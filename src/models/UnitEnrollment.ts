import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUnitEnrollment extends Document {
  studentId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
}

const UnitEnrollmentSchema = new Schema<IUnitEnrollment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
  },
  { timestamps: true }
);

UnitEnrollmentSchema.index({ studentId: 1, unitId: 1 }, { unique: true });

const UnitEnrollment: Model<IUnitEnrollment> = mongoose.model<IUnitEnrollment>('UnitEnrollment', UnitEnrollmentSchema);
export default UnitEnrollment;
