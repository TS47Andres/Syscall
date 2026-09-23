/**
 * File: app.ts
 * Role: Defines HTTP routes and delegates work to API application services.
 * Service: API.
 */
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import cors from '@fastify/cors';
import { z } from 'zod';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { AuditLog, Draft, Email, User, WebhookEvent, pingDatabase, type UserDocument } from '@syscall/db';
import { createOutboundEmailQueue, createSmsQueue, createUnreadEmailSmsQueue } from '@syscall/queues';
import { startOutboundCall, verifyWebhookSignature, webhookUrl } from '@syscall/telnyx';
import { isTelnyxConfigured } from '@syscall/config';
import { toPhoneE164, addressSchema, passwordSchema, phoneSchema } from '@syscall/validation';
import { scanWithClamAv } from '@syscall/mail';
import type { AppConfig } from '@syscall/config';
import { createLogger } from '@syscall/logging';
import { audit, createSession, ensureUserForPhone, hashPassword, hashSecret, persistAttachments, purgeEmail, queueEmail, queueSms, requestOtp, resolveSession, revokeAllSessions, revokeSession, verifyOtp, type ServiceContext } from './services.js';

// Builds the Fastify application with all shared dependencies explicitly provided.
export async function buildApp(config: AppConfig, redis: Redis): Promise<{ app: FastifyInstance; context: ServiceContext }> {
  const logger = createLogger('api');
  const outboundQueue = createOutboundEmailQueue(redis);
  const unreadQueue = createUnreadEmailSmsQueue(redis);
  const smsQueue = createSmsQueue(redis);
  const context: ServiceContext = { config, redis, outboundQueue, unreadQueue, smsQueue };
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: false });

  // Creates an HTTP-aware error without requiring a global error plugin.
  function httpError(statusCode: number, message: string): Error & { statusCode: number } { return Object.assign(new Error(message), { statusCode }); }

  // Converts an authenticated session header into a user or a 401 response.
  async function requireUser(request: FastifyRequest): Promise<UserDocument> {
    const token = request.headers['x-session-token'];
    const sessionToken = Array.isArray(token) ? token[0] : token;
    if (!sessionToken) throw httpError(401, 'X-Session-Token is required.');
    const user = await resolveSession(context, sessionToken);
    if (!user) throw httpError(401, 'Session is invalid or revoked.');
    return user;
  }

  // Returns common user-safe JSON without exposing password or internal identifiers.
  function publicUser(user: UserDocument): Record<string, unknown> {
    return { id: user.publicId, phone: user.phone10Digit, emailAddress: user.emailAddress, passwordConfigured: user.passwordConfigured, accountStatus: user.accountStatus };
  }

  app.get('/health', async () => ({ status: 'ok', service: 'api' }));

  app.get('/ready', async (_request, reply) => {
    const mongoReady = await pingDatabase();
    let clamavReady = true;
    try { await scanWithClamAv(config.CLAMAV_HOST, config.CLAMAV_PORT, Buffer.alloc(0)); } catch { clamavReady = false; }
    const filesystemReady = await Promise.all([config.RAW_MAIL_STORAGE_PATH, config.ATTACHMENT_STORAGE_PATH].map(async (directory) => { try { const fs = await import('node:fs/promises'); await fs.mkdir(directory, { recursive: true }); await fs.access(directory); return true; } catch { return false; } }));
    const ready = mongoReady && redis.status === 'ready' && clamavReady && filesystemReady.every(Boolean);
    return reply.code(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not-ready', dependencies: { mongodb: mongoReady, redis: redis.status === 'ready', clamav: clamavReady, filesystem: filesystemReady.every(Boolean), telnyxConfigured: isTelnyxConfigured(config) } });
  });

  app.post('/api/auth/otp/request', async (request, reply) => {
    const body = z.object({ phone: z.string() }).parse(request.body);
    await requestOtp(context, body.phone);
    return reply.code(202).send({ status: 'queued' });
  });

  app.post('/api/auth/otp/verify', async (request) => {
    const body = z.object({ phone: z.string(), otp: z.string().regex(/^\d{6}$/) }).parse(request.body);
    const result = await verifyOtp(context, body.phone, body.otp);
    return { sessionToken: result.sessionToken, requiresPassword: !result.user.passwordConfigured, user: publicUser(result.user) };
  });

  app.post('/api/auth/password/login', async (request) => {
    const body = z.object({ phone: z.string(), password: z.string() }).parse(request.body);
    const phoneE164 = toPhoneE164(body.phone);
    const user = await User.findOne({ phoneE164, accountStatus: 'active' });
    if (!user || !user.passwordHash || !(await (await import('argon2')).default.verify(user.passwordHash, body.password))) { await audit('login_failure', user?._id ?? null, [], { phone10Digit: phoneE164.slice(3) }); throw httpError(401, 'Invalid phone or password.'); }
    user.lastLoginAt = new Date(); await user.save();
    const sessionToken = await createSession(context, user); await audit('login_success', user._id);
    return { sessionToken, requiresPassword: false, user: publicUser(user) };
  });

  app.post('/api/auth/password/set', async (request) => {
    const user = await requireUser(request);
    const body = z.object({ password: passwordSchema }).parse(request.body);
    user.passwordHash = await hashPassword(body.password); user.passwordConfigured = true; await user.save();
    await audit('password_set', user._id);
    return { user: publicUser(user) };
  });

  app.post('/api/auth/logout', async (request) => {
    const token = request.headers['x-session-token']; const sessionToken = Array.isArray(token) ? token[0] : token;
    if (sessionToken) { await revokeSession(context, sessionToken); await audit('session_revoked', null); }
    return { status: 'logged-out' };
  });

  app.post('/api/auth/logout-all', async (request) => { const user = await requireUser(request); await revokeAllSessions(user); await audit('session_revoked', user._id); return { status: 'logged-out-all' }; });

  app.post('/api/auth/forgot-password', async (request, reply) => {
    const body = z.object({ phone: z.string() }).parse(request.body); const phoneE164 = toPhoneE164(body.phone); const user = await User.findOne({ phoneE164 });
    if (user) { const token = cryptoRandomToken(); await import('@syscall/db').then(({ ResetToken }) => ResetToken.create({ userId: user._id, tokenHash: hashSecret(token), expiresAt: new Date(Date.now() + config.PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000) })); await queueSms(context, { phoneE164, body: `Reset your PhoneMail password: ${config.PUBLIC_WEBHOOK_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}` }); await audit('password_reset_requested', user._id); }
    return reply.code(202).send({ status: 'accepted' });
  });

  app.post('/api/auth/reset-password', async (request) => {
    const body = z.object({ token: z.string().min(20), password: passwordSchema }).parse(request.body);
    const { ResetToken } = await import('@syscall/db'); const reset = await ResetToken.findOne({ tokenHash: hashSecret(body.token), consumedAt: null, expiresAt: { $gt: new Date() } });
    if (!reset) throw httpError(400, 'Reset token is invalid or expired.');
    const user = await User.findById(reset.userId); if (!user) throw httpError(400, 'Reset token is invalid or expired.');
    user.passwordHash = await hashPassword(body.password); user.passwordConfigured = true; await user.save(); await ResetToken.updateMany({ userId: user._id, consumedAt: null }, { $set: { consumedAt: new Date() } }); await revokeAllSessions(user); await audit('password_reset_completed', user._id);
    return { status: 'password-reset' };
  });

  app.post('/calls/start', async (request) => { const body = z.object({ phone: phoneSchema }).parse(request.body); const result = await startOutboundCall(config, { phoneE164: body.phone, webhookUrl: webhookUrl(config, 'voice') }); await audit('outbound_call_triggered', null, [], { phone10Digit: body.phone.slice(3) }); return { status: 'started', provider: result }; });

  app.post('/api/mail/send', async (request, reply) => {
    const user = await requireUser(request); if (!user.passwordConfigured) throw httpError(403, 'Set a password before using mail.');
    const body = z.object({ to: addressSchema, subject: z.string().max(998), textBody: z.string().default(''), htmlBody: z.string().nullable().optional(), attachments: z.array(z.object({ filename: z.string().min(1), contentType: z.string(), contentBase64: z.string() })).optional() }).parse(request.body);
    const attachments = await persistAttachments(context, body.attachments); const publicId = await queueEmail(context, user, body.to, body.subject, body.textBody, body.htmlBody ?? null, attachments);
    return reply.code(202).send({ publicId, deliveryStatus: 'queued' });
  });

  app.get('/api/mail', async (request) => { const user = await requireUser(request); const messages = await Email.find({ $or: [{ recipientUserId: user._id, recipientDeletedAt: null }, { senderUserId: user._id, senderDeletedAt: null }] }).sort({ createdAt: -1 }).limit(100).lean(); return messages.map((message) => ({ ...message, _id: undefined })); });

  app.get('/api/mail/:publicId', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const email = await Email.findOne({ publicId: params.publicId }); const isSender = Boolean(email && email.senderUserId.equals(user._id)); const isRecipient = Boolean(email && email.recipientUserId.equals(user._id)); if (!email || (!isSender && !isRecipient) || (isSender && email.senderDeletedAt) || (isRecipient && email.recipientDeletedAt)) throw httpError(404, 'Message not found.'); if (isRecipient && !email.readAt) { email.readAt = new Date(); await email.save(); await audit('message_read', user._id, [email.publicId]); } const output = email.toObject() as unknown as Record<string, unknown>; delete output._id; delete output.__v; return output; });

  app.delete('/api/mail/:publicId', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const email = await Email.findOne({ publicId: params.publicId }); if (!email) throw httpError(404, 'Message not found.'); const isSender = email.senderUserId.equals(user._id); const isRecipient = email.recipientUserId.equals(user._id); if (!isSender && !isRecipient) throw httpError(404, 'Message not found.'); if (isSender) email.senderDeletedAt = new Date(); if (isRecipient) email.recipientDeletedAt = new Date(); await email.save(); await audit('message_soft_deleted', user._id, [email.publicId], { role: isSender ? 'sender' : 'recipient' }); if (email.senderDeletedAt && email.recipientDeletedAt) await purgeEmail(context, email); return { status: 'deleted' }; });

  app.post('/api/mail/:publicId/spam', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const email = await Email.findOne({ publicId: params.publicId, recipientUserId: user._id }); if (!email) throw httpError(404, 'Message not found.'); email.isSpam = true; await email.save(); return { isSpam: true }; });
  app.delete('/api/mail/:publicId/spam', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const email = await Email.findOne({ publicId: params.publicId, recipientUserId: user._id }); if (!email) throw httpError(404, 'Message not found.'); email.isSpam = false; await email.save(); return { isSpam: false }; });

  app.post('/api/drafts', async (request) => { const user = await requireUser(request); const body = z.object({ to: addressSchema.nullable().optional(), subject: z.string().max(998).default(''), textBody: z.string().default(''), htmlBody: z.string().nullable().optional(), attachments: z.array(z.object({ filename: z.string().min(1), contentType: z.string(), contentBase64: z.string() })).optional() }).parse(request.body); const attachments = await persistAttachments(context, body.attachments); const draft = await Draft.create({ ownerUserId: user._id, recipientAddress: body.to ?? null, subject: body.subject, textBody: body.textBody, htmlBody: body.htmlBody ?? null, attachments }); return { publicId: draft.publicId }; });
  app.get('/api/drafts', async (request) => { const user = await requireUser(request); return Draft.find({ ownerUserId: user._id }).sort({ updatedAt: -1 }).lean(); });
  app.get('/api/drafts/:publicId', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const draft = await Draft.findOne({ publicId: params.publicId, ownerUserId: user._id }).lean(); if (!draft) throw httpError(404, 'Draft not found.'); return draft; });
  app.patch('/api/drafts/:publicId', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const body = z.object({ to: addressSchema.nullable().optional(), subject: z.string().max(998).optional(), textBody: z.string().optional(), htmlBody: z.string().nullable().optional() }).parse(request.body); const draft = await Draft.findOneAndUpdate({ publicId: params.publicId, ownerUserId: user._id, status: 'draft' }, { $set: body }, { new: true }).lean(); if (!draft) throw httpError(404, 'Draft not found.'); return draft; });
  app.delete('/api/drafts/:publicId', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const result = await Draft.deleteOne({ publicId: params.publicId, ownerUserId: user._id, status: 'draft' }); if (!result.deletedCount) throw httpError(404, 'Draft not found.'); return { status: 'deleted' }; });
  app.post('/api/drafts/:publicId/send', async (request, reply) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const draft = await Draft.findOne({ publicId: params.publicId, ownerUserId: user._id, status: 'draft' }); if (!draft || !draft.recipientAddress) throw httpError(400, 'Draft needs an existing @niti recipient before sending.'); const publicId = await queueEmail(context, user, draft.recipientAddress, draft.subject, draft.textBody, draft.htmlBody, draft.attachments); draft.status = 'queued'; await draft.save(); return reply.code(202).send({ publicId, deliveryStatus: 'queued' }); });

  app.post('/webhooks/telnyx/voice', async (request) => handleTelnyxWebhook(request, 'voice'));
  app.post('/webhooks/telnyx/sms', async (request) => handleTelnyxWebhook(request, 'sms'));

  // Processes a verified provider event exactly once before invoking provider-specific behavior.
  async function handleTelnyxWebhook(request: FastifyRequest, kind: 'voice' | 'sms'): Promise<Record<string, unknown>> {
    const rawBody = JSON.stringify(request.body ?? {}); const signature = request.headers['telnyx-signature-ed25519']; const timestamp = request.headers['telnyx-timestamp']; const signatureValue = Array.isArray(signature) ? signature[0] : signature; const timestampValue = Array.isArray(timestamp) ? timestamp[0] : timestamp;
    if (!verifyWebhookSignature(config, rawBody, signatureValue, timestampValue)) throw httpError(401, 'Invalid Telnyx webhook signature.');
    const event = request.body as { data?: { id?: string; event_type?: string; payload?: Record<string, unknown> } }; const eventId = event.data?.id; if (!eventId) return { received: true };
    try { await WebhookEvent.create({ providerEventId: eventId, eventType: event.data?.event_type ?? kind }); } catch (error) { if ((error as { code?: number }).code === 11000) return { received: true, duplicate: true }; throw error; }
    if (kind === 'voice') await processVoiceEvent(context, event.data?.event_type ?? '', event.data?.payload ?? {});
    return { received: true };
  }

  // Applies the small outbound IVR state machine to an answered call or DTMF event.
  async function processVoiceEvent(serviceContext: ServiceContext, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const phone = typeof payload.to === 'string' ? payload.to : typeof payload.from === 'string' ? payload.from : null;
    if (!phone) return;
    if (eventType.includes('answered')) logger.info({ eventType }, 'Outbound call answered; IVR menu is ready');
    if (eventType.includes('gather') && payload.digits === '1') { const result = await ensureUserForPhone(serviceContext.config, phone); await audit('ivr_account_creation_attempt', result.user._id, [], { created: result.created }); if (result.created) { await audit('account_created', result.user._id, [result.user.publicId]); await queueSms(serviceContext, { phoneE164: result.user.phoneE164, body: `Your PhoneMail account ${result.user.emailAddress} has been created.` }); } }
    if (eventType.includes('gather') && payload.digits === '2') { const user = await User.findOne({ phoneE164: toPhoneE164(phone) }); if (user) { const token = cryptoRandomToken(); const { ResetToken } = await import('@syscall/db'); await ResetToken.create({ userId: user._id, tokenHash: hashSecret(token), expiresAt: new Date(Date.now() + config.PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000) }); await queueSms(serviceContext, { phoneE164: user.phoneE164, body: `Reset your PhoneMail password: ${config.PUBLIC_WEBHOOK_BASE_URL}/reset-password?token=${token}` }); } }
  }

  // Creates a reset token with enough entropy for a one-time link.
  function cryptoRandomToken(): string { return crypto.randomBytes(32).toString('base64url'); }

  app.setErrorHandler((error, request, reply) => { const requestError = error as Error & { statusCode?: number; name?: string }; logger.error({ err: requestError, method: request.method, url: request.url }, 'Request failed'); const status = requestError.name === 'ZodError' ? 400 : requestError.statusCode && requestError.statusCode >= 400 ? requestError.statusCode : 500; return reply.code(status).send({ error: status === 500 ? 'Internal server error' : requestError.message }); });
  return { app, context };
}
