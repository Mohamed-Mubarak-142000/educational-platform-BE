import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Subject from '../models/Subject';
import GradeSubject from '../models/GradeSubject';
import Unit from '../models/Unit';
import TeacherAssignment from '../models/TeacherAssignment';
import Grade from '../models/Grade';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getSubjectFilter, attachCreator } from '../middlewares/rbacMiddleware';

// ---------------------------------------------------------------------------
// @desc  Get all subjects (filtered by role and optionally by stage)
// @route GET /api/subjects?stageId=xxx&stageName=xxx
// @access Private (requires authentication)
// ---------------------------------------------------------------------------
export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    let filter: any = {};
    const { stageId, stageName } = req.query;

    // Admin sees ALL subjects (no filtering)
    if (req.user?.role === 'Admin') {
      filter = {};
    }
    // Teacher sees ONLY assigned subjects
    else if (req.user?.role === 'Teacher') {
      filter = await getSubjectFilter(req);
    }
    // Students or other roles see all published subjects (no filter for now)
    else {
      filter = {};
    }
    
    let subjects = await Subject.find(filter).sort({ name: 1 });
    
    // ══════════════════════════════════════════════════════════════
    // Stage-based filtering (applied after role-based filtering)
    // ══════════════════════════════════════════════════════════════
    if (stageId || stageName) {
      // Get stage info
      let stage;
      if (stageId) {
        const Stage = mongoose.model('Stage');
        stage = await Stage.findById(stageId);
      } else if (stageName) {
        const Stage = mongoose.model('Stage');
        stage = await Stage.findOne({ 
          $or: [
            { name: new RegExp(stageName as string, 'i') },
            { nameAr: new RegExp(stageName as string, 'i') }
          ]
        });
      }

      if (stage) {
        const stageNameLower = (stage as any).name.toLowerCase();
        let stageCategory: string | null = null;
        
        // Determine stage category
        if (stageNameLower.includes('primary')) stageCategory = 'primary';
        else if (stageNameLower.includes('preparatory')) stageCategory = 'preparatory';
        else if (stageNameLower.includes('secondary')) stageCategory = 'secondary';

        // Filter subjects by stage relevance
        subjects = subjects.filter(subject => {
          // Always include subjects without category (backwards compatibility)
          if (!subject.category) return true;

          // Include if category matches
          if (subject.category === stageCategory) return true;
          
          // Include if category is 'general'
          if (subject.category === 'general') return true;

          // Include secondary science/literary subjects if we're in secondary
          if (stageCategory === 'secondary' && 
              (subject.category === 'secondary-science' || subject.category === 'secondary-literary')) {
            return true;
          }

          // Include if stage name is in suggestedStages
          if (subject.suggestedStages?.some((s: string) => 
            s.toLowerCase().includes(stageNameLower) || 
            stageNameLower.includes(s.toLowerCase())
          )) {
            return true;
          }

          return false;
        });
        
        console.log('[getSubjects] Filtered by stage:', (stage as any).name, '- Found:', subjects.length);
      }
    }
    
    res.json(subjects);
  } catch (error: any) {
    console.error('[getSubjects] Error:', error.message);
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
// @access Admin only
// ---------------------------------------------------------------------------
export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, nameAr, description, descriptionAr, color, icon, category, suggestedStages, stageId, order } = req.body;

    if (!name) {
      res.status(400).json({ message: 'name is required' });
      return;
    }

    const subjectData = attachCreator(req, {
      name,
      nameAr: nameAr ?? '',
      description: description ?? '',
      descriptionAr: descriptionAr ?? '',
      color: color ?? 'blue',
      icon: icon ?? '📚',
      category: category ?? 'general',
      suggestedStages: suggestedStages ?? [],
    });

    const subject = await Subject.create(subjectData);

    // If stageId is provided, automatically assign subject to all grades in that stage
    if (stageId) {
      const grades = await Grade.find({ stageId });
      
      if (grades.length > 0) {
        const gradeSubjects = [];
        
        for (const grade of grades) {
          const existing = await GradeSubject.findOne({
            gradeId: grade._id,
            subjectId: subject._id
          });
          
          if (!existing) {
            gradeSubjects.push({
              gradeId: grade._id,
              subjectId: subject._id,
              order: order ?? 0
            });
          }
        }
        
        if (gradeSubjects.length > 0) {
          await GradeSubject.insertMany(gradeSubjects);
        }
      }
    }

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

    const { name, nameAr, description, descriptionAr, color, icon, category, suggestedStages } = req.body;
    if (name !== undefined) subject.name = name;
    if (nameAr !== undefined) subject.nameAr = nameAr;
    if (description !== undefined) subject.description = description;
    if (descriptionAr !== undefined) subject.descriptionAr = descriptionAr;
    if (color !== undefined) subject.color = color;
    if (icon !== undefined) subject.icon = icon;
    if (category !== undefined) subject.category = category;
    if (suggestedStages !== undefined) subject.suggestedStages = suggestedStages;

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
export const createUnitForSubjectGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, gradeId } = req.params;
    const { title, titleAr, description, descriptionAr, isPublished } = req.body;

    const link = await GradeSubject.findOne({ subjectId, gradeId });
    if (!link) {
      res.status(404).json({ message: 'This subject is not assigned to the specified grade' });
      return;
    }

    const count = await Unit.countDocuments({ subjectId, gradeId });
    
    const unitData = attachCreator(req, {
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

    const unit = await Unit.create(unitData);

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
    const { title, description, gradeId } = req.body;

    // gradeId is required because Units must be associated with a specific grade
    if (!gradeId) {
      res.status(400).json({ 
        message: 'gradeId is required. Units must be associated with a specific grade.' 
      });
      return;
    }

    // Find the GradeSubject junction record
    const gradeSubject = await GradeSubject.findOne({
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      gradeId: new mongoose.Types.ObjectId(String(gradeId)),
    });

    if (!gradeSubject) {
      res.status(404).json({ 
        message: 'Subject is not assigned to this grade. Please assign the subject to the grade first.' 
      });
      return;
    }

    const count = await Unit.countDocuments({ 
      subjectId,
      gradeId,
    });

    const unit = await Unit.create({
      gradeSubjectId: gradeSubject._id,
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      gradeId: new mongoose.Types.ObjectId(String(gradeId)),
      title,
      description: description ?? '',
      order: count + 1,
    });

    res.status(201).json(unit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
