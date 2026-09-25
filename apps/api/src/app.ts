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
import { createOutboundEmailQueue, createSmsQueue, createUnreadEmailSmsQueue, queueEmailFailureSms } from '@syscall/queues';
import { hangupCall, startOutboundCall, verifyWebhookSignature, webhookUrl } from '@syscall/telnyx';
import { isTelnyxConfigured } from '@syscall/config';
import { toLocalAddress, toPhoneE164, addressSchema, passwordSchema, phone10Schema, phoneSchema, resolveScheduleTime, scheduleTimeZone } from '@syscall/validation';
import { scanWithClamAv } from '@syscall/mail';
import type { AppConfig } from '@syscall/config';
import { createLogger } from '@syscall/logging';
import { audit, cancelScheduledEmail, createSession, ensureUserForPhone, hashPassword, hashSecret, persistAttachments, purgeEmail, queueEmail, queueSms, requestOtp, requestPasswordReset, resolveSession, rescheduleEmail, revokeAllSessions, revokeSession, scheduleEmail, verifyOtp, type ServiceContext } from './services.js';

const voiceEmailDraftTtlSeconds = 15 * 60;

// Builds the Fastify application with all shared dependencies explicitly provided.
export async function buildApp(config: AppConfig, redis: Redis): Promise<{ app: FastifyInstance; context: ServiceContext }> {
  const logger = createLogger('api');
  const outboundQueue = createOutboundEmailQueue(redis);
  const unreadQueue = createUnreadEmailSmsQueue(redis);
  const smsQueue = createSmsQueue(redis);
  const context: ServiceContext = { config, redis, outboundQueue, unreadQueue, smsQueue };
  const app = Fastify({ logger: false });
  type RawBodyRequest = FastifyRequest & { rawBody?: string };
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const rawBody = body as string;
    (request as RawBodyRequest).rawBody = rawBody;
    try { done(null, JSON.parse(rawBody)); } catch (error) { done(error as Error, undefined); }
  });
  await app.register(cors, { origin: false });

  // Creates an HTTP-aware error without requiring a global error plugin.
  function httpError(statusCode: number, message: string): Error & { statusCode: number } { return Object.assign(new Error(message), { statusCode }); }

  // Converts caller-supplied absolute or relative schedule input using the API clock.
  function scheduleTime(input: { scheduledAt?: string; delaySeconds?: number }): Date {
    try { return resolveScheduleTime(input); }
    catch (error) { throw httpError(400, error instanceof Error ? error.message : 'Scheduled time is invalid.'); }
  }

  // Converts an authenticated session header into a user or a 401 response.
  async function requireUser(request: FastifyRequest): Promise<UserDocument> {
    const token = request.headers['x-session-token'];
    const sessionToken = Array.isArray(token) ? token[0] : token;
    if (!sessionToken) throw httpError(401, 'X-Session-Token is required.');
    const user = await resolveSession(context, sessionToken);
    if (!user) throw httpError(401, 'Session is invalid or revoked.');
    return user;
  }

  // Queues one sender notice for a confirmed voice-email attempt that failed synchronously.
  async function notifyFailedVoiceEmail(phoneE164: string, recipientPhone10: string, dedupeKey: string): Promise<boolean> {
    try {
      await queueEmailFailureSms(smsQueue, { phoneE164, recipientPhone10, dedupeKey });
      logger.info('Queued sender SMS for failed confirmed voice email');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Could not queue sender SMS for failed confirmed voice email');
      return false;
    }
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
    const body = z.object({ phone: z.string() }).parse(request.body);
    await requestPasswordReset(context, body.phone);
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

  app.post('/calls/start', async (request) => {
    const body = z.object({ phone: phoneSchema }).parse(request.body);
    if (!config.VOICE_AGENT_API_TOKEN) throw httpError(503, 'Voice assistant is not configured.');
    if (!config.PUBLIC_WEBHOOK_BASE_URL) throw httpError(503, 'Public voice URL is not configured.');
    const streamTicket = cryptoRandomToken();
    const ticketHash = hashSecret(streamTicket);
    const ticketKey = `voice:stream-ticket:${ticketHash}`;
    await redis.set(ticketKey, JSON.stringify({ phoneE164: body.phone }), 'EX', 300);
    try {
      const streamBase = new URL(config.PUBLIC_WEBHOOK_BASE_URL);
      if (streamBase.protocol !== 'https:') throw httpError(503, 'Public voice URL must use HTTPS.');
      streamBase.protocol = 'wss:';
      streamBase.pathname = `${streamBase.pathname.replace(/\/$/, '')}/voice-stream`;
      streamBase.search = '';
      streamBase.hash = '';
      streamBase.searchParams.set('ticket', streamTicket);
      const streamUrl = streamBase.toString();
      const result = await startOutboundCall(config, { phoneE164: body.phone, webhookUrl: webhookUrl(config, 'voice'), streamUrl });
      const callControlId = (result.data as Record<string, unknown> | undefined)?.call_control_id;
      if (typeof callControlId !== 'string') throw new Error('Telnyx did not return a call control ID.');
      await redis.set(`voice:call:${callControlId}`, JSON.stringify({ phoneE164: body.phone, createdAt: Date.now() }), 'EX', 21600);
      await audit('outbound_call_triggered', null, [], { phone10Digit: body.phone.slice(3) });
      return { status: 'started', callControlId };
    } catch (error) {
      await redis.del(ticketKey);
      throw error;
    }
  });

  // Binds a one-time stream ticket to the call announced on the authenticated Telnyx media stream.
  app.post('/internal/voice/sessions/activate', async (request) => {
    requireVoiceAgent(request);
    const body = z.object({ ticket: z.string().min(32), callControlId: z.string().min(10), phone: phoneSchema }).parse(request.body);
    const ticketKey = `voice:stream-ticket:${hashSecret(body.ticket)}`;
    const ticket = await redis.getdel(ticketKey);
    if (!ticket) throw httpError(401, 'Voice stream ticket is invalid or expired.');
    const ticketData = JSON.parse(ticket) as { phoneE164: string };
    const phoneE164 = toPhoneE164(body.phone);
    if (ticketData.phoneE164 !== phoneE164) throw httpError(401, 'Voice stream did not match the requested call.');
    const callKey = `voice:call:${body.callControlId}`;
    const call = await redis.get(callKey);
    if (!call || (JSON.parse(call) as { phoneE164: string }).phoneE164 !== phoneE164) throw httpError(401, 'Voice call is not active.');
    return { status: 'active' };
  });

  // Returns an authoritative clock and timezone only for a live authenticated voice call.
  app.post('/internal/voice/time-context', async (request) => {
    requireVoiceAgent(request);
    const body = z.object({ callControlId: z.string().min(10) }).parse(request.body);
    if (!await redis.exists(`voice:call:${body.callControlId}`)) throw httpError(401, 'Voice call is not active.');
    const now = new Date();
    const localTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'long', timeZone: scheduleTimeZone }).format(now);
    return { now: now.toISOString(), timeZone: scheduleTimeZone, localTime };
  });

  // Executes narrow account, mail, and call-control actions for a verified voice call.
  app.post('/internal/voice/actions', async (request) => {
    requireVoiceAgent(request);
    const body = z.object({ callControlId: z.string().min(10), actionId: z.string().min(12).max(80), action: z.enum(['create_account', 'request_password_reset', 'end_call', 'prepare_email', 'prepare_scheduled_email', 'send_email', 'schedule_email', 'discard_email', 'list_scheduled_emails', 'cancel_scheduled_email', 'reschedule_scheduled_email']), recipientPhone: phone10Schema.optional(), subject: z.string().max(998).optional(), textBody: z.string().max(12000).optional(), draftId: z.string().uuid().optional(), emailId: z.string().optional(), scheduledAt: z.string().optional(), delaySeconds: z.number().int().optional() }).parse(request.body);
    const call = await redis.get(`voice:call:${body.callControlId}`);
    if (!call) throw httpError(401, 'Voice call is not active.');
    const { phoneE164 } = JSON.parse(call) as { phoneE164: string };
    const actionKey = `voice:action:${body.callControlId}:${body.actionId}`;
    const claimed = await redis.set(actionKey, 'processing', 'EX', 3600, 'NX');
    if (!claimed) {
      const cached = await redis.get(actionKey);
      if (cached && cached !== 'processing') return JSON.parse(cached) as Record<string, unknown>;
      throw httpError(409, 'This voice action is already being processed.');
    }
    try {
      let result: Record<string, unknown> = { action: body.action, status: 'not_allowed' };
      if (body.action === 'create_account') {
        const created = await ensureUserForPhone(config, phoneE164);
        await audit('voice_account_creation_attempt', created.user._id, [], { created: created.created });
        if (created.created) {
          await audit('account_created', created.user._id, [created.user.publicId]);
          await queueSms(context, { phoneE164: created.user.phoneE164, body: `Your Syscall account ${created.user.emailAddress} has been created.` });
        }
        result = { action: body.action, created: created.created, emailAddress: created.user.emailAddress };
      } else if (body.action === 'request_password_reset') {
        await requestPasswordReset(context, phoneE164);
        result = { action: body.action, accepted: true };
      } else if (body.action === 'end_call') {
        await hangupCall(config, body.callControlId);
        logger.info('Telnyx accepted voice-agent hang-up command');
        result = { action: body.action, accepted: true };
      } else if (body.action === 'prepare_email' || body.action === 'prepare_scheduled_email') {
        if (!body.recipientPhone || body.subject === undefined || !body.textBody?.trim()) throw httpError(400, 'A recipient phone number, subject, and message body are required.');
        const recipientAddress = toLocalAddress(body.recipientPhone, config.LOCAL_MAIL_DOMAIN);
        const sender = await User.findOne({ phoneE164, accountStatus: 'active' });
        const recipient = await User.findOne({ emailAddress: recipientAddress, accountStatus: 'active' });
        if (!sender) result = { action: body.action, status: 'sender_account_unavailable' };
        else if (!recipient) result = { action: body.action, status: 'recipient_unavailable' };
        else {
          let scheduledAt: Date | undefined;
          if (body.action === 'prepare_scheduled_email') {
            try { scheduledAt = scheduleTime({ scheduledAt: body.scheduledAt, delaySeconds: body.delaySeconds }); }
            catch (error) { result = { action: body.action, status: 'invalid_schedule', reason: error instanceof Error ? error.message : 'Scheduled time is invalid.' }; }
          }
          if (body.action === 'prepare_email' || scheduledAt) {
          const draftId = crypto.randomUUID();
          const pendingEmail = { draftId, to: recipientAddress, subject: body.subject, textBody: body.textBody.trim(), ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}) };
          await redis.set(`voice:pending-email:${body.callControlId}`, JSON.stringify(pendingEmail), 'EX', voiceEmailDraftTtlSeconds);
          result = { action: body.action, status: 'prepared', draftId, recipientAddress, subject: body.subject, ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}) };
          }
        }
      } else if (body.action === 'send_email') {
        if (!body.draftId) throw httpError(400, 'A prepared email draft is required.');
        if (!body.recipientPhone) throw httpError(400, 'Recipient phone is required for a confirmed send attempt.');
        let notificationRecipientPhone10 = phone10Schema.parse(body.recipientPhone);
        try {
          const pendingValue = await redis.get(`voice:pending-email:${body.callControlId}`);
          const pendingEmail = pendingValue ? JSON.parse(pendingValue) as { draftId: string; to: string; subject: string; textBody: string; scheduledAt?: string } : null;
          if (!pendingEmail || pendingEmail.draftId !== body.draftId || pendingEmail.scheduledAt) throw new Error('Confirmed email draft is unavailable for immediate delivery.');
          notificationRecipientPhone10 = phone10Schema.parse(pendingEmail.to.split('@')[0]);
          if (notificationRecipientPhone10 !== body.recipientPhone) throw new Error('Confirmed email recipient did not match the prepared draft.');
          const sender = await User.findOne({ phoneE164, accountStatus: 'active' });
          if (!sender) throw new Error('Active sender account is unavailable.');
          const publicId = await queueEmail(context, sender, pendingEmail.to, pendingEmail.subject, pendingEmail.textBody, null, [], {
            phoneE164,
            recipientPhone10: notificationRecipientPhone10,
            dedupeKey: body.actionId,
          });
          try { await redis.del(`voice:pending-email:${body.callControlId}`); } catch (error) { logger.warn({ err: error }, 'Queued voice email but could not immediately clear its pending draft'); }
          result = { action: body.action, status: 'queued', publicId, recipientAddress: pendingEmail.to };
          logger.info({ emailId: publicId }, 'Confirmed voice email queued');
        } catch (error) {
          logger.error({ err: error }, 'Confirmed voice email failed before delivery queueing');
          const failureNotificationQueued = await notifyFailedVoiceEmail(phoneE164, notificationRecipientPhone10, body.actionId);
          result = { action: body.action, status: 'failed', failureNotificationQueued };
        }
      } else if (body.action === 'schedule_email') {
        if (!body.draftId) throw httpError(400, 'A confirmed scheduled email is required.');
        const pendingValue = await redis.get(`voice:pending-email:${body.callControlId}`);
        const pendingEmail = pendingValue ? JSON.parse(pendingValue) as { draftId: string; to: string; subject: string; textBody: string; scheduledAt?: string } : null;
        if (!pendingEmail || pendingEmail.draftId !== body.draftId || !pendingEmail.scheduledAt) throw httpError(409, 'The scheduled email confirmation is no longer available.');
        const sender = await User.findOne({ phoneE164, accountStatus: 'active' });
        if (!sender) throw httpError(409, 'The active sender account is unavailable.');
        let scheduledAt: Date;
        try { scheduledAt = scheduleTime({ scheduledAt: pendingEmail.scheduledAt }); }
        catch (error) {
          result = { action: body.action, status: 'invalid_schedule', reason: error instanceof Error ? error.message : 'Scheduled time is no longer valid.' };
          await redis.set(actionKey, JSON.stringify(result), 'EX', 3600);
          return result;
        }
        const email = await scheduleEmail(context, sender, pendingEmail.to, pendingEmail.subject, pendingEmail.textBody, null, [], scheduledAt, true, body.actionId);
        try { await redis.del(`voice:pending-email:${body.callControlId}`); }
        catch (error) { logger.warn({ err: error }, 'Scheduled voice email but could not clear its staged draft'); }
        result = { action: body.action, status: email.deliveryStatus === 'scheduled' ? 'scheduled' : 'already_processed', deliveryStatus: email.deliveryStatus, publicId: email.publicId, recipientAddress: email.recipientAddress, scheduledAt: email.scheduledAt?.toISOString() };
      } else if (body.action === 'list_scheduled_emails') {
        const sender = await User.findOne({ phoneE164, accountStatus: 'active' });
        const emails = sender ? await Email.find({ senderUserId: sender._id, deliveryStatus: 'scheduled', senderDeletedAt: null }).select({ publicId: 1, recipientAddress: 1, subject: 1, scheduledAt: 1 }).sort({ scheduledAt: 1 }).limit(20).lean() : [];
        result = { action: body.action, status: 'listed', emails: emails.map((email) => ({ emailId: email.publicId, recipientAddress: email.recipientAddress, subject: email.subject, scheduledAt: email.scheduledAt?.toISOString() })) };
      } else if (body.action === 'cancel_scheduled_email') {
        if (!body.emailId) throw httpError(400, 'Scheduled email ID is required.');
        const sender = await User.findOne({ phoneE164, accountStatus: 'active' });
        const email = sender ? await cancelScheduledEmail(context, sender, body.emailId) : null;
        result = email ? { action: body.action, status: 'cancelled', emailId: email.publicId } : { action: body.action, status: 'not_pending_or_unavailable' };
      } else if (body.action === 'reschedule_scheduled_email') {
        if (!body.emailId) throw httpError(400, 'Scheduled email ID is required.');
        const sender = await User.findOne({ phoneE164, accountStatus: 'active' });
        if (!sender) throw httpError(409, 'The active sender account is unavailable.');
        let scheduledAt: Date | undefined;
        let scheduleError = 'Scheduled time is invalid.';
        try { scheduledAt = scheduleTime({ scheduledAt: body.scheduledAt, delaySeconds: body.delaySeconds }); }
        catch (error) { scheduleError = error instanceof Error ? error.message : scheduleError; }
        if (scheduledAt) {
          const email = await rescheduleEmail(context, sender, body.emailId, scheduledAt);
          result = email ? { action: body.action, status: 'rescheduled', emailId: email.publicId, scheduledAt: email.scheduledAt?.toISOString() } : { action: body.action, status: 'not_pending_or_unavailable' };
        } else result = { action: body.action, status: 'invalid_schedule', reason: scheduleError };
      } else {
        if (!body.draftId) throw httpError(400, 'A prepared email draft is required.');
        const pendingKey = `voice:pending-email:${body.callControlId}`;
        const pendingValue = await redis.get(pendingKey);
        const pendingEmail = pendingValue ? JSON.parse(pendingValue) as { draftId: string } : null;
        if (pendingEmail?.draftId === body.draftId) await redis.del(pendingKey);
        result = { action: body.action, status: 'discarded' };
      }
      await redis.set(actionKey, JSON.stringify(result), 'EX', 3600);
      return result;
    } catch (error) {
      await redis.del(actionKey);
      throw error;
    }
  });

  app.post('/internal/voice/sessions/close', async (request) => {
    requireVoiceAgent(request);
    const body = z.object({ callControlId: z.string().min(10) }).parse(request.body);
    await redis.del(`voice:call:${body.callControlId}`, `voice:pending-email:${body.callControlId}`);
    return { status: 'closed' };
  });

  // Authenticates voice-agent-only internal routes using a constant-time token comparison.
  function requireVoiceAgent(request: FastifyRequest): void {
    const value = request.headers['x-syscall-voice-token'];
    const presented = Array.isArray(value) ? value[0] : value;
    const expected = config.VOICE_AGENT_API_TOKEN;
    if (!expected || !presented || expected.length !== presented.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(presented))) throw httpError(401, 'Voice agent authentication failed.');
  }

  app.post('/api/mail/send', async (request, reply) => {
    const user = await requireUser(request); if (!user.passwordConfigured) throw httpError(403, 'Set a password before using mail.');
    const body = z.object({ to: addressSchema, subject: z.string().max(998), textBody: z.string().default(''), htmlBody: z.string().nullable().optional(), attachments: z.array(z.object({ filename: z.string().min(1), contentType: z.string(), contentBase64: z.string() })).optional() }).parse(request.body);
    const attachments = await persistAttachments(context, body.attachments); const publicId = await queueEmail(context, user, body.to, body.subject, body.textBody, body.htmlBody ?? null, attachments);
    return reply.code(202).send({ publicId, deliveryStatus: 'queued' });
  });

  // Creates a complete authenticated email and its durable delayed-delivery job.
  app.post('/api/mail/scheduled', async (request, reply) => {
    const user = await requireUser(request);
    if (!user.passwordConfigured) throw httpError(403, 'Set a password before using mail.');
    const body = z.object({ to: addressSchema, subject: z.string().max(998), textBody: z.string().default(''), htmlBody: z.string().nullable().optional(), attachments: z.array(z.object({ filename: z.string().min(1), contentType: z.string(), contentBase64: z.string() })).optional(), scheduledAt: z.string().datetime({ offset: true }) }).parse(request.body);
    const scheduledAt = scheduleTime({ scheduledAt: body.scheduledAt });
    const attachments = await persistAttachments(context, body.attachments);
    const email = await scheduleEmail(context, user, body.to, body.subject, body.textBody, body.htmlBody ?? null, attachments, scheduledAt);
    return reply.code(202).send({ publicId: email.publicId, deliveryStatus: email.deliveryStatus, scheduledAt: email.scheduledAt?.toISOString() });
  });

  // Lists only pending schedules owned by the authenticated sender.
  app.get('/api/mail/scheduled', async (request) => {
    const user = await requireUser(request);
    const emails = await Email.find({ senderUserId: user._id, senderDeletedAt: null, deliveryStatus: 'scheduled' }).select({ _id: 0, publicId: 1, recipientAddress: 1, subject: 1, scheduledAt: 1, createdAt: 1 }).sort({ scheduledAt: 1 }).limit(100).lean();
    return emails;
  });

  // Changes only the delivery time of a sender-owned pending schedule.
  app.patch('/api/mail/scheduled/:publicId', async (request) => {
    const user = await requireUser(request);
    const params = z.object({ publicId: z.string().min(1) }).parse(request.params);
    const body = z.object({ scheduledAt: z.string().datetime({ offset: true }) }).parse(request.body);
    const scheduledAt = scheduleTime({ scheduledAt: body.scheduledAt });
    const email = await rescheduleEmail(context, user, params.publicId, scheduledAt);
    if (!email) {
      const owned = await Email.exists({ publicId: params.publicId, senderUserId: user._id });
      throw httpError(owned ? 409 : 404, owned ? 'Email is no longer scheduled.' : 'Scheduled email not found.');
    }
    return { publicId: email.publicId, deliveryStatus: email.deliveryStatus, scheduledAt: email.scheduledAt?.toISOString() };
  });

  // Cancels a sender-owned scheduled email before its worker begins delivery.
  app.delete('/api/mail/scheduled/:publicId', async (request) => {
    const user = await requireUser(request);
    const params = z.object({ publicId: z.string().min(1) }).parse(request.params);
    const email = await cancelScheduledEmail(context, user, params.publicId);
    if (!email) {
      const owned = await Email.exists({ publicId: params.publicId, senderUserId: user._id });
      throw httpError(owned ? 409 : 404, owned ? 'Email is no longer scheduled.' : 'Scheduled email not found.');
    }
    return { publicId: email.publicId, deliveryStatus: email.deliveryStatus };
  });

  app.get('/api/mail', async (request) => { const user = await requireUser(request); const messages = await Email.find({ $or: [{ recipientUserId: user._id, recipientDeletedAt: null, deliveryStatus: { $nin: ['scheduled', 'cancelled'] } }, { senderUserId: user._id, senderDeletedAt: null }] }).sort({ createdAt: -1 }).limit(100).lean(); return messages.map((message) => ({ ...message, _id: undefined })); });

  app.get('/api/mail/:publicId', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const email = await Email.findOne({ publicId: params.publicId }); const isSender = Boolean(email && email.senderUserId.equals(user._id)); const isRecipient = Boolean(email && email.recipientUserId.equals(user._id)); if (!email || (!isSender && !isRecipient) || (isSender && email.senderDeletedAt) || (isRecipient && email.recipientDeletedAt) || (!isSender && ['scheduled', 'cancelled'].includes(email.deliveryStatus))) throw httpError(404, 'Message not found.'); if (isRecipient && !email.readAt) { email.readAt = new Date(); await email.save(); await audit('message_read', user._id, [email.publicId]); } const output = email.toObject() as unknown as Record<string, unknown>; delete output._id; delete output.__v; return output; });

  // Prevents generic mailbox deletion from silently leaving a scheduled job active.
  app.delete('/api/mail/:publicId', async (request) => {
    const user = await requireUser(request);
    const params = z.object({ publicId: z.string() }).parse(request.params);
    const email = await Email.findOne({ publicId: params.publicId });
    if (!email) throw httpError(404, 'Message not found.');
    const isSender = email.senderUserId.equals(user._id);
    const isRecipient = email.recipientUserId.equals(user._id);
    if ((!isSender && !isRecipient) || ((!isSender) && ['scheduled', 'cancelled'].includes(email.deliveryStatus))) throw httpError(404, 'Message not found.');
    if (email.deliveryStatus === 'scheduled') throw httpError(409, 'Cancel the scheduled email before deleting it.');
    if (isSender) email.senderDeletedAt = new Date();
    if (isRecipient) email.recipientDeletedAt = new Date();
    await email.save();
    await audit('message_soft_deleted', user._id, [email.publicId], { role: isSender ? 'sender' : 'recipient' });
    if (email.senderDeletedAt && email.recipientDeletedAt) await purgeEmail(context, email);
    return { status: 'deleted' };
  });

  app.post('/api/mail/:publicId/spam', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const email = await Email.findOne({ publicId: params.publicId, recipientUserId: user._id, deliveryStatus: { $nin: ['scheduled', 'cancelled'] } }); if (!email) throw httpError(404, 'Message not found.'); email.isSpam = true; await email.save(); return { isSpam: true }; });
  app.delete('/api/mail/:publicId/spam', async (request) => { const user = await requireUser(request); const params = z.object({ publicId: z.string() }).parse(request.params); const email = await Email.findOne({ publicId: params.publicId, recipientUserId: user._id, deliveryStatus: { $nin: ['scheduled', 'cancelled'] } }); if (!email) throw httpError(404, 'Message not found.'); email.isSpam = false; await email.save(); return { isSpam: false }; });

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
    const rawBody = (request as RawBodyRequest).rawBody ?? JSON.stringify(request.body ?? {}); const signature = request.headers['telnyx-signature-ed25519']; const timestamp = request.headers['telnyx-timestamp']; const signatureValue = Array.isArray(signature) ? signature[0] : signature; const timestampValue = Array.isArray(timestamp) ? timestamp[0] : timestamp;
    if (!verifyWebhookSignature(config, rawBody, signatureValue, timestampValue)) throw httpError(401, 'Invalid Telnyx webhook signature.');
    const event = request.body as { data?: { id?: string; event_type?: string; payload?: Record<string, unknown> } }; const eventId = event.data?.id; if (!eventId) return { received: true };
    const eventType = event.data?.event_type ?? kind;
    try { await WebhookEvent.create({ providerEventId: eventId, eventType }); } catch (error) { if ((error as { code?: number }).code === 11000) return { received: true, duplicate: true }; throw error; }
    if (eventType === 'call.hangup') logger.info({ eventId }, 'Telnyx confirmed voice call hang-up');
    else logger.debug({ eventType, eventId }, 'Recorded Telnyx webhook event');
    return { received: true };
  }

  // Creates a reset token with enough entropy for a one-time link.
  function cryptoRandomToken(): string { return crypto.randomBytes(32).toString('base64url'); }

  app.setErrorHandler((error, request, reply) => { const requestError = error as Error & { statusCode?: number; name?: string }; logger.error({ err: requestError, method: request.method, url: request.url }, 'Request failed'); const status = requestError.name === 'ZodError' ? 400 : requestError.statusCode && requestError.statusCode >= 400 ? requestError.statusCode : 500; return reply.code(status).send({ error: status === 500 ? 'Internal server error' : requestError.message }); });
  return { app, context };
}
