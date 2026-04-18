import express from 'express';
import {
  getStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  getSubjectsByStage,
  assignSubjectToStage,
  removeSubjectFromStage,
  getStageSubjectCounts,
} from '../controllers/stageController';
import { protect } from '../middlewares/authMiddleware';
import { adminOnly } from '../middlewares/rbacMiddleware';

const router = express.Router();

// Public: subject count per stage (must come before /:id to avoid conflict)
router.get('/subject-counts', getStageSubjectCounts);

// Stages - Admin only (Teachers CANNOT manage stages)
router.route('/').get(getStages).post(protect, adminOnly, createStage);
router.route('/:id').get(getStageById).put(protect, adminOnly, updateStage).delete(protect, adminOnly, deleteStage);

// Stage subjects - Get subjects in a stage, or assign/remove subjects
router
  .route('/:stageId/subjects')
  .get(getSubjectsByStage)
  .post(protect, adminOnly, assignSubjectToStage);

router
  .route('/:stageId/subjects/:subjectId')
  .delete(protect, adminOnly, removeSubjectFromStage);

export default router;
