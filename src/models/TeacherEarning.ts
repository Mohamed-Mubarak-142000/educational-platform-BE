import mongoose, { Document, Model, Schema } from "mongoose";

export type TeacherEarningStatus = "available" | "paid_out" | "clawed_back";

export interface ITeacherEarning extends Document {
  paymentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  subscriptionType: "subject" | "unit" | "liveLesson";
  grossAmountCents: number;
  commissionRateBps: number;
  platformFeeCents: number;
  netEarningCents: number;
  status: TeacherEarningStatus;
  payoutId?: mongoose.Types.ObjectId;
  clawedBackAt?: Date;
  clawedBackReason?: string;
}

const TeacherEarningSchema = new Schema<ITeacherEarning>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    subscriptionType: {
      type: String,
      enum: ["subject", "unit", "liveLesson"],
      required: true,
    },
    grossAmountCents: { type: Number, required: true },
    commissionRateBps: { type: Number, required: true },
    platformFeeCents: { type: Number, required: true },
    netEarningCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ["available", "paid_out", "clawed_back"],
      default: "available",
    },
    payoutId: { type: Schema.Types.ObjectId, ref: "TeacherPayout" },
    clawedBackAt: { type: Date },
    clawedBackReason: { type: String },
  },
  { timestamps: true },
);

TeacherEarningSchema.index({ teacherId: 1, status: 1 });
TeacherEarningSchema.index({ teacherId: 1, createdAt: -1 });

const TeacherEarning: Model<ITeacherEarning> = mongoose.model<ITeacherEarning>(
  "TeacherEarning",
  TeacherEarningSchema,
);
export default TeacherEarning;
