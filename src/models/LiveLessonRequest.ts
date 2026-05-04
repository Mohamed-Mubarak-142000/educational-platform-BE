import mongoose, { Document, Model, Schema } from "mongoose";

export type RequestType = "instant" | "scheduled";
export type RequestStatus =
  | "pending"
  | "matched"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled"
  | "expired";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface ILiveLessonRequest extends Document {
  // Request metadata
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId; // Student selects specific teacher
  subjectId?: mongoose.Types.ObjectId;
  gradeId?: mongoose.Types.ObjectId;

  // Request details
  requestType: RequestType;
  preferredDateTime?: Date;
  duration: number; // Minutes (30, 60, 90, 120)
  description?: string;
  urgencyLevel: UrgencyLevel;

  // Status workflow
  status: RequestStatus;

  // Session timing (once accepted)
  sessionStartTime?: Date;
  sessionEndTime?: Date;
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;

  // Payment
  priceEGP: number;
  paymentId?: string;
  paymentStatus: PaymentStatus;

  // Communication & feedback
  studentNotes?: string;
  teacherNotes?: string;
  declineReason?: string;

  // Expiry (for instant requests)
  expiresAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const LiveLessonRequestSchema = new Schema<ILiveLessonRequest>(
  {
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
    },
    gradeId: {
      type: Schema.Types.ObjectId,
      ref: "Grade",
    },
    requestType: {
      type: String,
      enum: ["instant", "scheduled"],
      required: true,
    },
    preferredDateTime: {
      type: Date,
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
      max: 180, // Max 3 hours
    },
    description: {
      type: String,
      maxlength: 500,
    },
    urgencyLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "matched",
        "accepted",
        "declined",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "pending",
    },
    sessionStartTime: {
      type: Date,
    },
    sessionEndTime: {
      type: Date,
    },
    meetingLink: {
      type: String,
    },
    meetingId: {
      type: String,
    },
    meetingPassword: {
      type: String,
    },
    priceEGP: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentId: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    studentNotes: {
      type: String,
      maxlength: 1000,
    },
    teacherNotes: {
      type: String,
      maxlength: 1000,
    },
    declineReason: {
      type: String,
      maxlength: 500,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
LiveLessonRequestSchema.index({ studentId: 1, status: 1 });
LiveLessonRequestSchema.index({ teacherId: 1, status: 1 });
LiveLessonRequestSchema.index({ status: 1, expiresAt: 1 });
LiveLessonRequestSchema.index({ sessionStartTime: 1 });

const LiveLessonRequest: Model<ILiveLessonRequest> =
  mongoose.model<ILiveLessonRequest>(
    "LiveLessonRequest",
    LiveLessonRequestSchema,
  );

export default LiveLessonRequest;
