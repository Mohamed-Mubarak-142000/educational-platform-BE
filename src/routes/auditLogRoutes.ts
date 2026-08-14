import express from "express";
import { protect, admin } from "../middlewares/authMiddleware";
import { getAuditLogs } from "../controllers/auditLogController";

const router = express.Router();

router.get("/", protect, admin, getAuditLogs);

export default router;
