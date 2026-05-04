"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const lessonController_1 = require("../controllers/lessonController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rbacMiddleware_1 = require("../middlewares/rbacMiddleware");
const Lesson_1 = __importDefault(require("../models/Lesson"));
const router = express_1.default.Router();
// Progress
router.route("/progress").post(authMiddleware_1.protect, lessonController_1.updateProgress);
// Lesson parts (delete by part id — must come before /:id)
router.route("/parts/:id").delete(authMiddleware_1.protect, rbacMiddleware_1.teacherOnly, lessonController_1.deleteLessonPart);
// Single lesson — Teachers can only edit their own lessons
router
    .route("/:id")
    .get(authMiddleware_1.protect, lessonController_1.getLessons)
    .put(authMiddleware_1.protect, rbacMiddleware_1.teacherOnly, rbacMiddleware_1.validateLessonAccess, (0, rbacMiddleware_1.checkOwnership)(Lesson_1.default), lessonController_1.updateLesson)
    .delete(authMiddleware_1.protect, rbacMiddleware_1.teacherOnly, rbacMiddleware_1.validateLessonAccess, (0, rbacMiddleware_1.checkOwnership)(Lesson_1.default), lessonController_1.deleteLesson);
// Lesson comments
router
    .route("/:lessonId/comments")
    .get(lessonController_1.getCommentsByLesson)
    .post(authMiddleware_1.protect, lessonController_1.addLessonComment);
// Lesson parts
router
    .route("/:lessonId/parts")
    .get(lessonController_1.getPartsByLesson)
    .post(authMiddleware_1.protect, rbacMiddleware_1.teacherOnly, lessonController_1.createLessonPart);
exports.default = router;
