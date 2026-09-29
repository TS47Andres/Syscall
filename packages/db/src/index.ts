/**
 * File: index.ts
 * Role: Owns MongoDB connection lifecycle and shared persistence models.
 * Service: Shared database package.
 */
import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { v7 as uuidv7 } from 'uuid';

export interface UserDocument extends Document {
  publicId: string;
  phoneE164: string;
  phone10Digit: string;
  emailAddress: string;
  displayName: string;
  avatarStorageKey: string | null;
  passwordHash: string | null;
  passwordConfigured: boolean;
  accountStatus: 'active' | 'disabled';
  lastLoginAt: Date | null;
  sessionsRevokedAt: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  dateOfBirth?: string | null;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailDocument extends Document {
  publicId: string;
  senderUserId: mongoose.Types.ObjectId;
  senderAddress: string;
  recipientUserId: mongoose.Types.ObjectId;
  recipientAddress: string;
  subject: string;
  textBody: string;
  htmlBody: string | null;
  attachments: AttachmentMetadata[];
  rawMimePath: string;
  messageIdHeader: string;
  inReplyTo: string | null;
  references: string[];
  deliveryStatus: 'scheduled' | 'queued' | 'delivered' | 'failed' | 'cancelled';
  scheduledAt: Date | null;
  scheduleVersion: number;
  scheduledByVoice: boolean;
  scheduleActionId?: string;
  isSpam: boolean;
  senderStarredAt: Date | null;
  recipientStarredAt: Date | null;
  senderArchivedAt: Date | null;
  recipientArchivedAt: Date | null;
  readAt: Date | null;
  senderDeletedAt: Date | null;
  recipientDeletedAt: Date | null;
  senderPermanentlyDeletedAt: Date | null;
  recipientPermanentlyDeletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt: Date | null;
  failedAt: Date | null;
  lastDeliveryError: string | null;
}

export interface AttachmentMetadata {
  storageKey: string;
  originalFilename: string;
  contentType: string;
  size: number;
}

export interface DraftDocument extends Document {
  publicId: string;
  ownerUserId: mongoose.Types.ObjectId;
  recipientAddress: string | null;
  subject: string;
  textBody: string;
  htmlBody: string | null;
  attachments: AttachmentMetadata[];
  status: 'draft' | 'queued' | 'sent';
  createdAt: Date;
  updatedAt: Date;
}

export interface ResetTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface AuditLogDocument extends Document {
  publicId: string;
  eventType: string;
  actorUserId: mongoose.Types.ObjectId | null;
  relatedEntityIds: string[];
  metadata: Record<string, string | number | boolean | null>;
  createdAt: Date;
}

export interface WebhookEventDocument extends Document {
  providerEventId: string;
  eventType: string;
  receivedAt: Date;
}

export interface PushDeviceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<AttachmentMetadata>({
  storageKey: { type: String, required: true },
  originalFilename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
}, { _id: false });

const userSchema = new Schema<UserDocument>({
  publicId: { type: String, required: true, unique: true, default: uuidv7 },
  phoneE164: { type: String, required: true, unique: true, index: true },
  phone10Digit: { type: String, required: true, unique: true, index: true },
  emailAddress: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, default: '' },
  avatarStorageKey: { type: String, default: null },
  passwordHash: { type: String, default: null },
  passwordConfigured: { type: Boolean, required: true, default: false },
  accountStatus: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
  lastLoginAt: { type: Date, default: null },
  sessionsRevokedAt: { type: Date, default: Date.now },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say', null], default: null },
  dateOfBirth: { type: String, default: null },
  language: { type: String, default: 'en' },
}, { timestamps: true });

