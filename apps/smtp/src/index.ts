/**
 * File: index.ts
 * Role: Runs the internal SMTP protocol listener and mail security pipeline.
 * Service: SMTP.
 */
import { SMTPServer, type SMTPServerSession } from 'smtp-server';
import { AuditLog, Email, User, connectDatabase, disconnectDatabase } from '@syscall/db';
import { loadConfig } from '@syscall/config';
import { createLogger } from '@syscall/logging';
import { createPushQueue, createRedisConnection, createUnreadEmailSmsQueue } from '@syscall/queues';
import { parseMime, scanWithClamAv, validateAttachment, writeGeneratedFile } from '@syscall/mail';
import { v7 as uuidv7 } from 'uuid';

// Starts the internal SMTP service after its hard dependencies are available.
async function start(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('smtp');
  await connectDatabase(config.MONGODB_URI);
  const redis = createRedisConnection(config.REDIS_URL);
  const unreadQueue = createUnreadEmailSmsQueue(redis);
  const pushQueue = createPushQueue(redis);
  const server = new SMTPServer({
    disabledCommands: ['AUTH'],
    size: config.SMTP_MAX_MESSAGE_SIZE_MB * 1024 * 1024,
    onMailFrom(address, _session, callback) { void validateMailFrom(address.address, config.LOCAL_MAIL_DOMAIN).then(() => callback()).catch((error: unknown) => callback(smtpError(550, errorMessage(error)))); },
    onRcptTo(address, _session, callback) { void validateMailRecipient(address.address, config.LOCAL_MAIL_DOMAIN).then(() => callback()).catch((error: unknown) => callback(smtpError(550, errorMessage(error)))); },
    onData(stream, session, callback) { void processMessage(stream, session, config, unreadQueue, pushQueue).then(() => callback()).catch(async (error: unknown) => { logger.error({ err: error }, 'SMTP message rejected'); await AuditLog.create({ eventType: 'email_rejected', metadata: { reason: errorMessage(error).slice(0, 500) } }); callback(smtpError(error instanceof TemporaryMailError ? 451 : 550, errorMessage(error))); }); },
  });
  const shutdown = async (signal: string): Promise<void> => { logger.info({ signal }, 'Shutting down SMTP'); await new Promise<void>((resolve) => server.close(() => resolve())); await Promise.all([unreadQueue.close(), pushQueue.close()]); await redis.quit(); await disconnectDatabase(); process.exit(0); };
  process.once('SIGINT', () => void shutdown('SIGINT')); process.once('SIGTERM', () => void shutdown('SIGTERM'));
  await new Promise<void>((resolve, reject) => server.listen(config.SMTP_PORT, '0.0.0.0', (error?: Error) => error ? reject(error) : resolve()));
  logger.info({ port: config.SMTP_PORT }, 'Internal SMTP listening');
}

// Ensures a sender is a known identity in the local mail domain.
async function validateMailFrom(address: string, domain: string): Promise<void> {
  const normalized = address.toLowerCase(); if (!normalized.endsWith(`@${domain}`)) throw new Error('External sender domains are not accepted.');
  if (!await User.exists({ emailAddress: normalized, accountStatus: 'active' })) throw new Error('Unknown sender.');
}

// Ensures a recipient is a known identity in the local mail domain.
async function validateMailRecipient(address: string, domain: string): Promise<void> {
  const normalized = address.toLowerCase(); if (!normalized.endsWith(`@${domain}`)) throw new Error('External recipient domains are not accepted.');
  if (!await User.exists({ emailAddress: normalized, accountStatus: 'active' })) throw new Error('Unknown recipient.');
}

