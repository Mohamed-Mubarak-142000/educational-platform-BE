import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  plan: string;
  amount: number;
  method: 'Vodafone Cash' | 'InstaPay';
  screenshotUrl: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    method: { type: String, enum: ['Vodafone Cash', 'InstaPay'], required: true },
    screenshotUrl: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