const emailSchema = new Schema<EmailDocument>({
  publicId: { type: String, required: true, unique: true, default: uuidv7, index: true },
  senderUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  senderAddress: { type: String, required: true },
  recipientUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  recipientAddress: { type: String, required: true },
  subject: { type: String, required: true, maxlength: 998 },
  textBody: { type: String, default: '' },
  htmlBody: { type: String, default: null },
  attachments: { type: [attachmentSchema], default: [] },
  // Outbound messages have no raw-MIME file until the SMTP service accepts them.
  rawMimePath: { type: String, default: '' },
  messageIdHeader: { type: String, required: true },
  inReplyTo: { type: String, default: null },
  references: { type: [String], default: [] },
  deliveryStatus: { type: String, enum: ['scheduled', 'queued', 'delivered', 'failed', 'cancelled'], default: 'queued', index: true },
  scheduledAt: { type: Date, default: null, index: true },
  scheduleVersion: { type: Number, default: 0 },
  scheduledByVoice: { type: Boolean, default: false },
  scheduleActionId: { type: String },
  isSpam: { type: Boolean, default: false, index: true },
  senderStarredAt: { type: Date, default: null },
  recipientStarredAt: { type: Date, default: null },
  senderArchivedAt: { type: Date, default: null },
  recipientArchivedAt: { type: Date, default: null },
  readAt: { type: Date, default: null, index: true },
  senderDeletedAt: { type: Date, default: null },
  recipientDeletedAt: { type: Date, default: null },
  senderPermanentlyDeletedAt: { type: Date, default: null },
  recipientPermanentlyDeletedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  lastDeliveryError: { type: String, default: null },
}, { timestamps: true });
emailSchema.index({ recipientUserId: 1, recipientDeletedAt: 1, createdAt: -1 });
emailSchema.index({ senderUserId: 1, senderDeletedAt: 1, createdAt: -1 });
emailSchema.index({ deliveryStatus: 1, scheduledAt: 1 });
emailSchema.index({ scheduleActionId: 1 }, { unique: true, sparse: true });

const draftSchema = new Schema<DraftDocument>({
  publicId: { type: String, required: true, unique: true, default: uuidv7, index: true },
  ownerUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  recipientAddress: { type: String, default: null },
  subject: { type: String, default: '' },
  textBody: { type: String, default: '' },
  htmlBody: { type: String, default: null },
  attachments: { type: [attachmentSchema], default: [] },
  status: { type: String, enum: ['draft', 'queued', 'sent'], default: 'draft', index: true },
}, { timestamps: true });

const resetTokenSchema = new Schema<ResetTokenDocument>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  consumedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

const auditSchema = new Schema<AuditLogDocument>({
  publicId: { type: String, required: true, unique: true, default: uuidv7 },
  eventType: { type: String, required: true, index: true },
  actorUserId: { type: Schema.Types.ObjectId, default: null, ref: 'User' },
  relatedEntityIds: { type: [String], default: [] },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });
auditSchema.index({ createdAt: -1 });

const webhookSchema = new Schema<WebhookEventDocument>({
  providerEventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
}, { timestamps: { createdAt: false, updatedAt: false } });
webhookSchema.add({ receivedAt: { type: Date, required: true, default: Date.now } });

const pushDeviceSchema = new Schema<PushDeviceDocument>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  token: { type: String, required: true, unique: true, maxlength: 256 },
  platform: { type: String, enum: ['ios', 'android'], required: true },
}, { timestamps: true });

export const User: Model<UserDocument> = mongoose.models.User ?? mongoose.model<UserDocument>('User', userSchema);
export const Email: Model<EmailDocument> = mongoose.models.Email ?? mongoose.model<EmailDocument>('Email', emailSchema);
export const Draft: Model<DraftDocument> = mongoose.models.Draft ?? mongoose.model<DraftDocument>('Draft', draftSchema);
export const ResetToken: Model<ResetTokenDocument> = mongoose.models.ResetToken ?? mongoose.model<ResetTokenDocument>('ResetToken', resetTokenSchema);
export const AuditLog: Model<AuditLogDocument> = mongoose.models.AuditLog ?? mongoose.model<AuditLogDocument>('AuditLog', auditSchema);
export const WebhookEvent: Model<WebhookEventDocument> = mongoose.models.WebhookEvent ?? mongoose.model<WebhookEventDocument>('WebhookEvent', webhookSchema);
export const PushDevice: Model<PushDeviceDocument> = mongoose.models.PushDevice ?? mongoose.model<PushDeviceDocument>('PushDevice', pushDeviceSchema);

// Opens the shared MongoDB connection and fails loudly if the dependency is unavailable.
export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

// Closes MongoDB during graceful service shutdown.
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

// Checks whether MongoDB can answer a ping command.
export async function pingDatabase(): Promise<boolean> {
  try {
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}
