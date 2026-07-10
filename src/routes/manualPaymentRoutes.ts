import express from "express";
import { protect, admin } from "../middlewares/authMiddleware";
import upload from "../middlewares/uploadMiddleware";
import {
  uploadManualPaymentProof,
  createManualPaymentRequest,
  getMyManualPaymentRequests,
  getManualPaymentRequests,
  approveManualPaymentRequest,
  rejectManualPaymentRequest,
} from "../controllers/manualPaymentController";

const router = express.Router();

// Student: upload a proof screenshot, then submit the request
router.post("/upload", protect, upload.single("file"), uploadManualPaymentProof);
router.post("/", protect, createManualPaymentRequest);
router.get("/mine", protect, getMyManualPaymentRequests);

// Admin: review queue
router.get("/", protect, admin, getManualPaymentRequests);
router.post("/:id/approve", protect, admin, approveManualPaymentRequest);
router.post("/:id/reject", protect, admin, rejectManualPaymentRequest);

export default router;
