import express from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getUnitsBySubject,
  createUnitForSubject,
} from '../controllers/subjectController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(getSubjects).post(protect, admin, createSubject);
router.route('/:id').get(getSubjectById).put(protect, admin, updateSubject).delete(protect, admin, deleteSubject);
router.route('/:subjectId/units').get(getUnitsBySubject).post(protect, admin, createUnitForSubject);

export default router;
