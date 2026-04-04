import { Request, Response } from 'express';
import Stage from '../models/Stage';
import Subject from '../models/Subject';

export const getStages = async (_req: Request, res: Response) => {
  try {
    const stages = await Stage.find({}).sort({ order: 1, createdAt: 1 });
    res.json(stages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStageById = async (req: Request, res: Response) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage) {
      res.status(404).json({ message: 'Stage not found' });
      return;
    }
    res.json(stage);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createStage = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, color, order } = req.body;
    const count = await Stage.countDocuments();
    const stage = await Stage.create({
      name,
      description: description || '',
      icon: icon || '📚',
      color: color || 'blue',
      order: order !== undefined ? order : count + 1,
    });
    res.status(201).json(stage);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage) {
      res.status(404).json({ message: 'Stage not found' });
      return;
    }
    const { name, description, icon, color, order } = req.body;
    if (name !== undefined) stage.name = name;
    if (description !== undefined) stage.description = description;
    if (icon !== undefined) stage.icon = icon;
    if (color !== undefined) stage.color = color;
    if (order !== undefined) stage.order = order;
    const updated = await stage.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStage = async (req: Request, res: Response) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage) {
      res.status(404).json({ message: 'Stage not found' });
      return;
    }
    await stage.deleteOne();
    res.json({ message: 'Stage deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjectsByStage = async (req: Request, res: Response) => {
  try {
    const subjects = await Subject.find({ stageId: req.params.stageId })
      .populate('teacherId', 'name')
      .sort({ createdAt: 1 });
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
