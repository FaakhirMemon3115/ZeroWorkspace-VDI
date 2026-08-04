import { Schema, model, Document } from 'mongoose';

export interface IDlpPolicy extends Document {
  policyId: string;
  name: string;
  version: number;
  isActive: boolean;
  enforcements: {
    blockUsb: boolean;
    blockClipboard: {
      direction: 'INBOUND_ONLY' | 'OUTBOUND_ONLY' | 'BOTH' | 'NONE';
      maxCharacters: number;
    };
    networkExfiltration: {
      blockWebStorage: boolean;
      blockedMessagingApps: string[];
      blockedDomains: string[];
    };
    fileTransfer: {
      blockPrinting: boolean;
      blockScreenCapture: boolean;
    };
  };
  assignedUserGroups: string[];
  updatedAt: Date;
}

const dlpPolicySchema = new Schema<IDlpPolicy>(
  {
    policyId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    enforcements: {
      blockUsb: { type: Boolean, default: true },
      blockClipboard: {
        direction: { type: String, enum: ['INBOUND_ONLY', 'OUTBOUND_ONLY', 'BOTH', 'NONE'], default: 'BOTH' },
        maxCharacters: { type: Number, default: 0 },
      },
      networkExfiltration: {
        blockWebStorage: { type: Boolean, default: true },
        blockedMessagingApps: { type: [String], default: [] },
        blockedDomains: { type: [String], default: [] },
      },
      fileTransfer: {
        blockPrinting: { type: Boolean, default: true },
        blockScreenCapture: { type: Boolean, default: true },
      },
    },
    assignedUserGroups: { type: [String], default: ['DEVELOPERS'] },
  },
  { timestamps: true }
);

export const DlpPolicy = model<IDlpPolicy>('DlpPolicy', dlpPolicySchema);
