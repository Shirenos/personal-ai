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

export function exportAll() {
  const out = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) {
      try {
        out.data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
      } catch {
        out.data[k.slice(PREFIX.length)] = localStorage.getItem(k);
      }
    }
  }
  return out;
}

export function importAll(payload) {
  if (!payload || typeof payload !== 'object' || !payload.data) {
    throw new Error('Invalid backup file');
  }
  for (const [k, v] of Object.entries(payload.data)) {
    localStorage.setItem(PREFIX + k, JSON.stringify(v));
  }
}
