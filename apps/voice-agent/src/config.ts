/**
 * File: config.ts
 * Role: Validates the voice-agent's API, Redis, and Sarvam configuration.
 * Service: Syscall voice-agent.
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VOICE_AGENT_PORT: z.coerce.number().int().positive().default(4000),
  VOICE_AGENT_API_TOKEN: z.string().min(32),
  SARVAM_API_KEY: z.string().min(1),
  API_INTERNAL_URL: z.string().url().default('http://api:3000'),
  REDIS_URL: z.string().url(),
  VOICE_LANGUAGE_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
});

export type VoiceAgentConfig = z.infer<typeof schema>;

// Loads required voice settings and reports field names without exposing values.
export function loadVoiceAgentConfig(): VoiceAgentConfig {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Return field names only; configuration values can contain credentials.
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid voice-agent configuration. Check: ${fields}`);
  }
  return parsed.data;
}
