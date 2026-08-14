import express from 'express';
import {
	registerUser,
	verifyOTP,
	resendOTP,
	loginUser,
	verifyLoginOtp,
	logoutUser,
	getUserProfile,
	updateUserProfile,
	createTeacher,
	createStudent,
	getTeachers,
	getTeacherById,
	getPublicTeacherProfile,
	updateTeacher,
	deleteTeacher,
	getStudents,
	getStudentById,
	updateStudent,
	deleteStudent,
	getMySubscribedSubjects,
	forgotPassword,
	resetPassword,
	changePassword,
	getMyStudents,
	getMyUnitStudents,
} from '../controllers/userController';
import { protect, admin, teacher } from '../middlewares/authMiddleware';
import upload from '../middlewares/uploadMiddleware';
import { authLimiter } from '../middlewares/rateLimitMiddleware';

const router = express.Router();

router.post('/register', authLimiter, registerUser);
router.post('/verify', authLimiter, verifyOTP);
router.post('/resend-otp', authLimiter, resendOTP);
router.post('/login', authLimiter, loginUser);
router.post('/login/verify-otp', authLimiter, verifyLoginOtp);
router.post('/logout', logoutUser);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/change-password', protect, changePassword);
router.post('/teachers', protect, admin, createTeacher);
router.get('/teachers', protect, admin, getTeachers);
router.get('/teachers/:id/public-profile', getPublicTeacherProfile);
router.get('/teachers/:id', protect, admin, getTeacherById);
router.put('/teachers/:id', protect, admin, updateTeacher);
router.delete('/teachers/:id', protect, admin, deleteTeacher);
router.post('/students', protect, admin, createStudent);
router.get('/students', protect, admin, getStudents);
router.get('/students/:id', protect, admin, getStudentById);
router.put('/students/:id', protect, admin, updateStudent);
router.delete('/students/:id', protect, admin, deleteStudent);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('avatar'), updateUserProfile);
router.get('/subscribed-subjects', protect, getMySubscribedSubjects);
router.get('/my-students', protect, teacher, getMyStudents);
router.get('/my-unit-students', protect, teacher, getMyUnitStudents);

export default router;
