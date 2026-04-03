"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const lessonController_1 = require("../controllers/lessonController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/sections').post(authMiddleware_1.protect, authMiddleware_1.teacher, lessonController_1.createSection);
router.route('/sections/:courseId').get(lessonController_1.getSections);
router.route('/').post(authMiddleware_1.protect, authMiddleware_1.teacher, lessonController_1.createLesson);
router.route('/:sectionId').get(lessonController_1.getLessons);
router.route('/progress').post(authMiddleware_1.protect, lessonController_1.updateProgress);
exports.default = router;
