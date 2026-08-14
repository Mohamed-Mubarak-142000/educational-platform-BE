import express from "express";
import { protect, teacher } from "../middlewares/authMiddleware";
import { teacherOnly } from "../middlewares/rbacMiddleware";
import {
  createExam,
  getExam,
  submitExam,
  getExamSubmissions,
  getExamsByAssignment,
  getMyExams,
} from "../controllers/examController";

const router = express.Router();

router.post("/", protect, teacherOnly, createExam);
router.get("/mine", protect, getMyExams);
router.get("/assignment/:assignmentId", protect, teacher, getExamsByAssignment);
router.get("/:id", protect, getExam);
router.post("/:id/submit", protect, submitExam);
router.get("/:id/submissions", protect, teacher, getExamSubmissions);

export default router;
