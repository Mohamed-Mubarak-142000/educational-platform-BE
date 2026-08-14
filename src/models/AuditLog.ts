import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorName?: string;
  actorRole: string;
  method: string;
  path: string;
  statusCode: number;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  actorName: { type: String },
  actorRole: { type: String, required: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
