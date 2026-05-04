import express from 'express';
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

// Unit quiz CRUD
router.route('/attached/:attachedToId').get(protect, getQuizByAttached);
router.route('/unit').post(protect, teacher, createUnitQuiz);
router.route('/unit/:id').put(protect, teacher, updateUnitQuiz).delete(protect, teacher, deleteUnitQuiz);

// Quiz grade submission and retrieval
router.route('/grades').post(protect, submitQuizGrade);
router.route('/grades/student/:studentId').get(protect, getGradesByStudent);
router.route('/grades/quiz/:quizId').get(protect, teacher, getGradesByQuiz);

// MCQ questions
router.route('/questions').post(protect, teacher, createMCQQuestion);
router.route('/questions/:id').put(protect, teacher, updateMCQQuestion).delete(protect, teacher, deleteMCQQuestion);

// Questions by quiz
router.route('/:quizId/questions').get(protect, getQuestionsByQuiz).post(protect, teacher, createMCQQuestion);

export default router;
