import mongoose, { Document, Model, Schema } from "mongoose";

export type SessionStatus = "scheduled" | "active" | "ended" | "cancelled";

export interface ILiveClassroomSession extends Document {
  // References
  teacherId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId; // Link to LiveLessonRequest if from on-demand
  scheduleId?: mongoose.Types.ObjectId; // Link to TeacherSchedule if recurring

  // Session details
  roomId: string; // Unique room identifier for Socket.IO
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  scheduledDuration: number; // Planned duration in minutes
  actualDuration?: number; // Calculated after session ends

  // Session metadata
  teacherJoinedAt?: Date;
  studentJoinedAt?: Date;
  lastActivityAt?: Date;

  // Recording (future)
  recordingUrl?: string;
  recordingStartedAt?: Date;
  recordingDuration?: number;

  // Session stats
  whiteboardActions: number; // Count of whiteboard interactions
  chatMessages: number; // Count of chat messages
  connectionQuality?: "excellent" | "good" | "fair" | "poor";

  // Payment
  paymentId?: string;
  price?: number;

  createdAt: Date;
  updatedAt: Date;
}

const LiveClassroomSessionSchema = new Schema<ILiveClassroomSession>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
    },
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "LiveLessonRequest",
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "TeacherSchedule",
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended", "cancelled"],
      default: "scheduled",
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
    },
    scheduledDuration: {
      type: Number,
      required: true,
      min: 15,
      max: 180,
    },
    actualDuration: {
      type: Number,
      min: 0,
    },
    teacherJoinedAt: {
      type: Date,
    },
    studentJoinedAt: {
      type: Date,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    recordingUrl: {
      type: String,
    },
    recordingStartedAt: {
      type: Date,
    },
    recordingDuration: {
      type: Number,
      min: 0,
    },
    whiteboardActions: {
      type: Number,
      default: 0,
      min: 0,
    },
    chatMessages: {
      type: Number,
      default: 0,
      min: 0,
    },
    connectionQuality: {
      type: String,
      enum: ["excellent", "good", "fair", "poor"],
    },
    paymentId: {
      type: String,
    },
    price: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
LiveClassroomSessionSchema.index({ teacherId: 1, status: 1 });
LiveClassroomSessionSchema.index({ studentId: 1, status: 1 });
LiveClassroomSessionSchema.index({ status: 1, startTime: 1 });
LiveClassroomSessionSchema.index({ roomId: 1, status: 1 });

// Virtual to check if session is active
LiveClassroomSessionSchema.virtual("isActive").get(function () {
  return this.status === "active";
});

// Virtual to check if session can be joined (within 15 min of start time)
LiveClassroomSessionSchema.virtual("canJoin").get(function () {
  const now = new Date();
  const startTime = new Date(this.startTime);
  const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

  return this.status === "scheduled" && diffMinutes >= -15 && diffMinutes <= 15;
});

const LiveClassroomSession: Model<ILiveClassroomSession> =
  mongoose.model<ILiveClassroomSession>(
    "LiveClassroomSession",
    LiveClassroomSessionSchema,
  );

export default LiveClassroomSession;
