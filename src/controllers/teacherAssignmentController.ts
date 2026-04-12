import { Request, Response } from 'express';
import TeacherAssignment from '../models/TeacherAssignment';
import User from '../models/User';

// ---------------------------------------------------------------------------
// @desc  Get all assignments (filter by teacherId / subjectId / gradeId)
// @route GET /api/teacher-assignments
// @access Admin
// ---------------------------------------------------------------------------
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.teacherId) filter.teacherId = req.query.teacherId as string;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId as string;
    if (req.query.gradeId) filter.gradeId = req.query.gradeId as string;

    const assignments = await TeacherAssignment.find(filter)
      .populate('teacherId', 'name email profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr');

    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Create a teacher assignment
// @route POST /api/teacher-assignments
// @access Admin
// ---------------------------------------------------------------------------
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { teacherId, subjectId, gradeId, isPrimary } = req.body;

    if (!teacherId || !subjectId || !gradeId) {
      res.status(400).json({ message: 'teacherId, subjectId, and gradeId are required' });
      return;
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'Teacher') {
      res.status(400).json({ message: 'User is not a Teacher' });
      return;
    }

    const assignment = await TeacherAssignment.create({
      teacherId,
      subjectId,
      gradeId,
      isPrimary: isPrimary ?? false,
    });

    res.status(201).json(assignment);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: 'Teacher already assigned to this subject+grade' });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Update an assignment (e.g. flip isPrimary)
// @route PUT /api/teacher-assignments/:id
// @access Admin
// ---------------------------------------------------------------------------
export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const assignment = await TeacherAssignment.findById(req.params.id);
    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    if (req.body.isPrimary !== undefined) assignment.isPrimary = req.body.isPrimary;
    const updated = await assignment.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Delete an assignment
// @route DELETE /api/teacher-assignments/:id
// @access Admin
// ---------------------------------------------------------------------------
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const assignment = await TeacherAssignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }
    res.json({ message: 'Assignment removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get assignments for the logged-in teacher
// @route GET /api/teacher-assignments/mine
// @access Teacher
// ---------------------------------------------------------------------------
export const getMyAssignments = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user._id;

    const assignments = await TeacherAssignment.find({ teacherId })
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr stageId');

    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get teachers for a given subject+grade (student-facing, no admin req)
// @route GET /api/teacher-assignments/public?subjectId=X&gradeId=Y
// @access Private (any authenticated user)
// ---------------------------------------------------------------------------
export const getPublicAssignments = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.subjectId) filter.subjectId = req.query.subjectId as string;
    if (req.query.gradeId) filter.gradeId = req.query.gradeId as string;

    const assignments = await TeacherAssignment.find(filter)
      .populate('teacherId', 'name email bio profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr');

    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

