import express from 'express';
import {
  getTeacherApplications,
  submitTeacherApplication,
  reviewTeacherApplication,
} from '../controllers/teacherApplicationController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(protect, admin, getTeacherApplications).post(submitTeacherApplication);
router.route('/:id/review').post(protect, admin, reviewTeacherApplication);

export default router;
