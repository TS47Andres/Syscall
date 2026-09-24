/**
 * File: index.ts
 * Role: Bridges Telnyx call media, Sarvam conversation APIs, and narrow Syscall account actions.
 * Service: Syscall voice-agent.
 */
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { Redis } from 'ioredis';
import { createLogger } from '@syscall/logging';
import { phoneSchema, toPhoneE164 } from '@syscall/validation';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { finishPcmuFrame, takePcmuFrames } from './audio.js';
import { loadVoiceAgentConfig } from './config.js';
import { INITIAL_GREETING, UNCERTAIN_LANGUAGE_FALLBACK, UNSUPPORTED_LANGUAGE_FALLBACK, voiceLanguageFor, type VoiceLanguage } from './languages.js';
import { createRealtimeStt, streamSpeech, type ChatMessage, type TranscriptEvent } from './sarvam.js';

const config = loadVoiceAgentConfig();
const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 2, enableReadyCheck: true });
const logger = createLogger('voice-agent');
// Exposes only liveness over HTTP; the call media endpoint requires a one-time ticket at upgrade.
const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', service: 'voice-agent' }));
    return;
  }
  response.writeHead(404);
  response.end();
});
const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024, perMessageDeflate: false });

interface TelnyxEnvelope {
  event?: string;
  start?: { call_control_id?: string; to?: string; from?: string; media_format?: { encoding?: string; sample_rate?: number; channels?: number } };
  media?: { payload?: string; track?: string };
}

interface CallSession {
  socket: WebSocket;
  ticket: string;
  expectedPhoneE164: string;
  callControlId?: string;
  stt?: WebSocket;
  pendingAudio: string[];
  history: ChatMessage[];
  lastVoiceLanguage?: VoiceLanguage;
  activeSpeech?: AbortController;
  activeCompletion?: AbortController;
  turnQueue: Promise<void>;
  mediaQueue: Promise<void>;
  closed: boolean;
  activated: boolean;
  ticketReady: Promise<void>;
  apiSessionClosed: boolean;
}

// Hashes stream tickets so only the one-time verifier, never the raw token, is stored in Redis.
function ticketHash(ticket: string): string {
  return crypto.createHash('sha256').update(ticket).digest('hex');
}

