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

export function memoryBlockForPrompt() {
  const profile = getProfile().map((p) => `- ${p.text}`).join('\n');
  const notes = getMemories().slice(0, 40).map((m) => `- ${m.text}`).join('\n');
  return [
    '## Known profile facts',
    profile || '- (none)',
    '',
    '## Named memories (user-curated)',
    notes || '- (none yet)',
  ].join('\n');
}
