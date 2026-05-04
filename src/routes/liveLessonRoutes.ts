import express from "express";
import {
  createLiveLessonRequest,
  getMyRequests,
  cancelRequest,
  getMySessions,
  getPendingRequests,
  acceptRequest,
  declineRequest,
  updateTeacherAvailability,
  getTeacherSessions,
  getSessionDetails,
  rateSession,
  getAllRequests,
  getAllSessions,
} from "../controllers/liveLessonController";
import { protect, admin, teacher } from "../middlewares/authMiddleware";

const router = express.Router();

// ────────────── STUDENT ROUTES ──────────────
router.route("/request").post(protect, createLiveLessonRequest);
router.route("/my-requests").get(protect, getMyRequests);
router.route("/requests/:requestId").delete(protect, cancelRequest);
router.route("/my-sessions").get(protect, getMySessions);

// ────────────── TEACHER ROUTES ──────────────
router.route("/pending-requests").get(protect, teacher, getPendingRequests);
router
  .route("/requests/:requestId/accept")
  .post(protect, teacher, acceptRequest);
router
  .route("/requests/:requestId/decline")
  .post(protect, teacher, declineRequest);
router
  .route("/teacher/availability")
  .patch(protect, teacher, updateTeacherAvailability);
router.route("/teacher/sessions").get(protect, teacher, getTeacherSessions);

// ────────────── SHARED ROUTES ──────────────
router.route("/sessions/:sessionId").get(protect, getSessionDetails);
router.route("/sessions/:sessionId/rate").post(protect, rateSession);

// ────────────── ADMIN ROUTES ──────────────
router.route("/admin/all-requests").get(protect, admin, getAllRequests);
router.route("/admin/all-sessions").get(protect, admin, getAllSessions);

export default router;
