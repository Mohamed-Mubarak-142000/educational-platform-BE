import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILesson extends Document {
  unitId?: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  // Media fields — subject-agnostic; any combination can be used
  videoUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  modelUrl?: string;          // generic 3-D model (not biology-specific)
  modelExplanation?: string;
  modelExplanationAr?: string;
  audioUrl?: string;
  order: number;
  duration?: number;          // seconds
  isPublished: boolean;
  isFree: boolean;            // preview lesson — no subscription required
  // @deprecated — kept for backward compatibility during migration from Course track
  courseId?: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
}

const LessonSchema = new Schema<ILesson>(
  {
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    titleAr: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    videoUrl: { type: String },
    pdfUrl: { type: String },
    imageUrl: { type: String },
    modelUrl: { type: String },
    modelExplanation: { type: String },
    modelExplanationAr: { type: String },
    audioUrl: { type: String },
    order: { type: Number, required: true, default: 0 },
    duration: { type: Number },
    isPublished: { type: Boolean, default: false },
    isFree: { type: Boolean, default: false },
    // @deprecated — backward compat during migration
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
  },
  { timestamps: true }
);

LessonSchema.index({ unitId: 1, order: 1 });

const Lesson: Model<ILesson> = mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
