import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStage extends Document {
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

const StageSchema = new Schema<IStage>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '📚' },
    color: { type: String, default: 'blue' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Stage: Model<IStage> = mongoose.model<IStage>('Stage', StageSchema);
export default Stage;
