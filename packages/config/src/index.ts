/**
 * File: index.ts
 * Role: Loads and validates environment configuration for every service.
 * Service: Shared config package.
 */
import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  LOCAL_MAIL_DOMAIN: z.string().min(1).default('niti'),
  PUBLIC_WEBHOOK_BASE_URL: z.string().url().optional().or(z.literal('')),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().url(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  OTP_MAX_FAILED_ATTEMPTS_PER_DAY: z.coerce.number().int().positive().default(10),
  PASSWORD_RESET_EXPIRY_HOURS: z.coerce.number().int().positive().default(2),
  TELNYX_API_KEY: z.string().optional().or(z.literal('')),
  TELNYX_PUBLIC_KEY: z.string().optional().or(z.literal('')),
  TELNYX_PHONE_NUMBER: z.string().optional().or(z.literal('')),
  TELNYX_MESSAGING_SENDER_ID: z.string().optional().or(z.literal('')),
  TELNYX_CONNECTION_ID: z.string().optional().or(z.literal('')),
  TELNYX_MESSAGING_PROFILE_ID: z.string().optional().or(z.literal('')),
  VOICE_AGENT_API_TOKEN: z.string().optional().or(z.literal('')),
  SARVAM_API_KEY: z.string().optional().or(z.literal('')),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(2525),
  SMTP_MAX_MESSAGE_SIZE_MB: z.coerce.number().positive().default(25),
  MAX_ATTACHMENT_SIZE_MB: z.coerce.number().positive().default(10),
  ATTACHMENT_STORAGE_PATH: z.string().min(1),
  RAW_MAIL_STORAGE_PATH: z.string().min(1),
  CLAMAV_HOST: z.string().min(1),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
});

export type AppConfig = z.infer<typeof environmentSchema>;

// Loads process configuration once so services fail early on invalid infrastructure settings.
export function loadConfig(): AppConfig {
  const result = environmentSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid Syscall configuration. Provide the required environment values: ${details}`);
  }
  return result.data;
}

// Returns whether all Telnyx settings needed for provider actions are present.
export function isTelnyxConfigured(config: AppConfig): boolean {
  return Boolean(config.TELNYX_API_KEY && config.TELNYX_PUBLIC_KEY && config.TELNYX_PHONE_NUMBER && config.TELNYX_CONNECTION_ID && config.TELNYX_MESSAGING_PROFILE_ID && config.PUBLIC_WEBHOOK_BASE_URL);
}
