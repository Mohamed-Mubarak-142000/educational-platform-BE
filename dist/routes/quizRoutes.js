"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const quizController_1 = require("../controllers/quizController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/').post(authMiddleware_1.protect, authMiddleware_1.teacher, quizController_1.createQuiz);
router.route('/questions').post(authMiddleware_1.protect, authMiddleware_1.teacher, quizController_1.addQuestion);
router.route('/submit').post(authMiddleware_1.protect, quizController_1.submitQuiz);
router.route('/:quizId').get(authMiddleware_1.protect, quizController_1.getQuizDetails);
exports.default = router;
