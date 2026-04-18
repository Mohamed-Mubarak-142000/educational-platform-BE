import { Request, Response } from 'express';
import mongoose from 'mongoose';
import TeacherApplication from '../models/TeacherApplication';
import TeacherAssignment from '../models/TeacherAssignment';
import Grade from '../models/Grade';
import User from '../models/User';
import sendEmail from '../utils/sendEmail';
import {
  teacherApplicationReceivedTemplate,
  teacherApplicationAcceptedTemplate,
  teacherApplicationRejectedTemplate,
  teacherEvaluationScheduledTemplate,
} from '../utils/emailTemplates';

export const getTeacherApplications = async (_req: Request, res: Response) => {
  try {
    const applications = await TeacherApplication.find({}).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitTeacherApplication = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, profileImageUrl, cvUrl, bio, stageId, stageIds, subjectIds, gradeIds, availableDays, availableHours } = req.body;
    const application = await TeacherApplication.create({
      name,
      email,
      phone,
      profileImageUrl,
      cvUrl,
      bio: bio || '',
      stageId: stageId || undefined,
      stageIds: Array.isArray(stageIds) ? stageIds : (stageId ? [stageId] : []),
      subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
      gradeIds: Array.isArray(gradeIds) ? gradeIds : [],
      availableDays: availableDays || [],
      availableHours: availableHours || {},
      status: 'Pending',
    });

    const emailContent = teacherApplicationReceivedTemplate(name);
    try {
      await sendEmail({
        email,
        subject: emailContent.subject,
        message: emailContent.text,
        html: emailContent.html,
      });
    } catch (error) {
      console.error('Teacher application email failed:', error);
    }

    res.status(201).json(application);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const reviewTeacherApplication = async (req: Request, res: Response) => {
  try {
    const application = await TeacherApplication.findById(req.params.id);
    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }
    const { action, zoomLink, rejectionReason } = req.body;
    if (action === 'evaluate') {
      application.status = 'Under Evaluation';
      if (zoomLink) application.zoomLink = zoomLink;
      const updated = await application.save();
      if (zoomLink) {
        const template = teacherEvaluationScheduledTemplate(application.name, zoomLink);
        try {
          await sendEmail({
            email: application.email,
            subject: template.subject,
            message: template.text,
            html: template.html,
          });
        } catch (error) {
          console.error('Teacher evaluation email failed:', error);
        }
      }
      res.json(updated);
      return;
    }
    if (action === 'accept') {
      const existingUser = await User.findOne({ email: application.email });
      if (existingUser) {
        res.status(409).json({ message: 'A user with this email already exists.' });
        return;
      }

      const tempPassword = 'Academix123456';

      // Resolve stageIds and subjectIds
      const appStageIds = Array.isArray(application.stageIds) && application.stageIds.length > 0
        ? application.stageIds
        : application.stageId
        ? [application.stageId]
        : [];
      const appSubjectIds = Array.isArray(application.subjectIds) ? application.subjectIds : [];
      const appGradeIds = Array.isArray((application as any).gradeIds) ? (application as any).gradeIds : [];

      // ── Create Teacher User ──────────────────────────────────────
      const teacher = await User.create({
        name: application.name,
        email: application.email,
        password: tempPassword,
        role: 'Teacher',
        isVerified: true,
        mustChangePassword: true,
        phone: application.phone,
        bio: application.bio || '',
        profileImage: application.profileImageUrl || undefined,
        cvUrl: application.cvUrl || undefined,
        stageId: appStageIds[0] || undefined,
        stageIds: appStageIds.map((id: string) => new mongoose.Types.ObjectId(String(id))),
        subjectIds: appSubjectIds.map((id: string) => new mongoose.Types.ObjectId(String(id))),
        availableDays: Array.isArray(application.availableDays) ? application.availableDays : [],
        availableHours: application.availableHours || {},
      });

      // ── Auto-create TeacherAssignments ───────────────────────────
      // Determine gradeIds: use those from the application, or fall back to
      // all grades that belong to the teacher's stages.
      let resolvedGradeIds: string[] = appGradeIds;
      if (!resolvedGradeIds.length && appStageIds.length > 0) {
        const grades = await Grade.find({ stageId: { $in: appStageIds } }).select('_id').lean();
        resolvedGradeIds = grades.map((g) => String(g._id));
      }

      // Create one assignment per (subjectId × gradeId) — skip duplicates silently
      for (const subjectId of appSubjectIds) {
        for (const gradeId of resolvedGradeIds) {
          try {
            await TeacherAssignment.create({
              teacherId: new mongoose.Types.ObjectId(String(teacher._id)),
              subjectId: new mongoose.Types.ObjectId(String(subjectId)),
              gradeId: new mongoose.Types.ObjectId(String(gradeId)),
              isPrimary: false,
            });
          } catch (err: any) {
            if (err.code !== 11000) throw err; // ignore duplicate key
          }
        }
      }

      // ── Delete application — teacher now lives in users only ───────────────
      await application.deleteOne();

      const template = teacherApplicationAcceptedTemplate(teacher.name, teacher.email, tempPassword, teacher.subject);
      try {
        await sendEmail({
          email: teacher.email,
          subject: template.subject,
          message: template.text,
          html: template.html,
        });
      } catch (error) {
        console.error('Teacher invite email failed:', error);
      }

      res.json({ message: 'Teacher account created.', teacherId: teacher._id });
      return;
    }
    if (action === 'reject') {
      application.status = 'Rejected';
      if (rejectionReason) application.rejectionReason = rejectionReason;
      const updated = await application.save();
      const template = teacherApplicationRejectedTemplate(application.name, rejectionReason);
      try {
        await sendEmail({
          email: application.email,
          subject: template.subject,
          message: template.text,
          html: template.html,
        });
      } catch (error) {
        console.error('Teacher rejection email failed:', error);
      }
      res.json(updated);
      return;
    }

    res.status(400).json({ message: 'Invalid action. Use "evaluate", "accept", or "reject".' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadTeacherApplicationFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const uploadedFile = req.file as Express.Multer.File & { path?: string; filename?: string; secure_url?: string };
    const isDocument = uploadedFile.mimetype === 'application/pdf'
      || uploadedFile.originalname.toLowerCase().endsWith('.pdf')
      || uploadedFile.originalname.toLowerCase().endsWith('.doc')
      || uploadedFile.originalname.toLowerCase().endsWith('.docx');
    const resourceType = uploadedFile.mimetype?.startsWith('video/') || uploadedFile.mimetype?.startsWith('audio/')
      ? 'video'
      : uploadedFile.mimetype?.startsWith('image/')
      ? 'image'
      : 'raw';
    const baseUrl = uploadedFile.path || uploadedFile.secure_url || '';
    const fileUrl = isDocument
      ? baseUrl.replace('/image/upload/', '/raw/upload/').replace('/video/upload/', '/raw/upload/')
      : baseUrl;

    res.json({
      url: fileUrl,
      public_id: uploadedFile.filename,
      format: uploadedFile.mimetype,
      resource_type: resourceType,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error uploading file' });
  }
};
