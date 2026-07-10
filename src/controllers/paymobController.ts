import crypto from "crypto";
import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";
import Payment from "../models/Payment";
import Subscription from "../models/Subscription";
import TeacherAssignment from "../models/TeacherAssignment";
import LiveLessonRequest from "../models/LiveLessonRequest";
import { initiatePaymobCheckout } from "../utils/paymobClient";
import { verifyPaymobHmac } from "../utils/paymobHmac";
import {
  PLAN_CONFIG,
  getSubjectOrUnitBasePriceEGP,
  computeAmountCents,
  type SubscriptionPlanName,
} from "../utils/subscriptionPricing";
import { activateSubjectOrUnitSubscription } from "../utils/subscriptionActivation";

function buildIdempotencyKey(params: {
  studentId: string;
  teacherId: string;
  subjectId: string;
  gradeId: string;
  unitId?: string;
  plan: string;
}): string {
  const epoch = Math.floor(Date.now() / 300_000); // 5-minute window
  const raw = [
    params.studentId,
    params.teacherId,
    params.subjectId,
    params.gradeId,
    params.unitId ?? "",
    params.plan,
    epoch,
  ].join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ---------------------------------------------------------------------------
// @desc  Student initiates a Paymob checkout
// @route POST /api/payments/create-intention
// @access Student
// ---------------------------------------------------------------------------
export const initiateCheckout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Only students can initiate payments" });
      return;
    }

    const { teacherId, subjectId, gradeId, unitId, subscriptionType, plan } =
      req.body as {
        teacherId: string;
        subjectId: string;
        gradeId: string;
        unitId?: string;
        subscriptionType: "subject" | "unit";
        plan: "Monthly" | "Quarterly" | "Yearly";
      };

    if (!teacherId || !subjectId || !gradeId || !subscriptionType || !plan) {
      res.status(400).json({
        message:
          "Missing required fields: teacherId, subjectId, gradeId, subscriptionType, plan",
      });
      return;
    }

    if (!["Monthly", "Quarterly", "Yearly"].includes(plan)) {
      res.status(400).json({
        message: "Invalid plan. Choose Monthly, Quarterly, or Yearly",
      });
      return;
    }

    if (subscriptionType !== "subject" && subscriptionType !== "unit") {
      res
        .status(400)
        .json({ message: 'subscriptionType must be "subject" or "unit"' });
      return;
    }

    if (subscriptionType === "unit" && !unitId) {
      res
        .status(400)
        .json({ message: "unitId is required for unit subscriptions" });
      return;
    }

    // Verify teacher is assigned to this subject/grade
    const assignment = await TeacherAssignment.findOne({
      teacherId,
      subjectId,
      gradeId,
    });
    if (!assignment) {
      res
        .status(404)
        .json({ message: "Teacher is not assigned to this subject/grade" });
      return;
    }

    // Fetch price from DB (never trust client)
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

    const { amountCents, planDays } = computeAmountCents(basePriceEGP, plan);

    // Check for existing active subscription
    const existingSub = await Subscription.findOne({
      studentId: req.user._id,
      teacherId,
      subjectId,
      gradeId,
      unitId: subscriptionType === "unit" ? unitId : undefined,
      type: subscriptionType,
      status: { $in: ["active", "expiring_soon"] },
      expiresAt: { $gt: new Date() },
    });

    if (existingSub) {
      res.status(409).json({
        message: "You already have an active subscription for this content",
        expiresAt: existingSub.expiresAt,
      });
      return;
    }

    // Idempotency: check for existing pending payment in the same 5-min window
    const idempotencyKey = buildIdempotencyKey({
      studentId: String(req.user._id),
      teacherId,
      subjectId,
      gradeId,
      unitId,
      plan,
    });

    const existingPayment = await Payment.findOne({ idempotencyKey });
    if (existingPayment?.status === "pending") {
      // Return the same checkout URL to allow the student to retry without a new charge
      const checkoutUrl = `https://accept-alpha.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=`;
      res.json({
        paymentId: existingPayment._id,
        paymobOrderId: existingPayment.paymobOrderId,
        // iframeUrl is not stored on Payment, so we tell the client to re-initiate
        retryRequired: true,
        message: "A pending payment already exists. Please complete it.",
      });
      return;
    }

    // Build billing data (required by Paymob; use student profile data)
    const billingData: Record<string, string> = {
      apartment: "NA",
      email: (req.user as any).email ?? "student@platform.com",
      floor: "NA",
      first_name: (req.user as any).name?.split(" ")[0] ?? "Student",
      street: "NA",
      building: "NA",
      phone_number: (req.user as any).phone ?? "+20000000000",
      shipping_method: "NA",
      postal_code: "NA",
      city: "Cairo",
      country: "EG",
      last_name:
        (req.user as any).name?.split(" ").slice(1).join(" ") || "User",
      state: "NA",
    };

    // Create the Payment record first (status=pending)
    const payment = await Payment.create({
      studentId: req.user._id,
      teacherId,
      subjectId,
      gradeId,
      unitId: subscriptionType === "unit" ? unitId : undefined,
      subscriptionType,
      plan,
      planDays,
      amountCents,
      currency: "EGP",
      status: "pending",
      idempotencyKey,
      isTest: process.env.NODE_ENV !== "production",
    });

    // Call Paymob API
    let paymobOrderId: string;
    let iframeUrl: string;

    try {
      const result = await initiatePaymobCheckout(
        amountCents,
        "EGP",
        idempotencyKey, // merchant_order_id = our idempotency key
        billingData,
      );
      paymobOrderId = result.paymobOrderId;
      iframeUrl = result.iframeUrl;
    } catch (paymobError: any) {
      // Mark payment as failed if Paymob API call fails
      await Payment.findByIdAndUpdate(payment._id, { status: "failed" });
      res
        .status(502)
        .json({ message: "Payment gateway error. Please try again." });
      return;
    }

    // Update payment with Paymob order ID
    await Payment.findByIdAndUpdate(payment._id, { paymobOrderId });

    res.status(201).json({
      paymentId: payment._id,
      iframeUrl,
      amountEGP: amountCents / 100,
      plan,
      planDays,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Price quote for a subject/unit plan — lets the manual-payment flow
//        show "how much to transfer" before the student has actually paid
//        anything (Paymob learns the same number via create-intention).
// @route GET /api/payments/quote
// @access Student
// ---------------------------------------------------------------------------
export const getSubscriptionQuote = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Only students can request a quote" });
      return;
    }

    const { teacherId, subjectId, gradeId, unitId, subscriptionType, plan } =
      req.query as {
        teacherId?: string;
        subjectId?: string;
        gradeId?: string;
        unitId?: string;
        subscriptionType?: "subject" | "unit";
        plan?: SubscriptionPlanName;
      };

    if (!teacherId || !subjectId || !gradeId || !subscriptionType || !plan) {
      res.status(400).json({
        message:
          "Missing required fields: teacherId, subjectId, gradeId, subscriptionType, plan",
      });
      return;
    }
    if (!PLAN_CONFIG[plan]) {
      res.status(400).json({ message: "Invalid plan" });
      return;
    }
    if (subscriptionType === "unit" && !unitId) {
      res.status(400).json({ message: "unitId is required for unit subscriptions" });
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

    const { amountCents, planDays } = computeAmountCents(basePriceEGP, plan);
    res.json({ amountEGP: amountCents / 100, planDays });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student initiates a Paymob checkout for a single live-lesson request
// @route POST /api/payments/live-lesson/create-intention
// @access Student
// ---------------------------------------------------------------------------
export const initiateLiveLessonCheckout = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (req.user?.role !== "Student") {
      res.status(403).json({ message: "Only students can initiate payments" });
      return;
    }

    const { requestId } = req.body as { requestId: string };
    if (!requestId) {
      res.status(400).json({ message: "requestId is required" });
      return;
    }

    const request = await LiveLessonRequest.findById(requestId);
    if (!request) {
      res.status(404).json({ message: "Lesson request not found" });
      return;
    }

    if (String(request.studentId) !== String(req.user._id)) {
      res.status(403).json({ message: "This request does not belong to you" });
      return;
    }

    if (request.status !== "pending") {
      res
        .status(400)
        .json({ message: "This request is no longer awaiting payment" });
      return;
    }

    if (request.paymentStatus === "paid") {
      res.status(409).json({ message: "This request has already been paid" });
      return;
    }

    // Price is never re-derived from the client — it was already computed
    // server-side (duration × teacher rate × urgency) when the request was
    // created and stored on the request itself.
    const amountCents = Math.round(request.priceEGP * 100);

    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`live-lesson|${requestId}|${Math.floor(Date.now() / 300_000)}`)
      .digest("hex");

    const existingPayment = await Payment.findOne({ idempotencyKey });
    if (existingPayment?.status === "pending") {
      res.json({
        paymentId: existingPayment._id,
        paymobOrderId: existingPayment.paymobOrderId,
        retryRequired: true,
        message: "A pending payment already exists. Please complete it.",
      });
      return;
    }

    const billingData: Record<string, string> = {
      apartment: "NA",
      email: (req.user as any).email ?? "student@platform.com",
      floor: "NA",
      first_name: (req.user as any).name?.split(" ")[0] ?? "Student",
      street: "NA",
      building: "NA",
      phone_number: (req.user as any).phone ?? "+20000000000",
      shipping_method: "NA",
      postal_code: "NA",
      city: "Cairo",
      country: "EG",
      last_name:
        (req.user as any).name?.split(" ").slice(1).join(" ") || "User",
      state: "NA",
    };

    const payment = await Payment.create({
      studentId: req.user._id,
      teacherId: request.teacherId,
      subjectId: request.subjectId,
      gradeId: request.gradeId,
      subscriptionType: "liveLesson",
      liveLessonRequestId: request._id,
      amountCents,
      currency: "EGP",
      status: "pending",
      idempotencyKey,
      isTest: process.env.NODE_ENV !== "production",
    });

    let paymobOrderId: string;
    let iframeUrl: string;

    try {
      const result = await initiatePaymobCheckout(
        amountCents,
        "EGP",
        idempotencyKey,
        billingData,
      );
      paymobOrderId = result.paymobOrderId;
      iframeUrl = result.iframeUrl;
    } catch (paymobError: any) {
      await Payment.findByIdAndUpdate(payment._id, { status: "failed" });
      res
        .status(502)
        .json({ message: "Payment gateway error. Please try again." });
      return;
    }

    await Payment.findByIdAndUpdate(payment._id, { paymobOrderId });

    res.status(201).json({
      paymentId: payment._id,
      iframeUrl,
      amountEGP: amountCents / 100,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Paymob webhook — transaction processed callback
// @route POST /api/payments/webhook
// @access Public (Paymob server only) — HMAC verified
// ---------------------------------------------------------------------------
export const handleWebhook = async (req: any, res: Response) => {
  // Always return 200 immediately — Paymob retries on non-200
  res.status(200).json({ received: true });

  try {
    const hmac = String(req.query?.hmac ?? "");
    if (!hmac) return;

    const body = req.body as { type?: string; obj?: Record<string, unknown> };
    if (body.type !== "TRANSACTION" || !body.obj) return;

    const obj = body.obj;

    // Verify HMAC signature
    if (!verifyPaymobHmac(obj, hmac)) {
      console.error("[webhook] HMAC verification failed");
      return;
    }

    const paymobOrderId = String((obj.order as any)?.id ?? "");
    if (!paymobOrderId) return;

    // Find the pending payment by paymobOrderId
    const payment = await Payment.findOne({ paymobOrderId });
    if (!payment) {
      console.warn(
        `[webhook] No payment found for paymobOrderId=${paymobOrderId}`,
      );
      return;
    }

    // Idempotency: if we already processed this payment, skip
    if (payment.status !== "pending") {
      console.log(
        `[webhook] Payment ${payment._id} already processed (status=${payment.status}), skipping`,
      );
      return;
    }

    const transactionId = String(obj.id ?? "");
    const isSuccess = obj.success === true;
    const isVoided = obj.is_voided === true;
    const isRefunded = obj.is_refunded === true;
    const isPending = obj.pending === true;

    // Determine new payment status
    let newPaymentStatus: string;
    if (isSuccess && !isVoided && !isRefunded && !isPending) {
      newPaymentStatus = "success";
    } else if (isVoided) {
      newPaymentStatus = "voided";
    } else if (isRefunded) {
      newPaymentStatus = "refunded";
    } else {
      newPaymentStatus = "failed";
    }

    // Fraud protection: verify amount matches
    const webhookAmountCents = Number(obj.amount_cents ?? 0);
    if (isSuccess && webhookAmountCents !== payment.amountCents) {
      console.error(
        `[webhook] Amount mismatch: expected ${payment.amountCents}, got ${webhookAmountCents} for payment ${payment._id}`,
      );
      await Payment.findByIdAndUpdate(payment._id, {
        status: "failed",
        paymobTransactionId: transactionId,
        paymobIntegrationId: Number(obj.integration_id ?? 0),
        paymobResponse: obj,
      });
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Update Payment record
        await Payment.findByIdAndUpdate(
          payment._id,
          {
            status: newPaymentStatus,
            paymobTransactionId: transactionId,
            paymobIntegrationId: Number(obj.integration_id ?? 0),
            paymobResponse: obj,
          },
          { session },
        );

        // A live-lesson payment settles a single LiveLessonRequest, not a
        // recurring Subscription — this is what finally lets acceptRequest's
        // paymentStatus === "paid" gate actually pass.
        if (payment.subscriptionType === "liveLesson") {
          if (payment.liveLessonRequestId) {
            const requestPaymentStatus =
              newPaymentStatus === "success"
                ? "paid"
                : newPaymentStatus === "refunded"
                  ? "refunded"
                  : "failed";
            await LiveLessonRequest.findByIdAndUpdate(
              payment.liveLessonRequestId,
              {
                paymentStatus: requestPaymentStatus,
                paymentId: String(payment._id),
              },
              { session },
            );
          }
          return;
        }

        // Activate subscription on successful payment (subject/unit only —
        // liveLesson payments already returned above).
        if (newPaymentStatus === "success") {
          await activateSubjectOrUnitSubscription(session, payment);
        }
      });
    } finally {
      await session.endSession();
    }

    console.log(
      `[webhook] Processed payment ${payment._id} → status=${newPaymentStatus}`,
    );
  } catch (error: any) {
    console.error("[webhook] Error processing webhook:", error.message);
  }
};

// ---------------------------------------------------------------------------
// @desc  Paymob callback (browser redirect after payment)
// @route GET /api/payments/callback
// @access Public
// ---------------------------------------------------------------------------
export const handleCallback = async (req: any, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const params = new URLSearchParams();

  const success = req.query?.success;
  const transactionId = req.query?.id ?? req.query?.transaction_id;
  const paymobOrderId = String(req.query?.order ?? "");

  params.set("success", String(success));
  if (transactionId) params.set("transaction_id", String(transactionId));

  // Resolve paymentId from our Payment record
  if (paymobOrderId) {
    const payment = await Payment.findOne({ paymobOrderId }).select(
      "_id status",
    );
    if (payment) {
      params.set("payment_id", String(payment._id));
      params.set("status", payment.status);
    }
  }

  res.redirect(`${frontendUrl}/payment/result?${params.toString()}`);
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

    const payments = await Payment.find({ studentId: req.user?._id })
      .populate("teacherId", "name profileImage")
      .populate("subjectId", "name nameAr icon color")
      .populate("unitId", "title titleAr")
      .select("-paymobResponse -idempotencyKey")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Payment.countDocuments({ studentId: req.user?._id });

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
      "_id status amountCents currency plan planDays subscriptionId paymobOrderId paymobTransactionId createdAt",
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
// @desc  Admin analytics
// @route GET /api/payments/admin/analytics
// @access Admin
// ---------------------------------------------------------------------------
export const getAdminAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalRevenueCents,
      mrr,
      arr,
      successCount,
      failedCount,
      refundedCount,
      activeSubscriptions,
      expiringSoon,
      recentPayments,
    ] = await Promise.all([
      // Total all-time revenue
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amountCents" } } },
      ]).then((r) => r[0]?.total ?? 0),

      // MRR = revenue this calendar month
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amountCents" } } },
      ]).then((r) => r[0]?.total ?? 0),

      // ARR = revenue this calendar year
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: "$amountCents" } } },
      ]).then((r) => r[0]?.total ?? 0),

      Payment.countDocuments({ status: "success" }),
      Payment.countDocuments({ status: "failed" }),
      Payment.countDocuments({ status: "refunded" }),
      Subscription.countDocuments({
        status: { $in: ["active", "expiring_soon"] },
        expiresAt: { $gt: now },
      }),
      Subscription.countDocuments({
        status: "expiring_soon",
        expiresAt: {
          $gt: now,
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      }),

      // Last 20 successful payments
      Payment.find({ status: { $in: ["success", "failed", "refunded"] } })
        .populate("studentId", "name email")
        .populate("subjectId", "name nameAr icon")
        .select("-paymobResponse -idempotencyKey")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    res.json({
      totalRevenueCents,
      totalRevenueEGP: totalRevenueCents / 100,
      mrrCents: mrr,
      mrrEGP: mrr / 100,
      arrCents: arr,
      arrEGP: arr / 100,
      successCount,
      failedCount,
      refundedCount,
      activeSubscriptions,
      expiringSoon,
      recentPayments,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Admin refund a payment
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

    // Mark payment as refunded
    await Payment.findByIdAndUpdate(payment._id, {
      status: "refunded",
      refundedAt: new Date(),
      refundedBy: req.user?._id,
      refundReason: reason ?? "Admin refund",
    });

    // Revoke associated subscription
    if (payment.subscriptionId) {
      await Subscription.findByIdAndUpdate(payment.subscriptionId, {
        status: "revoked",
        revokedBy: req.user?._id,
        revokedAt: new Date(),
        revokedReason: "Payment refunded",
      });
    }

    res.json({ message: "Payment refunded and subscription revoked" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
