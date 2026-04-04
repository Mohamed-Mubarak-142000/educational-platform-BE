import { Request, Response } from 'express';
import TeacherApplication from '../models/TeacherApplication';

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
    const { name, email, phone, profileImageUrl, cvUrl, availableDays, availableHours } = req.body;
    const application = await TeacherApplication.create({
      name,
      email,
      phone,
      profileImageUrl,
      cvUrl,
      availableDays: availableDays || [],
      availableHours: availableHours || {},
      status: 'Pending',
    });
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
    if (action === 'accept') {
      application.status = 'Accepted';
      if (zoomLink) application.zoomLink = zoomLink;
    } else if (action === 'reject') {
      application.status = 'Rejected';
      if (rejectionReason) application.rejectionReason = rejectionReason;
    } else {
      res.status(400).json({ message: 'Invalid action. Use "accept" or "reject".' });
      return;
    }
    const updated = await application.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
