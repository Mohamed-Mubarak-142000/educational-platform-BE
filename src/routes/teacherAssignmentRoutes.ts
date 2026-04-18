import { Router } from 'express';
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getMyAssignments,
  getPublicAssignments,
  getTeachersBySubjectStage,
  getAssignmentContent,
  createUnitForAssignment,
  getUnitsForAssignment,
  getTeacherDashboard,
} from '../controllers/teacherAssignmentController';
import { protect, admin, teacher } from '../middlewares/authMiddleware';
import { teacherOnly } from '../middlewares/rbacMiddleware';

const router = Router();

// Public: get teachers for a subject+grade (no auth required — used from home page flow)
router.get('/public', getPublicAssignments);

// Student: get teachers for a subject+stage
router.get('/by-subject-stage', protect, getTeachersBySubjectStage);

// Teacher: dashboard stats
router.get('/dashboard', protect, teacher, getTeacherDashboard);

// Teacher: see own assignments
router.get('/mine', protect, teacher, getMyAssignments);

// Assignment unit routes (teacher only — admin must not create units)
router
  .route('/:assignmentId/units')
  .get(protect, getUnitsForAssignment)
  .post(protect, teacherOnly, createUnitForAssignment);

// Assignment content (units + lessons) with access flags
router.get('/:assignmentId/content', protect, getAssignmentContent);

// Admin: full CRUD
router.route('/').get(protect, admin, getAssignments).post(protect, admin, createAssignment);

router
  .route('/:id')
  .put(protect, admin, updateAssignment)
  .delete(protect, admin, deleteAssignment);

export default router;
