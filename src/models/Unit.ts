import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUnit extends Document {
  /** Junction reference: the GradeSubject row this unit belongs to */
  gradeSubjectId: mongoose.Types.ObjectId;
  /** Kept for convenience queries without joining GradeSubject */
  subjectId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  order: number;
  isPublished: boolean;
  createdBy?: mongoose.Types.ObjectId; // Admin or Teacher who created this
}

const UnitSchema = new Schema<IUnit>(
  {
    gradeSubjectId: { type: Schema.Types.ObjectId, ref: 'GradeSubject', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    title: { type: String, required: true },
    titleAr: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

UnitSchema.index({ gradeSubjectId: 1, order: 1 });
UnitSchema.index({ subjectId: 1, gradeId: 1 });

const Unit: Model<IUnit> = mongoose.model<IUnit>('Unit', UnitSchema);
export default Unit;
