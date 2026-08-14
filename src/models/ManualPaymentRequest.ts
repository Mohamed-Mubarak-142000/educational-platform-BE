import mongoose, { Document, Model, Schema } from "mongoose";

export type ManualPaymentMethod = "InstaPay" | "VodafoneCash" | "Fawry";
export type ManualPaymentPurpose = "subject" | "unit" | "liveLesson";
export type ManualPaymentStatus = "Pending" | "Approved" | "Rejected";

export interface IManualPaymentRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  gradeId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  liveLessonRequestId?: mongoose.Types.ObjectId;
  purpose: ManualPaymentPurpose;
  method: ManualPaymentMethod;
  amountEGP: number;
  // Shown to the student to write as the transfer reference/note, so an
  // admin reviewing a pile of near-identical transfers can match them up.
  referenceCode: string;
  proofUrl: string;
  senderNote?: string;
  status: ManualPaymentStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  // Set on approval — the synthesized Payment record this request produced.
  paymentId?: mongoose.Types.ObjectId;
}

const ManualPaymentRequestSchema = new Schema<IManualPaymentRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    gradeId: { type: Schema.Types.ObjectId, ref: "Grade" },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
    liveLessonRequestId: { type: Schema.Types.ObjectId, ref: "LiveLessonRequest" },
    purpose: { type: String, enum: ["subject", "unit", "liveLesson"], required: true },
    method: { type: String, enum: ["InstaPay", "VodafoneCash", "Fawry"], required: true },
    amountEGP: { type: Number, required: true },
    referenceCode: { type: String, required: true },
    proofUrl: { type: String, required: true },
    senderNote: { type: String, maxlength: 300 },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true },
);

ManualPaymentRequestSchema.index({ status: 1, createdAt: -1 });
ManualPaymentRequestSchema.index({ studentId: 1, createdAt: -1 });

const ManualPaymentRequest: Model<IManualPaymentRequest> = mongoose.model<IManualPaymentRequest>(
  "ManualPaymentRequest",
  ManualPaymentRequestSchema,
);

export default ManualPaymentRequest;
