import mongoose, { Document, Model, Schema } from 'mongoose';

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type ApplicationStatus = 'Pending' | 'Accepted' | 'Rejected';

interface AvailableHours {
  start: string;
  end: string;
}

export interface ITeacherApplication extends Document {
  name: string;
  email: string;
  phone: string;
  profileImageUrl?: string;
  cvUrl?: string;
  availableDays: DayOfWeek[];
  availableHours: Map<string, AvailableHours>;
  status: ApplicationStatus;
  zoomLink?: string;
  rejectionReason?: string;
}

const TeacherApplicationSchema = new Schema<ITeacherApplication>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    profileImageUrl: { type: String },
    cvUrl: { type: String },
    availableDays: [{
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    }],
    availableHours: {
      type: Map,
      of: new Schema({ start: String, end: String }, { _id: false }),
      default: {},
    },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
    zoomLink: { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

const TeacherApplication: Model<ITeacherApplication> = mongoose.model<ITeacherApplication>('TeacherApplication', TeacherApplicationSchema);
export default TeacherApplication;
