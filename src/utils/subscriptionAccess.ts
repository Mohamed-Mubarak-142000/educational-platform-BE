import Subscription from '../models/Subscription';
import Unit from '../models/Unit';
import Lesson from '../models/Lesson';
import TeacherAssignment from '../models/TeacherAssignment';

export type SubscriptionScope = {
  subjectAccess: boolean;
  unitAccessIds: Set<string>;
};

export const isLessonFreePreview = (_unitOrder: number, lessonOrder: number) =>
  lessonOrder === 1;

export const getStudentSubscriptionScope = async (params: {
  studentId: string;
  teacherId: string;
  subjectId: string;
  gradeId: string;
}): Promise<SubscriptionScope> => {
  const subs = await Subscription.find({
    studentId: params.studentId,
    teacherId: params.teacherId,
    subjectId: params.subjectId,
    gradeId: params.gradeId,
    status: 'Approved',
  }).lean();

  const subjectAccess = subs.some((s: any) => s.type === 'subject');
  const unitAccessIds = new Set(
    subs.filter((s: any) => s.type === 'unit' && s.unitId).map((s: any) => String(s.unitId))
  );

  return { subjectAccess, unitAccessIds };
};

export const canAccessLesson = async (params: {
  studentId: string;
  lessonId: string;
}): Promise<{ allowed: boolean; reason?: string; lesson?: any; unit?: any }> => {
  const lesson = await Lesson.findById(params.lessonId).lean();
  if (!lesson || !lesson.unitId) {
    return { allowed: false, reason: 'Lesson not found', lesson };
  }

  const unit = await Unit.findById(lesson.unitId).lean();
  if (!unit) {
    return { allowed: false, reason: 'Unit not found', lesson, unit };
  }

  if (isLessonFreePreview(unit.order ?? 0, lesson.order ?? 0)) {
    return { allowed: true, lesson, unit };
  }

  const firstLesson = await Lesson.find({ unitId: unit._id })
    .sort({ order: 1, createdAt: 1 })
    .select('_id')
    .limit(1)
    .lean();
  if (firstLesson[0]?._id && String(firstLesson[0]._id) === String(lesson._id)) {
    return { allowed: true, lesson, unit };
  }

  let teacherId: string | undefined;
  if (unit.assignmentId) {
    const assignment = await TeacherAssignment.findById(unit.assignmentId).select('teacherId').lean();
    teacherId = assignment ? String(assignment.teacherId) : undefined;
  }
  if (!teacherId && lesson.teacherId) {
    teacherId = String(lesson.teacherId);
  }

  if (!teacherId) {
    return { allowed: false, reason: 'Teacher not resolved', lesson, unit };
  }

  const scope = await getStudentSubscriptionScope({
    studentId: params.studentId,
    teacherId,
    subjectId: String(unit.subjectId),
    gradeId: String(unit.gradeId),
  });

  const unitId = String(unit._id);
  if (scope.subjectAccess || scope.unitAccessIds.has(unitId)) {
    return { allowed: true, lesson, unit };
  }

  return { allowed: false, reason: 'Subscription required', lesson, unit };
};
