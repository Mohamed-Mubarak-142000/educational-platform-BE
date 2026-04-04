import express from 'express';
import {
  createQuiz,
  addQuestion,
  getQuizDetails,
  submitQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizzes,
  getQuizResults,
  getQuizzesByCourse,
} from '../controllers/quizController';
import {
  getQuizByAttached,
  createUnitQuiz,
  updateUnitQuiz,
  deleteUnitQuiz,
  getQuestionsByQuiz,
  createMCQQuestion,
  updateMCQQuestion,
  deleteMCQQuestion,
  submitQuizGrade,
  getGradesByStudent,
  getGradesByQuiz,
} from '../controllers/unitController';
import { protect, teacher } from '../middlewares/authMiddleware';

const router = express.Router();

// ── Static prefix routes (must come before /:quizId) ─────────────
router.route('/attached/:attachedToId').get(protect, getQuizByAttached);
router.route('/unit').post(protect, teacher, createUnitQuiz);
router.route('/unit/:id').put(protect, teacher, updateUnitQuiz).delete(protect, teacher, deleteUnitQuiz);
router.route('/grades').post(protect, submitQuizGrade);
router.route('/grades/student/:studentId').get(protect, getGradesByStudent);
router.route('/grades/quiz/:quizId').get(protect, teacher, getGradesByQuiz);
router.route('/questions').post(protect, teacher, addQuestion);
router.route('/questions/:id').put(protect, teacher, updateMCQQuestion).delete(protect, teacher, deleteMCQQuestion);
router.route('/submit').post(protect, submitQuiz);
router.route('/course/:courseId').get(protect, getQuizzesByCourse);

// ── Exam quiz routes ──────────────────────────────────────────────
router.route('/').get(protect, getQuizzes).post(protect, teacher, createQuiz);
router.route('/:quizId').get(protect, getQuizDetails).put(protect, teacher, updateQuiz).delete(protect, teacher, deleteQuiz);
router.route('/:quizId/results').get(protect, teacher, getQuizResults);
router.route('/:quizId/questions').get(protect, getQuestionsByQuiz).post(protect, teacher, createMCQQuestion);

export default router;
