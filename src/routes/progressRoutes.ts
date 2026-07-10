import { Router } from 'express';
import {
  updateLessonProgress,
  getMyProgress,
  getUnitProgress,
  getSubjectProgress,
  getUnitProgressAll,
} from '../controllers/progressController';
import { protect, teacher } from '../middlewares/authMiddleware';
import { validateUnitAccess } from '../middlewares/rbacMiddleware';

const router = Router();

// Update / upsert lesson progress (student)
router.post('/lesson', protect, updateLessonProgress);

// Student analytics
router.get('/', protect, getMyProgress);
router.get('/unit/:unitId', protect, getUnitProgress);
router.get('/subject/:subjectId/grade/:gradeId', protect, getSubjectProgress);

// Admin / Teacher analytics — Teacher must be assigned to this unit's subject/grade
router.get('/unit/:unitId/all', protect, teacher, validateUnitAccess, getUnitProgressAll);

export default router;