// Calls an internal API route over the private Compose network with the service credential.
async function callApi(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${config.API_INTERNAL_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-syscall-voice-token': config.VOICE_AGENT_API_TOKEN },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Syscall API voice operation failed with HTTP ${response.status}.`);
  return await response.json() as Record<string, unknown>;
}

// Sends one protocol frame to the active Telnyx media stream.
function sendTelnyx(session: CallSession, message: Record<string, unknown>): void {
  if (session.socket.readyState === WebSocket.OPEN) session.socket.send(JSON.stringify(message));
}

// Removes API-side call authorization once the Telnyx media session ends.
async function closeApiSession(session: CallSession): Promise<void> {
  if (!session.callControlId || session.apiSessionClosed) return;
  session.apiSessionClosed = true;
  try {
    await callApi('/internal/voice/sessions/close', { callControlId: session.callControlId });
  } catch (error) {
    logger.warn({ err: error }, 'Could not clean up voice call authorization');
  }
}

// Cancels synthesized speech and clears audio already queued by Telnyx for barge-in.
function stopCurrentSpeech(session: CallSession): void {
  session.activeSpeech?.abort();
  session.activeSpeech = undefined;
  sendTelnyx(session, { event: 'clear' });
}

// Streams synthesized 8 kHz μ-law audio to Telnyx at 20 ms packet intervals.
async function speak(session: CallSession, text: string, language: VoiceLanguage): Promise<void> {
  if (session.closed) return;
  const outputLanguage = language;
  stopCurrentSpeech(session);
  const controller = new AbortController();
  session.activeSpeech = controller;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let buffered: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let nextFrameAt = Date.now();
  try {
    reader = await streamSpeech(config, outputLanguage, text, controller.signal);
    while (!controller.signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffered = Buffer.concat([buffered, Buffer.from(chunk.value)]);
      const packetized = takePcmuFrames(buffered);
      buffered = packetized.remainder;
      for (const frame of packetized.frames) {
        if (controller.signal.aborted) break;
        sendTelnyx(session, { event: 'media', media: { payload: frame.toString('base64') } });
        nextFrameAt += 20;
        const wait = nextFrameAt - Date.now();
        if (wait > 0) await delay(wait, undefined, { signal: controller.signal });
      }
    }
    if (buffered.length && !controller.signal.aborted) {
      const lastFrame = finishPcmuFrame(buffered);
      if (lastFrame) {
      sendTelnyx(session, { event: 'media', media: { payload: lastFrame.toString('base64') } });
      }
    }
  } catch (error) {
    if (!controller.signal.aborted) logger.warn({ err: error }, 'Voice response audio failed');
  } finally {
    try { await reader?.cancel(); } catch { /* Stream may already be closed. */ }
    if (session.activeSpeech === controller) session.activeSpeech = undefined;
  }
}

// Defines the only account actions available to the conversational agent.
function formatToolDefinitions(): unknown[] {
  return [
    { type: 'function', function: { name: 'create_account', description: 'Create a Syscall account for the caller phone number verified by the active call when the caller clearly asks to create or sign up for an account. Do not ask for keypad or a second confirmation.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'request_password_reset', description: 'Send generic password reset instructions by SMS when the caller asks to reset or recover their password. Never reveal whether an account exists.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  ];
}

// Infers an Indic voice from the script in this individual caller turn when available.
function voiceLanguageFromTranscript(text: string): VoiceLanguage | null {
  const scriptRanges: Array<{ language: string; range: RegExp }> = [
    { language: 'bn-IN', range: /[\u0980-\u09FF]/g },
    { language: 'pa-IN', range: /[\u0A00-\u0A7F]/g },
    { language: 'gu-IN', range: /[\u0A80-\u0AFF]/g },
    { language: 'or-IN', range: /[\u0B00-\u0B7F]/g },
    { language: 'ta-IN', range: /[\u0B80-\u0BFF]/g },
    { language: 'te-IN', range: /[\u0C00-\u0C7F]/g },
    { language: 'kn-IN', range: /[\u0C80-\u0CFF]/g },
    { language: 'ml-IN', range: /[\u0D00-\u0D7F]/g },
    { language: 'hi-IN', range: /[\u0900-\u097F]/g },
  ];
  const counts = scriptRanges.map(({ language, range }) => ({ language, count: [...text.matchAll(range)].length }));
  const dominant = counts.sort((a, b) => b.count - a.count)[0];
  return dominant && dominant.count > 0 ? voiceLanguageFor(dominant.language) : null;
}

// Requests a short voice-oriented response and scoped function calls from Sarvam's conversation model.
async function modelResponse(session: CallSession, language: VoiceLanguage, signal: AbortSignal): Promise<{ content: string | null; toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }> {
  const languageScript = language.code === 'pa-IN' ? ' For Punjabi, use Punjabi in Gurmukhi script.' : '';
  const system: ChatMessage = {
    role: 'system',
    content: `You are Syscall's friendly conversational phone assistant, not an IVR. For this response, speak in ${language.name}, the language detected for the caller's latest utterance, using its normal script.${languageScript} Language is selected independently for every caller turn and may change at any time; do not cling to a language used earlier in the call. Never claim that you can only speak or assist in English; respond to the latest utterance in ${language.name}. Keep answers concise and natural for a phone conversation. Help with Syscall account creation and password reset. When the caller clearly asks to create/sign up for an account, call create_account immediately; do not ask for confirmation, offer keypad options, or start a menu. When the caller asks for password reset/recovery, call request_password_reset immediately. Ask a brief clarifying question only if the caller's intent is genuinely ambiguous. Never ask for a password, OTP, payment details, or other secrets. Never claim an operation succeeded unless a tool result confirms it. Explain tool outcomes naturally in ${language.name}. Never mention IVR, keypad options, or internal tools.`,
  };
  const tools = formatToolDefinitions();
  const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'api-subscription-key': config.SARVAM_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'sarvam-105b-conversations', messages: [system, ...session.history.slice(-16)], tools, tool_choice: 'auto', parallel_tool_calls: false, temperature: 0.25, max_tokens: 120 }),
    signal,
  });
  if (!response.ok) throw new Error(`Sarvam chat returned HTTP ${response.status}.`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> } }> };
  const message = body.choices?.[0]?.message;
  if (!message) throw new Error('Sarvam chat returned no assistant response.');
  return { content: typeof message.content === 'string' ? message.content : null, toolCalls: message.tool_calls ?? [] };
}

