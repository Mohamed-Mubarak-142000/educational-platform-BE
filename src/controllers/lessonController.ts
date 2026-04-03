import { Request, Response } from 'express';
import Section from '../models/Section';
import Lesson from '../models/Lesson';
import Progress from '../models/Progress';

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
    const { sectionId, title, videoUrl, pdfUrl, order, duration } = req.body;
    const lesson = await Lesson.create({ sectionId, title, videoUrl, pdfUrl, order, duration });
    res.status(201).json(lesson);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLessons = async (req: Request, res: Response) => {
  try {
    const lessons = await Lesson.find({ sectionId: req.params.sectionId }).sort('order');
    res.json(lessons);
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
