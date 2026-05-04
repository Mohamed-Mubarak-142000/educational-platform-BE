import express from "express";
import {
  createLiveSession,
  getSessionDetails,
  getTeacherActiveSessions,
  getStudentSessions,
  endSession,
  getTeacherSessionHistory,
  getSessionStats,
  canJoinSession,
  getAllSessions,
} from "../controllers/liveClassroomController";
import { protect, admin, teacher } from "../middlewares/authMiddleware";

const router = express.Router();

// ────────────── SESSION MANAGEMENT ──────────────
router.route("/create").post(protect, createLiveSession);
router.route("/session/:identifier").get(protect, getSessionDetails);
router.route("/session/:sessionId/end").post(protect, teacher, endSession);
router.route("/can-join/:roomId").get(protect, canJoinSession);
router.route("/stats/:sessionId").get(protect, getSessionStats);

// ────────────── TEACHER ROUTES ──────────────
router.route("/teacher/active").get(protect, teacher, getTeacherActiveSessions);
router
  .route("/teacher/history")
  .get(protect, teacher, getTeacherSessionHistory);

// ────────────── STUDENT ROUTES ──────────────
router.route("/student/sessions").get(protect, getStudentSessions);

// ────────────── ADMIN ROUTES ──────────────
router.route("/admin/all").get(protect, admin, getAllSessions);

export default router;
