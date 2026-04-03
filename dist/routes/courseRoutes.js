"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const courseController_1 = require("../controllers/courseController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/').get(courseController_1.getCourses).post(authMiddleware_1.protect, authMiddleware_1.teacher, courseController_1.createCourse);
router.route('/enroll').post(authMiddleware_1.protect, courseController_1.enrollCourse);
router.route('/:id').get(courseController_1.getCourseById);
exports.default = router;
