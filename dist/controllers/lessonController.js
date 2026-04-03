"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProgress = exports.getLessons = exports.createLesson = exports.getSections = exports.createSection = void 0;
const Section_1 = __importDefault(require("../models/Section"));
const Lesson_1 = __importDefault(require("../models/Lesson"));
const Progress_1 = __importDefault(require("../models/Progress"));
const createSection = async (req, res) => {
    try {
        const { courseId, title, order } = req.body;
        const section = await Section_1.default.create({ courseId, title, order });
        res.status(201).json(section);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createSection = createSection;
const getSections = async (req, res) => {
    try {
        const sections = await Section_1.default.find({ courseId: req.params.courseId }).sort('order');
        res.json(sections);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSections = getSections;
const createLesson = async (req, res) => {
    try {
        const { sectionId, title, videoUrl, pdfUrl, order, duration } = req.body;
        const lesson = await Lesson_1.default.create({ sectionId, title, videoUrl, pdfUrl, order, duration });
        res.status(201).json(lesson);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createLesson = createLesson;
const getLessons = async (req, res) => {
    try {
        const lessons = await Lesson_1.default.find({ sectionId: req.params.sectionId }).sort('order');
        res.json(lessons);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getLessons = getLessons;
const updateProgress = async (req, res) => {
    try {
        const { lessonId, completed, watchedPercentage } = req.body;
        let progress = await Progress_1.default.findOne({ studentId: req.user._id, lessonId });
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
