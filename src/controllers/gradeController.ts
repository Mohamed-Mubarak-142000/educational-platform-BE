import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Grade from '../models/Grade';
import Subject from '../models/Subject';
import GradeSubject from '../models/GradeSubject';
import Unit from '../models/Unit';

// ---------------------------------------------------------------------------
// @desc  Get all grades (optionally filter by stageId)
// @route GET /api/grades
// @access Public
// ---------------------------------------------------------------------------
export const getGrades = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.stageId) filter.stageId = req.query.stageId as string;

    const grades = await Grade.find(filter).sort({ order: 1 });
    res.json(grades);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get a single grade
// @route GET /api/grades/:id
// @access Public
// ---------------------------------------------------------------------------
export const getGradeById = async (req: Request, res: Response) => {
  try {
    const grade = await Grade.findById(req.params.id).populate('stageId', 'name nameAr');
    if (!grade) {
      res.status(404).json({ message: 'Grade not found' });
      return;
    }
    res.json(grade);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Create a grade
// @route POST /api/grades
// @access Admin
// ---------------------------------------------------------------------------
export const createGrade = async (req: Request, res: Response) => {
  try {
    const { stageId, name, nameAr, order } = req.body;

    if (!stageId || !name) {
      res.status(400).json({ message: 'stageId and name are required' });
      return;
    }

    const grade = await Grade.create({ stageId, name, nameAr: nameAr ?? '', order: order ?? 0 });
    res.status(201).json(grade);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Update a grade
// @route PUT /api/grades/:id
// @access Admin
// ---------------------------------------------------------------------------
export const updateGrade = async (req: Request, res: Response) => {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) {
      res.status(404).json({ message: 'Grade not found' });
      return;
    }

    const { name, nameAr, order, stageId } = req.body;
    if (name !== undefined) grade.name = name;
    if (nameAr !== undefined) grade.nameAr = nameAr;
    if (order !== undefined) grade.order = order;
    if (stageId !== undefined) grade.stageId = stageId;

    const updated = await grade.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Delete a grade (cascades: GradeSubjects, Units)
// @route DELETE /api/grades/:id
// @access Admin
// ---------------------------------------------------------------------------
export const deleteGrade = async (req: Request, res: Response) => {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) {
      res.status(404).json({ message: 'Grade not found' });
      return;
    }

    await GradeSubject.deleteMany({ gradeId: grade._id });
    await Unit.deleteMany({ gradeId: grade._id });
    await grade.deleteOne();
    res.json({ message: 'Grade removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get subjects for a grade (via GradeSubject junction)
// @route GET /api/grades/:gradeId/subjects
// @access Public
// ---------------------------------------------------------------------------
export const getSubjectsByGrade = async (req: Request, res: Response) => {
  try {
    const rows = await GradeSubject.find({ gradeId: req.params.gradeId })
      .sort({ order: 1 })
      .populate('subjectId');

    const subjects = rows.map((row) => {
      const sub = (row.subjectId as any).toObject ? (row.subjectId as any).toObject() : row.subjectId;
      return {
        gradeSubjectId: row._id,
        order: row.order,
        ...sub,
      };
    });

    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Assign a subject to a grade
// @route POST /api/grades/:gradeId/subjects
// @access Admin
// ---------------------------------------------------------------------------
export const assignSubjectToGrade = async (req: Request, res: Response) => {
  try {
    const { subjectId, order } = req.body;

    if (!subjectId) {
      res.status(400).json({ message: 'subjectId is required' });
      return;
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    const row = await GradeSubject.create({
      gradeId: new mongoose.Types.ObjectId(String(req.params.gradeId)),
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      order: order ?? 0,
    });

    res.status(201).json(row);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: 'Subject already assigned to this grade' });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Remove a subject from a grade
// @route DELETE /api/grades/:gradeId/subjects/:subjectId
// @access Admin
// ---------------------------------------------------------------------------
export const removeSubjectFromGrade = async (req: Request, res: Response) => {
  try {
    const row = await GradeSubject.findOneAndDelete({
      gradeId: req.params.gradeId,
      subjectId: req.params.subjectId,
    });

    if (!row) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    res.json({ message: 'Subject removed from grade' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
