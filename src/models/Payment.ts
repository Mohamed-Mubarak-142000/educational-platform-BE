import mongoose, { Document, Model, Schema } from "mongoose";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "voided"
  | "refunded"
  | "expired";

export type SubscriptionPlan = "Monthly" | "Quarterly" | "Yearly";
export type PaymentMethod = "paymob" | "InstaPay" | "VodafoneCash" | "Fawry";

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  gradeId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  // "liveLesson" pays for a single LiveLessonRequest rather than a
  // recurring subject/unit subscription — plan/planDays don't apply to it.
  subscriptionType: "subject" | "unit" | "liveLesson";
  liveLessonRequestId?: mongoose.Types.ObjectId;
  plan?: SubscriptionPlan;
  planDays?: number;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  // Defaults to the Paymob gateway; the manual methods are recorded here once
  // an admin approves the matching ManualPaymentRequest.
  paymentMethod: PaymentMethod;
  manualPaymentRequestId?: mongoose.Types.ObjectId;
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
    // Required for subject/unit subscriptions, not applicable to a one-off
    // liveLesson payment.
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: function (this: IPayment) {
        return this.subscriptionType !== "liveLesson";
      },
    },
    gradeId: {
      type: Schema.Types.ObjectId,
      ref: "Grade",
      required: function (this: IPayment) {
        return this.subscriptionType !== "liveLesson";
      },
    },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
    liveLessonRequestId: { type: Schema.Types.ObjectId, ref: "LiveLessonRequest" },
    subscriptionType: {
      type: String,
      enum: ["subject", "unit", "liveLesson"],
      required: true,
    },
    plan: {
      type: String,
      enum: ["Monthly", "Quarterly", "Yearly"],
      required: function (this: IPayment) {
        return this.subscriptionType !== "liveLesson";
      },
    },
    planDays: {
      type: Number,
      required: function (this: IPayment) {
        return this.subscriptionType !== "liveLesson";
      },
    },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "EGP" },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "voided", "refunded", "expired"],
      default: "pending",
    },
    idempotencyKey: { type: String, required: true, unique: true },
    paymentMethod: {
      type: String,
      enum: ["paymob", "InstaPay", "VodafoneCash", "Fawry"],
      default: "paymob",
    },
    manualPaymentRequestId: { type: Schema.Types.ObjectId, ref: "ManualPaymentRequest" },
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
PaymentSchema.index({ liveLessonRequestId: 1 }, { sparse: true });
PaymentSchema.index({ studentId: 1, status: 1 });
PaymentSchema.index({ teacherId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

const Payment: Model<IPayment> = mongoose.model<IPayment>(
  "Payment",
  PaymentSchema,
);
export default Payment;
