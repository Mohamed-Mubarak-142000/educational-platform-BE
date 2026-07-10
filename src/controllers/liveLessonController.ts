import { Request, Response } from "express";
import LiveLessonRequest from "../models/LiveLessonRequest";
import LiveSession from "../models/LiveSession";
import User from "../models/User";
import Payment from "../models/Payment";
import mongoose from "mongoose";

// ────────────── STUDENT ENDPOINTS ──────────────

/**
 * Create a live lesson request
 * POST /api/live-lessons/request
 */
export const createLiveLessonRequest = async (req: any, res: Response) => {
  try {
    const studentId = req.user._id;
    const {
      teacherId,
      subjectId,
      gradeId,
      requestType,
      preferredDateTime,
      duration,
      description,
      urgencyLevel,
    } = req.body;

    // Validate teacher exists and is available
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "Teacher") {
      res.status(404).json({ message: "Teacher not found" });
      return;
    }

    // Check teacher availability for instant lessons
    if (requestType === "instant" && !teacher.isAvailableForInstantLessons) {
      res
        .status(400)
        .json({ message: "Teacher is not available for instant lessons" });
      return;
    }

    // Calculate price based on duration and urgency
    const pricePerHour = teacher.instantLessonPricePerHour || 100;
    const durationHours = duration / 60;
    let price = pricePerHour * durationHours;

    // Surge pricing for urgency
    if (urgencyLevel === "critical") {
      price *= 1.5;
    } else if (urgencyLevel === "high") {
      price *= 1.25;
    }

    // Set expiry time for instant requests (30 minutes)
    let expiresAt: Date | undefined;
    if (requestType === "instant") {
      expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    }

    // Create the request
    const request = await LiveLessonRequest.create({
      studentId,
      teacherId,
      subjectId,
      gradeId,
      requestType,
      preferredDateTime:
        requestType === "scheduled" ? preferredDateTime : new Date(),
      duration,
      description,
      urgencyLevel,
      priceEGP: Math.round(price),
      status: "pending",
      paymentStatus: "pending",
      expiresAt,
    });

    // Populate for response
    const populatedRequest = await LiveLessonRequest.findById(request._id)
      .populate("studentId", "name email profileImage")
      .populate(
        "teacherId",
        "name email profileImage instantLessonPricePerHour",
      )
      .populate("subjectId", "name nameAr icon")
      .populate("gradeId", "name nameAr");

    res.status(201).json(populatedRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get student's lesson requests
 * GET /api/live-lessons/my-requests
 */
export const getMyRequests = async (req: any, res: Response) => {
  try {
    const studentId = req.user._id;
    const { status } = req.query;

    const filter: any = { studentId };
    if (status) {
      filter.status = status;
    }

    const requests = await LiveLessonRequest.find(filter)
      .populate("teacherId", "name email profileImage")
      .populate("subjectId", "name nameAr icon")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cancel a lesson request
 * DELETE /api/live-lessons/requests/:requestId
 */
export const cancelRequest = async (req: any, res: Response) => {
  try {
    const studentId = req.user._id;
    const { requestId } = req.params;

    const request = await LiveLessonRequest.findById(requestId);
    if (!request) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    // Only student who created can cancel
    if (String(request.studentId) !== String(studentId)) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    // Can only cancel pending or accepted requests
    if (!["pending", "accepted"].includes(request.status)) {
      res.status(400).json({ message: "Cannot cancel this request" });
      return;
    }

    request.status = "cancelled";
    // Bookkeeping only, matching the existing admin refund flow — this
    // platform doesn't call Paymob's refund API anywhere yet, it just marks
    // the records so an admin knows a manual refund is owed.
    if (request.paymentStatus === "paid") {
      request.paymentStatus = "refunded";
      if (request.paymentId) {
        await Payment.findByIdAndUpdate(request.paymentId, {
          status: "refunded",
          refundedAt: new Date(),
          refundReason: "Live lesson request cancelled by student",
        });
      }
    }
    await request.save();

    res.json({ message: "Request cancelled successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get student's live sessions
 * GET /api/live-lessons/my-sessions
 */
export const getMySessions = async (req: any, res: Response) => {
  try {
    const studentId = req.user._id;
    const { status } = req.query;

    const filter: any = { studentId };
    if (status) {
      filter.status = status;
    }

    const sessions = await LiveSession.find(filter)
      .populate("teacherId", "name email profileImage")
      .populate("subjectId", "name nameAr icon")
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────── TEACHER ENDPOINTS ──────────────

/**
 * Get pending lesson requests for teacher
 * GET /api/live-lessons/pending-requests
 */
export const getPendingRequests = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;

    const requests = await LiveLessonRequest.find({
      teacherId,
      status: "pending",
    })
      .populate("studentId", "name email profileImage gradeId")
      .populate("subjectId", "name nameAr icon")
      .populate("gradeId", "name nameAr")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Accept a lesson request
 * POST /api/live-lessons/requests/:requestId/accept
 */
export const acceptRequest = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;
    const { requestId } = req.params;
    const { proposedStartTime, sessionNotes } = req.body;

    const request = await LiveLessonRequest.findById(requestId);
    if (!request) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    // Verify this request is for this teacher
    if (String(request.teacherId) !== String(teacherId)) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    // Check request status
    if (request.status !== "pending") {
      res.status(400).json({ message: "Request is no longer pending" });
      return;
    }

    // Check payment status
    if (request.paymentStatus !== "paid") {
      res.status(400).json({ message: "Payment not confirmed" });
      return;
    }

    // Calculate session times
    const startTime = proposedStartTime
      ? new Date(proposedStartTime)
      : request.requestType === "instant"
        ? new Date(Date.now() + 5 * 60 * 1000)
        : request.preferredDateTime || new Date();
    const endTime = new Date(
      startTime.getTime() + request.duration * 60 * 1000,
    );

    // Generate meeting link (placeholder - integrate with Zoom/Meet API)
    const meetingId = `${teacherId}-${Date.now()}`;
    const meetingLink = `https://meet.academix.com/${meetingId}`; // Placeholder
    const meetingPassword = Math.random().toString(36).substring(7);

    // Update request
    request.status = "accepted";
    request.sessionStartTime = startTime;
    request.sessionEndTime = endTime;
    request.meetingLink = meetingLink;
    request.meetingId = meetingId;
    request.meetingPassword = meetingPassword;
    request.teacherNotes = sessionNotes;
    await request.save();

    // Create live session
    const session = await LiveSession.create({
      requestId: request._id,
      studentId: request.studentId,
      teacherId: request.teacherId,
      subjectId: request.subjectId,
      gradeId: request.gradeId,
      startTime,
      endTime,
      scheduledDuration: request.duration,
      meetingLink,
      meetingId,
      meetingPassword,
      status: "scheduled",
      finalPrice: request.priceEGP,
      paymentId: request.paymentId,
      sessionNotes,
    });

    // TODO: Send notification to student

    const populatedSession = await LiveSession.findById(session._id)
      .populate("studentId", "name email profileImage")
      .populate("teacherId", "name email profileImage")
      .populate("subjectId", "name nameAr icon");

    res.json(populatedSession);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Decline a lesson request
 * POST /api/live-lessons/requests/:requestId/decline
 */
export const declineRequest = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await LiveLessonRequest.findById(requestId);
    if (!request) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    // Verify this request is for this teacher
    if (String(request.teacherId) !== String(teacherId)) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    if (request.status !== "pending") {
      res.status(400).json({ message: "Request is no longer pending" });
      return;
    }

    request.status = "declined";
    request.declineReason = reason;
    // Bookkeeping only — see the matching note in cancelRequest.
    if (request.paymentStatus === "paid") {
      request.paymentStatus = "refunded";
      if (request.paymentId) {
        await Payment.findByIdAndUpdate(request.paymentId, {
          status: "refunded",
          refundedAt: new Date(),
          refundReason: "Live lesson request declined by teacher",
        });
      }
    }
    await request.save();

    // TODO: Notify student

    res.json({ message: "Request declined" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update teacher instant availability
 * PATCH /api/live-lessons/teacher/availability
 */
export const updateTeacherAvailability = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;
    const {
      isAvailableForInstantLessons,
      instantLessonPricePerHour,
      maxConcurrentSessions,
      onlineStatus,
    } = req.body;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "Teacher") {
      res.status(404).json({ message: "Teacher not found" });
      return;
    }

    if (isAvailableForInstantLessons !== undefined) {
      teacher.isAvailableForInstantLessons = isAvailableForInstantLessons;
    }
    if (instantLessonPricePerHour !== undefined) {
      teacher.instantLessonPricePerHour = instantLessonPricePerHour;
    }
    if (maxConcurrentSessions !== undefined) {
      teacher.maxConcurrentSessions = maxConcurrentSessions;
    }
    if (onlineStatus !== undefined) {
      teacher.onlineStatus = onlineStatus;
      teacher.lastSeen = new Date();
    }

    await teacher.save();

    res.json({
      isAvailableForInstantLessons: teacher.isAvailableForInstantLessons,
      instantLessonPricePerHour: teacher.instantLessonPricePerHour,
      maxConcurrentSessions: teacher.maxConcurrentSessions,
      onlineStatus: teacher.onlineStatus,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get teacher's sessions
 * GET /api/live-lessons/teacher/sessions
 */
export const getTeacherSessions = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;
    const { status } = req.query;

    const filter: any = { teacherId };
    if (status) {
      filter.status = status;
    }

    const sessions = await LiveSession.find(filter)
      .populate("studentId", "name email profileImage")
      .populate("subjectId", "name nameAr icon")
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────── SHARED ENDPOINTS ──────────────

/**
 * Get session details
 * GET /api/live-lessons/sessions/:sessionId
 */
export const getSessionDetails = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    const session = await LiveSession.findById(sessionId)
      .populate("studentId", "name email profileImage")
      .populate("teacherId", "name email profileImage")
      .populate("subjectId", "name nameAr icon")
      .populate("gradeId", "name nameAr");

    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    // Verify user is part of this session
    if (
      String(session.studentId._id) !== String(userId) &&
      String(session.teacherId._id) !== String(userId)
    ) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Rate a completed session
 * POST /api/live-lessons/sessions/:sessionId/rate
 */
export const rateSession = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    const session = await LiveSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    if (session.status !== "completed") {
      res.status(400).json({ message: "Can only rate completed sessions" });
      return;
    }

    // Determine if user is student or teacher
    const isStudent = String(session.studentId) === String(userId);
    const isTeacher = String(session.teacherId) === String(userId);

    if (!isStudent && !isTeacher) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    if (isStudent) {
      session.studentRating = rating;
      session.studentFeedback = feedback;
    } else {
      session.teacherRating = rating;
      session.teacherFeedback = feedback;
    }

    await session.save();

    res.json({ message: "Rating submitted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────── ADMIN ENDPOINTS ──────────────

/**
 * Get all lesson requests (admin)
 * GET /api/live-lessons/admin/all-requests
 */
export const getAllRequests = async (_req: Request, res: Response) => {
  try {
    const requests = await LiveLessonRequest.find()
      .populate("studentId", "name email")
      .populate("teacherId", "name email")
      .populate("subjectId", "name nameAr")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all sessions (admin)
 * GET /api/live-lessons/admin/all-sessions
 */
export const getAllSessions = async (_req: Request, res: Response) => {
  try {
    const sessions = await LiveSession.find()
      .populate("studentId", "name email")
      .populate("teacherId", "name email")
      .populate("subjectId", "name nameAr")
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
