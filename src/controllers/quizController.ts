import { Request, Response } from 'express';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import Answer from '../models/Answer';
import Result from '../models/Result';
import Lesson from '../models/Lesson';
import Section from '../models/Section';
import Course from '../models/Course';

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { lessonId, title, timeLimit } = req.body;
    const quiz = await Quiz.create({ lessonId, title, timeLimit });
    res.status(201).json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizzes = async (_req: Request, res: Response) => {
  try {
    const quizzes = await Quiz.find({}).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { title, timeLimit } = req.body;
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    if (title !== undefined) quiz.title = title;
    if (timeLimit !== undefined) quiz.timeLimit = timeLimit;

    const updated = await quiz.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    await quiz.deleteOne();
    res.json({ message: 'Quiz removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addQuestion = async (req: Request, res: Response) => {
  try {
    const { quizId, question, type, answers } = req.body; 
    const newQuestion = await Question.create({ quizId, question, type });
    
    if (answers && answers.length > 0) {
      const answersToInsert = answers.map((a: any) => ({
        questionId: newQuestion._id,
        answerText: a.answerText,
        isCorrect: a.isCorrect
      }));
      await Answer.insertMany(answersToInsert);
    }
    
    res.status(201).json(newQuestion);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizDetails = async (req: Request, res: Response) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }
    
    const questions = await Question.find({ quizId: quiz._id });
    const questionIds = questions.map(q => q._id);
    const answers = await Answer.find({ questionId: { $in: questionIds } });
    
    res.json({ quiz, questions, answers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitQuiz = async (req: any, res: Response) => {
  try {
    const { quizId, score } = req.body;
    const result = await Result.create({
      studentId: req.user._id,
      quizId,
      score
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const results = await Result.find({ quizId: req.params.quizId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quizzes by course
// @route   GET /api/quizzes/course/:courseId
// @access  Private
export const getQuizzesByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    // Get all sections for this course
    const sections = await Section.find({ courseId });
    const sectionIds = sections.map(s => s._id);
    
    // Get all lessons for these sections
    const lessons = await Lesson.find({ sectionId: { $in: sectionIds } });
    const lessonIds = lessons.map(l => l._id);
    
    // Get all quizzes for these lessons
    const quizzes = await Quiz.find({ lessonId: { $in: lessonIds } })
      .populate('lessonId', 'title')
      .sort({ createdAt: -1 });
    
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quizzes for current teacher's courses/lessons
// @route   GET /api/quizzes/my
// @access  Private/Teacher
export const getMyQuizzes = async (req: any, res: Response) => {
  try {
    const courses = await Course.find({ teacherId: req.user._id }).select('_id');
    const courseIds = courses.map((c: any) => c._id);

    const sections = await Section.find({ courseId: { $in: courseIds } }).select('_id');
    const sectionIds = sections.map((s) => s._id);

    const lessons = await Lesson.find({
      $or: [
        { sectionId: { $in: sectionIds } },
        { courseId: { $in: courseIds } },
      ],
    }).select('_id');
    const lessonIds = lessons.map((l) => l._id);

    const quizzes = await Quiz.find({ lessonId: { $in: lessonIds } })
      .populate('lessonId', 'title')
      .sort({ createdAt: -1 });

    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
