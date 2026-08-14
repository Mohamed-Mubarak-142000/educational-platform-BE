import { Request, Response } from 'express';
import Unit from '../models/Unit';
import Lesson from '../models/Lesson';
import LessonPart from '../models/LessonPart';
import UnitQuiz from '../models/UnitQuiz';
import MCQQuestion from '../models/MCQQuestion';
import UnitAvailability from '../models/UnitAvailability';
import QuizGrade from '../models/QuizGrade';
import { AuthRequest } from '../middlewares/authMiddleware';
import { attachCreator, checkTeacherSubjectAccess } from '../middlewares/rbacMiddleware';
import TeacherAssignment from '../models/TeacherAssignment';
import {
  getStudentSubscriptionScope,
  getAccessibleUnitIdsForStudent,
} from '../utils/subscriptionAccess';
import { signMediaFields } from '../utils/cloudinarySignedUrl';

// Resolve the Unit a quiz is attached to, whether directly (unit) or via a
// lesson / lesson-part, so teacher ownership can be checked against it.
const resolveUnitForQuiz = async (quiz: { attachedTo: string; attachedToId: any } | null) => {
  if (!quiz) return null;
  if (quiz.attachedTo === 'unit') {
    return Unit.findById(quiz.attachedToId).select('subjectId gradeId').lean();
  }
  if (quiz.attachedTo === 'lesson') {
    const lesson = await Lesson.findById(quiz.attachedToId).select('unitId').lean();
    if (!lesson?.unitId) return null;
    return Unit.findById(lesson.unitId).select('subjectId gradeId').lean();
  }
  if (quiz.attachedTo === 'part') {
    const part = await LessonPart.findById(quiz.attachedToId).select('lessonId').lean();
    if (!part?.lessonId) return null;
    const lesson = await Lesson.findById(part.lessonId).select('unitId').lean();
    if (!lesson?.unitId) return null;
    return Unit.findById(lesson.unitId).select('subjectId gradeId').lean();
  }
  return null;
};

// Admins may manage any quiz/question. Teachers may only manage quizzes
// attached to units within a subject/grade they are assigned to — this is
// the same scope check enforced on Unit/Lesson write routes.
const assertTeacherOwnsQuiz = async (
  user: AuthRequest['user'],
  quiz: { attachedTo: string; attachedToId: any } | null,
): Promise<boolean> => {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (user.role !== 'Teacher') return false;
  const unit = await resolveUnitForQuiz(quiz);
  if (!unit) return false;
  return checkTeacherSubjectAccess(user._id.toString(), String(unit.subjectId), String(unit.gradeId));
};

// ── Unit CRUD ─────────────────────────────────────────────────────

