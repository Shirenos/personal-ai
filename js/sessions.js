import { load, save } from './storage.js';

function uid() {
  return 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function listSessions() {
  const list = load('sessions', null);
  if (Array.isArray(list) && list.length) return list;
  // migrate legacy single chatHistory
  const legacy = load('chatHistory', []);
  const s = {
    id: uid(),
    title: legacy.length ? titleFromMessages(legacy) : 'Новый чат',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  save('sessions', [s]);
  if (legacy.length) save('chat:' + s.id, legacy);
  save('activeSession', s.id);
  return [s];
}

function saveSessions(list) {
  save('sessions', list);
}

export function getActiveSessionId() {
  listSessions();
  let id = load('activeSession', null);
  const sessions = load('sessions', []);
  if (!id || !sessions.some((s) => s.id === id)) {
    id = sessions[0]?.id;
    if (id) save('activeSession', id);
  }
  return id;
}

export function setActiveSession(id) {
  save('activeSession', id);
}

export function getSessionMessages(id = getActiveSessionId()) {
  if (!id) return [];
  return load('chat:' + id, []);
}

export function saveSessionMessages(messages, id = getActiveSessionId()) {
  if (!id) return;
  save('chat:' + id, (messages || []).slice(-300));
  const sessions = listSessions().map((s) =>
    s.id === id
      ? {
          ...s,
          updatedAt: new Date().toISOString(),
          title: s.title === 'Новый чат' || s.title === 'New chat' || s.autoTitle !== false
            ? titleFromMessages(messages) || s.title
            : s.title,
        }
      : s
  );
  saveSessions(sessions);
}

export function createSession(title) {
  const s = {
    id: uid(),
    title: title || 'Новый чат',
    autoTitle: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const list = [s, ...listSessions()];
  saveSessions(list);
  save('chat:' + s.id, []);
  setActiveSession(s.id);
  return s;
}

export function renameSession(id, title) {
  const t = String(title || '').trim().slice(0, 80);
  if (!t) return;
  saveSessions(listSessions().map((s) => (s.id === id ? { ...s, title: t, autoTitle: false } : s)));
}

export function deleteSession(id) {
  let list = listSessions().filter((s) => s.id !== id);
  try { localStorage.removeItem('shira.v1.chat:' + id); } catch { /* ignore */ }
  if (!list.length) {
    const s = createSession();
    return s.id;
  }
  saveSessions(list);
  if (getActiveSessionId() === id) setActiveSession(list[0].id);
  return getActiveSessionId();
}

function titleFromMessages(messages) {
  const u = (messages || []).find((m) => m.role === 'user');
  if (!u) return '';
  return String(u.content || '').replace(/\s+/g, ' ').trim().slice(0, 42) || '';
}

export function getActiveSession() {
  const id = getActiveSessionId();
  const meta = listSessions().find((s) => s.id === id) || listSessions()[0];
  return {
    ...(meta || { id, title: 'Новый чат' }),
    messages: getSessionMessages(id),
  };
}

export function saveActiveMessages(messages) {
  saveSessionMessages(messages);
}

export function clearActiveSession() {
  const id = getActiveSessionId();
  save('chat:' + id, []);
  const sessions = listSessions().map((s) =>
    s.id === id
      ? { ...s, title: 'Новый чат', autoTitle: true, updatedAt: new Date().toISOString() }
      : s
  );
  saveSessions(sessions);
}

export function switchSession(id) {
  setActiveSession(id);
  return getActiveSession();
}

export function touchSessionTitle(title) {
  const id = getActiveSessionId();
  const t = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 48);
  if (!t || !id) return;
  saveSessions(
    listSessions().map((s) =>
      s.id === id && (s.autoTitle !== false || s.title === 'Новый чат' || s.title === 'New chat')
        ? { ...s, title: t, updatedAt: new Date().toISOString() }
        : s
    )
  );
}
