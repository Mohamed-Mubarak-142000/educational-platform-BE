import mongoose, { Document, Model, Schema } from 'mongoose';

export type SubscriptionType = 'subject' | 'unit';
export type SubscriptionStatus = 'Approved' | 'Revoked';

export interface ISubscription extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  type: SubscriptionType;
  status: SubscriptionStatus;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    type: { type: String, enum: ['subject', 'unit'], required: true },
    status: { type: String, enum: ['Approved', 'Revoked'], default: 'Approved' },
  },
  { timestamps: true }
);

SubscriptionSchema.index(
  { studentId: 1, teacherId: 1, subjectId: 1, gradeId: 1, unitId: 1, type: 1 },
  { unique: true }
);
SubscriptionSchema.index({ studentId: 1, subjectId: 1, gradeId: 1 });

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
