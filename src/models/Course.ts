import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  teacherId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  price: number;
  thumbnail?: string;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stageId: { type: Schema.Types.ObjectId, ref: 'Stage', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    price: { type: Number, required: true, default: 0 },
    thumbnail: { type: String },
  },
  { timestamps: true }
);

const Course: Model<ICourse> = mongoose.model<ICourse>('Course', CourseSchema);
export default Course;
