import { Response } from "express";
import Subscription from "../models/Subscription";

// ---------------------------------------------------------------------------
// @desc  Student gets active subscriptions
// @route GET /api/subscriptions/mine
// @access Student
// ---------------------------------------------------------------------------
export const getMySubscriptions = async (req: any, res: Response) => {
  try {
    const filters: Record<string, unknown> = {
      studentId: req.user._id,
      status: "active",
    };
    if (req.query.subjectId) filters.subjectId = req.query.subjectId;
    if (req.query.teacherId) filters.teacherId = req.query.teacherId;
    if (req.query.gradeId) filters.gradeId = req.query.gradeId;

    const subs = await Subscription.find(filters)
      .populate("teacherId", "name profileImage")
      .populate("subjectId", "name nameAr icon color")
      .populate("gradeId", "name nameAr")
      .populate("unitId", "title")
      .sort({ createdAt: -1 });

    res.json(subs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
