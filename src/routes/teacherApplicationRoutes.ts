import express from 'express';
import {
  getTeacherApplications,
  submitTeacherApplication,
  reviewTeacherApplication,
  uploadTeacherApplicationFile,
} from '../controllers/teacherApplicationController';
import upload from '../middlewares/uploadMiddleware';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(protect, admin, getTeacherApplications).post(submitTeacherApplication);
router.route('/upload').post(upload.single('file'), uploadTeacherApplicationFile);
router.route('/:id/review').post(protect, admin, reviewTeacherApplication);

export default router;
