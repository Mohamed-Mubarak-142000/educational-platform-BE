import { Request, Response, NextFunction } from "express";
import AuditLog from "../models/AuditLog";
import { AuthRequest } from "./authMiddleware";

// Registered globally, early in the chain (before `protect` runs per-route).
// `req.user` isn't set yet at that point, but `res.on('finish')` only fires
// after the whole request/response cycle completes — by then `protect` has
// already populated `req.user` on this same request object, so we read it
// there instead of trying to run after every route's own auth middleware.
export function auditLogger(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== "Admin") return;
    if (req.method === "GET") return;

    AuditLog.create({
      actorId: authReq.user._id,
      actorName: authReq.user.name,
      actorRole: authReq.user.role,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
    }).catch((error: any) => {
      console.error("[auditLog] failed to record entry:", error.message);
    });
  });
  next();
}
