import express from 'express';
import {
  createSection,
  getSections,
  createLesson,
  getLessonsByCourse,
  getLessons,
  updateLesson,
  deleteLesson,
  updateProgress,
  getCommentsByLesson,
  addLessonComment,
  getPartsByLesson,
  createLessonPart,
  deleteLessonPart,
} from '../controllers/lessonController';
import { protect, teacher } from '../middlewares/authMiddleware';
import { 
  teacherOnly, 
  validateLessonAccess,
  checkOwnership 
} from '../middlewares/rbacMiddleware';
import Lesson from '../models/Lesson';

const router = express.Router();

// Sections (course track)
router.route('/sections').post(protect, teacherOnly, createSection);
router.route('/sections/:courseId').get(getSections);

// Section-based lesson create
router.route('/').post(protect, teacherOnly, createLesson);

// Course-based lesson list
router.route('/course/:courseId').get(getLessonsByCourse);

// Progress
router.route('/progress').post(protect, updateProgress);

// Lesson parts (delete by part id — must come before /:id)
router.route('/parts/:id').delete(protect, teacherOnly, deleteLessonPart);

// Single lesson — Teachers can only edit their own lessons
router
  .route('/:id')
  .get(protect, getLessons)
  .put(protect, teacherOnly, validateLessonAccess, checkOwnership(Lesson), updateLesson)
  .delete(protect, teacherOnly, validateLessonAccess, checkOwnership(Lesson), deleteLesson);

// Lesson comments
router.route('/:lessonId/comments').get(getCommentsByLesson).post(protect, addLessonComment);

// Lesson parts
router.route('/:lessonId/parts').get(getPartsByLesson).post(protect, teacherOnly, createLessonPart);

export default router;
