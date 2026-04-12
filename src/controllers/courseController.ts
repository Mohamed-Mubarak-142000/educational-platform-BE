import { Request, Response } from 'express';
import Course from '../models/Course';
import Stage from '../models/Stage';
import Subject from '../models/Subject';
import Enrollment from '../models/Enrollment';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, string> = {};
    if (typeof req.query.teacherId === 'string') filter.teacherId = req.query.teacherId;
    if (typeof req.query.stageId === 'string') filter.stageId = req.query.stageId;
    if (typeof req.query.subjectId === 'string') filter.subjectId = req.query.subjectId;

    const courses = await Course.find(filter)
      .populate('teacherId', 'name email')
      .populate('stageId', 'name')
      .populate('subjectId', 'name');
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacherId', 'name email')
      .populate('stageId', 'name')
      .populate('subjectId', 'name');
    if (course) {
      res.json(course);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCourse = async (req: any, res: Response) => {
  try {
    const { title, description, price, thumbnail, stageId, subjectId } = req.body;
    if (!stageId || !subjectId) {
      res.status(400).json({ message: 'stageId and subjectId are required' });
      return;
    }

    // For teachers (not admins), verify the stage/subject is in their assigned list
    if (req.user.role === 'Teacher') {
      const teacherStageIds = (req.user.stageIds || []).map(String);
      const teacherSubjectIds = (req.user.subjectIds || []).map(String);

      if (teacherStageIds.length > 0 && !teacherStageIds.includes(String(stageId))) {
        res.status(403).json({ message: 'You are not assigned to teach in this stage' });
        return;
      }
      if (teacherSubjectIds.length > 0 && !teacherSubjectIds.includes(String(subjectId))) {
        res.status(403).json({ message: 'You are not assigned to teach this subject' });
        return;
      }
    }

    const [stage, subject] = await Promise.all([
      Stage.findById(stageId),
      Subject.findById(subjectId),
    ]);

    if (!stage) {
      res.status(400).json({ message: 'Stage not found' });
      return;
    }

    if (!subject) {
      res.status(400).json({ message: 'Subject not found' });
      return;
    }

    // Note: subject-stage validation removed in refactoring (Subject is now stage-agnostic)

    const course = new Course({
      title,
      description,
      price,
      thumbnail,
      teacherId: req.user._id,
      stageId,
      subjectId,
    });
    const createdCourse = await course.save();
    res.status(201).json(createdCourse);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCourse = async (req: any, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    if (req.user.role !== 'Admin' && String(course.teacherId) !== String(req.user._id)) {
      res.status(403).json({ message: 'Not authorized to update this course' });
      return;
    }

    const { title, description, price, thumbnail, teacherId, stageId, subjectId } = req.body;
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (price !== undefined) course.price = price;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;

    if (stageId !== undefined) course.stageId = stageId;
    if (subjectId !== undefined) course.subjectId = subjectId;
    if (teacherId !== undefined && req.user.role === 'Admin') course.teacherId = teacherId;

    // Note: subject-stage cross-validation removed (Subject is now stage-agnostic)

    const updated = await course.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCourse = async (req: any, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    if (req.user.role !== 'Admin' && String(course.teacherId) !== String(req.user._id)) {
      res.status(403).json({ message: 'Not authorized to delete this course' });
      return;
    }

    await course.deleteOne();
    res.json({ message: 'Course removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const enrollCourse = async (req: any, res: Response) => {
  try {
    const { courseId } = req.body;
    const existing = await Enrollment.findOne({ studentId: req.user._id, courseId });
    if (existing) {
      res.status(400).json({ message: 'Already enrolled' });
      return;
    }

    const enrollment = new Enrollment({
      studentId: req.user._id,
      courseId,
    });
    await enrollment.save();
    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get enrolled courses for current student
// @route   GET /api/courses/enrolled
// @access  Private/Student
export const getEnrolledCourses = async (req: any, res: Response) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id }).populate({
      path: 'courseId',
      populate: { path: 'teacherId', select: 'name email subject' }
    });
    const courses = enrollments.map(e => e.courseId);
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get courses by teacher
// @route   GET /api/courses/teacher/:teacherId
// @access  Private
export const getCoursesByTeacher = async (req: Request, res: Response) => {
  try {
    const teacherId = String(req.params.teacherId);
    const filter: Record<string, string> = { teacherId };
    if (typeof req.query.stageId === 'string') filter.stageId = req.query.stageId;
    if (typeof req.query.subjectId === 'string') filter.subjectId = req.query.subjectId;

    const courses = await Course.find(filter)
      .populate('teacherId', 'name email subject')
      .populate('stageId', 'name')
      .populate('subjectId', 'name');
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my courses (for logged-in teacher)
// @route   GET /api/courses/my
// @access  Private/Teacher
export const getMyCourses = async (req: any, res: Response) => {
  try {
    const filter: Record<string, string> = { teacherId: req.user._id };
    if (typeof req.query.stageId === 'string') filter.stageId = req.query.stageId;
    if (typeof req.query.subjectId === 'string') filter.subjectId = req.query.subjectId;

    const courses = await Course.find(filter)
      .populate('stageId', 'name')
      .populate('subjectId', 'name');
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

