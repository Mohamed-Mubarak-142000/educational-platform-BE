import mongoose, { Document, Model, Schema } from 'mongoose';

export type SubscriptionRequestStatus = 'Pending' | 'Approved' | 'Rejected';
export type SubscriptionRequestType = 'subject' | 'unit';

export interface ISubscriptionRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  type: SubscriptionRequestType;
  paymentMethod: 'Vodafone Cash' | 'InstaPay';
  paymentProofUrl: string;
  status: SubscriptionRequestStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
}

const SubscriptionRequestSchema = new Schema<ISubscriptionRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    type: { type: String, enum: ['subject', 'unit'], required: true },
    paymentMethod: { type: String, enum: ['Vodafone Cash', 'InstaPay'], required: true },
    paymentProofUrl: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

SubscriptionRequestSchema.index({ teacherId: 1, status: 1, createdAt: -1 });
SubscriptionRequestSchema.index({ studentId: 1, status: 1, createdAt: -1 });
SubscriptionRequestSchema.index(
  { studentId: 1, teacherId: 1, subjectId: 1, gradeId: 1, unitId: 1, type: 1, status: 1 }
);

const SubscriptionRequest: Model<ISubscriptionRequest> = mongoose.model<ISubscriptionRequest>(
  'SubscriptionRequest',
  SubscriptionRequestSchema
);
export default SubscriptionRequest;
