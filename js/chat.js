import { load, save } from './storage.js';
import { getSettings, hasApiKey } from './settings.js';
import { memoryBlockForPrompt, addMemory } from './memory.js';
import { tasksBlockForPrompt, addTask, toggleTask } from './tasks.js';
import { scheduleBlockForPrompt, lessonsFor, getViewDate, setToday, formatDayTitle, shiftDay } from './schedule.js';
import { renderMarkdown } from './markdown.js';
import { t, getLang } from './i18n.js';
import { speak, stopSpeaking } from './voice.js';

function uid() {
  return 'c_' + Math.random().toString(36).slice(2, 10);
}

let abortCtrl = null;
let lastUserText = '';
let streamingEl = null;

export function getHistory() {
  return load('chatHistory', []);
}

export function saveHistory(list) {
  save('chatHistory', list.slice(-200));
}

export function clearHistory() {
  save('chatHistory', []);
}

export function isStreaming() {
  return Boolean(abortCtrl);
}

export function stopGeneration() {
  if (abortCtrl) {
    abortCtrl.abort();
    abortCtrl = null;
  }
  stopSpeaking();
  if (streamingEl) {
    streamingEl.classList.remove('streaming');
    streamingEl = null;
  }
}

function needsSchedule(query) {
  return /расписан|пар[аыуе]?|лекц|сегодн|завтра|schedule|class(es)?|today|tomorrow|уроки|заняти/i.test(query);
}


function isHardQuestion(query) {
  return /почему|докажи|докажи|объясни подробно|сравни|разбер|how does|why |prove|derive|архитектур|оптимиз|сложн/i.test(query)
    || query.length > 220;
}

function buildSystemPrompt(userQuery = '') {
  const s = getSettings();
  const lang = getLang();
  const name = s.name || 'Шира';
  const hard = isHardQuestion(userQuery);

  const parts = [
    `${name}: personal AI for Shiren (ТулГУ 221461, ML/math, GitHub Shirenos). Timezone Europe/Moscow.`,
    'Style: concise lead → structure → depth only if asked or needed. No filler. Markdown ok. Never invent schedule facts.',
    hard
      ? 'Hard question: think briefly internally, then answer clearly. Do NOT dump chain-of-thought; give the conclusion and key steps.'
      : 'Default: answer in ≤12 lines unless depth is requested.',
    lang === 'ru'
      ? 'Language: Russian unless user writes otherwise.'
      : 'Language: English unless user writes Russian.',
    'Tools: if you must mutate app state, END with exactly one block:',
    '```tool',
    '{"actions":[{"type":"add_task"|"remember"|"open_panel"|"complete_task","text?":"…","panel?":"schedule|tasks|memory|settings","id?":"…"}]}',
    '```',
    'Use tools for remember/task/open panel. Prefer tools over pretending you saved something.',
    '',
    memoryBlockForPrompt(userQuery),
  ];

  // Short open-task list is cheap and keeps the assistant action-aware
  parts.push('', tasksBlockForPrompt());

  // Inject schedule only when relevant (or always next 2 days — small). Prefer relevance to save tokens.
  const schedDays = needsSchedule(userQuery) ? 3 : 1;
  parts.push('', scheduleBlockForPrompt(schedDays));

  return parts.join('\n');
}

function extractTool(content) {
  let actions = [];
  let clean = String(content ?? '');

  const tryParse = (raw) => {
    const t = String(raw || '').trim();
    if (!t) return [];
    // strip trailing commas / single quotes lightly
    const normalized = t
      .replace(/^\uFEFF/, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.actions)) return parsed.actions;
      if (parsed?.type) return [parsed];
    } catch { /* fall through */ }
    // salvage: find first {...} with "actions"
    const m = normalized.match(/\{[\s\S]*"actions"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
    if (m) {
      try {
        const p = JSON.parse(m[0]);
        if (Array.isArray(p.actions)) return p.actions;
      } catch { /* ignore */ }
    }
    return [];
  };

  const fence = clean.match(/```(?:tool|json)?\s*([\s\S]*?)```/i);
  if (fence) {
    actions = tryParse(fence[1]);
    clean = clean.replace(fence[0], '').trimEnd();
  } else {
    // bare trailing JSON object
    const bare = clean.match(/\n\s*(\{"actions"\s*:\s*\[[\s\S]*\}\s*)$/);
    if (bare) {
      actions = tryParse(bare[1]);
      if (actions.length) clean = clean.slice(0, bare.index).trimEnd();
    }
  }

  // Normalize action types
  actions = actions
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      ...a,
      type: String(a.type || '').toLowerCase().replace(/-/g, '_'),
    }));

  return { clean, actions };
}

