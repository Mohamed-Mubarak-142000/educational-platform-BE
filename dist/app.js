"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const errorMiddleware_1 = require("./middlewares/errorMiddleware");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
// Basic route
app.get("/", (req, res) => {
    res.send("API is running...");
});
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const lessonRoutes_1 = __importDefault(require("./routes/lessonRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const discussionRoutes_1 = __importDefault(require("./routes/discussionRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const paymobRoutes_1 = __importDefault(require("./routes/paymobRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const stageRoutes_1 = __importDefault(require("./routes/stageRoutes"));
const subjectRoutes_1 = __importDefault(require("./routes/subjectRoutes"));
const unitRoutes_1 = __importDefault(require("./routes/unitRoutes"));
const teacherApplicationRoutes_1 = __importDefault(require("./routes/teacherApplicationRoutes"));
const teacherScheduleRoutes_1 = __importDefault(require("./routes/teacherScheduleRoutes"));
const liveLessonRoutes_1 = __importDefault(require("./routes/liveLessonRoutes"));
const liveClassroomRoutes_1 = __importDefault(require("./routes/liveClassroomRoutes"));
// New routes
const gradeRoutes_1 = __importDefault(require("./routes/gradeRoutes"));
const teacherAssignmentRoutes_1 = __importDefault(require("./routes/teacherAssignmentRoutes"));
const progressRoutes_1 = __importDefault(require("./routes/progressRoutes"));
const platformConfigRoutes_1 = __importDefault(require("./routes/platformConfigRoutes"));
// Use Routes here
app.use("/api/users", userRoutes_1.default);
app.use("/api/upload", uploadRoutes_1.default);
app.use("/api/lessons", lessonRoutes_1.default);
app.use("/api/quizzes", quizRoutes_1.default);
app.use("/api/discussions", discussionRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/payments", paymobRoutes_1.default);
app.use("/api/subscriptions", subscriptionRoutes_1.default);
app.use("/api/stages", stageRoutes_1.default);
app.use("/api/subjects", subjectRoutes_1.default);
app.use("/api/units", unitRoutes_1.default);
app.use("/api/teacher-applications", teacherApplicationRoutes_1.default);
app.use("/api/teacher-schedules", teacherScheduleRoutes_1.default);
app.use("/api/live-lessons", liveLessonRoutes_1.default);
app.use("/api/live-classroom", liveClassroomRoutes_1.default);
// New routes (generic multi-subject platform)
app.use("/api/grades", gradeRoutes_1.default);
app.use("/api/teacher-assignments", teacherAssignmentRoutes_1.default);
app.use("/api/progress", progressRoutes_1.default);
app.use("/api/platform-config", platformConfigRoutes_1.default);
// Error Handling
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
