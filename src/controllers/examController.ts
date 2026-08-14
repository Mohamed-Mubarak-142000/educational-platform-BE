import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import Exam from "../models/Exam";
import ExamQuestion from "../models/ExamQuestion";
import ExamSubmission from "../models/ExamSubmission";
import TeacherAssignment from "../models/TeacherAssignment";
import Subscription from "../models/Subscription";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";
import { examScheduledTemplate } from "../utils/emailTemplates";

const GRACE_MS = 10_000; // network-lag buffer accepted past the exam's end time

function computeEndsAt(exam: { scheduledStart: Date; durationMinutes: number }) {
  return new Date(exam.scheduledStart.getTime() + exam.durationMinutes * 60_000);
}

// ---------------------------------------------------------------------------
// @desc  Teacher creates a comprehensive exam for a whole subject assignment,
//        with a fixed scheduled start + duration, and any number of MCQ
//        questions. Every subscribed student is emailed a direct link.
// @route POST /api/exams
// @access Teacher
// ---------------------------------------------------------------------------
export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "Teacher") {
      res.status(403).json({ message: "Only teachers can create exams" });
      return;
    }

    const { assignmentId, title, scheduledStart, durationMinutes, questions } = req.body as {
      assignmentId?: string;
      title?: string;
      scheduledStart?: string;
      durationMinutes?: number;
      questions?: { text: string; options: string[]; correctAnswer: number }[];
    };

    if (!assignmentId || !title || !scheduledStart || !durationMinutes) {
      res.status(400).json({
        message: "Missing required fields: assignmentId, title, scheduledStart, durationMinutes",
      });
      return;
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ message: "At least one question is required" });
      return;
    }
    const parsedStart = new Date(scheduledStart);
    if (Number.isNaN(parsedStart.getTime())) {
      res.status(400).json({ message: "Invalid scheduledStart date" });
      return;
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      res.status(400).json({ message: "durationMinutes must be at least 1" });
      return;
    }

    const assignment = await TeacherAssignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ message: "Assignment not found" });
      return;
    }
    if (String(assignment.teacherId) !== String(req.user._id)) {
      res.status(403).json({ message: "You do not own this assignment" });
      return;
    }

    const exam = await Exam.create({
      teacherId: assignment.teacherId,
      assignmentId: assignment._id,
      subjectId: assignment.subjectId,
      gradeId: assignment.gradeId,
      title,
      scheduledStart: parsedStart,
      durationMinutes,
    });

    const questionDocs = questions.map((q) => ({
      examId: exam._id,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));
    await ExamQuestion.insertMany(questionDocs);

    // Notify every student currently subscribed to this teacher's subject/grade.
    const studentIds = await Subscription.find({
      teacherId: assignment.teacherId,
      subjectId: assignment.subjectId,
      gradeId: assignment.gradeId,
      status: "active",
    }).distinct("studentId");

    const students = await User.find({ _id: { $in: studentIds } }).select("name email");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const examLink = `${frontendUrl}/exams/${exam._id}`;
    const scheduledStartFormatted = parsedStart.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    for (const student of students) {
      try {
        const template = examScheduledTemplate(student.name, title, scheduledStartFormatted, examLink);
        await sendEmail({
          email: student.email,
          subject: template.subject,
          message: template.text,
          html: template.html,
        });
      } catch (error) {
        console.error(`Could not email exam notice to ${student.email}`, error);
      }
    }

    res.status(201).json({ exam, notifiedCount: students.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get an exam, gated by the real server clock. Never returns question
//        correct answers to students, and never returns questions at all
//        before the scheduled start.
// @route GET /api/exams/:id
// @access Private
// ---------------------------------------------------------------------------
export const getExam = async (req: AuthRequest, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    const isOwner =
      req.user?.role === "Admin" ||
      (req.user?.role === "Teacher" && String(exam.teacherId) === String(req.user._id));

    if (isOwner) {
      const questions = await ExamQuestion.find({ examId: exam._id });
      res.json({ exam, questions });
      return;
    }

    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const hasAccess = await Subscription.exists({
      studentId: req.user._id,
      teacherId: exam.teacherId,
      subjectId: exam.subjectId,
      gradeId: exam.gradeId,
      status: "active",
    });
    if (!hasAccess) {
      res.status(403).json({ message: "You are not subscribed to this subject" });
      return;
    }

    const now = new Date();
    const endsAt = computeEndsAt(exam);

    if (now < exam.scheduledStart) {
      res.json({
        status: "scheduled",
        title: exam.title,
        scheduledStart: exam.scheduledStart,
        serverNow: now,
      });
      return;
    }

    const submission = await ExamSubmission.findOne({ examId: exam._id, studentId: req.user._id });
    if (submission) {
      res.json({
        status: "closed",
        alreadySubmitted: true,
        score: submission.score,
        correctCount: submission.correctCount,
        totalQuestions: submission.totalQuestions,
      });
      return;
    }

    if (now > endsAt) {
      res.json({ status: "closed", alreadySubmitted: false });
      return;
    }

    const questions = await ExamQuestion.find({ examId: exam._id }).select("-correctAnswer");
    res.json({
      status: "active",
      title: exam.title,
      questions,
      serverNow: now,
      endsAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student submits (or auto-submits) their answers. Score is always
//        computed server-side from the stored correctAnswer.
// @route POST /api/exams/:id/submit
// @access Student
// ---------------------------------------------------------------------------
export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Only students can submit exams" });
      return;
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    const now = new Date();
    const endsAt = computeEndsAt(exam);
    if (now < exam.scheduledStart || now.getTime() > endsAt.getTime() + GRACE_MS) {
      res.status(400).json({ message: "This exam is not open right now" });
      return;
    }

    const existing = await ExamSubmission.findOne({ examId: exam._id, studentId: req.user._id });
    if (existing) {
      res.json({
        score: existing.score,
        correctCount: existing.correctCount,
        totalQuestions: existing.totalQuestions,
        alreadySubmitted: true,
      });
      return;
    }

    const { answers, autoSubmitted } = req.body as {
      answers?: { questionId: string; selected: number }[];
      autoSubmitted?: boolean;
    };

    const questions = await ExamQuestion.find({ examId: exam._id });
    const submittedByQuestion = new Map<string, number>();
    for (const a of answers ?? []) {
      if (a && a.questionId !== undefined) {
        submittedByQuestion.set(String(a.questionId), Number(a.selected));
      }
    }

    let correctCount = 0;
    const storedAnswers = questions.map((q) => {
      const selected = submittedByQuestion.get(String(q._id));
      if (selected !== undefined && selected === q.correctAnswer) correctCount += 1;
      return { questionId: q._id, selected: selected ?? -1 };
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    try {
      const submission = await ExamSubmission.create({
        examId: exam._id,
        studentId: req.user._id,
        answers: storedAnswers,
        score,
        correctCount,
        totalQuestions,
        autoSubmitted: !!autoSubmitted,
      });
      res.status(201).json({
        score: submission.score,
        correctCount: submission.correctCount,
        totalQuestions: submission.totalQuestions,
        alreadySubmitted: false,
      });
    } catch (createError: any) {
      // Unique-index race: another request for the same student/exam won.
      if (createError.code === 11000) {
        const raced = await ExamSubmission.findOne({ examId: exam._id, studentId: req.user._id });
        res.json({
          score: raced?.score ?? 0,
          correctCount: raced?.correctCount ?? 0,
          totalQuestions: raced?.totalQuestions ?? 0,
          alreadySubmitted: true,
        });
        return;
      }
      throw createError;
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Teacher/Admin views every student's submission for an exam.
// @route GET /api/exams/:id/submissions
// @access Teacher/Admin
// ---------------------------------------------------------------------------
export const getExamSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }
    if (req.user?.role !== "Admin" && String(exam.teacherId) !== String(req.user?._id)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const submissions = await ExamSubmission.find({ examId: exam._id })
      .populate("studentId", "name email")
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Teacher's exams for a given assignment (subject+grade they teach).
// @route GET /api/exams/assignment/:assignmentId
// @access Teacher/Admin
// ---------------------------------------------------------------------------
export const getExamsByAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const assignment = await TeacherAssignment.findById(req.params.assignmentId);
    if (!assignment) {
      res.status(404).json({ message: "Assignment not found" });
      return;
    }
    if (req.user?.role !== "Admin" && String(assignment.teacherId) !== String(req.user?._id)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const exams = await Exam.find({ assignmentId: assignment._id }).sort({ scheduledStart: -1 });
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student's exams (past + upcoming) across every subject they're
//        subscribed to.
// @route GET /api/exams/mine
// @access Student
// ---------------------------------------------------------------------------
export const getMyExams = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Only students can view their exams" });
      return;
    }

    const subs = await Subscription.find({ studentId: req.user._id, status: "active" })
      .select("teacherId subjectId gradeId")
      .lean();

    if (subs.length === 0) {
      res.json([]);
      return;
    }

    const orClauses = subs.map((s) => ({
      teacherId: s.teacherId,
      subjectId: s.subjectId,
      gradeId: s.gradeId,
    }));

    const exams = await Exam.find({ $or: orClauses }).sort({ scheduledStart: -1 });
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
