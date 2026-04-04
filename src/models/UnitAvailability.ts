import mongoose, { Document, Model, Schema } from 'mongoose';

export type AvailabilityStatus = 'available' | 'locked' | 'upcoming';

export interface IUnitAvailability extends Document {
  unitId: mongoose.Types.ObjectId;
  availableMonth?: number;
  availableYear?: number;
  status: AvailabilityStatus;
  note?: string;
}

const UnitAvailabilitySchema = new Schema<IUnitAvailability>(
  {
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, unique: true },
    availableMonth: { type: Number, min: 1, max: 12 },
    availableYear: { type: Number },
    status: { type: String, enum: ['available', 'locked', 'upcoming'], default: 'available' },
    note: { type: String },
  },
  { timestamps: true }
);

const UnitAvailability: Model<IUnitAvailability> = mongoose.model<IUnitAvailability>('UnitAvailability', UnitAvailabilitySchema);
export default UnitAvailability;
