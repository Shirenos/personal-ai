// Product renamed to Shirenium; keep legacy prefix so existing installs keep data.
const PREFIX = 'shira.v1.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

/**
 * Export all app data. apiKey is intentionally omitted from backups
 * so a shared JSON file never leaks the secret.
 */
export function exportAll() {
  const out = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) {
      const short = k.slice(PREFIX.length);
      try {
        let value = JSON.parse(localStorage.getItem(k));
        if (short === 'settings' && value && typeof value === 'object') {
          const { apiKey: _omit, ...rest } = value;
          value = rest;
        }
        out.data[short] = value;
      } catch {
        out.data[short] = localStorage.getItem(k);
      }
    }
  }
  return out;
}

/**
 * Import backup JSON.
 * - Never writes apiKey from a file.
 * - Settings (esp. baseUrl) only applied when importSettings === true
 *   (caller must confirm — otherwise a malicious backup could redirect the key).
 * - Sessions, messages, tasks, memory, etc. always imported.
 */
export function importAll(payload, { importSettings = false } = {}) {
  if (!payload || typeof payload !== 'object' || !payload.data) {
    throw new Error('Invalid backup file');
  }
  for (const [k, v] of Object.entries(payload.data)) {
    if (k === 'settings') {
      if (!importSettings) continue;
      const incoming = v && typeof v === 'object' ? { ...v } : {};
      delete incoming.apiKey;
      const current = load('settings', {}) || {};
      // Keep the live key; never take one from the file.
      const merged = { ...current, ...incoming, apiKey: current.apiKey || '' };
      localStorage.setItem(PREFIX + k, JSON.stringify(merged));
      continue;
    }
    localStorage.setItem(PREFIX + k, JSON.stringify(v));
  }
}

export { PREFIX };
