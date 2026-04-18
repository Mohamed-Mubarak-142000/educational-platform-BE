import { Request, Response } from 'express';
import Progress from '../models/Progress';
import UnitProgress from '../models/UnitProgress';
import SubjectProgress from '../models/SubjectProgress';
import Lesson from '../models/Lesson';
import Unit from '../models/Unit';
import { canAccessLesson } from '../utils/subscriptionAccess';

// ---------------------------------------------------------------------------
// Helper: recompute and upsert UnitProgress after a lesson is completed
// ---------------------------------------------------------------------------
async function syncUnitProgress(studentId: string, unitId: string) {
  const totalLessons = await Lesson.countDocuments({ unitId, isPublished: true });
  const completedLessons = await Progress.find({ studentId, completed: true }).select('lessonId');
  const completedLessonIds = completedLessons.map((p) => p.lessonId);

  // Filter to only lessons belonging to this unit
  const unitLessonDocs = await Lesson.find({ unitId, _id: { $in: completedLessonIds } }).select('_id');
  const unitLessonIds = unitLessonDocs.map((l) => l._id);

  // findOneAndUpdate won't trigger pre-save hooks, so we upsert then save separately
  let doc = await UnitProgress.findOne({ studentId, unitId });
  const pct = totalLessons > 0 ? Math.round((unitLessonIds.length / totalLessons) * 100) : 0;
  if (!doc) {
    doc = new UnitProgress({ studentId, unitId, completedLessonIds: unitLessonIds, totalLessons, percentage: pct, lastAccessedAt: new Date() });
  } else {
    doc.completedLessonIds = unitLessonIds as any;
    doc.totalLessons = totalLessons;
    doc.percentage = pct;
    doc.lastAccessedAt = new Date();
  }
  await doc.save();
}

// Helper: recompute SubjectProgress after a unit is fully completed
async function syncSubjectProgress(studentId: string, subjectId: string, gradeId: string) {
  const totalUnits = await Unit.countDocuments({ subjectId, gradeId, isPublished: true });

  const unitDocs = await Unit.find({ subjectId, gradeId }).select('_id');
  const unitIds = unitDocs.map((u) => u._id.toString());

  const unitProgresses = await UnitProgress.find({
    studentId,
    unitId: { $in: unitIds },
    percentage: 100,
  }).select('unitId');

  const completedUnitIds = unitProgresses.map((up) => up.unitId);

  let doc = await SubjectProgress.findOne({ studentId, subjectId, gradeId });
  const pct = totalUnits > 0 ? Math.round((completedUnitIds.length / totalUnits) * 100) : 0;
  if (!doc) {
    doc = new SubjectProgress({ studentId, subjectId, gradeId, completedUnitIds, totalUnits, percentage: pct, lastAccessedAt: new Date() });
  } else {
    doc.completedUnitIds = completedUnitIds as any;
    doc.totalUnits = totalUnits;
    doc.percentage = pct;
    doc.lastAccessedAt = new Date();
  }
  await doc.save();
}

// ---------------------------------------------------------------------------
// @desc  Upsert lesson progress (watchedPercentage + completed flag)
// @route POST /api/progress/lesson
// @access Protected (Student)
// ---------------------------------------------------------------------------
export const updateLessonProgress = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user._id.toString();
    const { lessonId, watchedPercentage, completedPartId } = req.body;

    if (!lessonId) {
      res.status(400).json({ message: 'lessonId is required' });
      return;
    }

    const access = await canAccessLesson({ studentId, lessonId });
    if (!access.allowed) {
      res.status(403).json({ message: 'Lesson locked' });
      return;
    }

    const watched = Number(watchedPercentage ?? 0);
    const completed = watched >= 90;

    const update: Record<string, unknown> = {
      $set: { watchedPercentage: watched, completed, lastAccessedAt: new Date() },
    };
    if (completedPartId) {
      (update as any)['$addToSet'] = { completedPartIds: completedPartId };
    }

    const progress = await Progress.findOneAndUpdate(
      { studentId, lessonId },
      update,
      { upsert: true, new: true }
    );

    // Cascade sync upward
    const lesson = await Lesson.findById(lessonId).select('unitId');
    if (lesson?.unitId) {
      const unitId = lesson.unitId.toString();
      await syncUnitProgress(studentId, unitId);

      const unitProg = await UnitProgress.findOne({ studentId, unitId }).select('percentage');
      if (unitProg?.percentage === 100) {
        const unit = await Unit.findById(unitId).select('subjectId gradeId');
        if (unit) {
          await syncSubjectProgress(
            studentId,
            unit.subjectId.toString(),
            unit.gradeId.toString()
          );
        }
      }
    }

    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get overall progress for the logged-in student
// @route GET /api/progress
// @access Protected (Student)
// ---------------------------------------------------------------------------
export const getMyProgress = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user._id;

    const [lessonProgresses, unitProgresses, subjectProgresses] = await Promise.all([
      Progress.find({ studentId }).populate('lessonId', 'title unitId'),
      UnitProgress.find({ studentId }).populate('unitId', 'title subjectId gradeId'),
      SubjectProgress.find({ studentId })
        .populate('subjectId', 'name nameAr icon color')
        .populate('gradeId', 'name nameAr'),
    ]);

    res.json({ lessonProgresses, unitProgresses, subjectProgresses });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get progress for a specific unit
// @route GET /api/progress/unit/:unitId
// @access Protected (Student)
// ---------------------------------------------------------------------------
export const getUnitProgress = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user._id;
    const { unitId } = req.params;

    const progress = await UnitProgress.findOne({ studentId, unitId });
    res.json(progress ?? { unitId, percentage: 0, completedLessonIds: [] });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Get progress for a specific subject+grade
// @route GET /api/progress/subject/:subjectId/grade/:gradeId
// @access Protected (Student)
// ---------------------------------------------------------------------------
export const getSubjectProgress = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user._id;
    const { subjectId, gradeId } = req.params;

    const progress = await SubjectProgress.findOne({ studentId, subjectId, gradeId });
    res.json(progress ?? { subjectId, gradeId, percentage: 0, completedUnitIds: [] });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Admin/Teacher: get all students' progress for a unit
// @route GET /api/progress/unit/:unitId/all
// @access Admin | Teacher
// ---------------------------------------------------------------------------
export const getUnitProgressAll = async (req: Request, res: Response) => {
  try {
    const progresses = await UnitProgress.find({ unitId: req.params.unitId })
      .populate('studentId', 'name email profileImage');
    res.json(progresses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