export function applyActions(actions, hooks = {}) {
  const results = [];
  for (const a of actions || []) {
    if (!a || typeof a !== 'object') continue;
    if (a.type === 'add_task' && a.text) {
      const item = addTask(a.text, 'assistant');
      if (item) {
        results.push({ type: 'add_task', ok: true, text: item.text });
        hooks.onTasksChanged?.();
      }
    } else if (a.type === 'remember' && a.text) {
      const item = addMemory(a.text);
      if (item) {
        results.push({ type: 'remember', ok: true, text: item.text });
        hooks.onMemoryChanged?.();
      }
    } else if (a.type === 'open_panel' && a.panel) {
      results.push({ type: 'open_panel', ok: true, panel: a.panel });
      hooks.onOpenPanel?.(a.panel);
    } else if ((a.type === 'complete_task' || a.type === 'toggle_task') && a.id) {
      toggleTask(a.id);
      results.push({ type: 'complete_task', ok: true, id: a.id });
      hooks.onTasksChanged?.();
    }
  }
  return results;
}

function formatApiError(status, detail) {
  const d = String(detail || '');
  if (status === 401 || status === 403) {
    return getLang() === 'ru'
      ? 'Ключ отклонён (401/403). Проверь API-ключ в Настройках.'
      : 'API key rejected (401/403). Check the key in Settings.';
  }
  if (status === 429 || /rate.?limit|too many requests|quota/i.test(d)) {
    return getLang() === 'ru'
      ? 'Лимит запросов (429). Подожди несколько секунд или переключись на Fast-модель / другой ключ.'
      : 'Rate limited (429). Wait a few seconds or switch to a Fast model / another key.';
  }
  if (status === 413 || /context.?length|too many tokens|maximum context/i.test(d)) {
    return getLang() === 'ru'
      ? 'Слишком длинный контекст. Нажми «Новый чат» или уменьши окно контекста в настройках.'
      : 'Context too long. Start a new chat or lower the context window in Settings.';
  }
  if (status >= 500) {
    return getLang() === 'ru'
      ? `Сервер модели временно недоступен (${status}). Попробуй ещё раз.`
      : `Model server unavailable (${status}). Try again.`;
  }
  const short = d.replace(/\s+/g, ' ').slice(0, 180);
  return `${t('chat.error')}: ${status}${short ? ' — ' + short : ''}`;
}

