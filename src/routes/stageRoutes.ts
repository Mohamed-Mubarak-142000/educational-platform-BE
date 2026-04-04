import express from 'express';
import {
  getStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  getSubjectsByStage,
} from '../controllers/stageController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(getStages).post(protect, admin, createStage);
router.route('/:id').get(getStageById).put(protect, admin, updateStage).delete(protect, admin, deleteStage);
router.route('/:stageId/subjects').get(getSubjectsByStage);

export default router;
