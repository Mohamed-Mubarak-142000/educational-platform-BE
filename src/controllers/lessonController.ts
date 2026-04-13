import { Request, Response } from 'express';
import Course from '../models/Course';
import Section from '../models/Section';
import Lesson from '../models/Lesson';
import LessonPart from '../models/LessonPart';
import Progress from '../models/Progress';
import Comment from '../models/Comment';

const resolveCourseForLesson = async (lesson: any) => {
  if (lesson.courseId) {
    return await Course.findById(lesson.courseId);
  }

  if (lesson.sectionId) {
    const section = await Section.findById(lesson.sectionId);
    if (section) {
      return await Course.findById(section.courseId);
    }
  }

  return null;
};

const assertCourseOwnership = (req: any, res: Response, course: any) => {
  if (req.user?.role === 'Admin') return true;
  if (course && String(course.teacherId) === String(req.user._id)) return true;
  res.status(403).json({ message: 'Not authorized to modify this content' });
  return false;
};

export const createSection = async (req: Request, res: Response) => {
  try {
    const { courseId, title, order } = req.body;
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    if (!assertCourseOwnership(req as any, res, course)) return;
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
    const {
      courseId,
      sectionId,
      title,
      description,
      videoUrl,
      pdfUrl,
      imageUrl,
      modelUrl,
      modelExplanation,
      audioUrl,
      order,
      duration,
    } = req.body;

    let resolvedCourseId = courseId as string | undefined;

    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (!section) {
        res.status(404).json({ message: 'Section not found' });
        return;
      }
      if (!resolvedCourseId) {
        resolvedCourseId = String(section.courseId);
      } else if (String(section.courseId) !== String(resolvedCourseId)) {
        res.status(400).json({ message: 'Section does not belong to the provided course' });
        return;
      }
    }

    if (!resolvedCourseId) {
      res.status(400).json({ message: 'courseId is required for lesson creation' });
      return;
    }

    const course = await Course.findById(resolvedCourseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    if (!assertCourseOwnership(req as any, res, course)) return;

    const lesson = await Lesson.create({
      courseId: resolvedCourseId,
      teacherId: course.teacherId,
      sectionId,
      title,
      description,
      videoUrl,
      pdfUrl,
      imageUrl,
      modelUrl,
      modelExplanation,
      audioUrl,
      order,
      duration,
    });
    res.status(201).json(lesson);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLessonsByCourse = async (req: Request, res: Response) => {
  try {
    const lessons = await Lesson.find({ courseId: req.params.courseId }).sort('order');
    res.json(lessons);
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
    const course = await resolveCourseForLesson(lesson);
    if (!course && (req as any).user?.role !== 'Admin') {
      res.status(403).json({ message: 'Not authorized to modify this content' });
      return;
    }
    if (course && !assertCourseOwnership(req as any, res, course)) return;
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
    const course = await resolveCourseForLesson(lesson);
    if (!course && (req as any).user?.role !== 'Admin') {
      res.status(403).json({ message: 'Not authorized to modify this content' });
      return;
    }
    if (course && !assertCourseOwnership(req as any, res, course)) return;
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
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }
    const course = await resolveCourseForLesson(lesson);
    if (!course && (req as any).user?.role !== 'Admin') {
      res.status(403).json({ message: 'Not authorized to modify this content' });
      return;
    }
    if (course && !assertCourseOwnership(req as any, res, course)) return;
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
    const lesson = await Lesson.findById(part.lessonId);
    if (lesson) {
      const course = await resolveCourseForLesson(lesson);
      if (!course && (req as any).user?.role !== 'Admin') {
        res.status(403).json({ message: 'Not authorized to modify this content' });
        return;
      }
      if (course && !assertCourseOwnership(req as any, res, course)) return;
    }
    await part.deleteOne();
    res.json({ message: 'Lesson part deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


