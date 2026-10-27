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

const DEFAULTS = {
  name: 'Шира',
  lang: 'ru',
  provider: 'groq',
  baseUrl: PROVIDERS.groq.base,
  model: PROVIDERS.groq.model,
  apiKey: '',
  tts: false,
  contextMessages: 40,
};

export function getSettings() {
  return { ...DEFAULTS, ...load('settings', {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  // Never accidentally persist empty string over existing key unless intentional
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

export function removeSettings() {
  remove('settings');
}
