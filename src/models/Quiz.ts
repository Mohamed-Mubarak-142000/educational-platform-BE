import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IQuiz extends Document {
  lessonId: mongoose.Types.ObjectId;
  title: string;
  timeLimit: number; // in minutes
}

const QuizSchema = new Schema<IQuiz>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    title: { type: String, required: true },
    timeLimit: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Quiz: Model<IQuiz> = mongoose.model<IQuiz>('Quiz', QuizSchema);
export default Quiz;
