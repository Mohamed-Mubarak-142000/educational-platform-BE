import express from "express";
import {
  getMyEarningsSummary,
  getMyEarnings,
  getMyPayouts,
} from "../controllers/teacherEarningController";
import { protect, teacher } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/mine/summary", protect, teacher, getMyEarningsSummary);
router.get("/mine/payouts", protect, teacher, getMyPayouts);
router.get("/mine", protect, teacher, getMyEarnings);

export default router;