export function appendMessage(role, content, { streaming = false, meta = '' } = {}) {
  const box = document.getElementById('messages');
  const el = document.createElement('article');
  el.className = `msg ${role}` + (streaming ? ' streaming' : '');
  el.dataset.role = role;
  const name = role === 'user' ? 'Shiren' : role === 'assistant' ? (getSettings().name || 'Шира') : 'system';
  el.innerHTML = `<div class="role">${name}</div><div class="body"></div><div class="msg-meta" hidden></div>`;
  const body = el.querySelector('.body');
  if (role === 'assistant' || role === 'system') body.innerHTML = renderMarkdown(content);
  else body.textContent = content;
  if (meta) {
    const m = el.querySelector('.msg-meta');
    m.hidden = false;
    m.textContent = meta;
  }
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

export function updateMessageEl(el, content, { streaming = false, actions = [], meta = null } = {}) {
  if (!el) return;
  const body = el.querySelector('.body');
  body.innerHTML = renderMarkdown(content);
  el.classList.toggle('streaming', streaming);
  if (meta != null) {
    const m = el.querySelector('.msg-meta');
    if (m) {
      m.hidden = !meta;
      m.textContent = meta || '';
    }
  }
  let chips = el.querySelector('.action-chips');
  if (actions.length) {
    if (!chips) {
      chips = document.createElement('div');
      chips.className = 'action-chips';
      el.appendChild(chips);
    }
    chips.innerHTML = '';
    for (const a of actions) {
      const chip = document.createElement('span');
      chip.className = 'action-chip done';
      if (a.type === 'add_task') chip.textContent = `✓ task: ${a.text}`;
      else if (a.type === 'remember') chip.textContent = `✓ memory: ${a.text}`;
      else if (a.type === 'open_panel') chip.textContent = `→ ${a.panel}`;
      else chip.textContent = a.type;
      chips.appendChild(chip);
    }
  }
  const box = document.getElementById('messages');
  box.scrollTop = box.scrollHeight;
}

export function showWelcome() {
  const box = document.getElementById('messages');
  box.innerHTML = '';
  const hist = getHistory();
  if (!hist.length) {
    appendMessage('system', t('chat.welcome'));
    if (!hasApiKey()) appendMessage('system', t('chat.needKey'));
    return;
  }
  for (const m of hist) {
    if (m.role === 'user' || m.role === 'assistant') {
      const el = appendMessage(m.role, m.content);
      if (m.latencyMs && getSettings().showLatency) {
        const meta = el.querySelector('.msg-meta');
        if (meta) {
          meta.hidden = false;
          meta.textContent = `${m.latencyMs} ms`;
        }
      }
    }
  }
}

function pushPair(userText, assistantText) {
  const hist = getHistory();
  hist.push({ id: uid(), role: 'user', content: userText, at: new Date().toISOString() });
  hist.push({ id: uid(), role: 'assistant', content: assistantText, at: new Date().toISOString() });
  saveHistory(hist);
}

function localCommand(text, hooks) {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  if (lower === '/clear') {
    clearHistory();
    document.getElementById('messages').innerHTML = '';
    appendMessage('system', getLang() === 'ru' ? 'История чата очищена.' : 'Chat history cleared.');
    return true;
  }

  if (lower === '/help' || lower === '/команды') {
    const md = getLang() === 'ru'
      ? '**Команды:** `/task …` · `/remember …` · `/schedule` · `/tomorrow` · `/clear` · `/help`'
      : '**Commands:** `/task …` · `/remember …` · `/schedule` · `/tomorrow` · `/clear` · `/help`';
    appendMessage('assistant', md);
    return true;
  }

  const task = raw.match(/^\/(?:task|todo|задача)\s+(.+)/i);
  if (task) {
    const item = addTask(task[1], 'command');
    hooks.onTasksChanged?.();
    const reply = getLang() === 'ru' ? `Добавила задачу: **${item.text}**` : `Added task: **${item.text}**`;
    appendMessage('user', raw);
    appendMessage('assistant', reply);
    pushPair(raw, reply);
    return true;
  }

  const rem = raw.match(/^\/(?:remember|запомни)\s+(.+)/i);
  if (rem) {
    const item = addMemory(rem[1]);
    hooks.onMemoryChanged?.();
    const reply = getLang() === 'ru' ? `Запомнила: **${item.text}**` : `Remembered: **${item.text}**`;
    appendMessage('user', raw);
    appendMessage('assistant', reply);
    pushPair(raw, reply);
    return true;
  }

  const schedCmd = lower === '/schedule' || lower === '/сегодня' || lower === '/today'
    || lower === '/tomorrow' || lower === '/завтра';
  if (schedCmd) {
    if (lower === '/tomorrow' || lower === '/завтра') {
      setToday();
      shiftDay(1);
    } else {
      setToday();
    }
    const day = getViewDate();
    const lessons = lessonsFor(day);
    let md = `**${formatDayTitle(day)}**\n\n`;
    if (!lessons.length) md += getLang() === 'ru' ? 'Пар нет.' : 'No classes.';
    else md += lessons.map((l) => `- **${l.range?.label || l.time}** — ${l.subject} (${[l.kind, l.room].filter(Boolean).join(', ')})`).join('\n');
    appendMessage('user', raw);
    appendMessage('assistant', md);
    hooks.onOpenPanel?.('schedule');
    pushPair(raw, md);
    return true;
  }

  return false;
}

async function runCompletion(userContent, hooks, { regenerate = false } = {}) {
  if (!hasApiKey()) {
    appendMessage('system', t('chat.needKey'));
    hooks.onOpenPanel?.('settings');
    return;
  }

  stopGeneration();

  const s = getSettings();
  const ctxN = Math.max(6, Math.min(60, Number(s.contextMessages) || 24));
  const prior = getHistory()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-ctxN)
    .map((m) => ({ role: m.role, content: m.content }));

  // On regenerate, history already has the user message; avoid duplicating in prior if last is assistant
  const messages = [
    { role: 'system', content: buildSystemPrompt(userContent) },
    ...prior,
  ];

  const el = appendMessage('assistant', '…', { streaming: true });
  streamingEl = el;
  hooks.onStatus?.('busy');
  hooks.onStreamingChange?.(true);

  const t0 = performance.now();
  let firstTokenAt = null;
  abortCtrl = new AbortController();

  // rAF-batched UI updates for snappy feel without thrashing markdown
  let pending = '';
  let raf = 0;
  const flush = () => {
    raf = 0;
    const { clean } = extractTool(pending);
    updateMessageEl(el, clean || '…', { streaming: true });
  };
  const onDelta = (full) => {
    if (firstTokenAt == null) firstTokenAt = performance.now();
    pending = full;
    if (!raf) raf = requestAnimationFrame(flush);
  };

  try {
    const reply = await streamChatCompletion({
      baseUrl: s.baseUrl.replace(/\/$/, ''),
      apiKey: s.apiKey.trim(),
      model: s.model,
      messages,
      maxTokens: Number(s.maxTokens) || 1024,
      signal: abortCtrl.signal,
      onDelta,
    });

    if (raf) cancelAnimationFrame(raf);
    const { clean, actions } = extractTool(reply);
    let applied = applyActions(actions, hooks);
    // One silent retry parse if model forgot fence but mentioned saving
    if (!applied.length && /запомн|добав(ила|лю) задач|saved to memory|added (a )?task/i.test(clean)) {
      const retry = extractTool(reply + '\n');
      applied = applyActions(retry.actions, hooks);
    }

    const t1 = performance.now();
    const totalMs = Math.round(t1 - t0);
    const ttft = firstTokenAt != null ? Math.round(firstTokenAt - t0) : null;
    const meta = s.showLatency
      ? (ttft != null ? `${totalMs} ms · TTFT ${ttft} ms` : `${totalMs} ms`)
      : '';

    updateMessageEl(el, clean || reply || (getLang() === 'ru' ? '_(пусто)_' : '_(empty)_'), {
      streaming: false,
      actions: applied,
      meta,
    });

    const hist2 = getHistory();
    hist2.push({
      id: uid(),
      role: 'assistant',
      content: clean || reply,
      at: new Date().toISOString(),
      actions: applied,
      latencyMs: totalMs,
      ttftMs: ttft,
      regenerated: regenerate || undefined,
    });
    saveHistory(hist2);

    if (s.tts) speak(clean || reply, { lang: getLang() === 'ru' ? 'ru-RU' : 'en-US' });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const { clean } = extractTool(pending);
      updateMessageEl(el, (clean || pending || (getLang() === 'ru' ? '_(остановлено)_' : '_(stopped)_')), {
        streaming: false,
        meta: getLang() === 'ru' ? 'остановлено' : 'stopped',
      });
      if (pending) {
        const hist2 = getHistory();
        hist2.push({ id: uid(), role: 'assistant', content: clean || pending, at: new Date().toISOString(), stopped: true });
        saveHistory(hist2);
      }
    } else {
      updateMessageEl(el, err.message || String(err), { streaming: false });
    }
  } finally {
    abortCtrl = null;
    streamingEl = null;
    hooks.onStatus?.('ready');
    hooks.onStreamingChange?.(false);
  }
}

