/**
 * File: sarvam.ts
 * Role: Provides authenticated speech recognition and telephony-format speech synthesis.
 * Service: Syscall voice-agent.
 */
import WebSocket from 'ws';
import type { VoiceAgentConfig } from './config.js';
import type { VoiceLanguage } from './languages.js';

const SARVAM_BASE = 'https://api.sarvam.ai';

export interface TranscriptEvent {
  event?: string;
  text?: string;
  language?: string;
  language_confidence?: number;
  is_fatal?: boolean;
  code?: string | number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

// Opens Sarvam realtime transcription with auto-detection and Telnyx-compatible μ-law input.
export function createRealtimeStt(config: VoiceAgentConfig): WebSocket {
  const query = new URLSearchParams({
    model: 'saaras:v3-realtime',
    language_code: 'auto',
    stream_type: 'fast',
    endpointing: 'vad',
    encoding: 'mulaw',
    sample_rate: '8000',
  });
  return new WebSocket(`${SARVAM_BASE}/speech-to-text-realtime/ws?${query}`, {
    headers: { 'api-subscription-key': config.SARVAM_API_KEY },
    handshakeTimeout: 10000,
    maxPayload: 1024 * 1024,
  });
}

// Starts streaming μ-law audio synthesis for the selected spoken language.
export async function streamSpeech(
  config: VoiceAgentConfig,
  language: VoiceLanguage,
  text: string,
  signal: AbortSignal,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetch(`${SARVAM_BASE}/text-to-speech/stream`, {
    method: 'POST',
    headers: { 'api-subscription-key': config.SARVAM_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      text: text.slice(0, 1200),
      language_code: language.code,
      speaker: language.speaker,
      model: 'bulbul:v3',
      output_audio_codec: 'mulaw',
      speech_sample_rate: 8000,
    }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error(`Sarvam TTS returned HTTP ${response.status}.`);
  return response.body.getReader();
}
