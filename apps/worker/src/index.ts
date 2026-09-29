/**
 * File: index.ts
 * Role: Consumes durable BullMQ jobs for mail delivery and SMS notifications.
 * Service: Worker.
 */
import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { Worker, type Job } from 'bullmq';
import { Email, PushDevice, User, AuditLog, connectDatabase, disconnectDatabase, type EmailDocument } from '@syscall/db';
import { loadConfig } from '@syscall/config';
import { createLogger } from '@syscall/logging';
import { createOutboundEmailQueue, createPushQueue, createRedisConnection, QUEUE_NAMES, createSmsQueue, enqueueScheduledEmail, queueEmailFailureSms, scheduledEmailJobId, type OutboundEmailJob, type PushSendJob, type SmsSendJob, type UnreadEmailSmsJob } from '@syscall/queues';
import { sendSms } from '@syscall/telnyx';

// Starts all asynchronous workers after configuration and infrastructure validation.
async function start(): Promise<void> {
  const config = loadConfig(); const logger = createLogger('worker'); await connectDatabase(config.MONGODB_URI); const redis = createRedisConnection(config.REDIS_URL); await redis.ping();
  const smtpTransport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: false, ignoreTLS: true });
  const outboundQueue = createOutboundEmailQueue(redis);
  const smsQueue = createSmsQueue(redis);
  const pushQueue = createPushQueue(redis);
  const outboundWorker = new Worker<OutboundEmailJob>(QUEUE_NAMES.outboundEmail, async (job) => deliverEmail(job, smtpTransport, config, smsQueue, logger), { connection: redis, settings: { backoffStrategy: (attemptsMade) => [10000, 30000, 60000][attemptsMade] ?? 60000 } });
  const unreadWorker = new Worker<UnreadEmailSmsJob>(QUEUE_NAMES.unreadEmailSms, async (job) => notifyUnreadEmail(job, redis), { connection: redis });
  const smsWorker = new Worker<SmsSendJob>(QUEUE_NAMES.smsSend, async (job) => deliverSms(job, config, logger), { connection: redis });
  const pushWorker = new Worker<PushSendJob>(QUEUE_NAMES.pushSend, async (job) => deliverPush(job, logger), { connection: redis });
  let recoveringSchedules = false;
  const recoverSchedules = async (): Promise<void> => {
    if (recoveringSchedules) return;
    recoveringSchedules = true;
    try { await reconcileScheduledEmailJobs(outboundQueue, logger); }
    finally { recoveringSchedules = false; }
  };
  await recoverSchedules();
  const scheduleRecoveryTimer = setInterval(() => void recoverSchedules().catch((error) => logger.error({ err: error }, 'Scheduled email recovery pass failed')), 30000);
  scheduleRecoveryTimer.unref();
  for (const worker of [outboundWorker, unreadWorker, smsWorker, pushWorker]) worker.on('failed', (job, error) => logger.error({ queue: worker.name, jobId: job?.id, err: error }, 'Background job failed'));
  const shutdown = async (signal: string): Promise<void> => { logger.info({ signal }, 'Shutting down worker'); clearInterval(scheduleRecoveryTimer); await Promise.all([outboundWorker.close(), unreadWorker.close(), smsWorker.close(), pushWorker.close(), outboundQueue.close(), pushQueue.close()]); await redis.quit(); await disconnectDatabase(); process.exit(0); };
  process.once('SIGINT', () => void shutdown('SIGINT')); process.once('SIGTERM', () => void shutdown('SIGTERM'));
  logger.info('Syscall workers listening');
}

