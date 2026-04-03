import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  completed: boolean;
  watchedPercentage: number;
}

const ProgressSchema = new Schema<IProgress>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completed: { type: Boolean, required: true, default: false },
    watchedPercentage: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Progress: Model<IProgress> = mongoose.model<IProgress>('Progress', ProgressSchema);
export default Progress;
