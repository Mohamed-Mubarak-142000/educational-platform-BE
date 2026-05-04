import mongoose, { Document, Model, Schema } from "mongoose";

export type SessionStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled"
  | "no-show";

export interface ILiveSession extends Document {
  // References
  requestId?: mongoose.Types.ObjectId; // Link to LiveLessonRequest (if from on-demand)
  scheduleId?: mongoose.Types.ObjectId; // Link to TeacherSchedule (if from recurring schedule)
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId?: mongoose.Types.ObjectId;

  // Session details
  startTime: Date;
  endTime: Date;
  actualDuration?: number; // Actual minutes (calculated after completion)
  scheduledDuration: number; // Planned duration in minutes

  // Meeting info
  meetingLink: string;
  meetingId?: string;
  meetingPassword?: string;
  recordingUrl?: string;

  // Status
  status: SessionStatus;

  // Quality & feedback
  studentRating?: number; // 1-5 stars
  teacherRating?: number; // 1-5 stars
  studentFeedback?: string;
  teacherFeedback?: string;

  // Payment tracking
  finalPrice: number;
  paymentId?: string;
  refundId?: string;
  refundAmount?: number;

  // Session notes
  sessionNotes?: string;

  // Attendance tracking
  studentJoinedAt?: Date;
  teacherJoinedAt?: Date;
  studentLeftAt?: Date;
  teacherLeftAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const LiveSessionSchema = new Schema<ILiveSession>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "LiveLessonRequest",
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "TeacherSchedule",
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    gradeId: {
      type: Schema.Types.ObjectId,
      ref: "Grade",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    actualDuration: {
      type: Number,
      min: 0,
    },
    scheduledDuration: {
      type: Number,
      required: true,
      min: 15,
      max: 180,
    },
    meetingLink: {
      type: String,
      required: true,
    },
    meetingId: {
      type: String,
    },
    meetingPassword: {
      type: String,
    },
    recordingUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    studentRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    teacherRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    studentFeedback: {
      type: String,
      maxlength: 1000,
    },
    teacherFeedback: {
      type: String,
      maxlength: 1000,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentId: {
      type: String,
    },
    refundId: {
      type: String,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    sessionNotes: {
      type: String,
      maxlength: 2000,
    },
    studentJoinedAt: {
      type: Date,
    },
    teacherJoinedAt: {
      type: Date,
    },
    studentLeftAt: {
      type: Date,
    },
    teacherLeftAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
LiveSessionSchema.index({ studentId: 1, status: 1 });
LiveSessionSchema.index({ teacherId: 1, status: 1 });
LiveSessionSchema.index({ startTime: 1 });
LiveSessionSchema.index({ status: 1, startTime: 1 });

// Virtual for checking if session is upcoming
LiveSessionSchema.virtual("isUpcoming").get(function () {
  return this.status === "scheduled" && this.startTime > new Date();
});

const LiveSession: Model<ILiveSession> = mongoose.model<ILiveSession>(
  "LiveSession",
  LiveSessionSchema,
);

export default LiveSession;
