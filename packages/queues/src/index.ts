/**
 * File: index.ts
 * Role: Centralizes BullMQ queue names, connection creation, and job payloads.
 * Service: Shared queues package.
 */
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export const QUEUE_NAMES = {
  outboundEmail: 'outbound-email',
  unreadEmailSms: 'unread-email-sms',
  smsSend: 'sms-send',
} as const;

export interface OutboundEmailJob {
  emailId: string;
  scheduleVersion?: number;
  failureNotification?: {
    phoneE164: string;
    recipientPhone10: string;
    dedupeKey: string;
  };
}

// Produces a stable job ID for one version of a scheduled email.
export function scheduledEmailJobId(emailId: string, scheduleVersion: number): string {
  return `scheduled-${emailId}-${scheduleVersion}`;
}

export interface UnreadEmailSmsJob {
  emailId: string;
}

export interface SmsSendJob {
  phoneE164: string;
  body: string;
  auditEmailId?: string;
}

// Creates a Redis connection suitable for BullMQ producers and workers.
export function createRedisConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: true });
}

// Creates the outbound email queue.
export function createOutboundEmailQueue(connection: Redis): Queue<OutboundEmailJob> {
  return new Queue<OutboundEmailJob>(QUEUE_NAMES.outboundEmail, { connection });
}

// Adds a durable delayed delivery job for one schedule version.
export async function enqueueScheduledEmail(queue: Queue<OutboundEmailJob>, input: { emailId: string; scheduleVersion: number; scheduledAt: Date }): Promise<void> {
  await queue.add('scheduled-email', { emailId: input.emailId, scheduleVersion: input.scheduleVersion }, {
    jobId: scheduledEmailJobId(input.emailId, input.scheduleVersion),
    delay: Math.max(0, input.scheduledAt.getTime() - Date.now()),
    attempts: 3,
    backoff: { type: 'custom' },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

// Creates the delayed unread email SMS queue.
export function createUnreadEmailSmsQueue(connection: Redis): Queue<UnreadEmailSmsJob> {
  return new Queue<UnreadEmailSmsJob>(QUEUE_NAMES.unreadEmailSms, { connection });
}

// Creates the SMS delivery queue with retry policy.
export function createSmsQueue(connection: Redis): Queue<SmsSendJob> {
  return new Queue<SmsSendJob>(QUEUE_NAMES.smsSend, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'fixed', delay: 10000 }, removeOnComplete: 1000, removeOnFail: 5000 } });
}

// Queues one idempotent SMS to the sender after a confirmed voice-email attempt fails.
export async function queueEmailFailureSms(queue: Queue<SmsSendJob>, input: { phoneE164: string; recipientPhone10: string; dedupeKey: string; auditEmailId?: string }): Promise<void> {
  await queue.add('email-send-failed', {
    phoneE164: input.phoneE164,
    body: `Your message to ${input.recipientPhone10} failed due to a technical error.`,
    auditEmailId: input.auditEmailId,
  }, { jobId: `email-failure-${input.dedupeKey.replace(/[^A-Za-z0-9_-]/g, '-')}` });
}
