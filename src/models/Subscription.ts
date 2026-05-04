import mongoose, { Document, Model, Schema } from "mongoose";

export type SubscriptionType = "subject" | "unit";
export type SubscriptionStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "revoked";

export interface ISubscription extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  type: SubscriptionType;
  status: SubscriptionStatus;
  paymentId?: mongoose.Types.ObjectId;
  plan?: string;
  planDays?: number;
  expiresAt: Date;
  startsAt: Date;
  autoRenew: boolean;
  revokedBy?: mongoose.Types.ObjectId;
  revokedAt?: Date;
  revokedReason?: string;
  renewedFromId?: mongoose.Types.ObjectId;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: "Grade", required: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
    type: { type: String, enum: ["subject", "unit"], required: true },
    status: {
      type: String,
      enum: ["active", "expiring_soon", "expired", "revoked"],
      default: "active",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    plan: { type: String },
    planDays: { type: Number },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date("2099-01-01"),
    },
    startsAt: { type: Date, required: true, default: Date.now },
    autoRenew: { type: Boolean, default: false },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revokedAt: { type: Date },
    revokedReason: { type: String },
    renewedFromId: { type: Schema.Types.ObjectId, ref: "Subscription" },
  },
  { timestamps: true },
);

SubscriptionSchema.index(
  { studentId: 1, teacherId: 1, subjectId: 1, gradeId: 1, unitId: 1, type: 1 },
  { unique: true },
);
SubscriptionSchema.index({ studentId: 1, subjectId: 1, gradeId: 1 });
SubscriptionSchema.index({ status: 1, expiresAt: 1 });

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema,
);
export default Subscription;
