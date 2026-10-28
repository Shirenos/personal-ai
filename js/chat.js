import { getSettings, RETIRED_MODEL_MAP, SMART_MODEL } from './settings.js?v=20261028b';
import { memoryBlockForPrompt, addMemory } from './memory.js?v=20261028b';
import { addTask, listTasks, toggleTask, removeTask } from './tasks.js?v=20261028b';
import { scheduleBlockForPrompt, lessonsFor, formatDayTitle, setToday } from './schedule.js?v=20261028b';
import { renderMarkdown } from './markdown.js?v=20261028b';
import { t } from './i18n.js?v=20261028b';
import {
  getActiveSession, saveActiveMessages, clearActiveSession,
  listSessions, touchSessionTitle,
} from './sessions.js?v=20261028b';
import { executeToolCalls, formatToolResultsForModel } from './tools-exec.js?v=20261028b';
import { attachmentsToPrompt } from './files.js?v=20261028b';
import { isDemoMode, getDemoReply } from './demo.js?v=20261028b';

const MAX_AGENT_ROUNDS = 3;
let abortCtrl = null;
let streaming = false;
let pendingFiles = [];

export function getHistory() {
  return getActiveSession().messages || [];
}

export function saveHistory(list) {
  saveActiveMessages(list);
}

export function clearHistory() {
  clearActiveSession();
}

export function isStreaming() {
  return streaming;
}

export function stopGeneration() {
  if (abortCtrl) abortCtrl.abort();
}

/** Pending attachments are already-parsed objects from readAttachments (not File handles). */
export function setPendingFiles(atts) {
  pendingFiles = atts || [];
}

