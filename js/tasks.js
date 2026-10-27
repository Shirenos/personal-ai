import { load, save } from './storage.js';

function uid() {
  return 't_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getTasks() {
  return load('tasks', []);
}

export function addTask(text, source = 'ui') {
  const t = String(text || '').trim();
  if (!t) return null;
  const list = getTasks();
  const item = {
    id: uid(),
    text: t,
    done: false,
    source,
    createdAt: new Date().toISOString(),
  };
  list.unshift(item);
  save('tasks', list);
  return item;
}

export function toggleTask(id) {
  const list = getTasks();
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], done: !list[i].done, updatedAt: new Date().toISOString() };
  save('tasks', list);
  return list[i];
}

export function removeTask(id) {
  save('tasks', getTasks().filter((t) => t.id !== id));
}

export function openCount() {
  return getTasks().filter((t) => !t.done).length;
}

export function tasksBlockForPrompt() {
  const open = getTasks().filter((t) => !t.done).slice(0, 12);
  if (!open.length) return '## Open tasks\n- (none)';
  return '## Open tasks\n' + open.map((t) => `- [${t.id}] ${t.text}`).join('\n');
}
