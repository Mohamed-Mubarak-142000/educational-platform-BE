import mongoose, { Document, Model, Schema } from "mongoose";

// A general/comprehensive exam — distinct from the small per-unit/lesson
// UnitQuiz. Scoped to an entire TeacherAssignment (subject+grade+teacher),
// with a fixed scheduled start time and duration shared by every student
// (not a per-student rolling window).
export interface IExam extends Document {
  teacherId: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  title: string;
  scheduledStart: Date;
  durationMinutes: number;
  // Cached for cheap list rendering only — never trusted for gating access;
  // submit/get always recompute from `scheduledStart`/`durationMinutes` vs.
  // the real server clock.
  status: "scheduled" | "active" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: "TeacherAssignment", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: "Grade", required: true },
    title: { type: String, required: true, trim: true },
    scheduledStart: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["scheduled", "active", "closed"], default: "scheduled" },
  },
  { timestamps: true },
);

ExamSchema.index({ assignmentId: 1, scheduledStart: -1 });
ExamSchema.index({ teacherId: 1, createdAt: -1 });

const Exam: Model<IExam> = mongoose.model<IExam>("Exam", ExamSchema);
export default Exam;
