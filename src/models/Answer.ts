import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAnswer extends Document {
  questionId: mongoose.Types.ObjectId;
  answerText: string;
  isCorrect: boolean;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    answerText: { type: String, required: true },
    isCorrect: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

const Answer: Model<IAnswer> = mongoose.model<IAnswer>('Answer', AnswerSchema);
export default Answer;
