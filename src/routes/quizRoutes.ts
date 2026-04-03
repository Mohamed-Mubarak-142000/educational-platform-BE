import express from 'express';
import { createQuiz, addQuestion, getQuizDetails, submitQuiz, updateQuiz, deleteQuiz, getQuizzes, getQuizResults, getQuizzesByCourse } from '../controllers/quizController';
import { protect, teacher } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(protect, getQuizzes).post(protect, teacher, createQuiz);
router.route('/questions').post(protect, teacher, addQuestion);
router.route('/submit').post(protect, submitQuiz);
router.route('/course/:courseId').get(protect, getQuizzesByCourse);
router.route('/:quizId').get(protect, getQuizDetails).put(protect, teacher, updateQuiz).delete(protect, teacher, deleteQuiz);
router.route('/:quizId/results').get(protect, teacher, getQuizResults);

export default router;
