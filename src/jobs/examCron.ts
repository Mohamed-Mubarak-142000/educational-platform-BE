import cron from "node-cron";
import Exam from "../models/Exam";

/**
 * Every minute — refresh the cached `Exam.status` field used for cheap list
 * rendering (dashboards). NOT used for access gating — `getExam`/`submitExam`
 * always recompute the real window from `scheduledStart`/`durationMinutes`
 * against the live server clock, independent of this cached value.
 */
export function startExamStatusCron(): void {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const toActive = await Exam.updateMany(
        { status: "scheduled", scheduledStart: { $lte: now } },
        { $set: { status: "active" } },
      );

      // An exam is "closed" once its window has passed — computed per-doc
      // since the end time depends on each exam's own duration.
      const candidates = await Exam.find({
        status: "active",
        scheduledStart: { $lte: now },
      }).select("_id scheduledStart durationMinutes");

      const closedIds = candidates
        .filter((e) => now.getTime() > e.scheduledStart.getTime() + e.durationMinutes * 60_000)
        .map((e) => e._id);

      if (closedIds.length > 0) {
        await Exam.updateMany({ _id: { $in: closedIds } }, { $set: { status: "closed" } });
      }

      if (toActive.modifiedCount > 0 || closedIds.length > 0) {
        console.log(
          `[cron:examStatus] activated=${toActive.modifiedCount}, closed=${closedIds.length}`,
        );
      }
    } catch (error: any) {
      console.error("[cron:examStatus] Error:", error.message);
    }
  });

  console.log("[cron] Exam status cron scheduled (every minute)");
}
