import mongoose, { Document, Model, Schema } from "mongoose";

export type ParticipantRole = "teacher" | "student";

export interface ILiveSessionParticipant extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ParticipantRole;

  // Join/leave tracking
  joinedAt: Date;
  leftAt?: Date;

  // Participant stats
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;

  // Interaction stats
  whiteboardDraws: number;
  chatMessagesSent: number;

  // Connection info
  socketId?: string;
  peerId?: string;
  connectionQuality?: "excellent" | "good" | "fair" | "poor";
  disconnections: number; // Count of disconnection events

  // Virtuals
  isInSession: boolean;
  sessionDuration: number;

  createdAt: Date;
  updatedAt: Date;
}

const LiveSessionParticipantSchema = new Schema<ILiveSessionParticipant>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "LiveClassroomSession",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    leftAt: {
      type: Date,
    },
    videoEnabled: {
      type: Boolean,
      default: true,
    },
    audioEnabled: {
      type: Boolean,
      default: true,
    },
    screenSharing: {
      type: Boolean,
      default: false,
    },
    whiteboardDraws: {
      type: Number,
      default: 0,
      min: 0,
    },
    chatMessagesSent: {
      type: Number,
      default: 0,
      min: 0,
    },
    socketId: {
      type: String,
    },
    peerId: {
      type: String,
    },
    connectionQuality: {
      type: String,
      enum: ["excellent", "good", "fair", "poor"],
    },
    disconnections: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for session-user uniqueness
LiveSessionParticipantSchema.index(
  { sessionId: 1, userId: 1 },
  { unique: true },
);

// Virtual to check if participant is currently in session
LiveSessionParticipantSchema.virtual("isInSession").get(function () {
  return !!this.joinedAt && !this.leftAt;
});

// Virtual to calculate session duration for participant
LiveSessionParticipantSchema.virtual("sessionDuration").get(function () {
  if (!this.joinedAt) return 0;
  const endTime = this.leftAt || new Date();
  return Math.round(
    (endTime.getTime() - this.joinedAt.getTime()) / (1000 * 60),
  ); // Minutes
});

const LiveSessionParticipant: Model<ILiveSessionParticipant> =
  mongoose.model<ILiveSessionParticipant>(
    "LiveSessionParticipant",
    LiveSessionParticipantSchema,
  );

export default LiveSessionParticipant;
