import mongoose, { Document, Model, Schema } from "mongoose";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "voided"
  | "refunded"
  | "expired";

export type PaymentMethod = "InstaPay" | "VodafoneCash" | "Fawry";

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  gradeId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  // "liveLesson" pays for a single LiveLessonRequest rather than a
  // subject/unit purchase.
  subscriptionType: "subject" | "unit" | "liveLesson";
  liveLessonRequestId?: mongoose.Types.ObjectId;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  manualPaymentRequestId?: mongoose.Types.ObjectId;
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
    // Required for subject/unit purchases, not applicable to a one-off
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
      enum: ["InstaPay", "VodafoneCash", "Fawry"],
      required: true,
    },
    manualPaymentRequestId: { type: Schema.Types.ObjectId, ref: "ManualPaymentRequest" },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
    refundedAt: { type: Date },
    refundedBy: { type: Schema.Types.ObjectId, ref: "User" },
    refundReason: { type: String },
    isTest: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PaymentSchema.index({ liveLessonRequestId: 1 }, { sparse: true });
PaymentSchema.index({ studentId: 1, status: 1 });
PaymentSchema.index({ teacherId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

const Payment: Model<IPayment> = mongoose.model<IPayment>(
  "Payment",
  PaymentSchema,
);
export default Payment;
