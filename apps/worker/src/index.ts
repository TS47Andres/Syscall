/**
 * File: index.ts
 * Role: Consumes durable BullMQ jobs for mail delivery and SMS notifications.
 * Service: Worker.
 */
import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { Worker, type Job } from 'bullmq';
import { Email, User, AuditLog, connectDatabase, disconnectDatabase } from '@syscall/db';
import { loadConfig } from '@syscall/config';
import { createLogger } from '@syscall/logging';
import { createRedisConnection, QUEUE_NAMES, createSmsQueue, queueEmailFailureSms, type OutboundEmailJob, type SmsSendJob, type UnreadEmailSmsJob } from '@syscall/queues';
import { sendSms } from '@syscall/telnyx';

// Starts all asynchronous workers after configuration and infrastructure validation.
async function start(): Promise<void> {
  const config = loadConfig(); const logger = createLogger('worker'); await connectDatabase(config.MONGODB_URI); const redis = createRedisConnection(config.REDIS_URL); await redis.ping();
  const smtpTransport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: false, ignoreTLS: true });
  const smsQueue = createSmsQueue(redis);
  const outboundWorker = new Worker<OutboundEmailJob>(QUEUE_NAMES.outboundEmail, async (job) => deliverEmail(job, smtpTransport, config, smsQueue, logger), { connection: redis, settings: { backoffStrategy: (attemptsMade) => [10000, 30000, 60000][attemptsMade] ?? 60000 } });
  const unreadWorker = new Worker<UnreadEmailSmsJob>(QUEUE_NAMES.unreadEmailSms, async (job) => notifyUnreadEmail(job, redis), { connection: redis });
  const smsWorker = new Worker<SmsSendJob>(QUEUE_NAMES.smsSend, async (job) => deliverSms(job, config, logger), { connection: redis });
  for (const worker of [outboundWorker, unreadWorker, smsWorker]) worker.on('failed', (job, error) => logger.error({ queue: worker.name, jobId: job?.id, err: error }, 'Background job failed'));
  const shutdown = async (signal: string): Promise<void> => { logger.info({ signal }, 'Shutting down worker'); await Promise.all([outboundWorker.close(), unreadWorker.close(), smsWorker.close()]); await redis.quit(); await disconnectDatabase(); process.exit(0); };
  process.once('SIGINT', () => void shutdown('SIGINT')); process.once('SIGTERM', () => void shutdown('SIGTERM'));
  logger.info('Syscall workers listening');
}

// Delivers a queued email through the internal SMTP service and records final state.
async function deliverEmail(job: Job<OutboundEmailJob>, transport: nodemailer.Transporter, config: ReturnType<typeof loadConfig>, smsQueue: ReturnType<typeof createSmsQueue>, logger: ReturnType<typeof createLogger>): Promise<void> {
  const email = await Email.findOne({ publicId: job.data.emailId }); if (!email) throw new Error('Queued email no longer exists.');
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
    if (finalAttempt && job.data.failureNotification) {
      try {
        await queueEmailFailureSms(smsQueue, { ...job.data.failureNotification, auditEmailId: email.publicId });
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
