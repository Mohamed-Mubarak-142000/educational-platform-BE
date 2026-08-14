import cron from "node-cron";
import Payment from "../models/Payment";

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
  startPendingPaymentCleanupCron();
}
