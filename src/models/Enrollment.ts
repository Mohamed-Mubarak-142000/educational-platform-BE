import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  },
  { timestamps: true }
);

const Enrollment: Model<IEnrollment> = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
export default Enrollment;
