import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import { notFound, errorHandler } from "./middlewares/errorMiddleware";

const app: Application = express();

// CORS Configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.send("API is running...");
});

import userRoutes from "./routes/userRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import lessonRoutes from "./routes/lessonRoutes";
import quizRoutes from "./routes/quizRoutes";
import discussionRoutes from "./routes/discussionRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import paymobRoutes from "./routes/paymobRoutes";
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

// Use Routes here
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/discussions", discussionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payments", paymobRoutes);
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

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
