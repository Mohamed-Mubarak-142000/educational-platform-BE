import express from "express";
import { protect } from "../middlewares/authMiddleware";
import { teacherOnly } from "../middlewares/rbacMiddleware";
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

// Teacher: review queue for their own students' payments — the controller
// scopes the list to req.user._id and the approve/reject actions verify
// ownership, so this is intentionally teacherOnly (not admin).
router.get("/", protect, teacherOnly, getManualPaymentRequests);
router.post("/:id/approve", protect, teacherOnly, approveManualPaymentRequest);
router.post("/:id/reject", protect, teacherOnly, rejectManualPaymentRequest);

export default router;
