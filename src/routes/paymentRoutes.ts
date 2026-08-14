import express from "express";
import { protect, admin } from "../middlewares/authMiddleware";
import {
  getSubscriptionQuote,
  getMyPaymentHistory,
  getPaymentStatus,
  getAdminAnalytics,
  refundPayment,
} from "../controllers/paymentController";

const router = express.Router();

// Student: price quote for a subject/unit purchase (used by the manual-transfer flow)
router.get("/quote", protect, getSubscriptionQuote);

// Student: own payment history
router.get("/my-history", protect, getMyPaymentHistory);

// Student/Admin: check payment status
router.get("/status/:id", protect, getPaymentStatus);

// Admin: analytics
router.get("/admin/analytics", protect, admin, getAdminAnalytics);

// Admin: refund
router.post("/:id/refund", protect, admin, refundPayment);

export default router;
