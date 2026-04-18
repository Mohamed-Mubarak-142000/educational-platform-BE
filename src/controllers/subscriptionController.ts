import { Request, Response } from 'express';
import Subscription from '../models/Subscription';
import SubscriptionRequest from '../models/SubscriptionRequest';
import TeacherAssignment from '../models/TeacherAssignment';
import Unit from '../models/Unit';
import UnitEnrollment from '../models/UnitEnrollment';

// ---------------------------------------------------------------------------
// @desc  Student creates a subscription request
// @route POST /api/subscriptions/requests
// @access Student
// ---------------------------------------------------------------------------
export const createSubscriptionRequest = async (req: any, res: Response) => {
  try {
    if (req.user?.role !== 'Student') {
      res.status(403).json({ message: 'Only students can request subscriptions' });
      return;
    }

    const { teacherId, subjectId, gradeId, unitId, paymentMethod, paymentProofUrl, type } = req.body;

    if (!teacherId || !subjectId || !gradeId || !paymentMethod || !paymentProofUrl || !type) {
      res.status(400).json({ message: 'Missing subscription request details' });
      return;
    }

    if (type !== 'subject' && type !== 'unit') {
      res.status(400).json({ message: 'Invalid subscription type' });
      return;
    }

    const assignment = await TeacherAssignment.findOne({ teacherId, subjectId, gradeId });
    if (!assignment) {
      res.status(404).json({ message: 'Teacher is not assigned to this subject/grade' });
      return;
    }

    if (type === 'unit' && !unitId) {
      res.status(400).json({ message: 'unitId is required for unit subscriptions' });
      return;
    }

    if (unitId) {
      const unit = await Unit.findById(unitId).select('subjectId gradeId assignmentId');
      if (!unit) {
        res.status(404).json({ message: 'Unit not found' });
        return;
      }
      if (String(unit.subjectId) !== String(subjectId) || String(unit.gradeId) !== String(gradeId)) {
        res.status(400).json({ message: 'Unit does not belong to this subject/grade' });
        return;
      }
      if (unit.assignmentId && String(unit.assignmentId) !== String(assignment._id)) {
        res.status(400).json({ message: 'Unit does not belong to this teacher assignment' });
        return;
      }
    }

    const existing = await SubscriptionRequest.findOne({
      studentId: req.user._id,
      teacherId,
      subjectId,
      gradeId,
      unitId: unitId || undefined,
      type,
      status: 'Pending',
    });

    if (existing) {
      res.json(existing);
      return;
    }

    const request = await SubscriptionRequest.create({
      studentId: req.user._id,
      teacherId,
      subjectId,
      gradeId,
      unitId: unitId || undefined,
      type,
      paymentMethod,
      paymentProofUrl,
      status: 'Pending',
    });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student gets own subscription requests
// @route GET /api/subscriptions/requests/mine
// @access Student
// ---------------------------------------------------------------------------
export const getMySubscriptionRequests = async (req: any, res: Response) => {
  try {
    const requests = await SubscriptionRequest.find({ studentId: req.user._id })
      .populate('teacherId', 'name profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr')
      .populate('unitId', 'title')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Teacher gets pending subscription requests
// @route GET /api/subscriptions/requests/teacher
// @access Teacher
// ---------------------------------------------------------------------------
export const getTeacherSubscriptionRequests = async (req: any, res: Response) => {
  try {
    const status = (req.query.status as string) || 'Pending';

    const requests = await SubscriptionRequest.find({
      teacherId: req.user._id,
      status,
    })
      .populate('studentId', 'name email profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr')
      .populate('unitId', 'title')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Teacher approves a subscription request
// @route POST /api/subscriptions/requests/:id/approve
// @access Teacher
// ---------------------------------------------------------------------------
export const approveSubscriptionRequest = async (req: any, res: Response) => {
  try {
    const request = await SubscriptionRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (String(request.teacherId) !== String(req.user._id)) {
      res.status(403).json({ message: 'Not authorized to approve this request' });
      return;
    }

    request.status = 'Approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const subscription = await Subscription.findOneAndUpdate(
      {
        studentId: request.studentId,
        teacherId: request.teacherId,
        subjectId: request.subjectId,
        gradeId: request.gradeId,
        unitId: request.type === 'unit' ? request.unitId : undefined,
        type: request.type,
      },
      {
        studentId: request.studentId,
        teacherId: request.teacherId,
        subjectId: request.subjectId,
        gradeId: request.gradeId,
        unitId: request.type === 'unit' ? request.unitId : undefined,
        type: request.type,
        status: 'Approved',
      },
      { upsert: true, new: true }
    );

    if (request.type === 'unit' && request.unitId) {
      await UnitEnrollment.findOneAndUpdate(
        { studentId: request.studentId, unitId: request.unitId },
        { studentId: request.studentId, unitId: request.unitId },
        { upsert: true, new: true }
      );
    }

    res.json({ request, subscription });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Teacher rejects a subscription request
// @route POST /api/subscriptions/requests/:id/reject
// @access Teacher
// ---------------------------------------------------------------------------
export const rejectSubscriptionRequest = async (req: any, res: Response) => {
  try {
    const request = await SubscriptionRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (String(request.teacherId) !== String(req.user._id)) {
      res.status(403).json({ message: 'Not authorized to reject this request' });
      return;
    }

    request.status = 'Rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    if (req.body?.rejectionReason !== undefined) {
      request.rejectionReason = req.body.rejectionReason;
    }
    await request.save();

    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc  Student gets approved subscriptions
// @route GET /api/subscriptions/mine
// @access Student
// ---------------------------------------------------------------------------
export const getMySubscriptions = async (req: any, res: Response) => {
  try {
    const filters: Record<string, unknown> = { studentId: req.user._id, status: 'Approved' };
    if (req.query.subjectId) filters.subjectId = req.query.subjectId;
    if (req.query.teacherId) filters.teacherId = req.query.teacherId;
    if (req.query.gradeId) filters.gradeId = req.query.gradeId;

    const subs = await Subscription.find(filters)
      .populate('teacherId', 'name profileImage')
      .populate('subjectId', 'name nameAr icon color')
      .populate('gradeId', 'name nameAr')
      .populate('unitId', 'title')
      .sort({ createdAt: -1 });

    res.json(subs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
