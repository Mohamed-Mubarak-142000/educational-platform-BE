import mongoose, { Document, Model, Schema } from "mongoose";

// One document per question — no cap on how many a teacher can add, same
// pattern as MCQQuestion for the smaller per-unit quizzes.
export interface IExamQuestion extends Document {
  examId: mongoose.Types.ObjectId;
  text: string;
  options: string[];
  correctAnswer: number; // index into options
}

const ExamQuestionSchema = new Schema<IExamQuestion>({
  examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
});

ExamQuestionSchema.index({ examId: 1 });

const ExamQuestion: Model<IExamQuestion> = mongoose.model<IExamQuestion>(
  "ExamQuestion",
  ExamQuestionSchema,
);
export default ExamQuestion;
