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
  migrateYouTubeUrls,
} from '../controllers/lessonController';
import { protect, teacher } from '../middlewares/authMiddleware';

const router = express.Router();

// Sections (course track)
router.route('/sections').post(protect, teacher, createSection);
router.route('/sections/:courseId').get(getSections);

// Section-based lesson create
router.route('/').post(protect, teacher, createLesson);

// Course-based lesson list
router.route('/course/:courseId').get(getLessonsByCourse);

// Progress
router.route('/progress').post(protect, updateProgress);

// One-time migration for YouTube URLs
router.route('/migrate/youtube-urls').post(protect, teacher, migrateYouTubeUrls);

// Lesson parts (delete by part id — must come before /:id)
router.route('/parts/:id').delete(protect, teacher, deleteLessonPart);

// Single lesson — dual: if sectionId → array; if lessonId → object
router.route('/:id').get(getLessons).put(protect, teacher, updateLesson).delete(protect, teacher, deleteLesson);

// Lesson comments
router.route('/:lessonId/comments').get(getCommentsByLesson).post(protect, addLessonComment);

// Lesson parts
router.route('/:lessonId/parts').get(getPartsByLesson).post(protect, teacher, createLessonPart);

export default router;
