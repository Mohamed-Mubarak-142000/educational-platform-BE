import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * UnitProgress — aggregated completion state for one student in one unit.
 * Derived from individual lesson Progress documents but stored here for
 * fast dashboard queries.
 */
export interface IUnitProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  completedLessonIds: mongoose.Types.ObjectId[];
  totalLessons: number;
  percentage: number; // 0-100
  lastAccessedAt: Date;
}

const UnitProgressSchema = new Schema<IUnitProgress>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    completedLessonIds: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    totalLessons: { type: Number, default: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UnitProgressSchema.index({ studentId: 1, unitId: 1 }, { unique: true });
UnitProgressSchema.index({ studentId: 1 });

const UnitProgress: Model<IUnitProgress> = mongoose.model<IUnitProgress>(
  'UnitProgress',
  UnitProgressSchema
);
export default UnitProgress;
