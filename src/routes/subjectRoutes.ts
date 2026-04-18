import express from 'express';
import {
  getSubjects,
  getSubjectById,
  getSubjectTeachers,
  getSubjectTeacherContent,
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
import { 
  adminOnly, 
  teacherOnly, 
  validateSubjectAccess 
} from '../middlewares/rbacMiddleware';

const router = express.Router();

// Subjects - Requires authentication, filtered by role
router.route('/').get(protect, getSubjects).post(protect, adminOnly, createSubject);

// Subject teachers (student flow)
router.get('/:subjectId/teachers', protect, getSubjectTeachers);
router.get('/:subjectId/teachers/:teacherId/content', protect, getSubjectTeacherContent);

// Subject by ID - Requires authentication
router
  .route('/:id')
  .get(protect, getSubjectById)
  .put(protect, adminOnly, updateSubject)
  .delete(protect, adminOnly, deleteSubject);

// Primary: grade-scoped units - Teacher only (Admin is blocked from content mutations)
router
  .route('/:subjectId/grades/:gradeId/units')
  .get(getUnitsBySubjectAndGrade)
  .post(protect, teacherOnly, validateSubjectAccess, createUnitForSubjectGrade);

// Legacy: subject-only units (kept during migration)
router
  .route('/:subjectId/units')
  .get(getUnitsBySubject)
  .post(protect, teacherOnly, validateSubjectAccess, createUnitForSubject);

export default router;
