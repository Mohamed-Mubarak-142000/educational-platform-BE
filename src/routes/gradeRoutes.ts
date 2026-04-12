import { Router } from 'express';
import {
  getGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
  getSubjectsByGrade,
  assignSubjectToGrade,
  removeSubjectFromGrade,
} from '../controllers/gradeController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = Router();

router.route('/').get(getGrades).post(protect, admin, createGrade);

router
  .route('/:id')
  .get(getGradeById)
  .put(protect, admin, updateGrade)
  .delete(protect, admin, deleteGrade);

router
  .route('/:gradeId/subjects')
  .get(getSubjectsByGrade)
  .post(protect, admin, assignSubjectToGrade);

router
  .route('/:gradeId/subjects/:subjectId')
  .delete(protect, admin, removeSubjectFromGrade);

export default router;