export async function sendMessage(text, hooks = {}) {
  const content = String(text || '').trim();
  if (!content) return;
  if (isStreaming()) return;

  if (localCommand(content, hooks)) return;

  lastUserText = content;
  appendMessage('user', content);
  const hist = getHistory();
  hist.push({ id: uid(), role: 'user', content, at: new Date().toISOString() });
  saveHistory(hist);

  await runCompletion(content, hooks);
}

export async function regenerateLast(hooks = {}) {
  if (isStreaming()) return;
  const hist = getHistory();
  // Remove trailing assistant (and find last user)
  while (hist.length && hist[hist.length - 1].role === 'assistant') hist.pop();
  const lastUser = [...hist].reverse().find((m) => m.role === 'user');
  if (!lastUser) return;
  saveHistory(hist);
  lastUserText = lastUser.content;

  // Re-render chat without the removed assistant
  showWelcome();
  await runCompletion(lastUser.content, hooks, { regenerate: true });
}

async function streamChatCompletion({ baseUrl, apiKey, model, messages, maxTokens, signal, onDelta }) {
  const url = `${baseUrl}/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'Shira Personal AI';
  }

  const body = {
    model,
    messages,
    temperature: 0.6,
    stream: true,
    max_tokens: maxTokens || 1024,
  };
  // Stop sequences help cut runaway tool fences / chatter on some models
  body.stop = ['\nUser:', '\nShiren:'];

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(formatApiError(res.status, detail));
  }

  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json') && !ctype.includes('text/event-stream')) {
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    onDelta?.(text);
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Split on newlines ASAP; keep incomplete tail
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue; // SSE comments / keepalives
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content
          ?? json.choices?.[0]?.message?.content
          ?? '';
        if (delta) {
          full += delta;
          onDelta?.(full);
        }
      } catch {
        // incomplete JSON line — put back? usually whole event per line
      }
    }
  }
  return full;
}

/** Optional lightweight warmup: OPTIONS/HEAD-less tiny request skipped; just DNS/preconnect hint. */
export function warmupConnection() {
  const s = getSettings();
  if (!hasApiKey() || !s.baseUrl) return;
  try {
    const u = new URL(s.baseUrl);
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = u.origin;
    link.crossOrigin = 'anonymous';
    if (![...document.querySelectorAll('link[rel=preconnect]')].some((l) => l.href.startsWith(u.origin))) {
      document.head.appendChild(link);
    }
  } catch { /* ignore */ }
}
