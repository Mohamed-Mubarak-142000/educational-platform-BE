import express from 'express';
import { createSection, getSections, createLesson, getLessons, updateProgress } from '../controllers/lessonController';
import { protect, teacher } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/sections').post(protect, teacher, createSection);
router.route('/sections/:courseId').get(getSections);

router.route('/').post(protect, teacher, createLesson);
router.route('/:sectionId').get(getLessons);

router.route('/progress').post(protect, updateProgress);

export default router;
