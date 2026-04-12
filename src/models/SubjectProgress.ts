import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * SubjectProgress — aggregated completion state for one student in one
 * subject (within a grade context).
 * Kept separate from UnitProgress so the student dashboard can show a
 * per-subject completion ring without scanning all units at query time.
 */
export interface ISubjectProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  completedUnitIds: mongoose.Types.ObjectId[];
  totalUnits: number;
  percentage: number; // 0-100
  lastAccessedAt: Date;
}

const SubjectProgressSchema = new Schema<ISubjectProgress>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    completedUnitIds: [{ type: Schema.Types.ObjectId, ref: 'Unit' }],
    totalUnits: { type: Number, default: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SubjectProgressSchema.index(
  { studentId: 1, subjectId: 1, gradeId: 1 },
  { unique: true }
);
SubjectProgressSchema.index({ studentId: 1, gradeId: 1 });

const SubjectProgress: Model<ISubjectProgress> = mongoose.model<ISubjectProgress>(
  'SubjectProgress',
  SubjectProgressSchema
);
export default SubjectProgress;