// Sends a privacy-conscious push to each active mobile installation for newly accepted mail.
async function deliverPush(job: Job<PushSendJob>, logger: ReturnType<typeof createLogger>): Promise<void> {
  const email = await Email.findOne({ publicId: job.data.emailId, deliveryStatus: 'delivered', recipientDeletedAt: null, isSpam: false }).lean();
  if (!email) return;
  const devices = await PushDevice.find({ userId: email.recipientUserId }).lean();
  if (!devices.length) return;
  const messages = devices.map((device) => ({ to: device.token, title: 'New email', body: 'You have received a new email.', sound: 'default', channelId: 'mail', data: { emailId: email.publicId, folder: 'inbox' }, priority: 'high' }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
  if (!response.ok) throw new Error(`Expo push service returned HTTP ${response.status}.`);
  const result = await response.json() as { data?: Array<{ status?: string; message?: string; details?: { error?: string } }> };
  const tickets = result.data ?? [];
  for (const [index, ticket] of tickets.entries()) {
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      await PushDevice.deleteOne({ token: devices[index]?.token });
      continue;
    }
    if (ticket.status === 'error') logger.warn({ error: ticket.message, deviceId: String(devices[index]?._id) }, 'Expo push ticket was rejected');
  }
}

// Recreates missing or exhausted delayed jobs from scheduled MongoDB records.
async function reconcileScheduledEmailJobs(queue: ReturnType<typeof createOutboundEmailQueue>, logger: ReturnType<typeof createLogger>): Promise<void> {
  const cursor = Email.find({ deliveryStatus: 'scheduled' }).select({ publicId: 1, scheduleVersion: 1, scheduledAt: 1 }).lean().cursor();
  for await (const email of cursor) {
    if (!email.scheduledAt) continue;
    const jobId = scheduledEmailJobId(email.publicId, email.scheduleVersion);
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state !== 'failed' && state !== 'completed') continue;
      await job.remove();
    }
    await enqueueScheduledEmail(queue, { emailId: email.publicId, scheduleVersion: email.scheduleVersion, scheduledAt: email.scheduledAt });
  }
}

// Delivers a queued email through the internal SMTP service and records final state.
async function deliverEmail(job: Job<OutboundEmailJob>, transport: nodemailer.Transporter, config: ReturnType<typeof loadConfig>, smsQueue: ReturnType<typeof createSmsQueue>, logger: ReturnType<typeof createLogger>): Promise<void> {
  let email = await Email.findOne({ publicId: job.data.emailId }); if (!email) throw new Error('Queued email no longer exists.');
  if (job.data.scheduleVersion !== undefined) {
    if (email.scheduleVersion !== job.data.scheduleVersion) return;
    if (email.deliveryStatus === 'scheduled') {
      const transitionedEmail = await Email.findOneAndUpdate(
        { _id: email._id, deliveryStatus: 'scheduled', scheduleVersion: job.data.scheduleVersion, scheduledAt: { $lte: new Date() } },
        { $set: { deliveryStatus: 'queued' } },
        { new: true },
      );
      if (!transitionedEmail) return;
      email = transitionedEmail;
    } else if (email.deliveryStatus !== 'queued') return;
  } else if (email.deliveryStatus !== 'queued') return;
  let deliveryResponse: string;
  try {
    const result = await transport.sendMail({ from: email.senderAddress, to: email.recipientAddress, subject: email.subject, text: email.textBody, html: email.htmlBody ?? undefined, messageId: email.messageIdHeader, inReplyTo: email.inReplyTo ?? undefined, references: email.references, attachments: await Promise.all(email.attachments.map(async (attachment) => ({ filename: attachment.originalFilename, content: await fs.readFile(`${config.ATTACHMENT_STORAGE_PATH}/${attachment.storageKey}`) }))) });
    deliveryResponse = result.response.slice(0, 200);
  } catch (error) {
    email.lastDeliveryError = error instanceof Error ? error.message.slice(0, 1000) : 'Delivery failed';
    const finalAttempt = (job.attemptsMade + 1) >= Number(job.opts.attempts ?? 1);
    if (finalAttempt) {
      email.deliveryStatus = 'failed';
      email.failedAt = new Date();
    }
    try {
      await email.save();
    } catch (persistenceError) {
      logger.error({ emailId: email.publicId, err: persistenceError }, 'Could not persist email delivery failure state');
    }
    if (finalAttempt) {
      try {
        await AuditLog.create({ eventType: 'email_failed', relatedEntityIds: [email.publicId], metadata: { error: email.lastDeliveryError } });
      } catch (auditError) {
        logger.error({ emailId: email.publicId, err: auditError }, 'Could not record failed email audit event');
      }
    }
    const failureNotification = finalAttempt
      ? job.data.failureNotification ?? (email.scheduledByVoice ? await scheduledVoiceFailureNotification(email) : undefined)
      : undefined;
    if (failureNotification) {
      try {
        await queueEmailFailureSms(smsQueue, { ...failureNotification, dedupeKey: `scheduled-${email.publicId}`, auditEmailId: email.publicId });
        logger.info({ emailId: email.publicId }, 'Queued sender SMS after confirmed voice email delivery failure');
      } catch (notificationError) {
        logger.error({ emailId: email.publicId, err: notificationError }, 'Could not queue sender SMS after confirmed voice email delivery failure');
      }
    }
    throw error;
  }
  email.deliveryStatus = 'delivered'; email.deliveredAt = new Date(); email.lastDeliveryError = null; await email.save();
  try {
    await AuditLog.create({ eventType: 'email_delivered', relatedEntityIds: [email.publicId], metadata: { response: deliveryResponse } });
  } catch (auditError) {
    logger.error({ emailId: email.publicId, err: auditError }, 'Could not record delivered email audit event');
  }
}

