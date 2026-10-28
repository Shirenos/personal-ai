import { load, save, remove, PREFIX } from './storage.js?v=20261028b';

export const SMART_MODEL = 'openai/gpt-oss-120b';
export const FAST_MODEL = 'openai/gpt-oss-20b';

export const PROVIDERS = {
  groq: {
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    model: SMART_MODEL,
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

export const RETIRED_MODEL_MAP = {
  'llama-3.3-70b-versatile': SMART_MODEL,
  'llama-3.1-8b-instant': FAST_MODEL,
  'llama-3.1-70b-versatile': SMART_MODEL,
  'llama3-70b-8192': SMART_MODEL,
  'llama3-8b-8192': FAST_MODEL,
  'llama-3.2-90b-vision-preview': SMART_MODEL,
  'gemma2-9b-it': FAST_MODEL,
  'gemma-7b-it': FAST_MODEL,
  'mixtral-8x7b-32768': FAST_MODEL,
};

export const MODEL_PRESETS = [
  {
    id: 'smart',
    label: 'Smart · GPT-OSS 120B',
    provider: 'groq',
    model: SMART_MODEL,
    baseUrl: PROVIDERS.groq.base,
  },
  {
    id: 'fast',
    label: 'Fast · GPT-OSS 20B',
    provider: 'groq',
    model: FAST_MODEL,
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

const DEFAULT_NAME_RU = 'Ширениум';
const DEFAULT_NAME_EN = 'Shirenium';

const DEFAULTS = {
  name: DEFAULT_NAME_RU,
  lang: 'ru',
  provider: 'groq',
  baseUrl: PROVIDERS.groq.base,
  model: SMART_MODEL,
  preset: 'smart',
  apiKey: '',
  tts: false,
  contextMessages: 24,
  showLatency: true,
  maxTokens: 1024,
  // Empty for public visitors; owner sets their group in Settings. Cache still ships demo data.
  scheduleGroup: '',
  onboardingDone: false,
};

export function defaultAssistantName(lang) {
  return lang === 'en' ? DEFAULT_NAME_EN : DEFAULT_NAME_RU;
}

export function clampContextMessages(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 24;
  return Math.min(60, Math.max(6, Math.round(v)));
}

export function clampMaxTokens(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1024;
  return Math.min(4096, Math.max(256, Math.round(v)));
}

function migrateSettings(raw) {
  const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  let changed = false;

  if (s.name === 'Шира' || s.name === 'Shira') {
    s.name = s.lang === 'en' ? DEFAULT_NAME_EN : DEFAULT_NAME_RU;
    changed = true;
  }

  if (RETIRED_MODEL_MAP[s.model]) {
    const next = RETIRED_MODEL_MAP[s.model];
    if (next === FAST_MODEL) {
      s.preset = 'fast';
      s.model = FAST_MODEL;
    } else {
      s.preset = 'smart';
      s.model = SMART_MODEL;
    }
    if (s.provider === 'groq' || !s.provider) {
      s.provider = 'groq';
      s.baseUrl = PROVIDERS.groq.base;
    }
    changed = true;
  }

  if (s.preset === 'gemma') {
    s.preset = 'fast';
    s.model = FAST_MODEL;
    s.provider = 'groq';
    s.baseUrl = PROVIDERS.groq.base;
    changed = true;
  }

  // Do not force a default schedule group — empty means "use cache / set later".

  const ctx = clampContextMessages(s.contextMessages);
  if (ctx !== s.contextMessages) {
    s.contextMessages = ctx;
    changed = true;
  }
  const mt = clampMaxTokens(s.maxTokens);
  if (mt !== s.maxTokens) {
    s.maxTokens = mt;
    changed = true;
  }

  if (s.model === SMART_MODEL && s.provider === 'groq') s.preset = s.preset === 'custom' ? 'custom' : 'smart';
  if (s.model === FAST_MODEL && s.provider === 'groq' && s.preset === 'smart') s.preset = 'fast';

  if (changed) save('settings', s);
  return s;
}

export function getSettings() {
  return migrateSettings(load('settings', {}));
}

export function saveSettings(patch) {
  const merged = { ...getSettings(), ...patch };
  if (patch && 'contextMessages' in patch) {
    merged.contextMessages = clampContextMessages(patch.contextMessages);
  }
  if (patch && 'maxTokens' in patch) {
    merged.maxTokens = clampMaxTokens(patch.maxTokens);
  }
  if (patch && 'scheduleGroup' in patch) {
    merged.scheduleGroup = String(patch.scheduleGroup || '').trim();
  }
  const next = migrateSettings(merged);
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

/** Wipe all Shirenium localStorage keys (legacy prefix shira.v1.). */
export function wipeAllLocalData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function removeSettings() {
  remove('settings');
}
