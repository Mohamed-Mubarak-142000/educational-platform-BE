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

const router = express.Router();

// Unit availability (must come before /:id to avoid conflict)
router.route('/availability').get(protect, getUnitAvailability);
router.route('/enrolled/:studentId').get(protect, getEnrolledUnitIds);
router.route('/enroll').post(protect, enrollInUnit);

// Unit CRUD
router.route('/:id').get(getUnitById).put(protect, admin, updateUnit).delete(protect, admin, deleteUnit);
router.route('/:id/availability').put(protect, admin, setUnitAvailability);

// Unit lessons
router.route('/:unitId/lessons').get(getLessonsByUnit).post(protect, admin, createLessonForUnit);

export default router;