// Builds the delayed-delivery failure notice for a voice schedule after retries end.
async function scheduledVoiceFailureNotification(email: EmailDocument): Promise<{ phoneE164: string; recipientPhone10: string; dedupeKey: string } | undefined> {
  const sender = await User.findById(email.senderUserId).select({ phoneE164: 1 });
  const recipientPhone10 = email.recipientAddress.split('@')[0];
  if (!sender || !/^[6-9]\d{9}$/.test(recipientPhone10 ?? '')) return undefined;
  return { phoneE164: sender.phoneE164, recipientPhone10: recipientPhone10!, dedupeKey: `scheduled-${email.publicId}` };
}

// Rechecks unread state after the durable delay and queues a notification only when needed.
async function notifyUnreadEmail(job: Job<UnreadEmailSmsJob>, redis: ReturnType<typeof createRedisConnection>): Promise<void> {
  const email = await Email.findOne({ publicId: job.data.emailId }); if (!email || email.readAt) return; const recipient = await User.findById(email.recipientUserId); if (!recipient) return; const attachmentText = email.attachments.length ? ` Contains ${email.attachments.length} attachment(s).` : ''; const smsQueue = createSmsQueue(redis); await smsQueue.add('unread-notification', { phoneE164: recipient.phoneE164, body: `You have received an email from ${email.senderAddress}. Subject: ${email.subject}.${attachmentText}`, auditEmailId: email.publicId });
}

// Sends a queued SMS through Telnyx and writes a non-sensitive audit result.
async function deliverSms(job: Job<SmsSendJob>, config: ReturnType<typeof loadConfig>, logger: ReturnType<typeof createLogger>): Promise<void> {
  try {
    await sendSms(config, { to: job.data.phoneE164, text: job.data.body });
  } catch (error) {
    try {
      await AuditLog.create({ eventType: 'sms_failed', relatedEntityIds: job.data.auditEmailId ? [job.data.auditEmailId] : [], metadata: { phone10Digit: job.data.phoneE164.slice(3), error: error instanceof Error ? error.message.slice(0, 500) : 'SMS failed' } });
    } catch (auditError) {
      logger.error({ err: auditError }, 'Could not record failed SMS audit event');
    }
    throw error;
  }
  try {
    await AuditLog.create({ eventType: 'sms_sent', relatedEntityIds: job.data.auditEmailId ? [job.data.auditEmailId] : [], metadata: { phone10Digit: job.data.phoneE164.slice(3) } });
  } catch (auditError) {
    logger.error({ err: auditError }, 'Could not record sent SMS audit event');
  }
}

void start().catch((error: unknown) => { const logger = createLogger('worker-bootstrap'); logger.error({ err: error }, 'Worker failed to start'); process.exit(1); });
