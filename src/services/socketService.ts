import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import LiveClassroomSession from "../models/LiveClassroomSession";
import LiveSessionParticipant from "../models/LiveSessionParticipant";

interface SocketUser {
  userId: string;
  role: "teacher" | "student";
  name: string;
  profileImage?: string;
}

interface JoinRoomData {
  roomId: string;
  user: SocketUser;
}

interface SignalData {
  roomId: string;
  signal: any;
  from: string;
  to?: string;
}

interface WhiteboardData {
  roomId: string;
  action: "draw" | "erase" | "clear" | "undo" | "redo";
  data: any;
  userId: string;
}

interface ChatMessage {
  roomId: string;
  message: string;
  userId: string;
  userName: string;
  timestamp: number;
}

interface MediaToggle {
  roomId: string;
  userId: string;
  type: "video" | "audio" | "screen";
  enabled: boolean;
}

// Store active rooms and their participants
const rooms = new Map<string, Set<string>>(); // roomId -> Set of socketIds
const socketToUser = new Map<string, SocketUser>(); // socketId -> user info
const socketToRoom = new Map<string, string>(); // socketId -> roomId

/**
 * Initialize Socket.IO server for live classroom
 */
export const initializeSocketServer = (httpServer: HTTPServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // ──────────────────────────────────────────────────────────────
    // JOIN ROOM
    // ──────────────────────────────────────────────────────────────
    socket.on("join-room", async (data: JoinRoomData) => {
      const { roomId, user } = data;

      try {
        // Verify session exists
        const session = await LiveClassroomSession.findOne({
          roomId,
          status: { $in: ["scheduled", "active"] },
        });

        if (!session) {
          socket.emit("error", {
            message: "Session not found or already ended",
          });
          return;
        }

        // Verify user is authorized (must be teacher or student of this session)
        const isAuthorized =
          String(session.teacherId) === user.userId ||
          String(session.studentId) === user.userId;

        if (!isAuthorized) {
          socket.emit("error", {
            message: "Not authorized to join this session",
          });
          return;
        }

        // Join room
        socket.join(roomId);

        // Track participant
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        rooms.get(roomId)!.add(socket.id);
        socketToUser.set(socket.id, user);
        socketToRoom.set(socket.id, roomId);

        // Update session status to active if first join
        if (session.status === "scheduled") {
          session.status = "active";
          session.lastActivityAt = new Date();
          await session.save();
        }

        // Create or update participant record
        await LiveSessionParticipant.findOneAndUpdate(
          { sessionId: session._id, userId: user.userId },
          {
            role: user.role,
            joinedAt: new Date(),
            socketId: socket.id,
            $unset: { leftAt: "" },
          },
          { upsert: true, new: true },
        );

        // Update session join times
        if (user.role === "teacher" && !session.teacherJoinedAt) {
          session.teacherJoinedAt = new Date();
          await session.save();
        } else if (user.role === "student" && !session.studentJoinedAt) {
          session.studentJoinedAt = new Date();
          await session.save();
        }

        // Get all participants in room
        const participants = Array.from(rooms.get(roomId) || [])
          .map((sid) => socketToUser.get(sid))
          .filter(Boolean);

        // Notify others in room
        socket.to(roomId).emit("user-connected", {
          user,
          socketId: socket.id,
          participants,
        });

        // Send current participants to new user
        socket.emit("room-joined", {
          roomId,
          participants,
          session: {
            _id: session._id,
            teacherId: session.teacherId,
            studentId: session.studentId,
            startTime: session.startTime,
            scheduledDuration: session.scheduledDuration,
          },
        });

        console.log(
          `[Socket.IO] ${user.name} (${user.role}) joined room ${roomId}`,
        );
      } catch (error: any) {
        console.error("[Socket.IO] Error joining room:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ──────────────────────────────────────────────────────────────
    // WEBRTC SIGNALING
    // ──────────────────────────────────────────────────────────────

    // Send WebRTC offer
    socket.on("offer", (data: SignalData) => {
      const { roomId, signal, to } = data;

      if (to) {
        // Send to specific peer
        socket.to(to).emit("offer", {
          signal,
          from: socket.id,
        });
      } else {
        // Broadcast to room
        socket.to(roomId).emit("offer", {
          signal,
          from: socket.id,
        });
      }
    });

    // Send WebRTC answer
    socket.on("answer", (data: SignalData) => {
      const { signal, to } = data;

      if (to) {
        socket.to(to).emit("answer", {
          signal,
          from: socket.id,
        });
      }
    });

    // Send ICE candidate
    socket.on("ice-candidate", (data: SignalData) => {
      const { roomId, signal, to } = data;

      if (to) {
        socket.to(to).emit("ice-candidate", {
          signal,
          from: socket.id,
        });
      } else {
        socket.to(roomId).emit("ice-candidate", {
          signal,
          from: socket.id,
        });
      }
    });

    // ──────────────────────────────────────────────────────────────
    // WHITEBOARD ACTIONS
    // ──────────────────────────────────────────────────────────────
    socket.on("whiteboard-draw", async (data: WhiteboardData) => {
      const { roomId, action, data: drawData, userId } = data;

      try {
        // Broadcast to all others in room
        socket.to(roomId).emit("whiteboard-draw", {
          action,
          data: drawData,
          userId,
        });

        // Update stats
        const session = await LiveClassroomSession.findOne({ roomId });
        if (session) {
          session.whiteboardActions += 1;
          session.lastActivityAt = new Date();
          await session.save();
        }

        const participant = await LiveSessionParticipant.findOne({
          sessionId: session?._id,
          userId,
        });
        if (participant) {
          participant.whiteboardDraws += 1;
          await participant.save();
        }
      } catch (error) {
        console.error("[Socket.IO] Whiteboard error:", error);
      }
    });

    // ──────────────────────────────────────────────────────────────
    // CHAT MESSAGES
    // ──────────────────────────────────────────────────────────────
    socket.on("chat-message", async (data: ChatMessage) => {
      const { roomId, message, userId, userName, timestamp } = data;

      try {
        // Broadcast to all in room (including sender for confirmation)
        io.to(roomId).emit("chat-message", {
          message,
          userId,
          userName,
          timestamp,
        });

        // Update stats
        const session = await LiveClassroomSession.findOne({ roomId });
        if (session) {
          session.chatMessages += 1;
          session.lastActivityAt = new Date();
          await session.save();
        }

        const participant = await LiveSessionParticipant.findOne({
          sessionId: session?._id,
          userId,
        });
        if (participant) {
          participant.chatMessagesSent += 1;
          await participant.save();
        }
      } catch (error) {
        console.error("[Socket.IO] Chat error:", error);
      }
    });

    // ──────────────────────────────────────────────────────────────
    // MEDIA CONTROLS
    // ──────────────────────────────────────────────────────────────
    socket.on("toggle-media", async (data: MediaToggle) => {
      const { roomId, userId, type, enabled } = data;

      try {
        // Broadcast to others
        socket.to(roomId).emit("peer-media-toggle", {
          userId,
          type,
          enabled,
          socketId: socket.id,
        });

        // Update participant record
        const session = await LiveClassroomSession.findOne({ roomId });
        if (session) {
          const participant = await LiveSessionParticipant.findOne({
            sessionId: session._id,
            userId,
          });

          if (participant) {
            if (type === "video") participant.videoEnabled = enabled;
            if (type === "audio") participant.audioEnabled = enabled;
            if (type === "screen") participant.screenSharing = enabled;
            await participant.save();
          }
        }
      } catch (error) {
        console.error("[Socket.IO] Media toggle error:", error);
      }
    });

    // ──────────────────────────────────────────────────────────────
    // SESSION CONTROL
    // ──────────────────────────────────────────────────────────────
    socket.on(
      "end-session",
      async (data: { roomId: string; userId: string }) => {
        const { roomId, userId } = data;

        try {
          const session = await LiveClassroomSession.findOne({ roomId });
          if (!session) return;

          // Only teacher can end session
          if (String(session.teacherId) !== userId) {
            socket.emit("error", { message: "Only teacher can end session" });
            return;
          }

          // Update session
          session.status = "ended";
          session.endTime = new Date();

          if (session.teacherJoinedAt) {
            session.actualDuration = Math.round(
              (new Date().getTime() - session.teacherJoinedAt.getTime()) /
                (1000 * 60),
            );
          }

          await session.save();

          // Notify all participants
          io.to(roomId).emit("session-ended", {
            endedBy: "teacher",
            duration: session.actualDuration,
          });

          // Disconnect all from room
          const socketsInRoom = rooms.get(roomId) || new Set();
          socketsInRoom.forEach((sid) => {
            const s = io.sockets.sockets.get(sid);
            if (s) {
              s.leave(roomId);
            }
          });

          // Clean up
          rooms.delete(roomId);

          console.log(`[Socket.IO] Session ${roomId} ended by teacher`);
        } catch (error) {
          console.error("[Socket.IO] End session error:", error);
        }
      },
    );

    // ──────────────────────────────────────────────────────────────
    // DISCONNECT
    // ──────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      const roomId = socketToRoom.get(socket.id);
      const user = socketToUser.get(socket.id);

      if (roomId && user) {
        try {
          // Remove from room
          const roomSockets = rooms.get(roomId);
          if (roomSockets) {
            roomSockets.delete(socket.id);
            if (roomSockets.size === 0) {
              rooms.delete(roomId);
            }
          }

          // Update participant
          const session = await LiveClassroomSession.findOne({ roomId });
          if (session) {
            const participant = await LiveSessionParticipant.findOne({
              sessionId: session._id,
              userId: user.userId,
            });

            if (participant) {
              participant.leftAt = new Date();
              participant.disconnections += 1;
              await participant.save();
            }

            // Update session last activity
            session.lastActivityAt = new Date();
            await session.save();
          }

          // Notify others
          socket.to(roomId).emit("user-disconnected", {
            socketId: socket.id,
            user,
          });

          console.log(
            `[Socket.IO] ${user.name} disconnected from room ${roomId}`,
          );
        } catch (error) {
          console.error("[Socket.IO] Disconnect error:", error);
        }
      }

      // Clean up maps
      socketToUser.delete(socket.id);
      socketToRoom.delete(socket.id);

      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  // Auto-end inactive sessions (runs every 5 minutes)
  setInterval(
    async () => {
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const inactiveSessions = await LiveClassroomSession.find({
          status: "active",
          lastActivityAt: { $lt: thirtyMinutesAgo },
        });

        for (const session of inactiveSessions) {
          session.status = "ended";
          session.endTime = new Date();

          if (session.teacherJoinedAt) {
            session.actualDuration = Math.round(
              (new Date().getTime() - session.teacherJoinedAt.getTime()) /
                (1000 * 60),
            );
          }

          await session.save();

          // Notify room if anyone still connected
          io.to(session.roomId).emit("session-ended", {
            endedBy: "system",
            reason: "inactivity",
          });

          console.log(
            `[Socket.IO] Auto-ended inactive session: ${session.roomId}`,
          );
        }
      } catch (error) {
        console.error("[Socket.IO] Auto-end error:", error);
      }
    },
    5 * 60 * 1000,
  ); // Every 5 minutes

  console.log("[Socket.IO] Server initialized");

  return io;
};

export default initializeSocketServer;
