import { Request, Response } from "express";
import mongoose from "mongoose";
import TeacherEarning from "../models/TeacherEarning";
import TeacherPayout from "../models/TeacherPayout";

// ---------------------------------------------------------------------------
// @desc  Logged-in teacher's earnings summary
// @route GET /api/teacher-earnings/mine/summary
// @access Private/Teacher
// ---------------------------------------------------------------------------
export const getMyEarningsSummary = async (req: any, res: Response) => {
  try {
    const teacherId = new mongoose.Types.ObjectId(req.user._id);
    const [totals] = await TeacherEarning.aggregate([
      { $match: { teacherId } },
      {
        $group: {
          _id: null,
          totalGrossCents: { $sum: "$grossAmountCents" },
          totalPlatformFeeCents: { $sum: "$platformFeeCents" },
          totalNetCents: { $sum: "$netEarningCents" },
          availableCents: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, "$netEarningCents", 0] },
          },
          paidOutCents: {
            $sum: { $cond: [{ $eq: ["$status", "paid_out"] }, "$netEarningCents", 0] },
          },
        },
      },
    ]);

    res.json({
      totalGrossCents: totals?.totalGrossCents ?? 0,
      totalPlatformFeeCents: totals?.totalPlatformFeeCents ?? 0,
      totalNetCents: totals?.totalNetCents ?? 0,
      availableCents: totals?.availableCents ?? 0,
      paidOutCents: totals?.paidOutCents ?? 0,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Logged-in teacher's earnings list
// @route GET /api/teacher-earnings/mine
// @access Private/Teacher
// ---------------------------------------------------------------------------
export const getMyEarnings = async (req: any, res: Response) => {
  try {
    const { status, sortBy = "createdAt", sortOrder = "desc" } = req.query as {
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    };
    const filter: Record<string, unknown> = { teacherId: req.user._id };
    if (status) filter.status = status;
    const sortDir = sortOrder === "asc" ? 1 : -1;

    const earnings = await TeacherEarning.find(filter)
      .populate("studentId", "name")
      .populate("subjectId", "name nameAr icon")
      .sort({ [sortBy]: sortDir })
      .limit(200)
      .lean();

    res.json(earnings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Logged-in teacher's payout history
// @route GET /api/teacher-earnings/mine/payouts
// @access Private/Teacher
// ---------------------------------------------------------------------------
export const getMyPayouts = async (req: any, res: Response) => {
  try {
    const payouts = await TeacherPayout.find({ teacherId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(payouts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