export const getUnitById = async (req: Request, res: Response) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }
    res.json(unit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUnit = async (req: Request, res: Response) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }
    const { title, description, order, price } = req.body;
    if (title !== undefined) unit.title = title;
    if (description !== undefined) unit.description = description;
    if (order !== undefined) unit.order = order;
    if (price !== undefined) unit.price = Number(price) || 0;
    const updated = await unit.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }
    await unit.deleteOne();
    res.json({ message: 'Unit deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Unit Lessons ──────────────────────────────────────────────────

export const getLessonsByUnit = async (req: Request, res: Response) => {
  try {
    const unitId = req.params.unitId as string;
    const unit = await Unit.findById(unitId).select('assignmentId subjectId gradeId order').lean();
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }

    const lessons = await Lesson.find({ unitId }).sort({ order: 1 }).lean();
    const signedLessons = lessons.map((lesson: any) => signMediaFields(lesson));

    const reqUser = (req as any).user;
    if (reqUser?.role === 'Admin') {
      res.json(signedLessons);
      return;
    }

    if (reqUser?.role === 'Teacher') {
      const hasAccess = await checkTeacherSubjectAccess(
        String(reqUser._id),
        String(unit.subjectId),
        String(unit.gradeId),
      );
      if (!hasAccess) {
        res.status(403).json({ message: "Access denied. You are not assigned to this unit's subject/grade." });
        return;
      }
      res.json(signedLessons);
      return;
    }

    let teacherId: string | undefined;
    if (unit.assignmentId) {
      const assignment = await TeacherAssignment.findById(unit.assignmentId).select('teacherId').lean();
      teacherId = assignment ? String(assignment.teacherId) : undefined;
    }

    const scope = teacherId
      ? await getStudentSubscriptionScope({
          studentId: String(reqUser._id),
          teacherId,
          subjectId: String(unit.subjectId),
          gradeId: String(unit.gradeId),
        })
      : { subjectAccess: false, unitAccessIds: new Set<string>() };

    const unitUnlocked = scope.subjectAccess || scope.unitAccessIds.has(String(unit._id));

    const sanitized = signedLessons.map((lesson: any, idx: number) => {
      const isFree = idx === 0;
      const locked = !unitUnlocked && !isFree;
      if (!locked) {
        return { ...lesson, locked: false, isFree, isUnlocked: true };
      }
      return {
        _id: lesson._id,
        unitId: lesson.unitId,
        title: lesson.title,
        titleAr: lesson.titleAr,
        description: lesson.description,
        descriptionAr: lesson.descriptionAr,
        order: lesson.order,
        duration: lesson.duration,
        isPublished: lesson.isPublished,
        isFree,
        locked: true,
        isUnlocked: false,
      };
    });

    res.json(sanitized);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createLessonForUnit = async (req: AuthRequest, res: Response) => {
  try {
    const unitId = req.params.unitId as string;
    const { title, description, videoUrl, pdfUrl, imageUrl, modelUrl, modelExplanation, audioUrl, order } = req.body;
    const [count, unit] = await Promise.all([
      Lesson.countDocuments({ unitId }),
      Unit.findById(unitId).select('order').lean(),
    ]);
    // Free preview is the first lesson of each unit
    const isFree = count === 0;
    
    const lessonData = attachCreator(req, {
      unitId,
      teacherId: req.user?._id, // Set teacherId for lessons
      title,
      description,
      videoUrl,
      pdfUrl,
      imageUrl,
      modelUrl,
      modelExplanation,
      audioUrl,
      order: order !== undefined ? order : count + 1,
      isFree,
    });
    
    const lesson = await Lesson.create(lessonData);
    res.status(201).json(lesson);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Unit Quiz ─────────────────────────────────────────────────────

export const getQuizByAttached = async (req: Request, res: Response) => {
  try {
    const quiz = await UnitQuiz.findOne({ attachedToId: req.params.attachedToId as string });
    res.json(quiz || null);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUnitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { attachedTo, attachedToId, title, timeLimit } = req.body;
    if (!attachedTo || !attachedToId) {
      res.status(400).json({ message: 'attachedTo and attachedToId are required' });
      return;
    }
    const allowed = await assertTeacherOwnsQuiz(req.user, { attachedTo, attachedToId });
    if (!allowed) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this subject/grade.' });
      return;
    }
    const existing = await UnitQuiz.findOne({ attachedToId });
    if (existing) {
      res.status(400).json({ message: 'A quiz already exists for this unit/lesson' });
      return;
    }
    const quiz = await UnitQuiz.create({ attachedTo, attachedToId, title, timeLimit: timeLimit ?? 0 });
    res.status(201).json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUnitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const quiz = await UnitQuiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }
    const allowed = await assertTeacherOwnsQuiz(req.user, quiz);
    if (!allowed) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this quiz\'s subject/grade.' });
      return;
    }
    if (req.body.title !== undefined) quiz.title = req.body.title;
    if (req.body.timeLimit !== undefined) quiz.timeLimit = req.body.timeLimit;
    const updated = await quiz.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUnitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const quiz = await UnitQuiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }
    const allowed = await assertTeacherOwnsQuiz(req.user, quiz);
    if (!allowed) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this quiz\'s subject/grade.' });
      return;
    }
    await MCQQuestion.deleteMany({ quizId: quiz._id });
    await quiz.deleteOne();
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── MCQ Questions ─────────────────────────────────────────────────

