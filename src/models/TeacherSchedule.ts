import mongoose, { Document, Model, Schema } from 'mongoose';

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ITeacherSchedule extends Document {
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  maxStudents: number;
  enrolledStudents: mongoose.Types.ObjectId[];
  isActive: boolean;
}

const TeacherScheduleSchema = new Schema<ITeacherSchedule>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    day: {
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxStudents: { type: Number, default: 10 },
    enrolledStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const TeacherSchedule: Model<ITeacherSchedule> = mongoose.model<ITeacherSchedule>('TeacherSchedule', TeacherScheduleSchema);
export default TeacherSchedule;