// Executes an allowlisted account action using the identity bound to this live call.
async function executeTool(session: CallSession, name: string): Promise<Record<string, unknown>> {
  if (name === 'create_account' && session.callControlId) {
    return callApi('/internal/voice/actions', { callControlId: session.callControlId, actionId: crypto.randomUUID(), action: 'create_account' });
  }
  if (name === 'request_password_reset' && session.callControlId) {
    return callApi('/internal/voice/actions', { callControlId: session.callControlId, actionId: crypto.randomUUID(), action: 'request_password_reset' });
  }
  return { status: 'not_allowed' };
}

// Appends one caller turn, handles at most two tool round-trips, and speaks the final answer.
async function respondToCaller(session: CallSession, transcript: string, language: VoiceLanguage): Promise<void> {
  if (!transcript.trim()) return;
  session.history.push({ role: 'user', content: transcript.slice(0, 1200) });
  const controller = new AbortController();
  session.activeCompletion = controller;
  try {
    for (let round = 0; round < 2 && !controller.signal.aborted; round += 1) {
      const answer = await modelResponse(session, language, controller.signal);
      if (answer.toolCalls.length) {
        const first = answer.toolCalls[0]!;
        session.history.push({ role: 'assistant', content: answer.content, tool_calls: answer.toolCalls });
        for (const tool of answer.toolCalls) {
          let result: Record<string, unknown>;
          if (tool.id !== first.id) result = { status: 'only_one_action_allowed_per_turn' };
          else {
            try {
              JSON.parse(tool.function.arguments || '{}');
              result = await executeTool(session, tool.function.name);
            } catch (error) {
              logger.warn({ err: error, tool: tool.function.name }, 'Voice action failed');
              result = { status: 'temporarily_unavailable' };
            }
          }
          session.history.push({ role: 'tool', tool_call_id: tool.id, content: JSON.stringify(result) });
        }
        continue;
      }
      const content = answer.content?.trim().replace(/[`*_#]/g, '').slice(0, 600);
      if (!content) return;
      session.history.push({ role: 'assistant', content });
      await speak(session, content, language);
      return;
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      logger.warn({ err: error }, 'Voice conversation turn failed');
      const recovery = language.code === 'hi-IN'
        ? 'माफ़ कीजिए, अभी तकनीकी समस्या हुई। कृपया फिर से बताइए कि आपको किस काम में मदद चाहिए।'
        : language.code === 'gu-IN'
          ? 'માફ કરશો, અત્યારે ટેક્નિકલ સમસ્યા આવી. કૃપા કરીને ફરીથી કહો કે તમને શેમાં મદદ જોઈએ.'
          : 'I’m sorry, I ran into a technical issue. Please tell me again what you need help with.';
      await speak(session, recovery, language);
    }
  } finally {
    if (session.activeCompletion === controller) session.activeCompletion = undefined;
  }
}

// Chooses the caller's detected language or explains the configured English/Hindi fallback.
async function processTranscript(session: CallSession, event: TranscriptEvent): Promise<void> {
  const text = event.text?.trim();
  if (!text || session.closed) return;
  const confidenceValue = Number(event.language_confidence);
  const confidence = confidenceValue > 1 ? confidenceValue / 100 : confidenceValue;
  const detectedVoice = voiceLanguageFor(event.language);
  const transcriptVoice = voiceLanguageFromTranscript(text);
  const confidentDetection = detectedVoice && Number.isFinite(confidence) && confidence >= config.VOICE_LANGUAGE_CONFIDENCE_THRESHOLD;
  const language = transcriptVoice ?? (confidentDetection ? detectedVoice : undefined) ?? session.lastVoiceLanguage ?? detectedVoice ?? voiceLanguageFor('en-IN')!;
  const selectionSource = transcriptVoice ? 'transcript-script' : confidentDetection ? 'turn-detection' : session.lastVoiceLanguage ? 'previous-turn-fallback' : detectedVoice ? 'low-confidence-first-turn' : 'default';
  session.lastVoiceLanguage = language;
  logger.info({ detectedLanguage: event.language, confidence: Number.isFinite(confidence) ? confidence : null, selectedLanguage: language.code, selectionSource }, 'Selected response language for caller turn');
  if (!detectedVoice && !transcriptVoice && (!Number.isFinite(confidence) || confidence < config.VOICE_LANGUAGE_CONFIDENCE_THRESHOLD)) {
    await speak(session, UNCERTAIN_LANGUAGE_FALLBACK, language);
    return;
  }
  if (!detectedVoice && !transcriptVoice) {
    await speak(session, UNSUPPORTED_LANGUAGE_FALLBACK, language);
    return;
  }
  await respondToCaller(session, text, language);
}

// Parses provider JSON frames without allowing malformed data to crash the stream process.
function parseJson(raw: RawData): TelnyxEnvelope | TranscriptEvent | null {
  try { return JSON.parse(raw.toString()) as TelnyxEnvelope | TranscriptEvent; } catch { return null; }
}

// Verifies call/ticket/codec alignment, binds the call to the API, and opens realtime STT.
async function activateSession(session: CallSession, event: TelnyxEnvelope): Promise<void> {
  const callControlId = event.start?.call_control_id;
  const rawPhone = event.start?.to;
  const phone = typeof rawPhone === 'string' ? toPhoneE164(rawPhone) : '';
  if (!callControlId || !phone || phone !== session.expectedPhoneE164) throw new Error('Telnyx stream did not match its one-time call ticket.');
  const media = event.start?.media_format;
  if (media?.encoding !== 'PCMU' || media.sample_rate !== 8000 || media.channels !== 1) throw new Error('Telnyx stream format is not 8 kHz mono PCMU.');
  await callApi('/internal/voice/sessions/activate', { ticket: session.ticket, callControlId, phone });
  session.ticket = '';
  session.callControlId = callControlId;
  session.activated = true;
  session.stt = createRealtimeStt(config);
  // Starts the bilingual prompt only after the realtime recognizer can accept caller audio.
  session.stt.on('open', () => {
    for (const audio of session.pendingAudio.splice(0)) session.stt?.send(JSON.stringify({ event: 'audio_input', audio }));
    void speak(session, INITIAL_GREETING, voiceLanguageFor('hi-IN')!);
  });
  // Handles speech-start barge-in and finalized caller turns from Sarvam.
  session.stt.on('message', (raw) => {
    const message = parseJson(raw);
    if (!message || !('event' in message) || typeof message.event !== 'string') return;
    if (message.event === 'vad.speech_start') {
      stopCurrentSpeech(session);
      session.activeCompletion?.abort();
    }
    if (message.event === 'transcript.final') {
      // Serializes caller turns so two model responses cannot overlap.
      session.turnQueue = session.turnQueue.then(() => processTranscript(session, message as TranscriptEvent)).catch((error) => logger.warn({ err: error }, 'Transcript processing failed'));
    }
    if (message.event === 'error') logger.warn({ code: (message as TranscriptEvent).code, fatal: (message as TranscriptEvent).is_fatal }, 'Sarvam STT reported an error');
  });
  // Records provider failures without logging transcripts or credentials.
  session.stt.on('error', (error) => logger.warn({ err: error }, 'Sarvam STT connection failed'));
  // Keeps long-lived realtime STT sessions active using Sarvam's documented ping event.
  const heartbeat = setInterval(() => {
    if (session.stt?.readyState === WebSocket.OPEN) session.stt.send(JSON.stringify({ event: 'ping' }));
  }, 15000);
  // Stops the heartbeat when the Telnyx media socket closes.
  session.socket.once('close', () => clearInterval(heartbeat));
}

// Creates per-call state and installs Telnyx media and lifecycle handlers.
websocketServer.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const ticket = url.searchParams.get('ticket') ?? '';
  const session: CallSession = {
    socket,
    ticket,
    expectedPhoneE164: '',
    pendingAudio: [],
    history: [],
    turnQueue: Promise.resolve(),
    mediaQueue: Promise.resolve(),
    closed: false,
    activated: false,
    ticketReady: Promise.resolve(),
    apiSessionClosed: false,
  };
  // Resolves the ticket's expected number before the provider's start event is accepted.
  session.ticketReady = redis.get(`voice:stream-ticket:${ticketHash(ticket)}`).then((value) => {
    if (!value) throw new Error('Voice ticket expired before stream activation.');
    const parsed = JSON.parse(value) as { phoneE164: string };
    session.expectedPhoneE164 = phoneSchema.parse(parsed.phoneE164);
  });
  // Rejects the stream if its Redis ticket disappeared or contains invalid call metadata.
  void session.ticketReady.catch((error) => {
    logger.warn({ err: error }, 'Rejected invalid Telnyx media stream');
    socket.close(1008, 'Invalid stream ticket');
  });

  // Routes Telnyx start/media/stop frames into the active voice session.
  socket.on('message', (raw) => {
    const event = parseJson(raw);
    if (!event || !('event' in event)) return;
    if (event.event === 'start' && !session.activated) {
      void session.ticketReady.then(() => activateSession(session, event as TelnyxEnvelope)).catch((error) => {
        logger.warn({ err: error }, 'Could not activate Telnyx media stream');
        socket.close(1011, 'Voice session unavailable');
      });
      return;
    }
    if (!session.activated) return;
    if (event.event === 'media') {
      const media = (event as TelnyxEnvelope).media;
      if (!media?.payload || (media.track && media.track !== 'inbound')) return;
      // Maintains audio order while allowing Sarvam's WebSocket to come online.
      session.mediaQueue = session.mediaQueue.then(() => {
        if (session.stt?.readyState === WebSocket.OPEN) session.stt.send(JSON.stringify({ event: 'audio_input', audio: media.payload }));
        else if (session.pendingAudio.length < 100) session.pendingAudio.push(media.payload!);
      }).catch((error) => logger.warn({ err: error }, 'Could not forward caller audio'));
    }
    if (event.event === 'stop') {
      session.closed = true;
      stopCurrentSpeech(session);
      session.stt?.close(1000, 'Telnyx call ended');
      void closeApiSession(session);
      socket.close(1000, 'Call ended');
    }
  });

  // Cancels provider work and revokes API authorization when the stream ends.
  socket.on('close', () => {
    session.closed = true;
    stopCurrentSpeech(session);
    session.activeCompletion?.abort();
    session.stt?.close(1000, 'Telnyx stream closed');
    void closeApiSession(session);
  });
  // Keeps malformed or interrupted stream failures from escaping the agent process.
  socket.on('error', (error) => logger.warn({ err: error }, 'Telnyx media websocket error'));
});

// Validates the route and one-time ticket before accepting a public WebSocket upgrade.
server.on('upgrade', async (request, socket, head) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== '/voice-stream') throw new Error('Unknown websocket endpoint.');
    const ticket = url.searchParams.get('ticket');
    if (!ticket || ticket.length < 32 || ticket.length > 128) throw new Error('Missing stream ticket.');
    const saved = await redis.get(`voice:stream-ticket:${ticketHash(ticket)}`);
    if (!saved) throw new Error('Invalid stream ticket.');
    // Completes the HTTP upgrade only after Redis confirms a live ticket.
    websocketServer.handleUpgrade(request, socket, head, (websocket) => websocketServer.emit('connection', websocket, request));
  } catch {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
  }
});

// Starts the voice-agent listener after configuration validation.
await new Promise<void>((resolve) => server.listen(config.VOICE_AGENT_PORT, '0.0.0.0', resolve));
logger.info({ port: config.VOICE_AGENT_PORT }, 'Syscall voice agent listening');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  // Drains active WebSockets and Redis cleanly when Docker stops the container.
  process.once(signal, () => {
    // Requests a normal close on each Telnyx media session.
    websocketServer.clients.forEach((socket) => socket.close(1001, 'Service shutting down'));
    websocketServer.close();
    server.close();
    void redis.quit();
  });
}
