"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitQuiz = exports.getQuizDetails = exports.addQuestion = exports.createQuiz = void 0;
const Quiz_1 = __importDefault(require("../models/Quiz"));
const Question_1 = __importDefault(require("../models/Question"));
const Answer_1 = __importDefault(require("../models/Answer"));
const Result_1 = __importDefault(require("../models/Result"));
const createQuiz = async (req, res) => {
    try {
        const { lessonId, title, timeLimit } = req.body;
        const quiz = await Quiz_1.default.create({ lessonId, title, timeLimit });
        res.status(201).json(quiz);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createQuiz = createQuiz;
const addQuestion = async (req, res) => {
    try {
        const { quizId, question, type, answers } = req.body;
        const newQuestion = await Question_1.default.create({ quizId, question, type });
        if (answers && answers.length > 0) {
            const answersToInsert = answers.map((a) => ({
                questionId: newQuestion._id,
                answerText: a.answerText,
                isCorrect: a.isCorrect
            }));
            await Answer_1.default.insertMany(answersToInsert);
        }
        res.status(201).json(newQuestion);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.addQuestion = addQuestion;
const getQuizDetails = async (req, res) => {
    try {
        const quiz = await Quiz_1.default.findById(req.params.quizId);
        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }
        const questions = await Question_1.default.find({ quizId: quiz._id });
        const questionIds = questions.map(q => q._id);
        const answers = await Answer_1.default.find({ questionId: { $in: questionIds } });
        res.json({ quiz, questions, answers });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getQuizDetails = getQuizDetails;
const submitQuiz = async (req, res) => {
    try {
        const { quizId, score } = req.body;
        const result = await Result_1.default.create({
            studentId: req.user._id,
            quizId,
            score
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.submitQuiz = submitQuiz;
