import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IResult extends Document {
  studentId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  score: number;
}

const ResultSchema = new Schema<IResult>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    score: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Result: Model<IResult> = mongoose.model<IResult>('Result', ResultSchema);
export default Result;
