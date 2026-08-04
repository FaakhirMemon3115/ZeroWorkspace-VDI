import { Schema, model, Document } from 'mongoose';

export interface IActivityLog extends Document {
  timestamp: Date;
  userId: string;
  vmId: string;
  clientIp: string;
  eventType: 'DLP_VIOLATION_ATTEMPT' | 'FILE_ACCESS' | 'SESSION_INIT' | 'NETWORK_BLOCKED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, any>;
  resolvedStatus: 'FLAGGED' | 'RESOLVED' | 'PENDING_REVIEW';
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    userId: { type: String, required: true, index: true },
    vmId: { type: String, required: true, index: true },
    clientIp: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    details: { type: Schema.Types.Mixed, required: true },
    resolvedStatus: { type: String, enum: ['FLAGGED', 'RESOLVED', 'PENDING_REVIEW'], default: 'FLAGGED' },
  },
  { timestamps: false }
);

activityLogSchema.index({ userId: 1, timestamp: -1, severity: 1 });

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);
