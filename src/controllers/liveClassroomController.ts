import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import LiveClassroomSession from "../models/LiveClassroomSession";
import LiveSessionParticipant from "../models/LiveSessionParticipant";
import LiveLessonRequest from "../models/LiveLessonRequest";
import User from "../models/User";
import Subscription from "../models/Subscription";
import Payment from "../models/Payment";

/**
 * Create a new live classroom session
 * POST /api/live-classroom/create
 */
export const createLiveSession = async (req: any, res: Response) => {
  try {
    const {
      teacherId,
      studentId,
      subjectId,
      requestId,
      scheduleId,
      scheduledDuration,
      startTime,
      price,
      paymentId,
    } = req.body;

    // The caller must be one of the two participants they're creating a
    // session for — otherwise anyone could spin up a session (and its
    // room) for two other users.
    const requesterId = String(req.user._id);
    if (requesterId !== String(teacherId) && requesterId !== String(studentId)) {
      res.status(403).json({ message: "You can only create a session you are a participant in" });
      return;
    }

    // Verify teacher and student exist
    const teacher = await User.findById(teacherId);
    const student = await User.findById(studentId);

    if (!teacher || teacher.role !== "Teacher") {
      res.status(404).json({ message: "Teacher not found" });
      return;
    }

    if (!student || student.role !== "Student") {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Verify subscription if subject provided
    if (subjectId) {
      const hasSubscription = await Subscription.findOne({
        studentId,
        teacherId,
        subjectId,
        status: "active",
      });

      // A paymentId alone is not proof of payment — it must reference an
      // actual successful payment belonging to this student.
      let hasValidPayment = false;
      if (!hasSubscription && paymentId) {
        const payment = await Payment.findOne({
          _id: paymentId,
          studentId,
          teacherId,
          status: "success",
        });
        hasValidPayment = !!payment;
      }

      if (!hasSubscription && !hasValidPayment) {
        res.status(403).json({ message: "Active subscription required" });
        return;
      }
    }

    // Check for existing active session for this teacher
    const existingSession = await LiveClassroomSession.findOne({
      teacherId,
      status: "active",
    });

    if (existingSession) {
      res.status(400).json({
        message: "Teacher already has an active session",
        sessionId: existingSession._id,
        roomId: existingSession.roomId,
      });
      return;
    }

    // Generate unique room ID
    const roomId = `room-${uuidv4()}`;

    // Create session
    const session = await LiveClassroomSession.create({
      teacherId,
      studentId,
      subjectId,
      requestId,
      scheduleId,
      roomId,
      status: "scheduled",
      startTime: startTime || new Date(),
      scheduledDuration: scheduledDuration || 60,
      price,
      paymentId,
    });

    // If from live lesson request, update request
    if (requestId) {
      await LiveLessonRequest.findByIdAndUpdate(requestId, {
        status: "accepted",
        meetingLink: `/live-session/${session.roomId}`,
      });
    }

    const populatedSession = await LiveClassroomSession.findById(session._id)
      .populate("teacherId", "name email profileImage")
      .populate("studentId", "name email profileImage")
      .populate("subjectId", "name nameAr icon");

    res.status(201).json(populatedSession);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get session details by room ID or session ID
 * GET /api/live-classroom/session/:identifier
 */
export const getSessionDetails = async (req: any, res: Response) => {
  try {
    const { identifier } = req.params;
    const userId = req.user._id;

    // Try to find by roomId first, then by _id
    let session = await LiveClassroomSession.findOne({ roomId: identifier })
      .populate("teacherId", "name email profileImage")
      .populate("studentId", "name email profileImage")
      .populate("subjectId", "name nameAr icon");

    if (!session) {
      session = await LiveClassroomSession.findById(identifier)
        .populate("teacherId", "name email profileImage")
        .populate("studentId", "name email profileImage")
        .populate("subjectId", "name nameAr icon");
    }

    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    // Verify user is participant
    const isAuthorized =
      String(session.teacherId._id) === String(userId) ||
      String(session.studentId._id) === String(userId);

    if (!isAuthorized) {
      res.status(403).json({ message: "Not authorized to view this session" });
      return;
    }

    // Get participants
    const participants = await LiveSessionParticipant.find({
      sessionId: session._id,
    })
      .populate("userId", "name email profileImage")
      .sort({ joinedAt: 1 });

    res.json({
      session,
      participants,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get active sessions for a teacher
 * GET /api/live-classroom/teacher/active
 */
export const getTeacherActiveSessions = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;

    const sessions = await LiveClassroomSession.find({
      teacherId,
      status: { $in: ["scheduled", "active"] },
    })
      .populate("studentId", "name email profileImage")
      .populate("subjectId", "name nameAr icon")
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get upcoming/active sessions for a student
 * GET /api/live-classroom/student/sessions
 */
export const getStudentSessions = async (req: any, res: Response) => {
  try {
    const studentId = req.user._id;
    const { status } = req.query;

    const filter: any = { studentId };
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ["scheduled", "active"] };
    }

    const sessions = await LiveClassroomSession.find(filter)
      .populate("teacherId", "name email profileImage")
      .populate("subjectId", "name nameAr icon")
      .sort({ startTime: 1 });

    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * End a session (teacher only)
 * POST /api/live-classroom/session/:sessionId/end
 */
export const endSession = async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user._id;

    const session = await LiveClassroomSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    // Only teacher can end session
    if (String(session.teacherId) !== String(teacherId)) {
      res.status(403).json({ message: "Only teacher can end session" });
      return;
    }

    if (session.status === "ended") {
      res.status(400).json({ message: "Session already ended" });
      return;
    }

    session.status = "ended";
    session.endTime = new Date();

    if (session.teacherJoinedAt) {
      session.actualDuration = Math.round(
        (new Date().getTime() - session.teacherJoinedAt.getTime()) /
          (1000 * 60),
      );
    }

    await session.save();

    res.json({ message: "Session ended successfully", session });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get session history for teacher
 * GET /api/live-classroom/teacher/history
 */
export const getTeacherSessionHistory = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;
    const { limit = 20, page = 1 } = req.query;

    const sessions = await LiveClassroomSession.find({
      teacherId,
      status: { $in: ["ended", "cancelled"] },
    })
      .populate("studentId", "name email profileImage")
      .populate("subjectId", "name nameAr icon")
      .sort({ startTime: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await LiveClassroomSession.countDocuments({
      teacherId,
      status: { $in: ["ended", "cancelled"] },
    });

    res.json({
      sessions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get session statistics
 * GET /api/live-classroom/stats/:sessionId
 */
export const getSessionStats = async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await LiveClassroomSession.findById(sessionId)
      .populate("teacherId", "name")
      .populate("studentId", "name");

    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    // Verify authorization
    const isAuthorized =
      String(session.teacherId._id) === String(userId) ||
      String(session.studentId._id) === String(userId);

    if (!isAuthorized) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    const participants = await LiveSessionParticipant.find({
      sessionId: session._id,
    }).populate("userId", "name profileImage");

    const stats = {
      sessionId: session._id,
      roomId: session.roomId,
      status: session.status,
      duration: {
        scheduled: session.scheduledDuration,
        actual: session.actualDuration,
      },
      timestamps: {
        start: session.startTime,
        end: session.endTime,
        teacherJoined: session.teacherJoinedAt,
        studentJoined: session.studentJoinedAt,
      },
      engagement: {
        whiteboardActions: session.whiteboardActions,
        chatMessages: session.chatMessages,
      },
      participants: participants.map((p) => ({
        user: p.userId,
        role: p.role,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        duration: p.sessionDuration,
        whiteboardDraws: p.whiteboardDraws,
        chatMessagesSent: p.chatMessagesSent,
        disconnections: p.disconnections,
      })),
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Check if user can join session (within time window)
 * GET /api/live-classroom/can-join/:roomId
 */
export const canJoinSession = async (req: any, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const session = await LiveClassroomSession.findOne({ roomId });
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    // Verify user is participant
    const isParticipant =
      String(session.teacherId) === String(userId) ||
      String(session.studentId) === String(userId);

    if (!isParticipant) {
      res.status(403).json({ canJoin: false, reason: "not_authorized" });
      return;
    }

    // Check time window (can join 15 min before or after start time)
    const now = new Date();
    const startTime = new Date(session.startTime);
    const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

    if (diffMinutes < -15) {
      res.json({
        canJoin: false,
        reason: "too_early",
        startTime: session.startTime,
      });
      return;
    }

    if (session.status === "ended" || session.status === "cancelled") {
      res.json({
        canJoin: false,
        reason: "session_ended",
        status: session.status,
      });
      return;
    }

    res.json({
      canJoin: true,
      session: {
        _id: session._id,
        roomId: session.roomId,
        status: session.status,
        startTime: session.startTime,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin: Get all sessions
 * GET /api/live-classroom/admin/all
 */
export const getAllSessions = async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const sessions = await LiveClassroomSession.find(filter)
      .populate("teacherId", "name email")
      .populate("studentId", "name email")
      .populate("subjectId", "name nameAr")
      .sort({ startTime: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await LiveClassroomSession.countDocuments(filter);

    res.json({
      sessions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
