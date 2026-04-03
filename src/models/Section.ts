import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISection extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  order: number;
}

const SectionSchema = new Schema<ISection>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Section: Model<ISection> = mongoose.model<ISection>('Section', SectionSchema);
export default Section;
