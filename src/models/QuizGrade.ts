import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IQuizGrade extends Document {
  studentId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: Date;
}

const QuizGradeSchema = new Schema<IQuizGrade>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'UnitQuiz', required: true },
    score: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const QuizGrade: Model<IQuizGrade> = mongoose.model<IQuizGrade>('QuizGrade', QuizGradeSchema);
export default QuizGrade;
