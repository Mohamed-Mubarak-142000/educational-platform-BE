import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  completed: boolean;
  watchedPercentage: number; // 0-100
  /** IDs of LessonParts the student has completed within this lesson */
  completedPartIds: mongoose.Types.ObjectId[];
  lastAccessedAt: Date;
}

const ProgressSchema = new Schema<IProgress>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completed: { type: Boolean, required: true, default: false },
    watchedPercentage: { type: Number, required: true, default: 0, min: 0, max: 100 },
    completedPartIds: [{ type: Schema.Types.ObjectId, ref: 'LessonPart' }],
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });
ProgressSchema.index({ studentId: 1 });

const Progress: Model<IProgress> = mongoose.model<IProgress>('Progress', ProgressSchema);
export default Progress;
