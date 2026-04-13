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
  adminOrTeacher, 
  validateLessonAccess,
  checkOwnership 
} from '../middlewares/rbacMiddleware';
import Lesson from '../models/Lesson';

const router = express.Router();

// Sections (course track)
router.route('/sections').post(protect, adminOrTeacher, createSection);
router.route('/sections/:courseId').get(getSections);

// Section-based lesson create
router.route('/').post(protect, adminOrTeacher, createLesson);

// Course-based lesson list
router.route('/course/:courseId').get(getLessonsByCourse);

// Progress
router.route('/progress').post(protect, updateProgress);

// Lesson parts (delete by part id — must come before /:id)
router.route('/parts/:id').delete(protect, adminOrTeacher, deleteLessonPart);

// Single lesson — Teachers can only edit their own lessons
router
  .route('/:id')
  .get(getLessons)
  .put(protect, adminOrTeacher, validateLessonAccess, checkOwnership(Lesson), updateLesson)
  .delete(protect, adminOrTeacher, validateLessonAccess, checkOwnership(Lesson), deleteLesson);

// Lesson comments
router.route('/:lessonId/comments').get(getCommentsByLesson).post(protect, addLessonComment);

// Lesson parts
router.route('/:lessonId/parts').get(getPartsByLesson).post(protect, adminOrTeacher, createLessonPart);

export default router;
