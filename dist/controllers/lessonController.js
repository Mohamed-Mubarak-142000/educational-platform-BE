"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLessonPart = exports.createLessonPart = exports.getPartsByLesson = exports.addLessonComment = exports.getCommentsByLesson = exports.updateProgress = exports.deleteLesson = exports.updateLesson = exports.getLessons = void 0;
const Lesson_1 = __importDefault(require("../models/Lesson"));
const LessonPart_1 = __importDefault(require("../models/LessonPart"));
const Progress_1 = __importDefault(require("../models/Progress"));
const Comment_1 = __importDefault(require("../models/Comment"));
const subscriptionAccess_1 = require("../utils/subscriptionAccess");
const assertUnitLessonOwnership = (req, res, lesson) => {
    if (req.user?.role === "Admin")
        return true;
    const lessonTeacherId = lesson.teacherId?.toString();
    if (lessonTeacherId && lessonTeacherId === String(req.user._id))
        return true;
    res.status(403).json({ message: "Not authorized to modify this content" });
    return false;
};
// GET /lessons/:id
const getLessons = async (req, res) => {
    try {
        const lesson = await Lesson_1.default.findById(req.params.id).catch(() => null);
        if (!lesson) {
            res.status(404).json({ message: "Lesson not found" });
            return;
        }
        const reqUser = req.user;
        if (reqUser?.role === "Student") {
            const access = await (0, subscriptionAccess_1.canAccessLesson)({
                studentId: String(reqUser._id),
                lessonId: String(lesson._id),
            });
            if (!access.allowed) {
                res.status(403).json({ message: "Lesson locked" });
                return;
            }
        }
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getLessons = getLessons;
const updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson_1.default.findById(req.params.id);
        if (!lesson) {
            res.status(404).json({ message: "Lesson not found" });
            return;
        }
        if (!assertUnitLessonOwnership(req, res, lesson))
            return;
        const fields = [
            "title",
            "titleAr",
            "description",
            "descriptionAr",
            "videoUrl",
            "pdfUrl",
            "imageUrl",
            "modelUrl",
            "modelExplanation",
            "modelExplanationAr",
            "audioUrl",
            "order",
            "duration",
            "isPublished",
            "isFree",
        ];
        fields.forEach((f) => {
            if (req.body[f] !== undefined)
                lesson[f] = req.body[f];
        });
        const updated = await lesson.save();
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateLesson = updateLesson;
const deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson_1.default.findById(req.params.id);
        if (!lesson) {
            res.status(404).json({ message: "Lesson not found" });
            return;
        }
        if (!assertUnitLessonOwnership(req, res, lesson))
            return;
        await LessonPart_1.default.deleteMany({ lessonId: lesson._id });
        await lesson.deleteOne();
        res.json({ message: "Lesson deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteLesson = deleteLesson;
const updateProgress = async (req, res) => {
    try {
        const { lessonId, completed, watchedPercentage } = req.body;
        let progress = await Progress_1.default.findOne({
            studentId: req.user._id,
            lessonId,
        });
        if (progress) {
            progress.completed = completed;
            progress.watchedPercentage = watchedPercentage;
            await progress.save();
        }
        else {
            progress = await Progress_1.default.create({
                studentId: req.user._id,
                lessonId,
                completed,
                watchedPercentage,
            });
        }
        res.json(progress);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateProgress = updateProgress;
const getCommentsByLesson = async (req, res) => {
    try {
        const comments = await Comment_1.default.find({ lessonId: req.params.lessonId })
            .populate("userId", "name role")
            .sort({ createdAt: 1 });
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCommentsByLesson = getCommentsByLesson;
const addLessonComment = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { text } = req.body;
        const comment = await Comment_1.default.create({
            lessonId,
            userId: req.user._id,
            text,
            likes: [],
        });
        const populated = await comment.populate("userId", "name role");
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.addLessonComment = addLessonComment;
const getPartsByLesson = async (req, res) => {
    try {
        const parts = await LessonPart_1.default.find({ lessonId: req.params.lessonId }).sort({ order: 1 });
        res.json(parts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPartsByLesson = getPartsByLesson;
const createLessonPart = async (req, res) => {
    try {
        const lessonId = req.params.lessonId;
        const lesson = await Lesson_1.default.findById(lessonId);
        if (!lesson) {
            res.status(404).json({ message: "Lesson not found" });
            return;
        }
        if (!assertUnitLessonOwnership(req, res, lesson))
            return;
        const { title, content, media, quiz, order } = req.body;
        const count = await LessonPart_1.default.countDocuments({ lessonId });
        const part = await LessonPart_1.default.create({
            lessonId,
            title,
            content,
            media,
            quiz,
            order: order !== undefined ? order : count + 1,
        });
        res.status(201).json(part);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createLessonPart = createLessonPart;
const deleteLessonPart = async (req, res) => {
    try {
        const part = await LessonPart_1.default.findById(req.params.id);
        if (!part) {
            res.status(404).json({ message: "Lesson part not found" });
            return;
        }
        const lesson = await Lesson_1.default.findById(part.lessonId);
        if (lesson && !assertUnitLessonOwnership(req, res, lesson))
            return;
        await part.deleteOne();
        res.json({ message: "Lesson part deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteLessonPart = deleteLessonPart;
