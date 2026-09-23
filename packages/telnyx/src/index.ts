/**
 * File: index.ts
 * Role: Encapsulates Telnyx Voice, Messaging, and webhook verification.
 * Service: Shared Telnyx package.
 */
import crypto from 'node:crypto';
import type { AppConfig } from '@syscall/config';

export interface TelnyxCallInput { phoneE164: string; webhookUrl: string; }
export interface TelnyxMessageInput { to: string; text: string; }

// Ensures provider-dependent actions explain exactly which integration is missing.
function requireTelnyx(config: AppConfig): void {
  if (!config.TELNYX_API_KEY || !config.TELNYX_PHONE_NUMBER || !config.TELNYX_CONNECTION_ID || !config.TELNYX_MESSAGING_PROFILE_ID || !config.PUBLIC_WEBHOOK_BASE_URL) throw new Error('Telnyx is not configured. Set TELNYX_API_KEY, TELNYX_PHONE_NUMBER, TELNYX_CONNECTION_ID, TELNYX_MESSAGING_PROFILE_ID, and PUBLIC_WEBHOOK_BASE_URL in .env.');
}

// Makes an authenticated JSON request to the Telnyx API.
async function telnyxRequest(config: AppConfig, endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  requireTelnyx(config);
  const response = await fetch(`https://api.telnyx.com/v2${endpoint}`, { method: 'POST', headers: { authorization: `Bearer ${config.TELNYX_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Telnyx request failed with HTTP ${response.status}: ${await response.text()}`);
  return await response.json() as Record<string, unknown>;
}

// Starts an outbound Telnyx call with a callback to the local IVR webhook.
export async function startOutboundCall(config: AppConfig, input: TelnyxCallInput): Promise<Record<string, unknown>> {
  return telnyxRequest(config, '/calls', { connection_id: config.TELNYX_CONNECTION_ID, to: input.phoneE164, from: config.TELNYX_PHONE_NUMBER, webhook_url: input.webhookUrl, webhook_url_method: 'POST', webhook_api_version: '2' });
}

// Sends an SMS through the configured Telnyx messaging profile.
export async function sendSms(config: AppConfig, input: TelnyxMessageInput): Promise<Record<string, unknown>> {
  return telnyxRequest(config, '/messages', { from: config.TELNYX_PHONE_NUMBER, to: input.to, text: input.text, messaging_profile_id: config.TELNYX_MESSAGING_PROFILE_ID });
}

// Verifies a Telnyx v2 webhook signature over its timestamp and raw JSON body.
export function verifyWebhookSignature(config: AppConfig, rawBody: string, signature: string | undefined, timestamp: string | undefined): boolean {
  if (!config.TELNYX_PUBLIC_KEY || !signature || !timestamp) return false;
  try {
    const publicKey = crypto.createPublicKey({ key: Buffer.from(config.TELNYX_PUBLIC_KEY, 'base64'), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(`${timestamp}.${rawBody}`), publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

// Builds a public webhook URL without inventing a hostname when configuration is absent.
export function webhookUrl(config: AppConfig, kind: 'voice' | 'sms'): string {
  if (!config.PUBLIC_WEBHOOK_BASE_URL) throw new Error('PUBLIC_WEBHOOK_BASE_URL is missing; cannot generate a Telnyx webhook URL.');
  return `${config.PUBLIC_WEBHOOK_BASE_URL.replace(/\/$/, '')}/webhooks/telnyx/${kind}`;
}

