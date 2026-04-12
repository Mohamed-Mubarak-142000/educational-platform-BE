import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * GradeSubject — junction table linking a canonical Subject to a Grade.
 * Allows the same subject (e.g. "Mathematics") to appear in multiple grades
 * without duplicating subject metadata.
 */
export interface IGradeSubject extends Document {
  gradeId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  order: number;
}

const GradeSubjectSchema = new Schema<IGradeSubject>(
  {
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent duplicate (grade, subject) pairs
GradeSubjectSchema.index({ gradeId: 1, subjectId: 1 }, { unique: true });
GradeSubjectSchema.index({ gradeId: 1, order: 1 });

const GradeSubject: Model<IGradeSubject> = mongoose.model<IGradeSubject>(
  'GradeSubject',
  GradeSubjectSchema
);
export default GradeSubject;