export function getPendingFiles() {
  return pendingFiles;
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

function shiftISO(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

function formatLessons(dateStr) {
  const lessons = lessonsFor(dateStr);
  if (!lessons.length) return `${formatDayTitle(dateStr)}\n${t('schedule.empty')}`;
  return `${formatDayTitle(dateStr)}\n` + lessons.map((l) =>
    `• ${l.range?.label || l.time}  ${l.subject}\n  ${l.kind || '—'} · ${l.room || '—'} · ${l.teacher || '—'}`
  ).join('\n');
}

function parseSlash(text) {
  const m = text.trim().match(/^\/(\w+)(?:\s+([\s\S]+))?$/);
  if (!m) return null;
  return { cmd: m[1].toLowerCase(), arg: (m[2] || '').trim() };
}

export function applyActions(actions, hooks = {}) {
  if (!actions?.length) return;
  for (const a of actions) {
    try {
      if (a.type === 'add_task' && a.text) {
        addTask(a.text);
        hooks.onTasksChanged?.();
      } else if (a.type === 'complete_task') {
        const tasks = listTasks();
        let task = a.id ? tasks.find((x) => x.id === a.id) : null;
        if (!task && a.text) {
          const q = String(a.text).toLowerCase();
          task = tasks.find((x) => !x.done && x.text.toLowerCase().includes(q))
            || tasks.find((x) => x.text.toLowerCase().includes(q));
        }
        if (task && !task.done) {
          toggleTask(task.id);
          hooks.onTasksChanged?.();
        }
      } else if (a.type === 'delete_task' && a.id) {
        removeTask(a.id);
        hooks.onTasksChanged?.();
      } else if (a.type === 'remember' && a.text) {
        addMemory(a.text);
        hooks.onMemoryChanged?.();
      }
    } catch (e) {
      console.warn('action failed', a, e);
    }
  }
}

function extractActions(raw) {
  const fence = raw.match(/```actions\s*([\s\S]*?)```/i);
  if (!fence) return { clean: raw.trim(), actions: [] };
  let actions = [];
  try {
    const parsed = JSON.parse(fence[1].trim());
    actions = Array.isArray(parsed) ? parsed : (parsed.actions || []);
  } catch {
    actions = [];
  }
  const clean = raw.replace(/```actions[\s\S]*?```/gi, '').trim();
  return { clean, actions };
}

function extractToolCalls(raw) {
  const fence = raw.match(/```tools\s*([\s\S]*?)```/i);
  if (!fence) return { clean: raw.replace(/```tools[\s\S]*?```/gi, '').trim(), tools: [] };
  let tools = [];
  try {
    const parsed = JSON.parse(fence[1].trim());
    tools = Array.isArray(parsed) ? parsed : (parsed.tools || []);
  } catch {
    tools = [];
  }
  const clean = raw.replace(/```tools[\s\S]*?```/gi, '').trim();
  return { clean, tools };
}

export function appendMessage(role, content, { streaming: isStream = false, meta = '', toolNote = '' } = {}) {
  const box = document.getElementById('messages');
  if (!box) return null;
  const empty = box.querySelector('.empty-chat');
  if (empty) empty.remove();
  const el = document.createElement('article');
  el.className = `msg msg-${role}${isStream ? ' streaming' : ''}`;
  el.innerHTML = `
    <div class="msg-role">${role === 'user' ? 'You' : (getSettings().name || 'Ширениум')}</div>
    <div class="msg-body">${role === 'assistant' ? renderMarkdown(content) : escapeHtml(content)}</div>
    ${toolNote ? `<div class="msg-tools">${escapeHtml(toolNote)}</div>` : ''}
    <div class="msg-meta">${meta || (isStream ? '…' : '')}</div>
  `;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

export function updateMessageEl(el, content, { streaming: isStream = false, actions = [], meta = null, toolNote = null } = {}) {
  if (!el) return;
  el.classList.toggle('streaming', isStream);
  const body = el.querySelector('.msg-body');
  body.innerHTML = renderMarkdown(content);
  if (actions.length) {
    let bar = el.querySelector('.msg-actions');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'msg-actions';
      el.appendChild(bar);
    }
    bar.innerHTML = actions.map((a) =>
      `<span class="chip">${escapeHtml(a.type)}${a.text ? ': ' + escapeHtml(String(a.text).slice(0, 40)) : ''}</span>`
    ).join('');
  }
  if (toolNote != null) {
    let tn = el.querySelector('.msg-tools');
    if (!tn) {
      tn = document.createElement('div');
      tn.className = 'msg-tools';
      el.insertBefore(tn, el.querySelector('.msg-meta'));
    }
    tn.textContent = toolNote;
  }
  if (meta != null) el.querySelector('.msg-meta').textContent = meta;
  const box = document.getElementById('messages');
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const EMPTY_SUGGESTIONS = [
  { cmd: '/schedule', labelKey: 'empty.s1', fallback: 'Расписание на сегодня' },
  { cmd: '/tomorrow', labelKey: 'empty.s2', fallback: 'Что завтра?' },
  { cmd: '/task купить тетрадь', labelKey: 'empty.s3', fallback: 'Добавить задачу' },
  { cmd: '/remember я люблю короткие ответы', labelKey: 'empty.s4', fallback: 'Запомнить факт' },
  { cmd: '/help', labelKey: 'empty.s5', fallback: 'Справка по командам' },
];

export function showWelcome() {
  const box = document.getElementById('messages');
  if (!box) return;
  box.innerHTML = '';
  const hist = getHistory();
  if (!hist.length) {
    const wrap = document.createElement('div');
    wrap.className = 'empty-chat';
    const sug = EMPTY_SUGGESTIONS.map((s) => {
      const label = t(s.labelKey) !== s.labelKey ? t(s.labelKey) : s.fallback;
      return `<button type="button" class="suggest-chip" data-cmd="${escapeHtml(s.cmd)}">${escapeHtml(label)}</button>`;
    }).join('');
    wrap.innerHTML = `
      <div class="empty-mark" aria-hidden="true"></div>
      <h2>${escapeHtml(t('welcome.title'))}</h2>
      <p>${escapeHtml(t('welcome.body'))}</p>
      <div class="suggest-row">${sug}</div>
      <p class="empty-hint">${escapeHtml(t('welcome.hint'))}</p>
    `;
    box.appendChild(wrap);
    wrap.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('input');
        if (input) {
          input.value = btn.getAttribute('data-cmd');
          input.focus();
          input.dispatchEvent(new Event('input'));
        }
      });
    });
    return;
  }
  for (const m of hist) {
    if (m.role === 'system') continue;
    appendMessage(m.role, m.content, { meta: m.meta || '' });
  }
}

