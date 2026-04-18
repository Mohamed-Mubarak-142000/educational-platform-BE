import { Request, Response } from 'express';
import Unit from '../models/Unit';
import Lesson from '../models/Lesson';
import LessonPart from '../models/LessonPart';
import UnitQuiz from '../models/UnitQuiz';
import MCQQuestion from '../models/MCQQuestion';
import UnitAvailability from '../models/UnitAvailability';
import UnitEnrollment from '../models/UnitEnrollment';
import QuizGrade from '../models/QuizGrade';
import Comment from '../models/Comment';
import { AuthRequest } from '../middlewares/authMiddleware';
import { attachCreator } from '../middlewares/rbacMiddleware';
import TeacherAssignment from '../models/TeacherAssignment';
import { getStudentSubscriptionScope } from '../utils/subscriptionAccess';

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

    const reqUser = (req as any).user;
    if (!reqUser || reqUser.role !== 'Student') {
      res.json(lessons);
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

    const sanitized = lessons.map((lesson: any, idx: number) => {
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

// ── Lesson Parts ──────────────────────────────────────────────────

export const getPartsByLesson = async (req: Request, res: Response) => {
  try {
    const parts = await LessonPart.find({ lessonId: req.params.lessonId as string }).sort({ order: 1 });
    res.json(parts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createLessonPart = async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.lessonId as string;
    const { title, content, media, quiz, order } = req.body;
    const count = await LessonPart.countDocuments({ lessonId });
    const part = await LessonPart.create({
      lessonId,
      title,
      content,
      media,
      quiz,
      order: order !== undefined ? order : count + 1,
    });
    res.status(201).json(part);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLessonPart = async (req: Request, res: Response) => {
  try {
    const part = await LessonPart.findById(req.params.id);
    if (!part) {
      res.status(404).json({ message: 'Lesson part not found' });
      return;
    }
    await part.deleteOne();
    res.json({ message: 'Lesson part deleted successfully' });
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

export const createUnitQuiz = async (req: Request, res: Response) => {
  try {
    const { attachedTo, attachedToId, title, timeLimit } = req.body;
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

export const updateUnitQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await UnitQuiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
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

export const deleteUnitQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await UnitQuiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
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

export const getQuestionsByQuiz = async (req: Request, res: Response) => {
  try {
    const questions = await MCQQuestion.find({ quizId: req.params.quizId as string });
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMCQQuestion = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const { text, options, correctAnswer } = req.body;
    const question = await MCQQuestion.create({ quizId, text, options, correctAnswer });
    res.status(201).json(question);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMCQQuestion = async (req: Request, res: Response) => {
  try {
    const question = await MCQQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
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

export const deleteMCQQuestion = async (req: Request, res: Response) => {
  try {
    const question = await MCQQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }
    await question.deleteOne();
    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Quiz Grades ───────────────────────────────────────────────────

export const submitQuizGrade = async (req: any, res: Response) => {
  try {
    const { quizId, score, correctCount, totalQuestions } = req.body;
    const grade = await QuizGrade.create({
      studentId: req.user._id,
      quizId,
      score,
      correctCount,
      totalQuestions,
      completedAt: new Date(),
    });
    res.status(201).json(grade);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGradesByStudent = async (req: Request, res: Response) => {
  try {
    const grades = await QuizGrade.find({ studentId: req.params.studentId as string }).sort({ completedAt: -1 });
    res.json(grades);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGradesByQuiz = async (req: Request, res: Response) => {
  try {
    const grades = await QuizGrade.find({ quizId: req.params.quizId as string })
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

export const getEnrolledUnitIds = async (req: Request, res: Response) => {
  try {
    const enrollments = await UnitEnrollment.find({ studentId: req.params.studentId as string });
    res.json(enrollments.map((e) => e.unitId));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const enrollInUnit = async (req: any, res: Response) => {
  try {
    const { unitId } = req.body;
    const studentId = req.user._id;
    const existing = await UnitEnrollment.findOne({ studentId, unitId });
    if (existing) {
      res.json(existing);
      return;
    }
    const enrollment = await UnitEnrollment.create({ studentId, unitId });
    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Lesson Comments ───────────────────────────────────────────────

export const getCommentsByLesson = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ lessonId: req.params.lessonId as string })
      .populate('userId', 'name role')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addLessonComment = async (req: any, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { text } = req.body;
    const comment = await Comment.create({
      lessonId,
      userId: req.user._id,
      text,
      likes: [],
    });
    const populated = await comment.populate('userId', 'name role');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
