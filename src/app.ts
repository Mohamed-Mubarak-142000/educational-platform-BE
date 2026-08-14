import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { notFound, errorHandler } from "./middlewares/errorMiddleware";
import { generalApiLimiter } from "./middlewares/rateLimitMiddleware";
import { auditLogger } from "./middlewares/auditLogMiddleware";

const app: Application = express();

// Baseline security headers (HSTS, X-Content-Type-Options, X-Frame-Options,
// etc). CSP is disabled — this is a pure JSON API, not an HTML-serving app,
// so a default-src policy has nothing to protect and only risks blocking
// legitimate cross-origin media (Cloudinary) referenced by the frontend.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS Configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use("/api", generalApiLimiter);
app.use(auditLogger);

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.send("API is running...");
});

import userRoutes from "./routes/userRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import lessonRoutes from "./routes/lessonRoutes";
import quizRoutes from "./routes/quizRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import manualPaymentRoutes from "./routes/manualPaymentRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import stageRoutes from "./routes/stageRoutes";
import subjectRoutes from "./routes/subjectRoutes";
import unitRoutes from "./routes/unitRoutes";
import teacherApplicationRoutes from "./routes/teacherApplicationRoutes";
import teacherScheduleRoutes from "./routes/teacherScheduleRoutes";
import liveLessonRoutes from "./routes/liveLessonRoutes";
import liveClassroomRoutes from "./routes/liveClassroomRoutes";
// New routes
import gradeRoutes from "./routes/gradeRoutes";
import teacherAssignmentRoutes from "./routes/teacherAssignmentRoutes";
import progressRoutes from "./routes/progressRoutes";
import platformConfigRoutes from "./routes/platformConfigRoutes";
import teacherEarningRoutes from "./routes/teacherEarningRoutes";
import teacherPayoutRoutes from "./routes/teacherPayoutRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";
import examRoutes from "./routes/examRoutes";

// Use Routes here
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/manual-payments", manualPaymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/stages", stageRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/teacher-applications", teacherApplicationRoutes);
app.use("/api/teacher-schedules", teacherScheduleRoutes);
app.use("/api/live-lessons", liveLessonRoutes);
app.use("/api/live-classroom", liveClassroomRoutes);
// New routes (generic multi-subject platform)
app.use("/api/grades", gradeRoutes);
app.use("/api/teacher-assignments", teacherAssignmentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/platform-config", platformConfigRoutes);
app.use("/api/teacher-earnings", teacherEarningRoutes);
app.use("/api/teacher-payouts", teacherPayoutRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/exams", examRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
