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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Basic route
app.get('/', (req, res) => {
    res.send('API is running...');
});
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const courseRoutes_1 = __importDefault(require("./routes/courseRoutes"));
const lessonRoutes_1 = __importDefault(require("./routes/lessonRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const discussionRoutes_1 = __importDefault(require("./routes/discussionRoutes"));
// Use Routes here
app.use('/api/users', userRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/courses', courseRoutes_1.default);
app.use('/api/lessons', lessonRoutes_1.default);
app.use('/api/quizzes', quizRoutes_1.default);
app.use('/api/discussions', discussionRoutes_1.default);
// Error Handling
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
