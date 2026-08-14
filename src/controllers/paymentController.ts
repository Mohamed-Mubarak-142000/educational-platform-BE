import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";
import Payment from "../models/Payment";
import Subscription from "../models/Subscription";
import TeacherAssignment from "../models/TeacherAssignment";
import TeacherSchedule from "../models/TeacherSchedule";
import TeacherEarning from "../models/TeacherEarning";
import { getSubjectOrUnitBasePriceEGP, computeAmountCents } from "../utils/subscriptionPricing";
import { clawBackTeacherEarning } from "../utils/earningsActivation";

// ---------------------------------------------------------------------------
// @desc  Price quote for a subject/unit purchase — lets the manual-transfer
//        flow show "how much to transfer" before the student submits proof.
// @route GET /api/payments/quote
// @access Student
// ---------------------------------------------------------------------------
export const getSubscriptionQuote = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Only students can request a quote" });
      return;
    }

    const { teacherId, subjectId, gradeId, unitId, subscriptionType } =
      req.query as {
        teacherId?: string;
        subjectId?: string;
        gradeId?: string;
        unitId?: string;
        subscriptionType?: "subject" | "unit";
      };

    if (!teacherId || !subjectId || !gradeId || !subscriptionType) {
      res.status(400).json({
        message: "Missing required fields: teacherId, subjectId, gradeId, subscriptionType",
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
      res.status(priceError.message === "Unit not found" ? 404 : 400).json({
        message: priceError.message,
      });
      return;
    }

    const amountCents = computeAmountCents(basePriceEGP);
    res.json({ amountEGP: amountCents / 100 });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student payment history
// @route GET /api/payments/my-history
// @access Student
// ---------------------------------------------------------------------------
export const getMyPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query?.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit ?? 10)));
    const skip = (page - 1) * limit;
    const { status, subscriptionType, sortBy = "createdAt", sortOrder = "desc" } =
      req.query as {
        status?: string;
        subscriptionType?: string;
        sortBy?: string;
        sortOrder?: string;
      };

    const filter: Record<string, unknown> = { studentId: req.user?._id };
    if (status) filter.status = status;
    if (subscriptionType) filter.subscriptionType = subscriptionType;

    const sortDir = sortOrder === "asc" ? 1 : -1;

    const payments = await Payment.find(filter)
      .populate("teacherId", "name profileImage")
      .populate("subjectId", "name nameAr icon color")
      .populate("unitId", "title titleAr")
      .select("-idempotencyKey")
      .sort({ [sortBy]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Payment.countDocuments(filter);

    res.json({ payments, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Check payment status by ID
// @route GET /api/payments/status/:id
// @access Student (own payment only)
// ---------------------------------------------------------------------------
export const getPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id).select(
      "_id status amountCents currency subscriptionId createdAt",
    );
    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }
    if (
      String(payment.studentId) !== String(req.user?._id) &&
      req.user?.role !== "Admin"
    ) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Admin analytics — since purchases are one-time (not recurring), this
//        reports plain revenue-this-month/revenue-this-year totals rather
//        than MRR/ARR.
// @route GET /api/payments/admin/analytics
// @access Admin
// ---------------------------------------------------------------------------
export const getAdminAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const {
      search,
      status: recentStatus,
      subscriptionType,
      sortBy: recentSortBy = "createdAt",
      sortOrder: recentSortOrder = "desc",
    } = req.query as {
      search?: string;
      status?: string;
      subscriptionType?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const recentFilter: Record<string, unknown> = {};
    if (recentStatus) recentFilter.status = recentStatus;
    if (subscriptionType) recentFilter.subscriptionType = subscriptionType;
    const recentSortDir = recentSortOrder === "asc" ? 1 : -1;

    const [
      totalRevenueCents,
      revenueThisMonthCents,
      revenueThisYearCents,
      successCount,
      failedCount,
      refundedCount,
      activeSubscriptions,
      recentPayments,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amountCents" } } },
      ]).then((r) => r[0]?.total ?? 0),

      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amountCents" } } },
      ]).then((r) => r[0]?.total ?? 0),

      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: "$amountCents" } } },
      ]).then((r) => r[0]?.total ?? 0),

      Payment.countDocuments({ status: "success" }),
      Payment.countDocuments({ status: "failed" }),
      Payment.countDocuments({ status: "refunded" }),
      Subscription.countDocuments({ status: "active" }),

      // Recent payments — filtered/sorted per the request, populated so
      // search-by-name can match student/teacher.
      Payment.find(recentFilter)
        .populate("studentId", "name email")
        .populate("teacherId", "name")
        .populate("subjectId", "name nameAr icon")
        .select("-idempotencyKey")
        .sort({ [recentSortBy]: recentSortDir })
        .limit(100)
        .lean(),
    ]);

    let filteredRecentPayments: any[] = recentPayments;
    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filteredRecentPayments = recentPayments.filter((payment) => {
        const student = payment.studentId as any;
        const teacher = payment.teacherId as any;
        const studentName = student && typeof student === "object" ? student.name : undefined;
        const teacherName = teacher && typeof teacher === "object" ? teacher.name : undefined;
        return regex.test(studentName ?? "") || regex.test(teacherName ?? "");
      });
    }

    // Attach the platform-fee/net-earning breakdown already computed at
    // approval time (createTeacherEarning) — reused here rather than
    // recomputed, so the admin view can never drift from what was actually
    // recorded.
    const earnings = await TeacherEarning.find({
      paymentId: { $in: filteredRecentPayments.map((p) => p._id) },
    })
      .select("paymentId platformFeeCents netEarningCents")
      .lean();
    const earningByPaymentId = new Map(
      earnings.map((e) => [String(e.paymentId), e]),
    );
    filteredRecentPayments = filteredRecentPayments.map((payment) => {
      const earning = earningByPaymentId.get(String(payment._id));
      return {
        ...payment,
        platformFeeCents: earning?.platformFeeCents,
        netEarningCents: earning?.netEarningCents,
      };
    });

    res.json({
      totalRevenueCents,
      totalRevenueEGP: totalRevenueCents / 100,
      revenueThisMonthCents,
      revenueThisMonthEGP: revenueThisMonthCents / 100,
      revenueThisYearCents,
      revenueThisYearEGP: revenueThisYearCents / 100,
      successCount,
      failedCount,
      refundedCount,
      activeSubscriptions,
      recentPayments: filteredRecentPayments.slice(0, 50),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Admin refund a payment — this only updates internal records. There
//        is no electronic gateway anymore, so the admin must manually send
//        the money back to the student via whichever manual method
//        (InstaPay/Vodafone Cash/Fawry) they originally paid with.
// @route POST /api/payments/:id/refund
// @access Admin
// ---------------------------------------------------------------------------
export const refundPayment = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    if (payment.status !== "success") {
      res
        .status(400)
        .json({ message: "Only successful payments can be refunded" });
      return;
    }

    const { reason } = req.body as { reason?: string };
    const refundReason = reason ?? "Admin refund";

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Payment.findByIdAndUpdate(
          payment._id,
          {
            status: "refunded",
            refundedAt: new Date(),
            refundedBy: req.user?._id,
            refundReason,
          },
          { session },
        );

        if (payment.subscriptionId) {
          await Subscription.findByIdAndUpdate(
            payment.subscriptionId,
            {
              status: "revoked",
              revokedBy: req.user?._id,
              revokedAt: new Date(),
              revokedReason: "Payment refunded",
            },
            { session },
          );
        }

        // Remove the student from any of this teacher's schedule slots for
        // the refunded subject — they no longer have access to it.
        if (payment.subscriptionType !== "liveLesson") {
          await TeacherSchedule.updateMany(
            { teacherId: payment.teacherId, subjectId: payment.subjectId },
            { $pull: { enrolledStudents: payment.studentId } },
            { session },
          );
        }

        await clawBackTeacherEarning(session, payment._id as any, refundReason);
      });
    } finally {
      await session.endSession();
    }

    res.json({ message: "Payment refunded and subscription revoked" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
