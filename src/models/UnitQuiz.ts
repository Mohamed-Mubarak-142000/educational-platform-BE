import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUnitQuiz extends Document {
  attachedTo: 'unit' | 'lesson' | 'part';
  attachedToId: mongoose.Types.ObjectId;
  title: string;
}

const UnitQuizSchema = new Schema<IUnitQuiz>(
  {
    attachedTo: { type: String, enum: ['unit', 'lesson', 'part'], required: true },
    attachedToId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
  },
  { timestamps: true }
);

const UnitQuiz: Model<IUnitQuiz> = mongoose.model<IUnitQuiz>('UnitQuiz', UnitQuizSchema);
export default UnitQuiz;
