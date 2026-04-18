import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Subject from '../models/Subject';
import GradeSubject from '../models/GradeSubject';
import Unit from '../models/Unit';
import Lesson from '../models/Lesson';
import Subscription from '../models/Subscription';
import SubscriptionRequest from '../models/SubscriptionRequest';
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
// @desc  Get teachers for a subject (student-facing)
// @route GET /api/subjects/:subjectId/teachers
// @access Private
// ---------------------------------------------------------------------------
export const getSubjectTeachers = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    const gradeId = req.user?.role === 'Student'
      ? String(req.user.gradeId ?? '')
      : (req.query.gradeId as string | undefined);
    const stageId = req.user?.role === 'Student'
      ? String(req.user.stageId ?? '')
      : (req.query.stageId as string | undefined);

    const filter: Record<string, unknown> = { subjectId };
    if (gradeId) {
      filter.gradeId = gradeId;
    } else if (stageId) {
      const grades = await Grade.find({ stageId }).select('_id').lean();
      const gradeIds = grades.map((g) => g._id);
      if (gradeIds.length > 0) filter.gradeId = { $in: gradeIds };
    }

    const assignments = await TeacherAssignment.find(filter)
      .populate('teacherId', 'name email bio profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr');
    const assignmentsWithPricing = await Promise.all(
      assignments.map(async (assignment: any) => {
        const units = await Unit.find({ assignmentId: assignment._id }).select('price').lean();
        const anyUnitPrice = units.some((unit: any) => Number(unit.price) > 0);
        const subjectPrice = anyUnitPrice
          ? units.reduce((sum, unit: any) => sum + (Number(unit.price) || 0), 0)
          : 300;
        return { ...assignment.toObject(), subjectPrice };
      })
    );

    res.json(assignmentsWithPricing);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get subject content scoped to a teacher (student-facing)
