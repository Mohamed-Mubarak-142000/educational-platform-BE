import { Router } from 'express';
import {
  updateLessonProgress,
  getMyProgress,
  getUnitProgress,
  getSubjectProgress,
  getUnitProgressAll,
} from '../controllers/progressController';
import { protect, admin, teacher } from '../middlewares/authMiddleware';

const router = Router();

// Update / upsert lesson progress (student)
router.post('/lesson', protect, updateLessonProgress);

// Student analytics
router.get('/', protect, getMyProgress);
router.get('/unit/:unitId', protect, getUnitProgress);
router.get('/subject/:subjectId/grade/:gradeId', protect, getSubjectProgress);

// Admin / Teacher analytics
router.get('/unit/:unitId/all', protect, getUnitProgressAll);

export default router;
