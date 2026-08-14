import express from 'express';
import {
  getTeacherApplications,
  submitTeacherApplication,
  reviewTeacherApplication,
  uploadTeacherApplicationFile,
} from '../controllers/teacherApplicationController';
import { uploadApplicationFile } from '../middlewares/uploadMiddleware';
import { protect, admin } from '../middlewares/authMiddleware';
import { applicationUploadLimiter } from '../middlewares/rateLimitMiddleware';

const router = express.Router();

router.route('/').get(protect, admin, getTeacherApplications).post(submitTeacherApplication);
router
  .route('/upload')
  .post(applicationUploadLimiter, uploadApplicationFile.single('file'), uploadTeacherApplicationFile);
router.route('/:id/review').post(protect, admin, reviewTeacherApplication);

export default router;