export const getQuestionsByQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const questions = await MCQQuestion.find({ quizId: req.params.quizId as string });
    // Students taking the quiz must never receive the correct answer in the
    // payload — only reveal it to whoever is allowed to author/preview it.
    const isPrivileged = req.user?.role === 'Teacher' || req.user?.role === 'Admin';
    if (isPrivileged) {
      res.json(questions);
      return;
    }
    const sanitized = questions.map((q) => {
      const { correctAnswer, ...rest } = q.toObject();
      return rest;
    });
    res.json(sanitized);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMCQQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const quizId = (req.params.quizId as string) || req.body.quizId;
    if (!quizId) {
      res.status(400).json({ message: 'quizId is required' });
      return;
    }
    const quiz = await UnitQuiz.findById(quizId).select('attachedTo attachedToId').lean();
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }
    const allowed = await assertTeacherOwnsQuiz(req.user, quiz);
    if (!allowed) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this quiz\'s subject/grade.' });
      return;
    }
    const { text, options, correctAnswer } = req.body;
    const question = await MCQQuestion.create({ quizId, text, options, correctAnswer });
    res.status(201).json(question);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMCQQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = await MCQQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }
    const quiz = await UnitQuiz.findById(question.quizId).select('attachedTo attachedToId').lean();
    const allowed = await assertTeacherOwnsQuiz(req.user, quiz);
    if (!allowed) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this quiz\'s subject/grade.' });
      return;
    }
    const { text, options, correctAnswer } = req.body;
    if (text !== undefined) question.text = text;
    if (options !== undefined) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    const updated = await question.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMCQQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = await MCQQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }
    const quiz = await UnitQuiz.findById(question.quizId).select('attachedTo attachedToId').lean();
    const allowed = await assertTeacherOwnsQuiz(req.user, quiz);
    if (!allowed) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this quiz\'s subject/grade.' });
      return;
    }
    await question.deleteOne();
    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Quiz Grades ───────────────────────────────────────────────────

// The client submits which option it picked per question; the score is
// always computed here from the stored correctAnswer, never trusted from
// the request body — otherwise any student could report a fabricated score.
export const submitQuizGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId, answers } = req.body as { quizId: string; answers?: Record<string, number> };
    if (!quizId) {
      res.status(400).json({ message: 'quizId is required' });
      return;
    }

    const questions = await MCQQuestion.find({ quizId });
    const totalQuestions = questions.length;
    let correctCount = 0;
    const correctAnswers: Record<string, number> = {};

    for (const q of questions) {
      const qid = String(q._id);
      correctAnswers[qid] = q.correctAnswer;
      const submitted = answers?.[qid];
      if (submitted !== undefined && Number(submitted) === q.correctAnswer) {
        correctCount += 1;
      }
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const grade = await QuizGrade.create({
      studentId: req.user!._id,
      quizId,
      score,
      correctCount,
      totalQuestions,
      completedAt: new Date(),
    });

    // Now that the attempt is recorded, it's safe to reveal the correct
    // answers so the student can review what they got wrong.
    res.status(201).json({ ...grade.toObject(), correctAnswers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGradesByStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params as { studentId: string };
    if (req.user?.role !== 'Admin' && req.user?._id.toString() !== studentId) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }
    const grades = await QuizGrade.find({ studentId }).sort({ completedAt: -1 });
    res.json(grades);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGradesByQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params as { quizId: string };

    if (req.user?.role === 'Teacher') {
      const quiz = await UnitQuiz.findById(quizId).select('attachedTo attachedToId').lean();
      const unit = quiz ? await resolveUnitForQuiz(quiz) : null;
      const hasAccess =
        !!unit &&
        (await checkTeacherSubjectAccess(
          req.user._id.toString(),
          String(unit.subjectId),
          String(unit.gradeId)
        ));
      if (!hasAccess) {
        res.status(403).json({ message: "Access denied. You are not assigned to this quiz's subject/grade." });
        return;
      }
    }

    const grades = await QuizGrade.find({ quizId })
      .populate('studentId', 'name email')
      .sort({ completedAt: -1 });
    res.json(grades);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Unit Availability ─────────────────────────────────────────────

export const getUnitAvailability = async (_req: Request, res: Response) => {
  try {
    const records = await UnitAvailability.find({});
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setUnitAvailability = async (req: Request, res: Response) => {
  try {
    const { id: unitId } = req.params as { id: string };
    const { status, availableMonth, availableYear, note } = req.body;
    const existing = await UnitAvailability.findOne({ unitId });
    if (existing) {
      if (status !== undefined) existing.status = status;
      if (availableMonth !== undefined) existing.availableMonth = availableMonth;
      if (availableYear !== undefined) existing.availableYear = availableYear;
      if (note !== undefined) existing.note = note;
      const updated = await existing.save();
      res.json(updated);
    } else {
      const created = await UnitAvailability.create({ unitId, status, availableMonth, availableYear, note });
      res.status(201).json(created);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Unit Enrollment ───────────────────────────────────────────────

// Which units a student currently has access to — derived from active
// Subscriptions (the real record of what was paid for), not a separate
// enrollment table a student could otherwise write to directly.
export const getEnrolledUnitIds = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params as { studentId: string };
    if (req.user?.role !== 'Admin' && req.user?._id.toString() !== studentId) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }
    const unitIds = await getAccessibleUnitIdsForStudent(studentId);
    res.json(unitIds);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

