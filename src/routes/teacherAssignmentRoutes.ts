import { Router } from 'express';
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getMyAssignments,
  getPublicAssignments,
} from '../controllers/teacherAssignmentController';
import { protect, admin, teacher } from '../middlewares/authMiddleware';

const router = Router();

// Public: get teachers for a subject+grade (no auth required — used from home page flow)
router.get('/public', getPublicAssignments);

// Teacher: see own assignments
router.get('/mine', protect, teacher, getMyAssignments);

// Admin: full CRUD
router.route('/').get(protect, admin, getAssignments).post(protect, admin, createAssignment);

router
  .route('/:id')
  .put(protect, admin, updateAssignment)
  .delete(protect, admin, deleteAssignment);

export default router;
