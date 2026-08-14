import mongoose, { Document, Model, Schema } from "mongoose";

export type SubscriptionType = "subject" | "unit";
export type SubscriptionStatus = "active" | "revoked";

// A subscription is a one-time purchase that grants lifetime access — there
// is no plan/renewal concept. `expiresAt` is kept (always set to the sentinel
// far-future date below) purely so existing access-control queries that
// filter on `expiresAt: { $gt: now }` keep working unchanged.
export const LIFETIME_EXPIRY = new Date("2099-01-01");

export interface ISubscription extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  type: SubscriptionType;
  status: SubscriptionStatus;
  paymentId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  startsAt: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokedAt?: Date;
  revokedReason?: string;
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
      enum: ["active", "revoked"],
      default: "active",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    expiresAt: {
      type: Date,
      required: true,
      default: () => LIFETIME_EXPIRY,
    },
    startsAt: { type: Date, required: true, default: Date.now },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revokedAt: { type: Date },
    revokedReason: { type: String },
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