function buildSystemPrompt(userText) {
  const s = getSettings();
  const tasks = listTasks().filter((x) => !x.done).slice(0, 12);
  const taskLines = tasks.length
    ? tasks.map((x) => `- [${x.id.slice(0, 6)}] ${x.text}`).join('\n')
    : '(none)';

  return `You are ${s.name}, a personal AI assistant running entirely in the user's browser.
Language: reply in the user's language (Russian or English). Be concise, concrete, useful.
Timezone for schedule: Europe/Moscow.

You have local tools the app executes for you:
1) Structured ACTIONS (side effects in the app) — put ONLY valid JSON in a fenced block:
\`\`\`actions
[{"type":"add_task","text":"..."},{"type":"complete_task","text":"..."},{"type":"remember","text":"..."}]
\`\`\`
Types: add_task, complete_task, delete_task, remember. Prefer complete_task by matching text.

2) External TOOLS (web / wiki / calc / reminder) — when you need live info, emit BEFORE the final answer:
\`\`\`tools
[{"name":"web_search","args":{"query":"..."}},{"name":"wiki_summary","args":{"title":"..."}},{"name":"calculate","args":{"expression":"2+2"}},{"name":"set_reminder","args":{"text":"...","minutes":30}}]
\`\`\`
The app will run tools and send results back. Then answer the user. Do not invent tool results.
Use tools when the user asks for current facts, news, definitions, math, or reminders. Skip tools for pure chat, tasks, schedule, or memory.

Never invent schedule entries — use the schedule block below.
Never claim you stored something unless you emitted the matching action.

${memoryBlockForPrompt(userText)}

## Open tasks
${taskLines}

${scheduleBlockForPrompt(4)}

## Capabilities
- Chat, memory, tasks, university schedule (group ${s.scheduleGroup || '(unset)'})
- Slash commands the user may type: /task /remember /schedule /tomorrow /clear /help
- Voice input/TTS when available in the browser
- File attachments (txt/md/pdf/images) may be included in the user message
`;
}

