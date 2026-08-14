import express from "express";
import {
  getPayoutsOverview,
  getTeacherBalances,
  getPayoutHistory,
  createPayout,
} from "../controllers/teacherPayoutController";
import { protect, admin } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/overview", protect, admin, getPayoutsOverview);
router.get("/balances", protect, admin, getTeacherBalances);
router.get("/", protect, admin, getPayoutHistory);
router.post("/", protect, admin, createPayout);

export default router;
