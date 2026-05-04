import mongoose, { Document, Model, Schema } from "mongoose";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "voided"
  | "refunded"
  | "expired";

export type SubscriptionPlan = "Monthly" | "Quarterly" | "Yearly";

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  subscriptionType: "subject" | "unit";
  plan: SubscriptionPlan;
  planDays: number;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  paymobOrderId?: string;
  paymobTransactionId?: string;
  paymobIntegrationId?: number;
  paymobResponse?: Record<string, unknown>;
  subscriptionId?: mongoose.Types.ObjectId;
  refundedAt?: Date;
  refundedBy?: mongoose.Types.ObjectId;
  refundReason?: string;
  isTest: boolean;
}

const PaymentSchema = new Schema<IPayment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: "Grade", required: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
    subscriptionType: {
      type: String,
      enum: ["subject", "unit"],
      required: true,
    },
    plan: {
      type: String,
      enum: ["Monthly", "Quarterly", "Yearly"],
      required: true,
    },
    planDays: { type: Number, required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "EGP" },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "voided", "refunded", "expired"],
      default: "pending",
    },
    idempotencyKey: { type: String, required: true, unique: true },
    paymobOrderId: { type: String, sparse: true },
    paymobTransactionId: { type: String, sparse: true },
    paymobIntegrationId: { type: Number },
    paymobResponse: { type: Schema.Types.Mixed },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
    refundedAt: { type: Date },
    refundedBy: { type: Schema.Types.ObjectId, ref: "User" },
    refundReason: { type: String },
    isTest: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PaymentSchema.index({ paymobOrderId: 1 }, { sparse: true });
PaymentSchema.index({ studentId: 1, status: 1 });
PaymentSchema.index({ teacherId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

const Payment: Model<IPayment> = mongoose.model<IPayment>(
  "Payment",
  PaymentSchema,
);
export default Payment;
