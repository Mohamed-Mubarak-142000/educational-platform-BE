import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Stage from '../models/Stage';
import Subject from '../models/Subject';
import Grade from '../models/Grade';
import GradeSubject from '../models/GradeSubject';

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
    const { name, nameAr, description, icon, color, order } = req.body;
    const count = await Stage.countDocuments();
    const stage = await Stage.create({
      name,
      nameAr: nameAr || '',
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
    const { name, nameAr, description, icon, color, order } = req.body;
    if (name !== undefined) stage.name = name;
    if (nameAr !== undefined) stage.nameAr = nameAr;
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
    const stageId = req.params.stageId;

    // 1. Find all grades in this stage
    const grades = await Grade.find({ stageId });
    const gradeIds = grades.map(g => g._id);

    if (gradeIds.length === 0) {
      res.json([]);
      return;
    }

    // 2. Find all GradeSubject entries for these grades
    const gradeSubjects = await GradeSubject.find({ 
      gradeId: { $in: gradeIds } 
    }).populate({
      path: 'subjectId',
      select: 'name nameAr description descriptionAr icon color createdBy'
    }).populate({
      path: 'gradeId',
      select: 'name nameAr'
    }).sort({ order: 1 });

    // 3. Extract unique subjects with their grade info
    const subjectMap = new Map();
    
    gradeSubjects.forEach(gs => {
      const subject = gs.subjectId as any;
      const grade = gs.gradeId as any;
      
      if (subject && subject._id) {
        const subjectId = subject._id.toString();
        
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            ...subject.toObject(),
            grades: []
          });
        }
        
        // Add grade info
        subjectMap.get(subjectId).grades.push({
          _id: grade._id,
          name: grade.name,
          nameAr: grade.nameAr
        });
      }
    });

    // Convert map to array
    const subjects = Array.from(subjectMap.values());
    
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Assign a subject to ALL grades in a stage
// @route POST /api/stages/:stageId/subjects
// @access Admin
// ---------------------------------------------------------------------------
export const assignSubjectToStage = async (req: Request, res: Response) => {
  try {
    const { stageId } = req.params;
    const { subjectId, order } = req.body;

    if (!subjectId) {
      res.status(400).json({ message: 'subjectId is required' });
      return;
    }

    // Verify subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    // Find all grades in this stage
    const grades = await Grade.find({ stageId });

    if (grades.length === 0) {
      res.status(400).json({ 
        message: 'No grades found in this stage. Please create grades first.' 
      });
      return;
    }

    // Assign subject to each grade
    const results = [];
    const errors = [];

    for (const grade of grades) {
      try {
        // Check if already exists
        const existing = await GradeSubject.findOne({
          gradeId: grade._id,
          subjectId: new mongoose.Types.ObjectId(String(subjectId))
        });

        if (!existing) {
          const gradeSubject = await GradeSubject.create({
            gradeId: grade._id,
            subjectId: new mongoose.Types.ObjectId(String(subjectId)),
            order: order ?? 0
          });
          results.push({
            gradeId: grade._id,
            gradeName: grade.name,
            gradeSubjectId: gradeSubject._id,
            status: 'created'
          });
        } else {
          results.push({
            gradeId: grade._id,
            gradeName: grade.name,
            gradeSubjectId: existing._id,
            status: 'already_exists'
          });
        }
      } catch (error: any) {
        errors.push({
          gradeId: grade._id,
          gradeName: grade.name,
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: `Subject assigned to ${results.length} grade(s)`,
      subject: subject.toObject(),
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Remove a subject from ALL grades in a stage
// @route DELETE /api/stages/:stageId/subjects/:subjectId
// @access Admin
// ---------------------------------------------------------------------------
export const removeSubjectFromStage = async (req: Request, res: Response) => {
  try {
    const { stageId, subjectId } = req.params;

    // Find all grades in this stage
    const grades = await Grade.find({ stageId });
    const gradeIds = grades.map(g => g._id);

    if (gradeIds.length === 0) {
      res.status(404).json({ message: 'No grades found in this stage' });
      return;
    }

    // Delete all GradeSubject entries
    const result = await GradeSubject.deleteMany({
      gradeId: { $in: gradeIds },
      subjectId: new mongoose.Types.ObjectId(String(subjectId))
    });

    res.json({
      message: `Subject removed from stage`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get distinct subject count per stage — used by Landing page cards
// @route GET /api/stages/subject-counts
// @access Public
// ---------------------------------------------------------------------------
export const getStageSubjectCounts = async (_req: Request, res: Response) => {
  try {
    // Aggregate: Stage → Grades → GradeSubjects → distinct subjects
    const stages = await Stage.find({}).select('_id').lean();

    const counts: Record<string, number> = {};

    await Promise.all(
      stages.map(async (stage) => {
        const grades = await Grade.find({ stageId: stage._id }).select('_id').lean();
        const gradeIds = grades.map((g) => g._id);

        if (gradeIds.length === 0) {
          counts[stage._id.toString()] = 0;
          return;
        }

        const distinctSubjects = await GradeSubject.distinct('subjectId', {
          gradeId: { $in: gradeIds },
        });

        counts[stage._id.toString()] = distinctSubjects.length;
      })
    );

    res.json(counts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
