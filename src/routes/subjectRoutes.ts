import express from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  // Grade-scoped unit endpoints (primary)
  getUnitsBySubjectAndGrade,
  createUnitForSubjectGrade,
  // Legacy endpoints (kept for backward-compat during migration)
  getUnitsBySubject,
  createUnitForSubject,
} from '../controllers/subjectController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(getSubjects).post(protect, admin, createSubject);

router
  .route('/:id')
  .get(getSubjectById)
  .put(protect, admin, updateSubject)
  .delete(protect, admin, deleteSubject);

// Primary: grade-scoped units
router
  .route('/:subjectId/grades/:gradeId/units')
  .get(getUnitsBySubjectAndGrade)
  .post(protect, admin, createUnitForSubjectGrade);

// Legacy: subject-only units (kept during migration)
router
  .route('/:subjectId/units')
  .get(getUnitsBySubject)
  .post(protect, admin, createUnitForSubject);

export default router;
