import mongoose, { Document, Model, Schema } from 'mongoose';

interface PartQuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

interface PartMedia {
  videoUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  modelUrl?: string;
  modelExplanation?: string;
  audioUrl?: string;
}

export interface ILessonPart extends Document {
  lessonId: mongoose.Types.ObjectId;
  title: string;
  content?: string;
  media?: PartMedia;
  quiz?: PartQuizQuestion[];
  order: number;
}

const PartMediaSchema = new Schema<PartMedia>(
  {
    videoUrl: { type: String },
    pdfUrl: { type: String },
    imageUrl: { type: String },
    modelUrl: { type: String },
    modelExplanation: { type: String },
    audioUrl: { type: String },
  },
  { _id: false }
);

const PartQuizSchema = new Schema<PartQuizQuestion>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
  },
  { _id: false }
);

const LessonPartSchema = new Schema<ILessonPart>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    title: { type: String, required: true },
    content: { type: String },
    media: { type: PartMediaSchema },
    quiz: { type: [PartQuizSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const LessonPart: Model<ILessonPart> = mongoose.model<ILessonPart>('LessonPart', LessonPartSchema);
export default LessonPart;
