import { Request, Response } from 'express';
import mongoose from 'mongoose';
import TeacherAssignment from '../models/TeacherAssignment';
import Unit from '../models/Unit';
import GradeSubject from '../models/GradeSubject';
import User from '../models/User';
import Grade from '../models/Grade';
import Lesson from '../models/Lesson';
import Quiz from '../models/Quiz';
import UnitEnrollment from '../models/UnitEnrollment';
import Subscription from '../models/Subscription';

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
export const getPublicAssignments = async (req: Request, res: Response) => {  try {
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

// ---------------------------------------------------------------------------
// @desc  Get teachers for a given subject+stage (student-facing)
// @route GET /api/teacher-assignments/by-subject-stage?subjectId=X&stageId=Y
// @access Private (any authenticated user)
// ---------------------------------------------------------------------------
export const getTeachersBySubjectStage = async (req: Request, res: Response) => {
  try {
    const { subjectId, stageId } = req.query as { subjectId?: string; stageId?: string };
    if (!subjectId || !stageId) {
      res.status(400).json({ message: 'subjectId and stageId are required' });
      return;
    }

    const grades = await Grade.find({ stageId }).select('_id').lean();
    const gradeIds = grades.map((g) => g._id);

    if (gradeIds.length === 0) {
      res.json([]);
      return;
    }

    const assignments = await TeacherAssignment.find({
      subjectId,
      gradeId: { $in: gradeIds },
    })
      .populate('teacherId', 'name email bio profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr stageId');

    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get assignment content (units + lessons) with access flags for students
// @route GET /api/teacher-assignments/:assignmentId/content
// @access Private (Student | Teacher | Admin)
// ---------------------------------------------------------------------------
export const getAssignmentContent = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await TeacherAssignment.findById(assignmentId)
      .populate('teacherId', 'name profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr stageId')
      .lean();

    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    const reqUser = (req as any).user;
    if (reqUser?.role === 'Teacher' && String(assignment.teacherId?._id || assignment.teacherId) !== String(reqUser._id)) {
      res.status(403).json({ message: 'Not authorized for this assignment' });
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
      console.warn('[getAssignmentContent] normalized populated assignment ids', {
        assignmentId,
        subjectId: normalizedSubjectId,
        gradeId: normalizedGradeId,
        teacherId: normalizedTeacherId,
      });
    }

    let units = await Unit.find({ assignmentId }).sort({ order: 1 }).lean();
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

    if (reqUser?.role === 'Student') {
      const subs = await Subscription.find({
        studentId: reqUser._id,
        teacherId: normalizedTeacherId,
        subjectId: normalizedSubjectId,
        gradeId: normalizedGradeId,
        status: 'Approved',
      }).lean();

      subjectAccess = subs.some((s: any) => s.type === 'subject');
      subs
        .filter((s: any) => s.type === 'unit' && s.unitId)
        .forEach((s: any) => unitAccessIds.add(String(s.unitId)));
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
        const locked = reqUser?.role === 'Student' ? !unitUnlocked && !isFree : false;
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
        isUnlocked: reqUser?.role === 'Student' ? unitUnlocked : true,
        lessons: normalizedLessons,
      };
    });

    res.json({
      assignment,
      units: payloadUnits,
      access: reqUser?.role === 'Student'
        ? { subject: subjectAccess, unitIds: Array.from(unitAccessIds) }
        : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Create a unit linked to a teacher assignment
// @route POST /api/teacher-assignments/:assignmentId/units
// @access Teacher (own) | Admin
// ---------------------------------------------------------------------------
export const createUnitForAssignment = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { title, titleAr, description, descriptionAr, isPublished, price } = req.body;

    if (!title) {
      res.status(400).json({ message: 'title is required' });
      return;
    }

    const assignment = await TeacherAssignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    // Verify teacher ownership unless admin
    const reqUser = (req as any).user;
    if (reqUser?.role === 'Teacher' && String(assignment.teacherId) !== String(reqUser._id)) {
      res.status(403).json({ message: 'Not authorized for this assignment' });
      return;
    }

    // Try to find GradeSubject junction (optional)
    const gradeSubject = await GradeSubject.findOne({
      subjectId: assignment.subjectId,
      gradeId: assignment.gradeId,
    });

    const count = await Unit.countDocuments({
      subjectId: assignment.subjectId,
      gradeId: assignment.gradeId,
    });

    const unitData: Record<string, unknown> = {
      assignmentId: new mongoose.Types.ObjectId(String(assignmentId)),
      subjectId: assignment.subjectId,
      gradeId: assignment.gradeId,
      title,
      titleAr: titleAr ?? '',
      description: description ?? '',
      descriptionAr: descriptionAr ?? '',
      price: price !== undefined ? Number(price) || 0 : undefined,
      order: count + 1,
      isPublished: isPublished ?? false,
      createdBy: reqUser?._id,
    };
    if (gradeSubject) unitData.gradeSubjectId = gradeSubject._id;

    const unit = await Unit.create(unitData);
    res.status(201).json(unit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get units for a teacher assignment
// @route GET /api/teacher-assignments/:assignmentId/units
// @access Teacher (own) | Admin
// ---------------------------------------------------------------------------
export const getUnitsForAssignment = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await TeacherAssignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    const units = await Unit.find({ assignmentId }).sort({ order: 1 });
    res.json(units);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get dashboard statistics for the logged-in teacher
// @route GET /api/teacher-assignments/dashboard
// @access Teacher
// ---------------------------------------------------------------------------
export const getTeacherDashboard = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user._id;

    // 1. Teacher assignments → unique subjects, grades
    const assignments = await TeacherAssignment.find({ teacherId }).lean();
    const assignmentIds = assignments.map((a) => a._id);
    const subjectIds = [...new Set(assignments.map((a) => String(a.subjectId)))];
    const gradeIds = [...new Set(assignments.map((a) => String(a.gradeId)))];

    // 2. Unique stages from grades
    const grades = await Grade.find({ _id: { $in: gradeIds } }).select('stageId').lean();
    const stageIds = [...new Set(grades.map((g) => String(g.stageId)).filter(Boolean))];

    // 3. Units owned by this teacher (linked via assignmentId)
    const units = await Unit.find({ assignmentId: { $in: assignmentIds } })
      .select('_id createdAt')
      .lean();
    const unitIds = units.map((u) => u._id);

    // 4. Lessons in those units
    const lessons = await Lesson.find({ unitId: { $in: unitIds } })
      .select('_id createdAt')
      .lean();
    const lessonIds = lessons.map((l) => l._id);

    // 5. Quizzes linked to those lessons
    const quizzesCount = await Quiz.countDocuments({ lessonId: { $in: lessonIds } });

    // 6. Unique students enrolled in teacher's units
    const studentIdList =
      unitIds.length > 0
        ? await UnitEnrollment.distinct('studentId', { unitId: { $in: unitIds } })
        : [];

    // 7. Student growth — distinct enrolled students grouped by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const studentGrowth =
      unitIds.length > 0
        ? await UnitEnrollment.aggregate([
            { $match: { unitId: { $in: unitIds }, createdAt: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                students: { $addToSet: '$studentId' },
              },
            },
            {
              $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                count: { $size: '$students' },
              },
            },
            { $sort: { year: 1, month: 1 } },
          ])
        : [];

    // 8. Content stats — lessons created per month (last 6 months)
    const contentStats =
      lessonIds.length > 0
        ? await Lesson.aggregate([
            { $match: { unitId: { $in: unitIds }, createdAt: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                count: 1,
              },
            },
            { $sort: { year: 1, month: 1 } },
          ])
        : [];

    res.json({
      studentsCount: studentIdList.length,
      subjectsCount: subjectIds.length,
      stagesCount: stageIds.length,
      unitsCount: units.length,
      lessonsCount: lessons.length,
      quizzesCount,
      studentGrowth,
      contentStats,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
