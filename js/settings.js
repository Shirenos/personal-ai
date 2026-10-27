import { load, save, remove } from './storage.js';

export const PROVIDERS = {
  groq: {
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  openai: {
    label: 'OpenAI',
    base: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.0-flash-001',
  },
  custom: {
    label: 'Custom',
    base: 'http://127.0.0.1:8080/v1',
    model: 'local-model',
  },
};

/** Groq-oriented speed/quality presets (also usable as model ids elsewhere). */
export const MODEL_PRESETS = [
  {
    id: 'smart',
    label: 'Smart · Llama 3.3 70B',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    baseUrl: PROVIDERS.groq.base,
  },
  {
    id: 'fast',
    label: 'Fast · Llama 3.1 8B Instant',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    baseUrl: PROVIDERS.groq.base,
  },
  {
    id: 'gemma',
    label: 'Fast · Gemma 2 9B',
    provider: 'groq',
    model: 'gemma2-9b-it',
    baseUrl: PROVIDERS.groq.base,
  },
  {
    id: 'or-gemini',
    label: 'OpenRouter · Gemini 2.0 Flash',
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-001',
    baseUrl: PROVIDERS.openrouter.base,
  },
];

const DEFAULTS = {
  name: 'Шира',
  lang: 'ru',
  provider: 'groq',
  baseUrl: PROVIDERS.groq.base,
  model: 'llama-3.3-70b-versatile',
  preset: 'smart',
  apiKey: '',
  tts: false,
  contextMessages: 24,
  showLatency: true,
  maxTokens: 1024,
};

export function getSettings() {
  return { ...DEFAULTS, ...load('settings', {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  save('settings', next);
  return next;
}

export function clearApiKey() {
  const s = getSettings();
  s.apiKey = '';
  save('settings', s);
  return s;
}

export function hasApiKey() {
  return Boolean(getSettings().apiKey && getSettings().apiKey.trim());
}

export function applyProviderDefaults(provider) {
  const p = PROVIDERS[provider] || PROVIDERS.groq;
  return { provider, baseUrl: p.base, model: p.model };
}

export function applyPreset(presetId) {
  const p = MODEL_PRESETS.find((x) => x.id === presetId) || MODEL_PRESETS[0];
  return {
    preset: p.id,
    provider: p.provider,
    baseUrl: p.baseUrl,
    model: p.model,
  };
}

export function removeSettings() {
  remove('settings');
}
