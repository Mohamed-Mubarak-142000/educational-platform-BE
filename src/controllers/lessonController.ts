import { Request, Response } from "express";
import Lesson from "../models/Lesson";
import LessonPart from "../models/LessonPart";
import Progress from "../models/Progress";
import Comment from "../models/Comment";
import { canAccessLesson } from "../utils/subscriptionAccess";

const assertUnitLessonOwnership = (
  req: any,
  res: Response,
  lesson: any,
): boolean => {
  if (req.user?.role === "Admin") return true;
  const lessonTeacherId = lesson.teacherId?.toString();
  if (lessonTeacherId && lessonTeacherId === String(req.user._id)) return true;
  res.status(403).json({ message: "Not authorized to modify this content" });
  return false;
};

// GET /lessons/:id
export const getLessons = async (req: Request, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id).catch(() => null);
    if (!lesson) {
      res.status(404).json({ message: "Lesson not found" });
      return;
    }
    const reqUser = (req as any).user;
    if (reqUser?.role === "Student") {
      const access = await canAccessLesson({
        studentId: String(reqUser._id),
        lessonId: String(lesson._id),
      });
      if (!access.allowed) {
        res.status(403).json({ message: "Lesson locked" });
        return;
      }
    }
    res.json(lesson);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      res.status(404).json({ message: "Lesson not found" });
      return;
    }
    if (!assertUnitLessonOwnership(req as any, res, lesson)) return;
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
    ] as const;
    fields.forEach((f) => {
      if (req.body[f] !== undefined) (lesson as any)[f] = req.body[f];
    });
    const updated = await lesson.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      res.status(404).json({ message: "Lesson not found" });
      return;
    }
    if (!assertUnitLessonOwnership(req as any, res, lesson)) return;
    await LessonPart.deleteMany({ lessonId: lesson._id });
    await lesson.deleteOne();
    res.json({ message: "Lesson deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProgress = async (req: any, res: Response) => {
  try {
    const { lessonId, completed, watchedPercentage } = req.body;
    let progress = await Progress.findOne({
      studentId: req.user._id,
      lessonId,
    });
    if (progress) {
      progress.completed = completed;
      progress.watchedPercentage = watchedPercentage;
      await progress.save();
    } else {
      progress = await Progress.create({
        studentId: req.user._id,
        lessonId,
        completed,
        watchedPercentage,
      });
    }
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCommentsByLesson = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ lessonId: req.params.lessonId })
      .populate("userId", "name role")
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addLessonComment = async (req: any, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { text } = req.body;
    const comment = await Comment.create({
      lessonId,
      userId: req.user._id,
      text,
      likes: [],
    });
    const populated = await comment.populate("userId", "name role");
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPartsByLesson = async (req: Request, res: Response) => {
  try {
    const parts = await LessonPart.find({ lessonId: req.params.lessonId }).sort(
      { order: 1 },
    );
    res.json(parts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createLessonPart = async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.lessonId as string;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ message: "Lesson not found" });
      return;
    }
    if (!assertUnitLessonOwnership(req as any, res, lesson)) return;
    const { title, content, media, quiz, order } = req.body;
    const count = await LessonPart.countDocuments({ lessonId });
    const part = await LessonPart.create({
      lessonId,
      title,
      content,
      media,
      quiz,
      order: order !== undefined ? order : count + 1,
    });
    res.status(201).json(part);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLessonPart = async (req: Request, res: Response) => {
  try {
    const part = await LessonPart.findById(req.params.id);
    if (!part) {
      res.status(404).json({ message: "Lesson part not found" });
      return;
    }
    const lesson = await Lesson.findById(part.lessonId);
    if (lesson && !assertUnitLessonOwnership(req as any, res, lesson)) return;
    await part.deleteOne();
    res.json({ message: "Lesson part deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
