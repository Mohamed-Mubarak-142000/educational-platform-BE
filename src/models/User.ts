import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "Student" | "Teacher" | "Admin";
  phone?: string;
  subject?: string;
  stageId?: mongoose.Types.ObjectId; // Student: educational stage (kept for quick filter)
  gradeId?: mongoose.Types.ObjectId; // Student: grade within that stage

  cvUrl?: string;
  bio?: string;
  availableDays?: string[];
  availableHours?: Map<string, { start?: string; end?: string }>;
  subscribeLiveLessons?: boolean;
  parentEmail?: string;
  status?: "Active" | "Inactive";
  profileImage?: string;
  isVerified: boolean;

  // Live lesson instant availability (for teachers)
  isAvailableForInstantLessons?: boolean;
  instantLessonPricePerHour?: number;
  maxConcurrentSessions?: number;
  onlineStatus?: "online" | "offline" | "busy" | "away";
  lastSeen?: Date;
  otp?: string;
  otpExpires?: Date;
  otpLastSent?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  mustChangePassword: boolean;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: {
      type: String,
      enum: ["Student", "Teacher", "Admin"],
      default: "Student",
    },
    phone: { type: String },
    subject: { type: String },
    stageId: { type: Schema.Types.ObjectId, ref: "Stage" },
    gradeId: { type: Schema.Types.ObjectId, ref: "Grade" }, // Student grade
    cvUrl: { type: String },
    bio: { type: String, default: "" },
    availableDays: [
      {
        type: String,
        enum: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
      },
    ],
    availableHours: {
      type: Map,
      of: new Schema({ start: String, end: String }, { _id: false }),
      default: {},
    },
    subscribeLiveLessons: { type: Boolean, default: false },
    parentEmail: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    profileImage: { type: String },
    isVerified: { type: Boolean, default: false },

    // Live lesson instant availability
    isAvailableForInstantLessons: { type: Boolean, default: false },
    instantLessonPricePerHour: { type: Number, default: 100, min: 0 },
    maxConcurrentSessions: { type: Number, default: 3, min: 1, max: 10 },
    onlineStatus: {
      type: String,
      enum: ["online", "offline", "busy", "away"],
      default: "offline",
    },
    lastSeen: { type: Date },

    otp: { type: String },
    otpExpires: { type: Date },
    otpLastSent: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    mustChangePassword: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { flattenMaps: true },
    toObject: { flattenMaps: true },
  },
);

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
