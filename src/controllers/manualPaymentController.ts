import crypto from "crypto";
import mongoose from "mongoose";
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import ManualPaymentRequest, {
  type ManualPaymentMethod,
} from "../models/ManualPaymentRequest";
import Payment from "../models/Payment";
import Subscription from "../models/Subscription";
import TeacherAssignment from "../models/TeacherAssignment";
import LiveLessonRequest from "../models/LiveLessonRequest";
import {
  getSubjectOrUnitBasePriceEGP,
  computeAmountCents,
} from "../utils/subscriptionPricing";
import { activateSubjectOrUnitSubscription } from "../utils/subscriptionActivation";
import { createTeacherEarning } from "../utils/earningsActivation";

const METHODS: ManualPaymentMethod[] = ["InstaPay", "VodafoneCash", "Fawry"];

const generateReferenceCode = () =>
  `AC-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

// ---------------------------------------------------------------------------
// @desc  Upload a payment proof screenshot (Cloudinary)
// @route POST /api/manual-payments/upload
// @access Student
// ---------------------------------------------------------------------------
export const uploadManualPaymentProof = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }
    const uploadedFile = req.file as Express.Multer.File & {
      path?: string;
      secure_url?: string;
    };
    res.json({ url: uploadedFile.path || uploadedFile.secure_url || "" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error uploading file" });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student submits a manual payment (InstaPay/Vodafone Cash/Fawry) for
//        review, either against a subject/unit subscription or a live-lesson
//        request they already created.
// @route POST /api/manual-payments
// @access Student
// ---------------------------------------------------------------------------
export const createManualPaymentRequest = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Only students can submit payments" });
      return;
    }

    const {
      method,
      proofUrl,
      senderNote,
      liveLessonRequestId,
      teacherId,
      subjectId,
      gradeId,
      unitId,
      subscriptionType,
    } = req.body as {
      method: ManualPaymentMethod;
      proofUrl: string;
      senderNote?: string;
      liveLessonRequestId?: string;
      teacherId?: string;
      subjectId?: string;
      gradeId?: string;
      unitId?: string;
      subscriptionType?: "subject" | "unit";
    };

    if (!method || !METHODS.includes(method)) {
      res.status(400).json({ message: "Invalid payment method" });
      return;
    }
    if (!proofUrl) {
      res.status(400).json({ message: "A payment proof screenshot is required" });
      return;
    }

    // ── Live-lesson request payment ──
    if (liveLessonRequestId) {
      const request = await LiveLessonRequest.findById(liveLessonRequestId);
      if (!request) {
        res.status(404).json({ message: "Lesson request not found" });
        return;
      }
      if (String(request.studentId) !== String(req.user._id)) {
        res.status(403).json({ message: "This request does not belong to you" });
        return;
      }
      if (request.status !== "pending") {
        res.status(400).json({ message: "This request is no longer awaiting payment" });
        return;
      }
      if (request.paymentStatus === "paid") {
        res.status(409).json({ message: "This request has already been paid" });
        return;
      }

      const doc = await ManualPaymentRequest.create({
        studentId: req.user._id,
        teacherId: request.teacherId,
        subjectId: request.subjectId,
        gradeId: request.gradeId,
        liveLessonRequestId: request._id,
        purpose: "liveLesson",
        method,
        proofUrl,
        senderNote,
        amountEGP: request.priceEGP,
        referenceCode: generateReferenceCode(),
        status: "Pending",
      });
      res.status(201).json(doc);
      return;
    }

    // ── Subject/unit one-time purchase ──
    if (!teacherId || !subjectId || !gradeId || !subscriptionType) {
      res.status(400).json({
        message:
          "Missing required fields: teacherId, subjectId, gradeId, subscriptionType",
      });
      return;
    }
    if (subscriptionType === "unit" && !unitId) {
      res.status(400).json({ message: "unitId is required for unit purchases" });
      return;
    }

    const assignment = await TeacherAssignment.findOne({
      teacherId,
      subjectId,
      gradeId,
    });
    if (!assignment) {
      res.status(404).json({ message: "Teacher is not assigned to this subject/grade" });
      return;
    }

    // Access is for life once purchased — block a duplicate purchase attempt
    // instead of "renewing" something that never expires.
    const existingSub = await Subscription.findOne({
      studentId: req.user._id,
      teacherId,
      subjectId,
      gradeId,
      unitId: subscriptionType === "unit" ? unitId : undefined,
      type: subscriptionType,
      status: "active",
    });
    if (existingSub) {
      res.status(409).json({
        message: "You already have access to this content",
      });
      return;
    }

    let basePriceEGP: number;
    try {
      basePriceEGP = await getSubjectOrUnitBasePriceEGP({
        subscriptionType,
        unitId,
        subjectId,
        gradeId,
        assignmentId: assignment._id,
      });
    } catch (priceError: any) {
      res.status(400).json({ message: priceError.message });
      return;
    }

    const amountCents = computeAmountCents(basePriceEGP);

    const doc = await ManualPaymentRequest.create({
      studentId: req.user._id,
      teacherId,
      subjectId,
      gradeId,
      unitId: subscriptionType === "unit" ? unitId : undefined,
      purpose: subscriptionType,
      method,
      proofUrl,
      senderNote,
      amountEGP: amountCents / 100,
      referenceCode: generateReferenceCode(),
      status: "Pending",
    });
    res.status(201).json(doc);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student's own manual payment requests
// @route GET /api/manual-payments/mine
// @access Student
// ---------------------------------------------------------------------------
export const getMyManualPaymentRequests = async (req: AuthRequest, res: Response) => {
  try {
    const items = await ManualPaymentRequest.find({ studentId: req.user?._id }).sort({
      createdAt: -1,
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Manual payment requests addressed to the logged-in teacher
//        (optionally filtered by status)
// @route GET /api/manual-payments
// @access Teacher
// ---------------------------------------------------------------------------
export const getManualPaymentRequests = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      search,
      method,
      purpose,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as {
      status?: string;
      search?: string;
      method?: string;
      purpose?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    // A teacher only ever sees requests made against them — never another
    // teacher's queue.
    const filter: Record<string, unknown> = { teacherId: req.user!._id };
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;
    if (method) {
      const methods = method.split(",").filter(Boolean);
      if (methods.length > 0) filter.method = { $in: methods };
    }

    const sortDir = sortOrder === "asc" ? 1 : -1;

    let items: any[] = await ManualPaymentRequest.find(filter)
      .populate("studentId", "name email")
      .populate("teacherId", "name")
      .populate("subjectId", "name nameAr icon")
      .sort({ [sortBy]: sortDir })
      .lean();

    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      items = items.filter((item) => {
        const student = item.studentId as any;
        const name = student && typeof student === "object" ? student.name : undefined;
        return regex.test(name ?? "");
      });
    }

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Approve a manual payment — synthesizes a successful Payment record
//        and runs it through the same activation path used everywhere else
//        (subscription creation / live-lesson paid flag).
// @route POST /api/manual-payments/:id/approve
// @access Teacher (own requests only)
// ---------------------------------------------------------------------------
export const approveManualPaymentRequest = async (req: AuthRequest, res: Response) => {
  try {
    const request = await ManualPaymentRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: "Payment request not found" });
      return;
    }
    if (String(request.teacherId) !== String(req.user!._id)) {
      res.status(403).json({ message: "This request does not belong to you" });
      return;
    }
    if (request.status !== "Pending") {
      res.status(400).json({ message: "This request has already been reviewed" });
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const [payment] = await Payment.create(
          [
            {
              studentId: request.studentId,
              teacherId: request.teacherId,
              subjectId: request.subjectId,
              gradeId: request.gradeId,
              unitId: request.unitId,
              subscriptionType: request.purpose,
              liveLessonRequestId: request.liveLessonRequestId,
              amountCents: Math.round(request.amountEGP * 100),
              currency: "EGP",
              status: "success",
              paymentMethod: request.method,
              manualPaymentRequestId: request._id,
              idempotencyKey: `manual-${request._id}`,
              isTest: false,
            },
          ],
          { session },
        );

        if (request.purpose === "liveLesson") {
          if (request.liveLessonRequestId) {
            await LiveLessonRequest.findByIdAndUpdate(
              request.liveLessonRequestId,
              { paymentStatus: "paid", paymentId: String(payment._id) },
              { session },
            );
          }
        } else {
          await activateSubjectOrUnitSubscription(session, payment);
        }
        await createTeacherEarning(session, payment);

        request.status = "Approved";
        request.reviewedBy = req.user!._id as mongoose.Types.ObjectId;
        request.reviewedAt = new Date();
        request.paymentId = payment._id as mongoose.Types.ObjectId;
        await request.save({ session });
      });
    } finally {
      await session.endSession();
    }

    res.json({ message: "Payment approved" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Reject a manual payment request
// @route POST /api/manual-payments/:id/reject
// @access Teacher (own requests only)
// ---------------------------------------------------------------------------
export const rejectManualPaymentRequest = async (req: AuthRequest, res: Response) => {
  try {
    const request = await ManualPaymentRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: "Payment request not found" });
      return;
    }
    if (String(request.teacherId) !== String(req.user!._id)) {
      res.status(403).json({ message: "This request does not belong to you" });
      return;
    }
    if (request.status !== "Pending") {
      res.status(400).json({ message: "This request has already been reviewed" });
      return;
    }

    request.status = "Rejected";
    request.reviewedBy = req.user!._id as mongoose.Types.ObjectId;
    request.reviewedAt = new Date();
    request.rejectionReason = (req.body as { reason?: string })?.reason;
    await request.save();

    res.json({ message: "Payment rejected" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
