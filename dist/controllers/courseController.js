"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollCourse = exports.createCourse = exports.getCourseById = exports.getCourses = void 0;
const Course_1 = __importDefault(require("../models/Course"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const getCourses = async (req, res) => {
    try {
        const courses = await Course_1.default.find({}).populate('teacherId', 'name email');
        res.json(courses);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCourses = getCourses;
const getCourseById = async (req, res) => {
    try {
        const course = await Course_1.default.findById(req.params.id).populate('teacherId', 'name email');
        if (course) {
            res.json(course);
        }
        else {
            res.status(404).json({ message: 'Course not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCourseById = getCourseById;
const createCourse = async (req, res) => {
    try {
        const { title, description, price, thumbnail } = req.body;
        const course = new Course_1.default({
            title,
            description,
            price,
            thumbnail,
            teacherId: req.user._id,
        });
        const createdCourse = await course.save();
        res.status(201).json(createdCourse);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createCourse = createCourse;
const enrollCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const existing = await Enrollment_1.default.findOne({ studentId: req.user._id, courseId });
        if (existing) {
            res.status(400).json({ message: 'Already enrolled' });
            return;
        }
        const enrollment = new Enrollment_1.default({
            studentId: req.user._id,
            courseId,
        });
        await enrollment.save();
        res.status(201).json(enrollment);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.enrollCourse = enrollCourse;
