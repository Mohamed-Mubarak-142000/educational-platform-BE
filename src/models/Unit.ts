import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUnit extends Document {
  subjectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
}

const UnitSchema = new Schema<IUnit>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Unit: Model<IUnit> = mongoose.model<IUnit>('Unit', UnitSchema);
export default Unit;
