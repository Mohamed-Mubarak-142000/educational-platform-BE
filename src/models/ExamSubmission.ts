import mongoose, { Document, Model, Schema } from "mongoose";

export interface IExamAnswer {
  questionId: mongoose.Types.ObjectId;
  selected: number;
}

// One-shot — a student can submit an exam exactly once (unique index below),
// unlike the retakeable per-unit quizzes.
export interface IExamSubmission extends Document {
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: IExamAnswer[];
  score: number;
  correctCount: number;
  totalQuestions: number;
  autoSubmitted: boolean;
  submittedAt: Date;
}

const ExamSubmissionSchema = new Schema<IExamSubmission>({
  examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      _id: false,
      questionId: { type: Schema.Types.ObjectId, ref: "ExamQuestion", required: true },
      selected: { type: Number, required: true },
    },
  ],
  score: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  autoSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
});

ExamSubmissionSchema.index({ examId: 1, studentId: 1 }, { unique: true });

const ExamSubmission: Model<IExamSubmission> = mongoose.model<IExamSubmission>(
  "ExamSubmission",
  ExamSubmissionSchema,
);
export default ExamSubmission;
