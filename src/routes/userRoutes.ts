import express from 'express';
import {
	registerUser,
	verifyOTP,
	resendOTP,
	loginUser,
	logoutUser,
	getUserProfile,
	createTeacher,
	createStudent,
	getTeachers,
	getTeacherById,
	updateTeacher,
	deleteTeacher,
	getStudents,
	getStudentById,
	updateStudent,
	deleteStudent,
	forgotPassword,
	resetPassword,
	changePassword,
} from '../controllers/userController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);
router.post('/teachers', protect, admin, createTeacher);
router.get('/teachers', protect, admin, getTeachers);
router.get('/teachers/:id', protect, admin, getTeacherById);
router.put('/teachers/:id', protect, admin, updateTeacher);
router.delete('/teachers/:id', protect, admin, deleteTeacher);
router.post('/students', protect, admin, createStudent);
router.get('/students', protect, admin, getStudents);
router.get('/students/:id', protect, admin, getStudentById);
router.put('/students/:id', protect, admin, updateStudent);
router.delete('/students/:id', protect, admin, deleteStudent);
router.get('/profile', protect, getUserProfile);

export default router;
