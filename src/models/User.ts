import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'DEVELOPER' | 'AUDITOR';
  status: 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
  department: string;
  assignedVM?: {
    vmId: string;
    ipAddress: string;
    goldenImageVersion: string;
    allocatedAt: Date;
  };
  allowedIpRanges: string[];
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'DEVELOPER', 'AUDITOR'], required: true },
  status: { type: String, enum: ['ACTIVE', 'DISABLED', 'SUSPENDED'], default: 'ACTIVE' },
  department: { type: String, required: true },
  assignedVM: {
    vmId: { type: String },
    ipAddress: { type: String },
    goldenImageVersion: { type: String },
    allocatedAt: { type: Date },
  },
  allowedIpRanges: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<IUser>('User', userSchema);
