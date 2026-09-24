/**
 * File: languages.ts
 * Role: Maps realtime STT language results to supported Sarvam output voices.
 * Service: Syscall voice-agent.
 */
export interface VoiceLanguage {
  code: string;
  name: string;
  speaker: string;
}

// Pins supported Bulbul v3 locales and production-recommended speakers.
const VOICE_LANGUAGES: Record<string, VoiceLanguage> = {
  'en-IN': { code: 'en-IN', name: 'English', speaker: 'shubh' },
  'hi-IN': { code: 'hi-IN', name: 'Hindi', speaker: 'shubh' },
  'bn-IN': { code: 'bn-IN', name: 'Bengali', speaker: 'rehan' },
  'ta-IN': { code: 'ta-IN', name: 'Tamil', speaker: 'ritu' },
  'te-IN': { code: 'te-IN', name: 'Telugu', speaker: 'shubh' },
  'kn-IN': { code: 'kn-IN', name: 'Kannada', speaker: 'shubh' },
  'ml-IN': { code: 'ml-IN', name: 'Malayalam', speaker: 'shubh' },
  'mr-IN': { code: 'mr-IN', name: 'Marathi', speaker: 'ratan' },
  'gu-IN': { code: 'gu-IN', name: 'Gujarati', speaker: 'ratan' },
  'pa-IN': { code: 'pa-IN', name: 'Punjabi', speaker: 'mani' },
  'or-IN': { code: 'od-IN', name: 'Odia', speaker: 'shubh' },
};

const LANGUAGE_ALIASES: Record<string, string> = {
  en: 'en-IN', english: 'en-IN',
  hi: 'hi-IN', hindi: 'hi-IN',
  bn: 'bn-IN', bengali: 'bn-IN',
  ta: 'ta-IN', tamil: 'ta-IN',
  te: 'te-IN', telugu: 'te-IN',
  kn: 'kn-IN', kannada: 'kn-IN',
  ml: 'ml-IN', malayalam: 'ml-IN',
  mr: 'mr-IN', marathi: 'mr-IN',
  gu: 'gu-IN', gujarati: 'gu-IN',
  pa: 'pa-IN', punjabi: 'pa-IN',
  'pa-punjabi': 'pa-IN',
  or: 'or-IN', od: 'or-IN', odia: 'or-IN',
};

// Normalizes Sarvam language codes and common names to supported TTS voices.
export function voiceLanguageFor(code: string | undefined): VoiceLanguage | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase().replaceAll('_', '-');
  const canonical = LANGUAGE_ALIASES[normalized]
    ?? Object.keys(VOICE_LANGUAGES).find((supported) => supported.toLowerCase() === normalized);
  return canonical ? VOICE_LANGUAGES[canonical] ?? null : null;
}

export const VOICE_LANGUAGE_CODES = Object.freeze(Object.keys(VOICE_LANGUAGES));

export const INITIAL_GREETING = 'Welcome to Syscall. Tell me what you need help with in the language you prefer. नमस्ते, Syscall में आपका स्वागत है। कृपया अपनी पसंद की भाषा में बताएं कि मैं आपकी कैसे मदद करूँ।';

export const UNSUPPORTED_LANGUAGE_FALLBACK = 'I may not be able to speak that language yet. Please try English or Hindi, or tell me what you need help with. माफ़ कीजिए, मैं अभी यह भाषा नहीं बोल सकता। कृपया अंग्रेज़ी या हिंदी में बोलें।';

export const UNCERTAIN_LANGUAGE_FALLBACK = 'I could not identify the language clearly. Please say a short sentence again in English or Hindi. मैं भाषा स्पष्ट रूप से नहीं पहचान पाया। कृपया अंग्रेज़ी या हिंदी में एक छोटा वाक्य फिर से बोलें।';
