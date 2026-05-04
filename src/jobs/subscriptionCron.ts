import cron from "node-cron";
import Subscription from "../models/Subscription";
import Payment from "../models/Payment";

/**
 * Daily at 01:00 UTC — mark subscriptions as expiring_soon or expired.
 */
export function startSubscriptionExpiryCron(): void {
  cron.schedule("0 1 * * *", async () => {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      // Mark active subscriptions that expire within 7 days as expiring_soon
      const expiringSoonResult = await Subscription.updateMany(
        {
          status: "active",
          expiresAt: { $gt: now, $lte: sevenDaysFromNow },
        },
        { $set: { status: "expiring_soon" } },
      );

      // Mark subscriptions that have already expired
      const expiredResult = await Subscription.updateMany(
        {
          status: { $in: ["active", "expiring_soon"] },
          expiresAt: { $lte: now },
        },
        { $set: { status: "expired" } },
      );

      console.log(
        `[cron:subscriptionExpiry] expiring_soon=${expiringSoonResult.modifiedCount}, expired=${expiredResult.modifiedCount}`,
      );
    } catch (error: any) {
      console.error("[cron:subscriptionExpiry] Error:", error.message);
    }
  });

  console.log("[cron] Subscription expiry cron scheduled (daily at 01:00 UTC)");
}

/**
 * Every 15 minutes — mark pending payments older than 2 hours as expired.
 */
export function startPendingPaymentCleanupCron(): void {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const result = await Payment.updateMany(
        {
          status: "pending",
          createdAt: { $lte: twoHoursAgo },
        },
        { $set: { status: "expired" } },
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[cron:pendingPaymentCleanup] Expired ${result.modifiedCount} stale pending payments`,
        );
      }
    } catch (error: any) {
      console.error("[cron:pendingPaymentCleanup] Error:", error.message);
    }
  });

  console.log(
    "[cron] Pending payment cleanup cron scheduled (every 15 minutes)",
  );
}

export function startAllCronJobs(): void {
  startSubscriptionExpiryCron();
  startPendingPaymentCleanupCron();
}
