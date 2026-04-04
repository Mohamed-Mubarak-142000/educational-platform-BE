import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMCQQuestion extends Document {
  quizId: mongoose.Types.ObjectId;
  text: string;
  options: string[];
  correctAnswer: number;
}

const MCQQuestionSchema = new Schema<IMCQQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'UnitQuiz', required: true },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true },
  },
  { timestamps: true }
);

const MCQQuestion: Model<IMCQQuestion> = mongoose.model<IMCQQuestion>('MCQQuestion', MCQQuestionSchema);
export default MCQQuestion;
