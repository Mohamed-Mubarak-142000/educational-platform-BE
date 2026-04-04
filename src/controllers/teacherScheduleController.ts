import { Request, Response } from 'express';
import TeacherSchedule from '../models/TeacherSchedule';

export const getSchedules = async (_req: Request, res: Response) => {
  try {
    const schedules = await TeacherSchedule.find({ isActive: true })
      .populate('teacherId', 'name email')
      .populate('subjectId', 'name')
      .sort({ day: 1, startTime: 1 });
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSchedulesBySubject = async (req: Request, res: Response) => {
  try {
    const schedules = await TeacherSchedule.find({ subjectId: req.params.subjectId as string, isActive: true })
      .populate('teacherId', 'name email')
      .populate('subjectId', 'name')
      .sort({ day: 1, startTime: 1 });
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentSchedules = async (req: any, res: Response) => {
  try {
    const studentId = req.user._id;
    const schedules = await TeacherSchedule.find({ enrolledStudents: studentId, isActive: true })
      .populate<{ teacherId: { _id: any; name: string } }>('teacherId', 'name')
      .populate<{ subjectId: { _id: any; name: string } }>('subjectId', 'name')
      .sort({ day: 1, startTime: 1 });

    const result = schedules.map((s) => ({
      _id: s._id,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      maxStudents: s.maxStudents,
      enrolledStudents: s.enrolledStudents,
      isActive: s.isActive,
      teacherName: (s.teacherId as any)?.name ?? 'Unknown',
      subjectName: (s.subjectId as any)?.name ?? 'Unknown',
    }));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSchedulesByTeacher = async (req: Request, res: Response) => {
  try {
    const schedules = await TeacherSchedule.find({ teacherId: req.params.teacherId })
      .populate('subjectId', 'name')
      .sort({ day: 1, startTime: 1 });
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { teacherId, subjectId, day, startTime, endTime, maxStudents } = req.body;
    const schedule = await TeacherSchedule.create({
      teacherId,
      subjectId,
      day,
      startTime,
      endTime,
      maxStudents: maxStudents || 10,
      enrolledStudents: [],
      isActive: true,
    });
    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const schedule = await TeacherSchedule.findById(req.params.id);
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }
    const { day, startTime, endTime, maxStudents, isActive } = req.body;
    if (day !== undefined) schedule.day = day;
    if (startTime !== undefined) schedule.startTime = startTime;
    if (endTime !== undefined) schedule.endTime = endTime;
    if (maxStudents !== undefined) schedule.maxStudents = maxStudents;
    if (isActive !== undefined) schedule.isActive = isActive;
    const updated = await schedule.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const schedule = await TeacherSchedule.findById(req.params.id);
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }
    await schedule.deleteOne();
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const enrollInSchedule = async (req: any, res: Response) => {
  try {
    const schedule = await TeacherSchedule.findById(req.params.id);
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }
    const studentId = req.user._id;
    if (schedule.enrolledStudents.some((id) => String(id) === String(studentId))) {
      res.status(400).json({ message: 'Already enrolled in this schedule' });
      return;
    }
    if (schedule.enrolledStudents.length >= schedule.maxStudents) {
      res.status(400).json({ message: 'Schedule is full' });
      return;
    }
    schedule.enrolledStudents.push(studentId);
    await schedule.save();
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