function apiHeaders(s) {
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${s.apiKey}`,
  };
  if (s.provider === 'openrouter') {
    h['HTTP-Referer'] = location.origin;
    h['X-Title'] = s.name || 'Shirenium';
  }
  return h;
}

function classifyError(err, status, bodyText) {
  if (err?.name === 'AbortError') return { kind: 'abort', message: t('err.aborted') };
  if (!navigator.onLine) return { kind: 'offline', message: t('err.offline') };
  const lower = `${status || ''} ${bodyText || ''} ${err?.message || ''}`.toLowerCase();
  if (status === 401 || status === 403 || lower.includes('invalid api key') || lower.includes('unauthorized')) {
    return { kind: 'badkey', message: t('err.badkey') };
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many')) {
    return { kind: 'ratelimit', message: t('err.ratelimit') };
  }
  if (status === 404 || lower.includes('model') && lower.includes('decommission')) {
    return { kind: 'model', message: t('err.model') };
  }
  if (err?.message === 'Failed to fetch' || lower.includes('network') || lower.includes('fetch')) {
    return { kind: 'offline', message: t('err.offline') };
  }
  return { kind: 'generic', message: `${t('err.generic')}${status ? ` (${status})` : ''}: ${(bodyText || err?.message || '').slice(0, 180)}` };
}

async function streamChat(messages, { onToken, signal, modelOverride } = {}) {
  const s = getSettings();
  const model = modelOverride || s.model;
  const url = `${s.baseUrl.replace(/\/$/, '')}/chat/completions`;
  // Key goes ONLY to configured API base URL — never to our static host
  const res = await fetch(url, {
    method: 'POST',
    headers: apiHeaders(s),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: s.maxTokens || 1024,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(text || res.statusText);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop() || '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content || '';
        if (token) {
          full += token;
          onToken?.(full, token);
        }
      } catch { /* ignore partial */ }
    }
  }
  return full;
}

async function streamWithModelFallback(messages, opts) {
  const s = getSettings();
  try {
    return await streamChat(messages, opts);
  } catch (err) {
    const mapped = RETIRED_MODEL_MAP[s.model];
    if (err.status === 404 && mapped && mapped !== s.model) {
      return streamChat(messages, { ...opts, modelOverride: mapped || SMART_MODEL });
    }
    throw err;
  }
}

function trimMessages(messages, limit) {
  if (messages.length <= limit) return messages;
  const sys = messages[0]?.role === 'system' ? [messages[0]] : [];
  const rest = messages.slice(sys.length);
  return [...sys, ...rest.slice(-(limit - sys.length))];
}

async function handleSlash(cmd, arg, hooks) {
  if (cmd === 'help') {
    return t('help.text');
  }
  if (cmd === 'clear') {
    clearHistory();
    showWelcome();
    hooks.onSessionsChanged?.();
    return t('chat.cleared');
  }
  if (cmd === 'task') {
    if (!arg) return t('tasks.needtext');
    addTask(arg);
    hooks.onTasksChanged?.();
    return `✓ ${t('tasks.added')}: ${arg}`;
  }
  if (cmd === 'remember') {
    if (!arg) return t('memory.needtext');
    addMemory(arg);
    hooks.onMemoryChanged?.();
    return `✓ ${t('memory.added')}: ${arg}`;
  }
  if (cmd === 'schedule' || cmd === 'today') {
    setToday();
    hooks.onScheduleChanged?.();
    return formatLessons(todayISO());
  }
  if (cmd === 'tomorrow') {
    return formatLessons(shiftISO(todayISO(), 1));
  }
  if (cmd === 'demo') {
    return getDemoReply(arg || 'help');
  }
  return null;
}

export async function sendMessage(text, hooks = {}) {
  const raw = (text || '').trim();
  if ((!raw && !pendingFiles.length) || streaming) return;

  let userContent = raw;
  if (pendingFiles.length) {
    try {
      // Files were snapshotted on pick (see app.js) — use parsed attachments, not File handles.
      const extracted = attachmentsToPrompt(pendingFiles);
      if (extracted) userContent = (raw ? raw + '\n\n' : '') + extracted;
    } catch (e) {
      appendMessage('assistant', `${t('err.files')}: ${e.message}`);
      return;
    }
    pendingFiles = [];
    hooks.onFilesCleared?.();
  }
  if (!userContent.trim()) return;

  const slash = parseSlash(userContent);
  appendMessage('user', userContent);

  const hist = getHistory();
  hist.push({ role: 'user', content: userContent, ts: Date.now() });
  if (hist.filter((m) => m.role === 'user').length === 1) {
    touchSessionTitle(userContent.slice(0, 48));
  }
  saveHistory(hist);
  hooks.onSessionsChanged?.();

  if (slash) {
    const reply = await handleSlash(slash.cmd, slash.arg, hooks);
    if (reply != null) {
      appendMessage('assistant', reply);
      hist.push({ role: 'assistant', content: reply, ts: Date.now() });
      saveHistory(hist);
      return;
    }
  }

  // Demo mode: no key required
  if (isDemoMode()) {
    const reply = getDemoReply(userContent);
    const el = appendMessage('assistant', '', { streaming: true });
    // lightweight typewriter
    let i = 0;
    await new Promise((resolve) => {
      const tick = () => {
        i = Math.min(reply.length, i + 3);
        updateMessageEl(el, reply.slice(0, i), { streaming: i < reply.length, meta: 'demo' });
        if (i < reply.length) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
    hist.push({ role: 'assistant', content: reply, meta: 'demo', ts: Date.now() });
    saveHistory(hist);
    hooks.onAssistantDone?.(reply);
    return;
  }

  const s = getSettings();
  if (!s.apiKey) {
    appendMessage('assistant', t('err.nokey'));
    hooks.onNeedKey?.();
    return;
  }

  streaming = true;
  hooks.onStreamStart?.();
  abortCtrl = new AbortController();
  const el = appendMessage('assistant', '', { streaming: true });
  const t0 = performance.now();

  const system = buildSystemPrompt(userContent);
  let messages = trimMessages([
    { role: 'system', content: system },
    ...hist.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
  ], (s.contextMessages || 24) + 1);

  let toolNotes = [];
  let finalText = '';
  let actions = [];

  try {
    for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
      const full = await streamWithModelFallback(messages, {
        signal: abortCtrl.signal,
        onToken: (acc) => {
          const preview = acc.replace(/```(?:actions|tools)[\s\S]*$/i, '').trimEnd();
          updateMessageEl(el, preview || '…', {
            streaming: true,
            toolNote: toolNotes.length ? toolNotes.join(' · ') : null,
          });
        },
      });

      const { clean: afterTools, tools } = extractToolCalls(full);
      if (tools.length && round < MAX_AGENT_ROUNDS - 1) {
        toolNotes.push(...tools.map((x) => x.name || '?'));
        updateMessageEl(el, afterTools || t('chat.running_tools'), {
          streaming: true,
          toolNote: toolNotes.join(' · '),
        });
        const results = await executeToolCalls(tools);
        const resultText = formatToolResultsForModel(results);
        messages.push({ role: 'assistant', content: full });
        messages.push({
          role: 'user',
          content: `Tool results (use these facts; do not invent):\n${resultText}\n\nNow give the final answer to the user. You may still emit an \`\`\`actions block if needed. Do not emit \`\`\`tools again unless absolutely necessary.`,
        });
        continue;
      }

      const extracted = extractActions(afterTools || full);
      finalText = extracted.clean || afterTools || full;
      actions = extracted.actions;
      break;
    }

    const ms = Math.round(performance.now() - t0);
    const meta = s.showLatency ? `${ms} ms · ${s.model}` : s.model;
    updateMessageEl(el, finalText, {
      streaming: false,
      actions,
      meta,
      toolNote: toolNotes.length ? `tools: ${toolNotes.join(', ')}` : '',
    });
    applyActions(actions, hooks);
    hist.push({
      role: 'assistant',
      content: finalText,
      meta,
      ts: Date.now(),
    });
    saveHistory(hist);
    hooks.onAssistantDone?.(finalText);
  } catch (err) {
    if (err.name === 'AbortError') {
      updateMessageEl(el, (el.querySelector('.msg-body')?.innerText || '') + '\n\n_' + t('chat.stopped') + '_', {
        streaming: false,
        meta: t('chat.stopped'),
      });
    } else {
      const info = classifyError(err, err.status, err.body);
      updateMessageEl(el, info.message, { streaming: false, meta: info.kind });
    }
  } finally {
    streaming = false;
    abortCtrl = null;
    hooks.onStreamEnd?.();
  }
}

export async function regenerateLast(hooks = {}) {
  if (streaming) return;
  const hist = getHistory();
  let lastUserIdx = -1;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].role === 'user') { lastUserIdx = i; break; }
  }
  if (lastUserIdx < 0) return;
  const text = hist[lastUserIdx].content;
  hist.splice(lastUserIdx);
  saveHistory(hist);
  showWelcome();
  await sendMessage(text, hooks);
}

export function warmupConnection() {
  const s = getSettings();
  if (!s.apiKey || !s.baseUrl) return;
  try {
    const u = new URL(s.baseUrl);
    // fire-and-forget OPTIONS/HEAD not always allowed — skip; DNS warm via Image for groq
    if (u.hostname.includes('groq')) {
      fetch(`${s.baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${s.apiKey}` },
        mode: 'cors',
      }).catch(() => {});
    }
  } catch { /* ignore */ }
}

export { listSessions, getActiveSession };
