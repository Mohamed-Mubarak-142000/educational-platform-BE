import express from 'express';
import {
  getUnitById,
  updateUnit,
  deleteUnit,
  getLessonsByUnit,
  createLessonForUnit,
  getUnitAvailability,
  setUnitAvailability,
  getEnrolledUnitIds,
  enrollInUnit,
} from '../controllers/unitController';
import { protect, admin } from '../middlewares/authMiddleware';
import { 
  adminOrTeacher, 
  validateUnitAccess,
  checkOwnership 
} from '../middlewares/rbacMiddleware';
import Unit from '../models/Unit';

const router = express.Router();

// Unit availability (must come before /:id to avoid conflict)
router.route('/availability').get(protect, getUnitAvailability);
router.route('/enrolled/:studentId').get(protect, getEnrolledUnitIds);
router.route('/enroll').post(protect, enrollInUnit);

// Unit CRUD - Teachers can edit their own units
router
  .route('/:id')
  .get(getUnitById)
  .put(protect, adminOrTeacher, validateUnitAccess, checkOwnership(Unit), updateUnit)
  .delete(protect, adminOrTeacher, validateUnitAccess, checkOwnership(Unit), deleteUnit);

router.route('/:id/availability').put(protect, admin, setUnitAvailability);

// Unit lessons - Teachers can create lessons in their units
router
  .route('/:unitId/lessons')
  .get(getLessonsByUnit)
  .post(protect, adminOrTeacher, validateUnitAccess, createLessonForUnit);

export default router;
