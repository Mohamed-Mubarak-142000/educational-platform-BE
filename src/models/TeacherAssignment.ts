import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * TeacherAssignment — precise mapping of teacher → subject → grade.
 * Replaces the loose arrays (subjectIds[], stageIds[]) on the User model
 * when fine-grained per-grade authorisation is needed.
 */
export interface ITeacherAssignment extends Document {
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  isPrimary: boolean; // first/lead teacher for the assignment
}

const TeacherAssignmentSchema = new Schema<ITeacherAssignment>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One teacher can only be assigned once per (subject, grade)
TeacherAssignmentSchema.index(
  { teacherId: 1, subjectId: 1, gradeId: 1 },
  { unique: true }
);
TeacherAssignmentSchema.index({ subjectId: 1, gradeId: 1 });

const TeacherAssignment: Model<ITeacherAssignment> =
  mongoose.model<ITeacherAssignment>('TeacherAssignment', TeacherAssignmentSchema);
export default TeacherAssignment;
