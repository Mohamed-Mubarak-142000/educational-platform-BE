import express from 'express';
import { getCourses, getCourseById, createCourse, enrollCourse, updateCourse, deleteCourse, getEnrolledCourses, getCoursesByTeacher, getMyCourses } from '../controllers/courseController';
import { protect, teacher } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(getCourses).post(protect, teacher, createCourse);
router.route('/enroll').post(protect, enrollCourse);
router.route('/enrolled').get(protect, getEnrolledCourses);
router.route('/my').get(protect, teacher, getMyCourses);
router.route('/teacher/:teacherId').get(protect, getCoursesByTeacher);
router.route('/:id').get(getCourseById).put(protect, teacher, updateCourse).delete(protect, teacher, deleteCourse);

export default router;
