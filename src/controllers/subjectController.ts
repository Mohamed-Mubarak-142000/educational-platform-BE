import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Subject from '../models/Subject';
import GradeSubject from '../models/GradeSubject';
import Unit from '../models/Unit';
import TeacherAssignment from '../models/TeacherAssignment';

// ---------------------------------------------------------------------------
// @desc  Get all subjects (generic catalog)
// @route GET /api/subjects
// @access Public
// ---------------------------------------------------------------------------
export const getSubjects = async (_req: Request, res: Response) => {
  try {
    const subjects = await Subject.find({}).sort({ name: 1 });
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get single subject with its grade assignments and teachers
// @route GET /api/subjects/:id
// @access Public
// ---------------------------------------------------------------------------
export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    const gradeAssignments = await GradeSubject.find({ subjectId: subject._id }).populate(
      'gradeId',
      'name nameAr stageId'
    );

    const teachers = await TeacherAssignment.find({ subjectId: subject._id })
      .populate('teacherId', 'name email profileImage bio')
      .populate('gradeId', 'name nameAr');

    res.json({ ...subject.toObject(), gradeAssignments, teachers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Create a canonical subject
// @route POST /api/subjects
// @access Admin
// ---------------------------------------------------------------------------
export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, nameAr, description, descriptionAr, color, icon } = req.body;

    if (!name) {
      res.status(400).json({ message: 'name is required' });
      return;
    }

    const subject = await Subject.create({
      name,
      nameAr: nameAr ?? '',
      description: description ?? '',
      descriptionAr: descriptionAr ?? '',
      color: color ?? 'blue',
      icon: icon ?? '📚',
    });

    res.status(201).json(subject);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: 'A subject with this name already exists' });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Update a subject
// @route PUT /api/subjects/:id
// @access Admin
// ---------------------------------------------------------------------------
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    const { name, nameAr, description, descriptionAr, color, icon } = req.body;
    if (name !== undefined) subject.name = name;
    if (nameAr !== undefined) subject.nameAr = nameAr;
    if (description !== undefined) subject.description = description;
    if (descriptionAr !== undefined) subject.descriptionAr = descriptionAr;
    if (color !== undefined) subject.color = color;
    if (icon !== undefined) subject.icon = icon;

    await subject.save();
    res.json(subject);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Delete a subject (and its GradeSubject mappings)
// @route DELETE /api/subjects/:id
// @access Admin
// ---------------------------------------------------------------------------
export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    await GradeSubject.deleteMany({ subjectId: subject._id });
    await subject.deleteOne();
    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get units for a subject within a specific grade
// @route GET /api/subjects/:subjectId/grades/:gradeId/units
// @access Public
// ---------------------------------------------------------------------------
export const getUnitsBySubjectAndGrade = async (req: Request, res: Response) => {
  try {
    const { subjectId, gradeId } = req.params;
    const units = await Unit.find({ subjectId, gradeId, isPublished: true }).sort({ order: 1 });
    res.json(units);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Create a unit for a subject+grade
// @route POST /api/subjects/:subjectId/grades/:gradeId/units
// @access Admin | Teacher (assigned)
// ---------------------------------------------------------------------------
export const createUnitForSubjectGrade = async (req: Request, res: Response) => {
  try {
    const { subjectId, gradeId } = req.params;
    const { title, titleAr, description, descriptionAr, isPublished } = req.body;

    const link = await GradeSubject.findOne({ subjectId, gradeId });
    if (!link) {
      res.status(404).json({ message: 'This subject is not assigned to the specified grade' });
      return;
    }

    const count = await Unit.countDocuments({ subjectId, gradeId });
    const unit = await Unit.create({
      gradeSubjectId: link._id,
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      gradeId: new mongoose.Types.ObjectId(String(gradeId)),
      title,
      titleAr: titleAr ?? '',
      description: description ?? '',
      descriptionAr: descriptionAr ?? '',
      order: count + 1,
      isPublished: isPublished ?? false,
    });

    res.status(201).json(unit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// Legacy helpers kept for backward compatibility during migration
// ---------------------------------------------------------------------------
export const getUnitsBySubject = async (req: Request, res: Response) => {
  try {
    const units = await Unit.find({ subjectId: req.params.subjectId }).sort({ order: 1 });
    res.json(units);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUnitForSubject = async (req: Request, res: Response) => {
  try {
    const subjectId = req.params.subjectId;
    const { title, description } = req.body;
    const count = await Unit.countDocuments({ subjectId });
    const unit = await Unit.create({
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      title,
      description: description ?? '',
      order: count + 1,
    });
    res.status(201).json(unit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
