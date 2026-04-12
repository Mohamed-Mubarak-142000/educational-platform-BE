import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGrade extends Document {
  stageId: mongoose.Types.ObjectId;
  name: string;
  nameAr: string;
  order: number;
}

const GradeSchema = new Schema<IGrade>(
  {
    stageId: { type: Schema.Types.ObjectId, ref: 'Stage', required: true },
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

GradeSchema.index({ stageId: 1, order: 1 });

const Grade: Model<IGrade> = mongoose.model<IGrade>('Grade', GradeSchema);
export default Grade;
