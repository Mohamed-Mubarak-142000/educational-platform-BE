import express from 'express';
import {
  getSchedules,
  getSchedulesBySubject,
  getSchedulesByTeacher,
  getStudentSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  enrollInSchedule,
} from '../controllers/teacherScheduleController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

// Static paths must come before parameterized ones
router.route('/student').get(protect, getStudentSchedules);
router.route('/teacher/:teacherId').get(getSchedulesByTeacher);
router.route('/subject/:subjectId').get(getSchedulesBySubject);

router.route('/').get(getSchedules).post(protect, admin, createSchedule);
router.route('/:id').put(protect, admin, updateSchedule).delete(protect, admin, deleteSchedule);
router.route('/:id/enroll').post(protect, enrollInSchedule);

export default router;
