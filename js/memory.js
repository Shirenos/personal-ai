import { load, save } from './storage.js';

const PROFILE_DEFAULT = [
  { id: 'p1', text: 'Имя: Shiren (GitHub: Shirenos)' },
  { id: 'p2', text: 'Университет: ТулГУ, Прикладная математика и информатика, специализация «ИИ в технических системах», группа 221461' },
  { id: 'p3', text: 'Предпочитает русский язык; отвечает по делу, без воды' },
  { id: 'p4', text: 'Интересы: машинное обучение, математика, полезные утилиты, личные ИИ-ассистенты' },
];

function uid() {
  return 'm_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getProfile() {
  const stored = load('profile', null);
  return Array.isArray(stored) && stored.length ? stored : PROFILE_DEFAULT.map((x) => ({ ...x }));
}

export function setProfile(list) {
  save('profile', list);
}

export function getMemories() {
  return load('memories', []);
}

export function addMemory(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const list = getMemories();
  const item = { id: uid(), text: t, createdAt: new Date().toISOString() };
  list.unshift(item);
  save('memories', list.slice(0, 200));
  return item;
}

export function updateMemory(id, text) {
  const list = getMemories();
  const i = list.findIndex((m) => m.id === id);
  if (i < 0) return false;
  list[i] = { ...list[i], text: String(text).trim(), updatedAt: new Date().toISOString() };
  save('memories', list);
  return true;
}

export function removeMemory(id) {
  save('memories', getMemories().filter((m) => m.id !== id));
}

const STOP = new Set([
  'и','в','во','на','по','с','со','к','ко','о','об','от','до','за','из','у','а','но','или','the','a','an','to','of','in','on','for','is','are','be','as','at','it','this','that','with','и','что','как','это','не','да','же','ли','бы','мне','меня','мой','моя','моё','ты','я','он','она','они','мы','you','me','my','your','i',
]);

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Rank named memories by keyword overlap with the user query; always keep newest as weak fallback. */
export function selectRelevantMemories(query, { limit = 8 } = {}) {
  const all = getMemories();
  if (!all.length) return [];
  const q = new Set(tokens(query));
  if (!q.size) return all.slice(0, Math.min(4, limit));

  const scored = all.map((m, idx) => {
    const mt = tokens(m.text);
    let score = 0;
    for (const w of mt) if (q.has(w)) score += 1;
    // slight recency bias
    score += Math.max(0, (all.length - idx) * 0.01);
    return { m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.filter((x) => x.score >= 1).slice(0, limit).map((x) => x.m);
  if (hits.length) return hits;
  return all.slice(0, Math.min(3, limit));
}

export function memoryBlockForPrompt(query = '') {
  const profile = getProfile().map((p) => `- ${p.text}`).join('\n');
  const notes = selectRelevantMemories(query, { limit: 8 }).map((m) => `- ${m.text}`).join('\n');
  return [
    '## Profile',
    profile || '- (none)',
    '',
    '## Relevant memories',
    notes || '- (none)',
  ].join('\n');
}
