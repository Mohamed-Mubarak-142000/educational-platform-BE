import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISubject extends Document {
  stageId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  description: string;
  color: string;
  icon: string;
  teacherId?: mongoose.Types.ObjectId;
}

const SubjectSchema = new Schema<ISubject>(
  {
    stageId: { type: Schema.Types.ObjectId, ref: 'Stage', required: true },
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    description: { type: String, default: '' },
    color: { type: String, default: 'blue' },
    icon: { type: String, default: '📚' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Subject: Model<ISubject> = mongoose.model<ISubject>('Subject', SubjectSchema);
export default Subject;
