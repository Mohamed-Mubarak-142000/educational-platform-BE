import { Request, Response } from 'express';
import Section from '../models/Section';
import Lesson from '../models/Lesson';
import LessonPart from '../models/LessonPart';
import Progress from '../models/Progress';
import Comment from '../models/Comment';

export const createSection = async (req: Request, res: Response) => {
  try {
    const { courseId, title, order } = req.body;
    const section = await Section.create({ courseId, title, order });
    res.status(201).json(section);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSections = async (req: Request, res: Response) => {
  try {
    const sections = await Section.find({ courseId: req.params.courseId }).sort('order');
    res.json(sections);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { sectionId, title, videoUrl, pdfUrl, imageUrl, modelUrl, modelExplanation, audioUrl, order, duration } = req.body;
    const lesson = await Lesson.create({ sectionId, title, videoUrl, pdfUrl, imageUrl, modelUrl, modelExplanation, audioUrl, order, duration });
    res.status(201).json(lesson);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /lessons/:id
// Dual-purpose: if :id is a Section → return [{lessons}], if :id is a Lesson → return {lesson}
export const getLessons = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if this is a section ID
    const section = await Section.findById(id as string).catch(() => null);
    if (section) {
      const lessons = await Lesson.find({ sectionId: id as string }).sort('order');
      res.json(lessons);
      return;
    }

    // Otherwise treat as a single lesson ID
    const lesson = await Lesson.findById(id as string).catch(() => null);
    if (lesson) {
      res.json(lesson);
      return;
    }

    res.status(404).json({ message: 'Not found' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }
    const fields = ['title', 'description', 'videoUrl', 'pdfUrl', 'imageUrl', 'modelUrl', 'modelExplanation', 'audioUrl', 'order', 'duration'] as const;
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
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }
    await LessonPart.deleteMany({ lessonId: lesson._id });
    await lesson.deleteOne();
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProgress = async (req: any, res: Response) => {
  try {
    const { lessonId, completed, watchedPercentage } = req.body;
    let progress = await Progress.findOne({ studentId: req.user._id, lessonId });
    
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

// GET /lessons/:lessonId/comments
export const getCommentsByLesson = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ lessonId: req.params.lessonId })
      .populate('userId', 'name role')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /lessons/:lessonId/comments
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
    const populated = await comment.populate('userId', 'name role');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /lessons/:lessonId/parts
export const getPartsByLesson = async (req: Request, res: Response) => {
  try {
    const parts = await LessonPart.find({ lessonId: req.params.lessonId }).sort({ order: 1 });
    res.json(parts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /lessons/:lessonId/parts
export const createLessonPart = async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.lessonId as string;
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

// DELETE /lessons/parts/:id
export const deleteLessonPart = async (req: Request, res: Response) => {
  try {
    const part = await LessonPart.findById(req.params.id);
    if (!part) {
      res.status(404).json({ message: 'Lesson part not found' });
      return;
    }
    await part.deleteOne();
    res.json({ message: 'Lesson part deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /lessons/migrate/youtube-urls
export const migrateYouTubeUrls = async (_req: Request, res: Response) => {
  try {
    const normalizeYouTubeUrl = (url?: string) => {
      if (!url) return '';
      const trimmed = url.trim();
      if (!trimmed) return '';
      if (trimmed.includes('youtube.com/embed/')) return trimmed;
      const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
      if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`;
      return trimmed;
    };

    const urlFilter = { $regex: 'youtube\\.com|youtu\\.be', $options: 'i' };

    const lessons = await Lesson.find({ videoUrl: urlFilter });
    let lessonUpdates = 0;
    for (const lesson of lessons) {
      const nextUrl = normalizeYouTubeUrl(lesson.videoUrl);
      if (nextUrl && nextUrl !== lesson.videoUrl) {
        lesson.videoUrl = nextUrl;
        await lesson.save();
        lessonUpdates += 1;
      }
    }

    const parts = await LessonPart.find({ 'media.videoUrl': urlFilter });
    let partUpdates = 0;
    for (const part of parts) {
      const nextUrl = normalizeYouTubeUrl(part.media?.videoUrl);
      if (nextUrl && nextUrl !== part.media?.videoUrl) {
        part.media = { ...(part.media || {}), videoUrl: nextUrl };
        await part.save();
        partUpdates += 1;
      }
    }

    res.json({ message: 'YouTube URLs normalized.', lessonsUpdated: lessonUpdates, partsUpdated: partUpdates });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

