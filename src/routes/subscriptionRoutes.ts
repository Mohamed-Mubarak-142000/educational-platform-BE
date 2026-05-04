import { Router } from "express";
import { getMySubscriptions } from "../controllers/subscriptionController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Student: active subscriptions
router.get("/mine", protect, getMySubscriptions);

export default router;
