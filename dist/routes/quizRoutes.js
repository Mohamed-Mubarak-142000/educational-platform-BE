"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const unitController_1 = require("../controllers/unitController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Unit quiz CRUD
router.route('/attached/:attachedToId').get(authMiddleware_1.protect, unitController_1.getQuizByAttached);
router.route('/unit').post(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.createUnitQuiz);
router.route('/unit/:id').put(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.updateUnitQuiz).delete(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.deleteUnitQuiz);
// Quiz grade submission and retrieval
router.route('/grades').post(authMiddleware_1.protect, unitController_1.submitQuizGrade);
router.route('/grades/student/:studentId').get(authMiddleware_1.protect, unitController_1.getGradesByStudent);
router.route('/grades/quiz/:quizId').get(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.getGradesByQuiz);
// MCQ questions
router.route('/questions').post(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.createMCQQuestion);
router.route('/questions/:id').put(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.updateMCQQuestion).delete(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.deleteMCQQuestion);
// Questions by quiz
router.route('/:quizId/questions').get(authMiddleware_1.protect, unitController_1.getQuestionsByQuiz).post(authMiddleware_1.protect, authMiddleware_1.teacher, unitController_1.createMCQQuestion);
exports.default = router;
