import mongoose from "mongoose";
import { IPayment } from "../models/Payment";
import TeacherEarning from "../models/TeacherEarning";
import { getOrCreateConfig } from "../controllers/platformConfigController";

// Shared by every path that produces a "success" Payment (currently just the
// manual-payment approval flow) — this is the one place that turns that into
// a TeacherEarning record (mirrors utils/subscriptionActivation.ts's role for
// Subscriptions).
//
// Subject/unit subscriptions take a flat platform fee (subscriptionFlatFeeCents)
// — live-lesson bookings keep the percentage-based commission (commissionRateBps).
export async function createTeacherEarning(
  session: mongoose.ClientSession,
  payment: IPayment,
): Promise<void> {
  const config = await getOrCreateConfig();
  const isSubscription =
    payment.subscriptionType === "subject" || payment.subscriptionType === "unit";

  const platformFeeCents = isSubscription
    // Never take more than the student actually paid — guards against a
    // unit/subject priced below the flat fee producing a negative net.
    ? Math.min(config.settings.subscriptionFlatFeeCents ?? 5000, payment.amountCents)
    : Math.round((payment.amountCents * (config.settings.commissionRateBps ?? 3000)) / 10000);
  const netEarningCents = payment.amountCents - platformFeeCents;
  // The effective rate for this specific earning — kept for reporting
  // continuity even when the fee was actually a flat amount.
  const effectiveRateBps =
    payment.amountCents > 0 ? Math.round((platformFeeCents / payment.amountCents) * 10000) : 0;

  await TeacherEarning.create(
    [
      {
        paymentId: payment._id,
        teacherId: payment.teacherId,
        studentId: payment.studentId,
        subjectId: payment.subjectId,
        subscriptionType: payment.subscriptionType,
        grossAmountCents: payment.amountCents,
        commissionRateBps: effectiveRateBps,
        platformFeeCents,
        netEarningCents,
        status: "available",
      },
    ],
    { session },
  );
}

// Only reverses the earning if it's still "available" — if it's already been
// paid out, the money has already left the platform's hands, so that case
// needs manual admin reconciliation rather than a silent auto-reversal.
export async function clawBackTeacherEarning(
  session: mongoose.ClientSession | undefined,
  paymentId: mongoose.Types.ObjectId,
  reason: string,
): Promise<void> {
  await TeacherEarning.findOneAndUpdate(
    { paymentId, status: "available" },
    { status: "clawed_back", clawedBackAt: new Date(), clawedBackReason: reason },
    { session },
  );
}
