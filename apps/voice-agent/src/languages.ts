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

export const INITIAL_GREETING = 'Welcome to Syscall. Please say a few words in the language you prefer, and I will continue in that language. You may also press 1 to create an account, 2 for password reset, or 9 to repeat this message. नमस्ते, Syscall में आपका स्वागत है। आप जिस भाषा में बात करना चाहते हैं, कृपया उसमें कुछ शब्द बोलें। मैं उसी भाषा में बात करूँगा। खाता बनाने के लिए 1, पासवर्ड रीसेट के लिए 2, या यह संदेश दोबारा सुनने के लिए 9 दबाएँ।';

export const UNSUPPORTED_LANGUAGE_FALLBACK = 'Sorry, I cannot speak that language yet. Please continue in English or Hindi, or press 1 to create an account, 2 for password reset, or 9 to repeat the welcome message. माफ़ कीजिए, मैं अभी इस भाषा में बात नहीं कर सकता। कृपया अंग्रेज़ी या हिंदी में बोलें, या खाता बनाने के लिए 1, पासवर्ड रीसेट के लिए 2, या संदेश दोहराने के लिए 9 दबाएँ।';

export const UNCERTAIN_LANGUAGE_FALLBACK = 'I could not identify the language clearly. Please say a short sentence again in English or Hindi, or press 1 to create an account, 2 for password reset, or 9 to repeat the welcome message. मैं भाषा पहचान नहीं पाया। कृपया अंग्रेज़ी या हिंदी में फिर से एक छोटा वाक्य बोलें, या खाता बनाने के लिए 1, पासवर्ड रीसेट के लिए 2, या संदेश दोहराने के लिए 9 दबाएँ।';
