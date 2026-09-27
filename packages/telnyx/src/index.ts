/**
 * File: index.ts
 * Role: Encapsulates Telnyx Voice, Messaging, and webhook verification.
 * Service: Shared Telnyx package.
 */
import crypto from 'node:crypto';
import type { AppConfig } from '@syscall/config';

export interface TelnyxCallInput { phoneE164: string; webhookUrl: string; streamUrl: string; }
export interface TelnyxMessageInput { to: string; text: string; }

// Builds the Telnyx media stream options shared by inbound and outbound calls.
function streamOptions(streamUrl: string): Record<string, unknown> {
  return { stream_url: streamUrl, stream_track: 'inbound_track', stream_codec: 'PCMU', stream_bidirectional_mode: 'rtp', stream_bidirectional_codec: 'PCMU' };
}

// Ensures provider-dependent actions explain exactly which integration is missing.
function requireTelnyx(config: AppConfig): void {
  if (!config.TELNYX_API_KEY || !config.TELNYX_PHONE_NUMBER || !config.TELNYX_CONNECTION_ID || !config.TELNYX_MESSAGING_PROFILE_ID || !config.PUBLIC_WEBHOOK_BASE_URL) throw new Error('Telnyx is not configured. Set TELNYX_API_KEY, TELNYX_PHONE_NUMBER, TELNYX_CONNECTION_ID, TELNYX_MESSAGING_PROFILE_ID, and PUBLIC_WEBHOOK_BASE_URL in .env.');
}

// Makes an authenticated JSON request to the Telnyx API.
async function telnyxRequest(config: AppConfig, endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  requireTelnyx(config);
  const response = await fetch(`https://api.telnyx.com/v2${endpoint}`, { method: 'POST', headers: { authorization: `Bearer ${config.TELNYX_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Telnyx request failed with HTTP ${response.status}.`);
  return await response.json() as Record<string, unknown>;
}

// Starts an outbound Telnyx call with signed event webhooks and bidirectional PCMU media.
export async function startOutboundCall(config: AppConfig, input: TelnyxCallInput): Promise<Record<string, unknown>> {
  return telnyxRequest(config, '/calls', {
    connection_id: config.TELNYX_CONNECTION_ID,
    to: input.phoneE164,
    from: config.TELNYX_PHONE_NUMBER,
    webhook_url: input.webhookUrl,
    webhook_url_method: 'POST',
    webhook_api_version: '2',
    ...streamOptions(input.streamUrl),
  });
}

// Answers a Telnyx inbound call before attaching the voice-agent media stream.
export async function answerInboundCall(config: AppConfig, callControlId: string): Promise<Record<string, unknown>> {
  return telnyxRequest(config, `/calls/${encodeURIComponent(callControlId)}/actions/answer`, { command_id: crypto.randomUUID() });
}

// Starts the bidirectional media stream on an answered inbound Telnyx call.
export async function startCallStreaming(config: AppConfig, callControlId: string, streamUrl: string): Promise<Record<string, unknown>> {
  return telnyxRequest(config, `/calls/${encodeURIComponent(callControlId)}/actions/streaming_start`, { command_id: crypto.randomUUID(), ...streamOptions(streamUrl) });
}

// Speaks the OTP prompt and collects six keypad digits followed by #.
export async function gatherOtpDigits(config: AppConfig, callControlId: string, gatherId: string, prompt: string): Promise<Record<string, unknown>> {
  return telnyxRequest(config, `/calls/${encodeURIComponent(callControlId)}/actions/gather_using_speak`, {
    command_id: crypto.randomUUID(),
    client_state: Buffer.from(JSON.stringify({ gatherId })).toString('base64'),
    payload: prompt,
    payload_type: 'text',
    voice: 'Telnyx.NaturalHD.astra',
    language: 'en-IN',
    service_level: 'premium',
    minimum_digits: 7,
    maximum_digits: 7,
    terminating_digit: '',
    valid_digits: '0123456789#',
    maximum_tries: 1,
    inter_digit_timeout_millis: 15000,
    timeout_millis: 60000,
  });
}

// Ends an active Telnyx call through its Call Control ID.
export async function hangupCall(config: AppConfig, callControlId: string): Promise<Record<string, unknown>> {
  return telnyxRequest(config, `/calls/${encodeURIComponent(callControlId)}/actions/hangup`, { command_id: crypto.randomUUID() });
}

// Sends an SMS through the configured Telnyx messaging profile.
export async function sendSms(config: AppConfig, input: TelnyxMessageInput): Promise<Record<string, unknown>> {
  const sender = config.TELNYX_MESSAGING_SENDER_ID || config.TELNYX_PHONE_NUMBER;
  if (!sender) throw new Error('Telnyx SMS sender is missing. Set TELNYX_MESSAGING_SENDER_ID in .env.');
  return telnyxRequest(config, '/messages', { from: sender, to: input.to, text: input.text, messaging_profile_id: config.TELNYX_MESSAGING_PROFILE_ID });
}

// Verifies a Telnyx v2 webhook signature over its timestamp and raw JSON body.
export function verifyWebhookSignature(config: AppConfig, rawBody: string, signature: string | undefined, timestamp: string | undefined): boolean {
  if (!config.TELNYX_PUBLIC_KEY || !signature || !timestamp) return false;
  try {
    const webhookTime = Number(timestamp);
    if (!Number.isSafeInteger(webhookTime) || Math.abs(Math.floor(Date.now() / 1000) - webhookTime) > 300) return false;
    const rawPublicKey = Buffer.from(config.TELNYX_PUBLIC_KEY, 'base64');
    if (rawPublicKey.length !== 32) return false;
    const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const publicKey = crypto.createPublicKey({ key: Buffer.concat([spkiPrefix, rawPublicKey]), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(`${timestamp}|${rawBody}`), publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

// Builds a public webhook URL without inventing a hostname when configuration is absent.
export function webhookUrl(config: AppConfig, kind: 'voice' | 'sms'): string {
  if (!config.PUBLIC_WEBHOOK_BASE_URL) throw new Error('PUBLIC_WEBHOOK_BASE_URL is missing; cannot generate a Telnyx webhook URL.');
  return `${config.PUBLIC_WEBHOOK_BASE_URL.replace(/\/$/, '')}/webhooks/telnyx/${kind}`;
}
