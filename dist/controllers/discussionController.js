"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.likeComment = exports.getComments = exports.addComment = void 0;
const Comment_1 = __importDefault(require("../models/Comment"));
const addComment = async (req, res) => {
    try {
        const { lessonId, text, parentId } = req.body;
        const comment = await Comment_1.default.create({
            lessonId,
            userId: req.user._id,
            text,
            parentId,
            likes: []
        });
        res.status(201).json(comment);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.addComment = addComment;
const getComments = async (req, res) => {
    try {
        const comments = await Comment_1.default.find({ lessonId: req.params.lessonId })
            .populate('userId', 'name role')
            .sort({ createdAt: -1 });
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getComments = getComments;
const likeComment = async (req, res) => {
    try {
        const comment = await Comment_1.default.findById(req.params.commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        const userId = req.user._id;
        if (comment.likes.includes(userId)) {
            comment.likes = comment.likes.filter((id) => String(id) !== String(userId));
        }
        else {
            comment.likes.push(userId);
        }
        await comment.save();
        res.json(comment);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.likeComment = likeComment;
