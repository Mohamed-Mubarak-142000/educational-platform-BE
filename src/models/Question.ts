import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IQuestion extends Document {
  quizId: mongoose.Types.ObjectId;
  question: string;
  type: string; // "Multiple Choice", "True/False", "Short Answer"
}

const QuestionSchema = new Schema<IQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    question: { type: String, required: true },
    type: { type: String, required: true, enum: ['Multiple Choice', 'True/False', 'Short Answer'] },
  },
  { timestamps: true }
);

const Question: Model<IQuestion> = mongoose.model<IQuestion>('Question', QuestionSchema);
export default Question;
