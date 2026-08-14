import mongoose, { Document, Model, Schema } from "mongoose";

export type PayoutMethod = "InstaPay" | "VodafoneCash" | "BankTransfer" | "Other";

export interface ITeacherPayout extends Document {
  teacherId: mongoose.Types.ObjectId;
  amountCents: number;
  method: PayoutMethod;
  reference?: string;
  earningsCount: number;
  createdBy: mongoose.Types.ObjectId;
}

const TeacherPayoutSchema = new Schema<ITeacherPayout>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Always computed server-side as the sum of the earnings it settles —
    // never trust a client-supplied amount here.
    amountCents: { type: Number, required: true },
    method: {
      type: String,
      enum: ["InstaPay", "VodafoneCash", "BankTransfer", "Other"],
      required: true,
    },
    reference: { type: String },
    earningsCount: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

TeacherPayoutSchema.index({ teacherId: 1, createdAt: -1 });

const TeacherPayout: Model<ITeacherPayout> = mongoose.model<ITeacherPayout>(
  "TeacherPayout",
  TeacherPayoutSchema,
);
export default TeacherPayout;
