/**
 * File: services.ts
 * Role: Holds API application services so route handlers stay thin.
 * Service: API.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import argon2 from 'argon2';
import type { Redis } from 'ioredis';
import { v7 as uuidv7 } from 'uuid';
import { AuditLog, Draft, Email, ResetToken, User, type UserDocument, type AttachmentMetadata } from '@syscall/db';
import { toLocalAddress, toPhone10, toPhoneE164, passwordSchema } from '@syscall/validation';
import { writeGeneratedFile, validateAttachment } from '@syscall/mail';
import { createOutboundEmailQueue, createSmsQueue, createUnreadEmailSmsQueue, type SmsSendJob } from '@syscall/queues';
import type { AppConfig } from '@syscall/config';

export interface ServiceContext {
  config: AppConfig;
  redis: Redis;
  outboundQueue: ReturnType<typeof createOutboundEmailQueue>;
  unreadQueue: ReturnType<typeof createUnreadEmailSmsQueue>;
  smsQueue: ReturnType<typeof createSmsQueue>;
}

// Hashes sensitive short-lived values before persistence or comparison.
export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Records a non-sensitive audit event without exposing credentials or raw tokens.
export async function audit(eventType: string, actorUserId: UserDocument['_id'] | null, relatedEntityIds: string[] = [], metadata: Record<string, string | number | boolean | null> = {}): Promise<void> {
  await AuditLog.create({ publicId: uuidv7(), eventType, actorUserId, relatedEntityIds, metadata });
}

// Creates or returns the one canonical account for an Indian phone number.
export async function ensureUserForPhone(config: AppConfig, phone: string): Promise<{ user: UserDocument; created: boolean }> {
  const phoneE164 = toPhoneE164(phone);
  const phone10Digit = toPhone10(phoneE164);
  const existing = await User.findOne({ phoneE164 });
  if (existing) return { user: existing, created: false };
  const user = await User.create({ phoneE164, phone10Digit, emailAddress: toLocalAddress(phone10Digit, config.LOCAL_MAIL_DOMAIN), passwordHash: null, passwordConfigured: false });
  return { user, created: true };
}

// Sends password reset instructions without revealing account existence to a caller.
export async function requestPasswordReset(context: ServiceContext, phone: string): Promise<void> {
  const phoneE164 = toPhoneE164(phone);
  const user = await User.findOne({ phoneE164 });
  if (!user) return;
  const token = crypto.randomBytes(32).toString('base64url');
  await ResetToken.create({ userId: user._id, tokenHash: hashSecret(token), expiresAt: new Date(Date.now() + context.config.PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000) });
  await queueSms(context, { phoneE164: user.phoneE164, body: `Reset your Syscall password: ${context.config.PUBLIC_WEBHOOK_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}` });
  await audit('password_reset_requested', user._id);
}

// Creates a secure Redis-backed session and returns its opaque token.
export async function createSession(context: ServiceContext, user: UserDocument): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSecret(token);
  const sessionCreatedAt = Date.now();
  const ttlSeconds = context.config.SESSION_TTL_DAYS * 24 * 60 * 60;
  await context.redis.set(`session:${tokenHash}`, JSON.stringify({ userId: user.id, createdAt: sessionCreatedAt }), 'EX', ttlSeconds);
  return token;
}

// Resolves a session token and enforces user-wide revocation timestamps.
export async function resolveSession(context: ServiceContext, token: string): Promise<UserDocument | null> {
  const sessionData = await context.redis.get(`session:${hashSecret(token)}`);
  if (!sessionData) return null;
  const parsed = JSON.parse(sessionData) as { userId: string; createdAt: number };
  const user = await User.findById(parsed.userId);
  if (!user || user.accountStatus !== 'active' || user.sessionsRevokedAt.getTime() > parsed.createdAt) return null;
  return user;
}

// Revokes the specific opaque session token.
export async function revokeSession(context: ServiceContext, token: string): Promise<void> {
  await context.redis.del(`session:${hashSecret(token)}`);
}

// Revokes every session issued before the current time for a user.
export async function revokeAllSessions(user: UserDocument): Promise<void> {
  user.sessionsRevokedAt = new Date();
  await user.save();
}

// Generates and queues a six-digit OTP without logging its plaintext value.
export async function requestOtp(context: ServiceContext, phone: string): Promise<void> {
  const phoneE164 = toPhoneE164(phone);
  const cooldownKey = `otp:cooldown:${phoneE164}`;
  if (await context.redis.exists(cooldownKey)) throw new Error('OTP resend cooldown is active. Try again later.');
  const dailyKey = `otp:failed:${phoneE164}:${new Date().toISOString().slice(0, 10)}`;
  const failedAttempts = Number(await context.redis.get(dailyKey) ?? 0);
  if (failedAttempts >= context.config.OTP_MAX_FAILED_ATTEMPTS_PER_DAY) throw new Error('Daily OTP failure limit reached.');
  const otp = crypto.randomInt(100000, 1000000).toString();
  await context.redis.set(`otp:value:${phoneE164}`, JSON.stringify({ hash: hashSecret(otp), expiresAt: Date.now() + context.config.OTP_EXPIRY_MINUTES * 60 * 1000 }), 'EX', context.config.OTP_EXPIRY_MINUTES * 60);
  await context.redis.set(cooldownKey, '1', 'EX', context.config.OTP_RESEND_COOLDOWN_SECONDS);
  await context.smsQueue.add('otp', { phoneE164, body: `Your Syscall verification code is ${otp}. It expires in ${context.config.OTP_EXPIRY_MINUTES} minutes.` });
  await audit('otp_sent', null, [], { phone10Digit: toPhone10(phoneE164) });
}

// Verifies an OTP, consumes it, and creates a session for an existing account.
export async function verifyOtp(context: ServiceContext, phone: string, otp: string): Promise<{ user: UserDocument; sessionToken: string }> {
  const phoneE164 = toPhoneE164(phone);
  const value = await context.redis.get(`otp:value:${phoneE164}`);
  const dailyKey = `otp:failed:${phoneE164}:${new Date().toISOString().slice(0, 10)}`;
  const failedAttempts = Number(await context.redis.get(dailyKey) ?? 0);
  if (!value || failedAttempts >= context.config.OTP_MAX_FAILED_ATTEMPTS_PER_DAY) throw new Error('OTP is invalid or expired.');
  const stored = JSON.parse(value) as { hash: string; expiresAt: number };
  if (stored.expiresAt < Date.now() || hashSecret(otp) !== stored.hash) {
    await context.redis.incr(dailyKey);
    await context.redis.expire(dailyKey, 24 * 60 * 60);
    await audit('otp_failed', null, [], { phone10Digit: toPhone10(phoneE164) });
    throw new Error('OTP is invalid or expired.');
  }
  const user = await User.findOne({ phoneE164 });
  if (!user) throw new Error('Account does not exist.');
  await context.redis.del(`otp:value:${phoneE164}`);
  user.lastLoginAt = new Date();
  await user.save();
  const sessionToken = await createSession(context, user);
  await audit('login_success', user._id);
  return { user, sessionToken };
}

// Validates and hashes an Argon2id password.
export async function hashPassword(password: string): Promise<string> {
  passwordSchema.parse(password);
  return argon2.hash(password, { type: argon2.argon2id });
}

// Enqueues an SMS and keeps SMS provider side effects out of request handlers.
export async function queueSms(context: ServiceContext, job: SmsSendJob): Promise<void> {
  await context.smsQueue.add('sms', job);
}

// Validates JSON attachment input and persists bytes under generated storage keys.
export async function persistAttachments(context: ServiceContext, attachments: Array<{ filename: string; contentType: string; contentBase64: string }> | undefined): Promise<AttachmentMetadata[]> {
  if (!attachments) return [];
  const maxBytes = context.config.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
  const total = attachments.reduce((sum, item) => sum + Buffer.byteLength(item.contentBase64, 'base64'), 0);
  if (total > context.config.SMTP_MAX_MESSAGE_SIZE_MB * 1024 * 1024) throw new Error('Total message size exceeds configured limit.');
  const metadata: AttachmentMetadata[] = [];
  for (const item of attachments) {
    const content = Buffer.from(item.contentBase64, 'base64');
    validateAttachment({ filename: item.filename, contentType: item.contentType, content }, maxBytes);
    const extension = item.filename.split('.').pop()?.toLowerCase() ?? 'bin';
    const storageKey = await writeGeneratedFile(context.config.ATTACHMENT_STORAGE_PATH, content, extension);
    metadata.push({ storageKey, originalFilename: item.filename, contentType: item.contentType, size: content.length });
  }
  return metadata;
}

// Builds an email record owned by the authenticated sender before queueing delivery.
export async function queueEmail(context: ServiceContext, sender: UserDocument, recipientAddress: string, subject: string, textBody: string, htmlBody: string | null, attachments: AttachmentMetadata[]): Promise<string> {
  const recipient = await User.findOne({ emailAddress: recipientAddress, accountStatus: 'active' });
  if (!recipient) throw new Error('Recipient must be an existing active @niti user.');
  const email = await Email.create({ senderUserId: sender._id, senderAddress: sender.emailAddress, recipientUserId: recipient._id, recipientAddress, subject, textBody, htmlBody, attachments, rawMimePath: '', messageIdHeader: `<${uuidv7()}@${context.config.LOCAL_MAIL_DOMAIN}>`, deliveryStatus: 'queued' });
  await context.outboundQueue.add('outbound-email', { emailId: email.publicId }, { attempts: 3, backoff: { type: 'custom' } });
  await audit('email_queued', sender._id, [email.publicId]);
  return email.publicId;
}

// Deletes a generated file tree entry only after both participants soft-delete a message.
export async function purgeEmail(context: ServiceContext, email: EmailDocumentLike): Promise<void> {
  if (email.rawMimePath) await safeRemove(context.config.RAW_MAIL_STORAGE_PATH, email.rawMimePath);
  for (const attachment of email.attachments) await safeRemove(context.config.ATTACHMENT_STORAGE_PATH, attachment.storageKey);
  await Email.deleteOne({ _id: email._id });
  await audit('message_purged', null, [email.publicId]);
}

type EmailDocumentLike = Pick<import('@syscall/db').EmailDocument, '_id' | 'publicId' | 'rawMimePath' | 'attachments'>;

// Removes a generated file while preserving the original error for real storage failures.
async function safeRemove(root: string, storageKey: string): Promise<void> {
  try { await fs.unlink(`${root}/${storageKey}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
