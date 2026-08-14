import { Request, Response } from "express";
import mongoose from "mongoose";
import TeacherEarning from "../models/TeacherEarning";
import TeacherPayout from "../models/TeacherPayout";
import User from "../models/User";

function escapeRegex(value: string): string {
  return value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// @desc  Platform-wide commission/payout overview
// @route GET /api/teacher-payouts/overview
// @access Private/Admin
// ---------------------------------------------------------------------------
export const getPayoutsOverview = async (_req: Request, res: Response) => {
  try {
    const [totals] = await TeacherEarning.aggregate([
      {
        $group: {
          _id: null,
          totalPlatformFeeCents: { $sum: "$platformFeeCents" },
          totalOwedCents: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, "$netEarningCents", 0] },
          },
          totalPaidOutCents: {
            $sum: { $cond: [{ $eq: ["$status", "paid_out"] }, "$netEarningCents", 0] },
          },
        },
      },
    ]);

    const teachersWithBalance = await TeacherEarning.distinct("teacherId", {
      status: "available",
    });

    res.json({
      totalPlatformFeeCents: totals?.totalPlatformFeeCents ?? 0,
      totalOwedCents: totals?.totalOwedCents ?? 0,
      totalPaidOutCents: totals?.totalPaidOutCents ?? 0,
      teachersWithBalanceCount: teachersWithBalance.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Per-teacher balance rows
// @route GET /api/teacher-payouts/balances
// @access Private/Admin
// ---------------------------------------------------------------------------
export const getTeacherBalances = async (req: Request, res: Response) => {
  try {
    const { search, sortBy = "availableCents", sortOrder = "desc" } = req.query as {
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const rows = await TeacherEarning.aggregate([
      {
        $group: {
          _id: "$teacherId",
          totalEarnedCents: { $sum: "$netEarningCents" },
          availableCents: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, "$netEarningCents", 0] },
          },
          totalPaidOutCents: {
            $sum: { $cond: [{ $eq: ["$status", "paid_out"] }, "$netEarningCents", 0] },
          },
        },
      },
    ]);

    const teacherIds = rows.map((r) => r._id);
    const teachers = await User.find({ _id: { $in: teacherIds } })
      .select("name email")
      .lean();
    const teacherMap = new Map(teachers.map((t) => [String(t._id), t]));

    const lastPayouts = await TeacherPayout.aggregate([
      { $match: { teacherId: { $in: teacherIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$teacherId", lastPayoutAt: { $first: "$createdAt" } } },
    ]);
    const lastPayoutMap = new Map(lastPayouts.map((p) => [String(p._id), p.lastPayoutAt]));

    let result = rows.map((r) => {
      const teacher = teacherMap.get(String(r._id));
      return {
        teacherId: String(r._id),
        name: teacher?.name ?? "—",
        email: teacher?.email ?? "",
        totalEarnedCents: r.totalEarnedCents,
        availableCents: r.availableCents,
        totalPaidOutCents: r.totalPaidOutCents,
        lastPayoutAt: lastPayoutMap.get(String(r._id)) ?? null,
      };
    });

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      result = result.filter((r) => regex.test(r.name) || regex.test(r.email));
    }

    const sortDir = sortOrder === "asc" ? 1 : -1;
    result.sort((a: any, b: any) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * sortDir;
      return String(aVal ?? "").localeCompare(String(bVal ?? "")) * sortDir;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Payout history across all teachers
// @route GET /api/teacher-payouts
// @access Private/Admin
// ---------------------------------------------------------------------------
export const getPayoutHistory = async (req: Request, res: Response) => {
  try {
    const { search, method, sortBy = "createdAt", sortOrder = "desc" } = req.query as {
      search?: string;
      method?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const filter: Record<string, unknown> = {};
    if (method) {
      const methods = method.split(",").filter(Boolean);
      if (methods.length > 0) filter.method = { $in: methods };
    }

    const sortDir = sortOrder === "asc" ? 1 : -1;
    let payouts: any[] = await TeacherPayout.find(filter)
      .populate("teacherId", "name")
      .populate("createdBy", "name")
      .sort({ [sortBy]: sortDir })
      .lean();

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      payouts = payouts.filter((p) => {
        const teacher = p.teacherId as any;
        const name = teacher && typeof teacher === "object" ? teacher.name : undefined;
        return regex.test(name ?? "");
      });
    }

    res.json(payouts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Create a payout — always settles the teacher's ENTIRE current
//        available balance (computed server-side, never client-supplied) so
//        there's no partial-amount bookkeeping to get wrong.
// @route POST /api/teacher-payouts
// @access Private/Admin
// ---------------------------------------------------------------------------
export const createPayout = async (req: any, res: Response) => {
  try {
    const { teacherId, method, reference } = req.body as {
      teacherId?: string;
      method?: string;
      reference?: string;
    };
    if (!teacherId || !method) {
      res.status(400).json({ message: "teacherId and method are required" });
      return;
    }

    const session = await mongoose.startSession();
    let createdPayout: any = null;
    try {
      await session.withTransaction(async () => {
        const availableEarnings = await TeacherEarning.find({
          teacherId,
          status: "available",
        }).session(session);

        const amountCents = availableEarnings.reduce((sum, e) => sum + e.netEarningCents, 0);
        if (availableEarnings.length === 0 || amountCents <= 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const [payout] = await TeacherPayout.create(
          [
            {
              teacherId,
              amountCents,
              method,
              reference,
              earningsCount: availableEarnings.length,
              createdBy: req.user._id,
            },
          ],
          { session },
        );

        await TeacherEarning.updateMany(
          { _id: { $in: availableEarnings.map((e) => e._id) } },
          { status: "paid_out", payoutId: payout._id },
          { session },
        );

        createdPayout = payout;
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json(createdPayout);
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      res.status(400).json({ message: "This teacher has no available balance to pay out" });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};
