import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISubscription extends Document {
  studentId: mongoose.Types.ObjectId;
  plan: string;
  status: 'Active' | 'Inactive' | 'Cancelled';
  startDate?: Date;
  endDate?: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Cancelled'], default: 'Inactive' },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