// Stores one accepted MIME message and schedules its durable unread notification check.
async function processMessage(stream: NodeJS.ReadableStream, session: SMTPServerSession, config: ReturnType<typeof loadConfig>, unreadQueue: ReturnType<typeof createUnreadEmailSmsQueue>, pushQueue: ReturnType<typeof createPushQueue>): Promise<void> {
  const raw = await readStream(stream, config.SMTP_MAX_MESSAGE_SIZE_MB * 1024 * 1024);
  try { await scanWithClamAv(config.CLAMAV_HOST, config.CLAMAV_PORT, raw); } catch (error) { if (errorMessage(error).includes('Malware detected')) { await AuditLog.create({ eventType: 'malware_detected', metadata: { messageSize: raw.length } }); throw new PermanentMailError(errorMessage(error)); } throw new TemporaryMailError(errorMessage(error)); }
  const parsed = await parseMime(raw);
  const senderAddress = typeof session.envelope.mailFrom === 'object' ? session.envelope.mailFrom.address.toLowerCase() : undefined; const recipientAddress = session.envelope.rcptTo[0]?.address.toLowerCase();
  if (!senderAddress || !recipientAddress) throw new Error('SMTP envelope is incomplete.');
  const sender = await User.findOne({ emailAddress: senderAddress, accountStatus: 'active' }); const recipient = await User.findOne({ emailAddress: recipientAddress, accountStatus: 'active' }); if (!sender || !recipient) throw new Error('SMTP envelope identity is no longer valid.');
  const attachmentMetadata = [];
  for (const attachment of parsed.attachments) { try { validateAttachment({ filename: attachment.filename ?? 'attachment.bin', contentType: attachment.contentType, content: attachment.content }, config.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024); await scanWithClamAv(config.CLAMAV_HOST, config.CLAMAV_PORT, attachment.content); } catch (error) { await AuditLog.create({ eventType: errorMessage(error).includes('Malware detected') ? 'malware_detected' : 'attachment_rejected', metadata: { filename: attachment.filename ?? 'attachment.bin' } }); if (errorMessage(error).includes('ClamAV unavailable') || errorMessage(error).includes('timed out')) throw new TemporaryMailError(errorMessage(error)); throw new PermanentMailError(errorMessage(error)); } const extension = (attachment.filename ?? 'attachment.bin').split('.').pop() ?? 'bin'; const storageKey = await writeGeneratedFile(config.ATTACHMENT_STORAGE_PATH, attachment.content, extension); attachmentMetadata.push({ storageKey, originalFilename: attachment.filename ?? 'attachment.bin', contentType: attachment.contentType, size: attachment.size ?? attachment.content.length }); }
  const rawMimePath = await writeGeneratedFile(config.RAW_MAIL_STORAGE_PATH, raw, 'eml');
  const messageIdHeader = parsed.messageId ?? `<${uuidv7()}@${config.LOCAL_MAIL_DOMAIN}>`;
  const existingEmail = await Email.findOne({ messageIdHeader });
  const email = existingEmail ?? await Email.create({ publicId: uuidv7(), senderUserId: sender._id, senderAddress, recipientUserId: recipient._id, recipientAddress, subject: parsed.subject ?? '', textBody: parsed.text ?? '', htmlBody: typeof parsed.html === 'string' ? parsed.html : null, attachments: attachmentMetadata, rawMimePath, messageIdHeader, inReplyTo: parsed.inReplyTo ?? null, references: parsed.references ?? [], deliveryStatus: 'delivered', deliveredAt: new Date() });
  if (existingEmail) { existingEmail.rawMimePath = rawMimePath; existingEmail.deliveryStatus = 'delivered'; existingEmail.deliveredAt = new Date(); existingEmail.lastDeliveryError = null; await existingEmail.save(); }
  await AuditLog.create({ eventType: 'email_accepted', relatedEntityIds: [email.publicId], metadata: { senderAddress, recipientAddress } });
  await unreadQueue.add('unread-email', { emailId: email.publicId }, { delay: 60000, attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  await pushQueue.add('new-email-push', { emailId: email.publicId }, { jobId: `new-email-${email.publicId}` });
}

// Reads a stream with an explicit message-size ceiling.
async function readStream(stream: NodeJS.ReadableStream, maxBytes: number): Promise<Buffer> { const chunks: Buffer[] = []; let total = 0; for await (const chunk of stream as AsyncIterable<Buffer>) { total += chunk.length; if (total > maxBytes) throw new Error('Message exceeds configured size limit.'); chunks.push(chunk); } return Buffer.concat(chunks); }

// Creates an SMTP response error with the required protocol status code.
function smtpError(responseCode: number, message: string): Error & { responseCode: number } { return Object.assign(new Error(message), { responseCode }); }

// Converts unknown failures into safe client-visible text.
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'SMTP processing failed.'; }

class TemporaryMailError extends Error {}
class PermanentMailError extends Error {}

void start().catch((error: unknown) => { const logger = createLogger('smtp-bootstrap'); logger.error({ err: error }, 'SMTP failed to start'); process.exit(1); });
