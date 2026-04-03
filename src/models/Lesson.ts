import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILesson extends Document {
  sectionId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  videoUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  modelUrl?: string;
  order: number;
  duration?: number;
}

const LessonSchema = new Schema<ILesson>(
  {
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String },
    pdfUrl: { type: String },
    imageUrl: { type: String },
    modelUrl: { type: String },
    order: { type: Number, required: true, default: 0 },
    duration: { type: Number },
  },
  { timestamps: true }
);

const Lesson: Model<ILesson> = mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