// @route GET /api/subjects/:subjectId/teachers/:teacherId/content
// @access Private
// ---------------------------------------------------------------------------
export const getSubjectTeacherContent = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, teacherId } = req.params;
    const subjectIdStr = String(subjectId);
    const teacherIdStr = String(teacherId);
    const gradeId = req.user?.role === 'Student'
      ? String(req.user.gradeId ?? '')
      : (req.query.gradeId as string | undefined);
    const stageId = req.user?.role === 'Student'
      ? String(req.user.stageId ?? '')
      : (req.query.stageId as string | undefined);

    let assignment = await TeacherAssignment.findOne({
      subjectId: subjectIdStr,
      teacherId: teacherIdStr,
      ...(gradeId ? { gradeId } : {}),
    })
      .populate('teacherId', 'name profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr stageId')
      .lean();

    if (!assignment && stageId) {
      const grades = await Grade.find({ stageId }).select('_id').lean();
      const gradeIds = grades.map((g) => g._id);
      if (gradeIds.length > 0) {
        const assignments = await TeacherAssignment.find({
          subjectId: subjectIdStr,
          teacherId: teacherIdStr,
          gradeId: { $in: gradeIds },
        })
          .populate('teacherId', 'name profileImage')
          .populate('subjectId', 'name nameAr icon color')
          .populate('gradeId', 'name nameAr stageId')
          .lean();

        assignment = assignments.find((a) => a.isPrimary) ?? assignments[0];
      }
    }

    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    const normalizedSubjectId = typeof assignment.subjectId === 'object'
      ? String((assignment.subjectId as any)?._id ?? assignment.subjectId)
      : String(assignment.subjectId);
    const normalizedGradeId = typeof assignment.gradeId === 'object'
      ? String((assignment.gradeId as any)?._id ?? assignment.gradeId)
      : String(assignment.gradeId);
    const normalizedTeacherId = typeof assignment.teacherId === 'object'
      ? String((assignment.teacherId as any)?._id ?? assignment.teacherId)
      : String(assignment.teacherId);

    if (typeof assignment.subjectId === 'object' || typeof assignment.gradeId === 'object' || typeof assignment.teacherId === 'object') {
      console.warn('[getSubjectTeacherContent] normalized populated assignment ids', {
        assignmentId: String(assignment._id),
        subjectId: normalizedSubjectId,
        gradeId: normalizedGradeId,
        teacherId: normalizedTeacherId,
      });
    }

    let units = await Unit.find({ assignmentId: assignment._id }).sort({ order: 1 }).lean();
    if (units.length === 0) {
      const legacyUnits = await Unit.find({
        $or: [{ assignmentId: { $exists: false } }, { assignmentId: null }],
        subjectId: normalizedSubjectId,
        gradeId: normalizedGradeId,
      }).sort({ order: 1 }).lean();

      if (legacyUnits.length > 0) {
        const legacyUnitIds = legacyUnits.map((unit) => unit._id);
        const legacyLessons = await Lesson.find({ unitId: { $in: legacyUnitIds } })
          .select('unitId teacherId')
          .lean();

        const lessonTeacherUnitIds = new Set(
          legacyLessons
            .filter((lesson: any) => String(lesson.teacherId) === normalizedTeacherId)
            .map((lesson: any) => String(lesson.unitId))
        );

        units = legacyUnits.filter((unit: any) =>
          String(unit.createdBy) === normalizedTeacherId || lessonTeacherUnitIds.has(String(unit._id))
        );
      }
    }

    console.log('[getSubjectTeacherContent] content debug', {
      subjectId: subjectIdStr,
      teacherId: teacherIdStr,
      gradeId: gradeId ?? null,
      assignmentId: String(assignment._id),
      unitsCount: units.length,
    });

    const unitIds = units.map((u) => u._id);
    let lessons = await Lesson.find({ unitId: { $in: unitIds }, isPublished: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    if (lessons.length === 0) {
      lessons = await Lesson.find({ unitId: { $in: unitIds } })
        .sort({ order: 1, createdAt: 1 })
        .lean();
    }

    let subjectAccess = false;
    const unitAccessIds = new Set<string>();
    let subscriptionStatus: 'Approved' | 'Pending' | 'None' = 'None';
    const pendingUnitIds: string[] = [];

    if (req.user?.role === 'Student') {
      const subs = await Subscription.find({
        studentId: req.user._id,
        teacherId: normalizedTeacherId,
        subjectId: normalizedSubjectId,
        gradeId: normalizedGradeId,
        status: 'Approved',
      }).lean();

      subjectAccess = subs.some((s: any) => s.type === 'subject');
      subs
        .filter((s: any) => s.type === 'unit' && s.unitId)
        .forEach((s: any) => unitAccessIds.add(String(s.unitId)));

      if (subjectAccess) {
        subscriptionStatus = 'Approved';
      } else {
        const pending = await SubscriptionRequest.find({
          studentId: req.user._id,
          teacherId: normalizedTeacherId,
          subjectId: normalizedSubjectId,
          gradeId: normalizedGradeId,
          status: 'Pending',
        }).lean();

        const hasPendingSubject = pending.some((p: any) => p.type === 'subject');
        if (hasPendingSubject) subscriptionStatus = 'Pending';

        pending
          .filter((p: any) => p.type === 'unit' && p.unitId)
          .forEach((p: any) => pendingUnitIds.push(String(p.unitId)));
      }
    }

    const lessonByUnit = new Map<string, any[]>();
    lessons.forEach((lesson: any) => {
      const key = String(lesson.unitId);
      if (!lessonByUnit.has(key)) lessonByUnit.set(key, []);
      lessonByUnit.get(key)!.push(lesson);
    });

    const payloadUnits = units.map((unit: any) => {
      const unitLessons = lessonByUnit.get(String(unit._id)) || [];
      const unitUnlocked = subjectAccess || unitAccessIds.has(String(unit._id));
      const firstLessonId = unitLessons[0]?._id ? String(unitLessons[0]._id) : null;
      const normalizedLessons = unitLessons.map((lesson: any) => {
        const isFree = firstLessonId ? String(lesson._id) === firstLessonId : false;
        const locked = req.user?.role === 'Student' ? !unitUnlocked && !isFree : false;
        if (!locked) {
          return { ...lesson, isFree, locked: false, isUnlocked: true };
        }
        return {
          _id: lesson._id,
          unitId: lesson.unitId,
          title: lesson.title,
          titleAr: lesson.titleAr,
          description: lesson.description,
          descriptionAr: lesson.descriptionAr,
          order: lesson.order,
          duration: lesson.duration,
          isPublished: lesson.isPublished,
          isFree,
          locked: true,
          isUnlocked: false,
        };
      });

      return {
        ...unit,
        isUnlocked: req.user?.role === 'Student' ? unitUnlocked : true,
        lessons: normalizedLessons,
      };
    });

    const anyUnitPrice = payloadUnits.some((unit: any) => Number(unit.price) > 0);
    const subjectPrice = anyUnitPrice
      ? payloadUnits.reduce((sum, unit: any) => sum + (Number(unit.price) || 0), 0)
      : 300;

    res.json({
      assignmentId: String(assignment._id),
      assignment,
      units: payloadUnits,
      pricing: { subject: subjectPrice },
      access: req.user?.role === 'Student'
        ? { subject: subjectAccess, unitIds: Array.from(unitAccessIds) }
        : undefined,
      subscriptionStatus,
      pendingUnitIds,
    });
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
    const { title, titleAr, description, descriptionAr, isPublished, price } = req.body;

    const link = await GradeSubject.findOne({ subjectId, gradeId });
    if (!link) {
      res.status(404).json({ message: 'This subject is not assigned to the specified grade' });
      return;
    }

    const count = await Unit.countDocuments({ subjectId, gradeId });
    
    const { assignmentId } = req.body;

    const baseData: Record<string, unknown> = {
      gradeSubjectId: link._id,
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      gradeId: new mongoose.Types.ObjectId(String(gradeId)),
      title,
      titleAr: titleAr ?? '',
      description: description ?? '',
      descriptionAr: descriptionAr ?? '',
      price: price !== undefined ? Number(price) || 0 : undefined,
      order: count + 1,
      isPublished: isPublished ?? false,
    };
    if (assignmentId) baseData.assignmentId = new mongoose.Types.ObjectId(String(assignmentId));

    const unitData = attachCreator(req, baseData);

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
    const { title, description, gradeId, assignmentId, price } = req.body;

    // gradeId is required because Units must be associated with a specific grade
    if (!gradeId) {
      res.status(400).json({ 
        message: 'gradeId is required. Units must be associated with a specific grade.' 
      });
      return;
    }

    // Find the GradeSubject junction record (may be null for new assignment-based flow)
    const gradeSubject = await GradeSubject.findOne({
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      gradeId: new mongoose.Types.ObjectId(String(gradeId)),
    });

    const count = await Unit.countDocuments({ subjectId, gradeId });

    const unitData: Record<string, unknown> = {
      subjectId: new mongoose.Types.ObjectId(String(subjectId)),
      gradeId: new mongoose.Types.ObjectId(String(gradeId)),
      title,
      description: description ?? '',
      price: price !== undefined ? Number(price) || 0 : undefined,
      order: count + 1,
    };

    if (gradeSubject) unitData.gradeSubjectId = gradeSubject._id;
    if (assignmentId) unitData.assignmentId = new mongoose.Types.ObjectId(String(assignmentId));

    const unit = await Unit.create(unitData);

    res.status(201).json(unit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
