import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Subject — canonical, reusable subject definition (e.g. "Mathematics", "Physics").
 * NOT tied to any Stage/Grade directly; the GradeSubject junction handles that mapping.
 * A single Subject doc can appear across many grades without data duplication.
 */
export interface ISubject extends Document {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  color: string;
  icon: string;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    color: { type: String, default: 'blue' },
    icon: { type: String, default: '📚' },
  },
  { timestamps: true }
);

// Prevent duplicate subject names (case-insensitive would need collation,
// but a simple unique index prevents exact duplicates)
SubjectSchema.index({ name: 1 }, { unique: true });

const Subject: Model<ISubject> = mongoose.model<ISubject>('Subject', SubjectSchema);
export default Subject;
