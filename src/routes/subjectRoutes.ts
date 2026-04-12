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
  // Debug
  debugRBAC,
} from '../controllers/subjectController';
import { protect, admin } from '../middlewares/authMiddleware';
import { 
  adminOnly, 
  adminOrTeacher, 
  validateSubjectAccess 
} from '../middlewares/rbacMiddleware';

const router = express.Router();

// Debug endpoint (must come before /:id to avoid conflict)
router.route('/debug/rbac').get(protect, debugRBAC);

// Subjects - Requires authentication, filtered by role
router.route('/').get(protect, getSubjects).post(protect, adminOnly, createSubject);

// Subject by ID - Requires authentication
router
  .route('/:id')
  .get(protect, getSubjectById)
  .put(protect, adminOnly, updateSubject)
  .delete(protect, adminOnly, deleteSubject);

// Primary: grade-scoped units - Admin or assigned Teacher can create
router
  .route('/:subjectId/grades/:gradeId/units')
  .get(getUnitsBySubjectAndGrade)
  .post(protect, adminOrTeacher, validateSubjectAccess, createUnitForSubjectGrade);

// Legacy: subject-only units (kept during migration)
router
  .route('/:subjectId/units')
  .get(getUnitsBySubject)
  .post(protect, adminOrTeacher, validateSubjectAccess, createUnitForSubject);

export default router;
