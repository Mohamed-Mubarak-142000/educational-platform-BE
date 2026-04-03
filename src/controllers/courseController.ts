import { Request, Response } from 'express';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find({}).populate('teacherId', 'name email');
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id).populate('teacherId', 'name email');
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
    const { title, description, price, thumbnail } = req.body;
    const course = new Course({
      title,
      description,
      price,
      thumbnail,
      teacherId: req.user._id,
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

    const { title, description, price, thumbnail, teacherId } = req.body;
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (price !== undefined) course.price = price;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (teacherId !== undefined && req.user.role === 'Admin') course.teacherId = teacherId;

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
    const courses = await Course.find({ teacherId: req.params.teacherId }).populate('teacherId', 'name email subject');
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
    const courses = await Course.find({ teacherId: req.user._id });
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

