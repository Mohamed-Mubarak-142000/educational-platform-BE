import { Request, Response } from 'express';
import Subject from '../models/Subject';
import Unit from '../models/Unit';

export const getSubjects = async (_req: Request, res: Response) => {
  try {
    const subjects = await Subject.find({})
      .populate('teacherId', 'name')
      .sort({ createdAt: 1 });
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('teacherId', 'name');
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    res.json(subject);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { stageId, name, nameAr, description, color, icon, teacherId } = req.body;
    const subject = await Subject.create({
      stageId,
      name,
      nameAr: nameAr || '',
      description: description || '',
      color: color || 'blue',
      icon: icon || '📚',
      teacherId: teacherId || undefined,
    });
    const populated = await subject.populate('teacherId', 'name');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    const { name, nameAr, description, color, icon, teacherId, stageId } = req.body;
    if (name !== undefined) subject.name = name;
    if (nameAr !== undefined) subject.nameAr = nameAr;
    if (description !== undefined) subject.description = description;
    if (color !== undefined) subject.color = color;
    if (icon !== undefined) subject.icon = icon;
    if (teacherId !== undefined) subject.teacherId = teacherId;
    if (stageId !== undefined) subject.stageId = stageId;
    await subject.save();
    const populated = await subject.populate('teacherId', 'name');
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    await subject.deleteOne();
    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnitsBySubject = async (req: Request, res: Response) => {
  try {
    const units = await Unit.find({ subjectId: req.params.subjectId as string }).sort({ order: 1 });
    res.json(units);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUnitForSubject = async (req: Request, res: Response) => {
  try {
    const subjectId = req.params.subjectId as string;
    const { title, description } = req.body;
    const count = await Unit.countDocuments({ subjectId });
    const unit = await Unit.create({
      subjectId,
      title,
      description: description || undefined,
      order: count + 1,
    });
    res.status(201).json(unit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
