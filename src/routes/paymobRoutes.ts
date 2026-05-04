import express from "express";
import { protect, admin } from "../middlewares/authMiddleware";
import {
  initiateCheckout,
  handleWebhook,
  handleCallback,
  getMyPaymentHistory,
  getPaymentStatus,
  getAdminAnalytics,
  refundPayment,
} from "../controllers/paymobController";

const router = express.Router();

// Student: initiate Paymob checkout
router.post("/create-intention", protect, initiateCheckout);

// Paymob webhook — must receive raw JSON body, no auth
router.post("/webhook", express.json(), handleWebhook);

// Paymob browser redirect after payment
router.get("/callback", handleCallback);

// Student: own payment history
router.get("/my-history", protect, getMyPaymentHistory);

// Student/Admin: check payment status
router.get("/status/:id", protect, getPaymentStatus);

// Admin: analytics
router.get("/admin/analytics", protect, admin, getAdminAnalytics);

// Admin: refund
router.post("/:id/refund", protect, admin, refundPayment);

export default router;
