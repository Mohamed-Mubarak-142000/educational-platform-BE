import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import AuditLog from "../models/AuditLog";

// ---------------------------------------------------------------------------
// @desc  List admin audit log entries (filterable by actor/date/path)
// @route GET /api/audit-logs
// @access Admin
// ---------------------------------------------------------------------------
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query?.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit ?? 50)));
    const skip = (page - 1) * limit;
    const { actorId, path, from, to } = req.query as {
      actorId?: string;
      path?: string;
      from?: string;
      to?: string;
    };

    const filter: Record<string, unknown> = {};
    if (actorId) filter.actorId = actorId;
    if (path) filter.path = new RegExp(path.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.$gte = new Date(from);
      if (to) createdAt.$lte = new Date(to);
      filter.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
