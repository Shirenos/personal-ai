import { load, save } from './storage.js';
import { getSettings, hasApiKey } from './settings.js';
import { memoryBlockForPrompt, addMemory } from './memory.js';
import { tasksBlockForPrompt, addTask } from './tasks.js';
import { scheduleBlockForPrompt, lessonsFor, getViewDate, setToday, formatDayTitle } from './schedule.js';
import { renderMarkdown } from './markdown.js';
import { t, getLang } from './i18n.js';
import { speak } from './voice.js';

function uid() {
  return 'c_' + Math.random().toString(36).slice(2, 10);
}

export function getHistory() {
  return load('chatHistory', []);
}

export function saveHistory(list) {
  save('chatHistory', list.slice(-200));
}

export function clearHistory() {
  save('chatHistory', []);
}

function buildSystemPrompt() {
  const s = getSettings();
  const lang = getLang();
  const name = s.name || 'Шира';
  return [
    `You are ${name} — a serious personal AI assistant for Shiren (GitHub: Shirenos).`,
    'You are not a toy chatbot. Be precise, warm when appropriate, and action-oriented.',
    '',
    '## User',
    '- Student at Tula State University (ТулГУ), Applied Mathematics & Informatics, specialization Artificial Intelligence in Technical Systems, group 221461.',
    '- Prefers Russian by default; switch to English if he writes in English or asks.',
    '- Interests: ML, mathematics, useful tools, personal AI.',
    '- Timezone: Europe/Moscow.',
    '',
    '## Capabilities in this web app',
    '- Persistent memory (profile + named notes) injected below.',
    '- Tasks list the user can manage in the Tasks panel; you can create tasks.',
    '- University schedule for group 221461 is injected for the next few days.',
    '- Voice input/output exists in the UI; you do not need to simulate it.',
    '',
    '## How to act',
    '- Prefer concrete next steps over vague advice.',
    '- When the user asks to remember something, confirm and use a TOOL block.',
    '- When they ask to add a todo/task, use a TOOL block.',
    '- When they ask about today/tomorrow classes, answer from the schedule block; do not invent lessons.',
    '- Keep answers structured: short lead sentence, then bullets or steps when useful.',
    '- Markdown is welcome (headings, lists, code).',
    '',
    '## Tool protocol (mandatory when taking an action)',
    'If you need the app to mutate state, append ONE fenced block at the end of your reply:',
    '```tool',
    '{"actions":[{"type":"add_task","text":"..."},{"type":"remember","text":"..."},{"type":"open_panel","panel":"schedule|tasks|memory|settings"}]}',
    '```',
    'Valid types: add_task, remember, open_panel, complete_task (with "id").',
    'Do not invent tool types. Do not put the JSON elsewhere. The UI executes these and shows confirmation chips.',
    '',
    lang === 'ru'
      ? 'Respond in Russian unless the user writes in another language.'
      : 'Respond in English unless the user writes in Russian.',
    '',
    memoryBlockForPrompt(),
    '',
    tasksBlockForPrompt(),
    '',
    scheduleBlockForPrompt(4),
  ].join('\n');
}

function extractTool(content) {
  const re = /```tool\s*([\s\S]*?)```/i;
  const m = content.match(re);
  if (!m) return { clean: content, actions: [] };
  let actions = [];
  try {
    const parsed = JSON.parse(m[1].trim());
    actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  } catch {
    actions = [];
  }
  return { clean: content.replace(re, '').trimEnd(), actions };
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
    } else if (a.type === 'complete_task' && a.id) {
      results.push({ type: 'complete_task', ok: true, id: a.id });
      hooks.onCompleteTask?.(a.id);
    }
  }
  return results;
}

export function appendMessage(role, content, { streaming = false } = {}) {
  const box = document.getElementById('messages');
  const el = document.createElement('article');
  el.className = `msg ${role}` + (streaming ? ' streaming' : '');
  el.dataset.role = role;
  const name = role === 'user' ? 'Shiren' : role === 'assistant' ? (getSettings().name || 'Шира') : 'system';
  el.innerHTML = `<div class="role">${name}</div><div class="body"></div>`;
  const body = el.querySelector('.body');
  if (role === 'assistant' || role === 'system') body.innerHTML = renderMarkdown(content);
  else body.textContent = content;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

export function updateMessageEl(el, content, { streaming = false, actions = [] } = {}) {
  const body = el.querySelector('.body');
  body.innerHTML = renderMarkdown(content);
  el.classList.toggle('streaming', streaming);
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
      appendMessage(m.role, m.content);
    }
  }
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

  const task = raw.match(/^\/task\s+(.+)/i);
  if (task) {
    const item = addTask(task[1], 'command');
    hooks.onTasksChanged?.();
    appendMessage('assistant', getLang() === 'ru'
      ? `Добавила задачу: **${item.text}**`
      : `Added task: **${item.text}**`);
    const hist = getHistory();
    hist.push({ id: uid(), role: 'user', content: raw, at: new Date().toISOString() });
    hist.push({ id: uid(), role: 'assistant', content: getLang() === 'ru' ? `Добавила задачу: **${item.text}**` : `Added task: **${item.text}**`, at: new Date().toISOString() });
    saveHistory(hist);
    return true;
  }

  const rem = raw.match(/^\/remember\s+(.+)/i);
  if (rem) {
    const item = addMemory(rem[1]);
    hooks.onMemoryChanged?.();
    appendMessage('assistant', getLang() === 'ru'
      ? `Запомнила: **${item.text}**`
      : `Remembered: **${item.text}**`);
    const hist = getHistory();
    hist.push({ id: uid(), role: 'user', content: raw, at: new Date().toISOString() });
    hist.push({ id: uid(), role: 'assistant', content: getLang() === 'ru' ? `Запомнила: **${item.text}**` : `Remembered: **${item.text}**`, at: new Date().toISOString() });
    saveHistory(hist);
    return true;
  }

  if (lower === '/schedule' || lower === '/сегодня' || lower === '/today') {
    setToday();
    const day = getViewDate();
    const lessons = lessonsFor(day);
    let md = `**${formatDayTitle(day)}**\n\n`;
    if (!lessons.length) md += getLang() === 'ru' ? 'Пар нет.' : 'No classes.';
    else md += lessons.map((l) => `- **${l.range?.label || l.time}** — ${l.subject} (${[l.kind, l.room].filter(Boolean).join(', ')})`).join('\n');
    appendMessage('assistant', md);
    hooks.onOpenPanel?.('schedule');
    const hist = getHistory();
    hist.push({ id: uid(), role: 'user', content: raw, at: new Date().toISOString() });
    hist.push({ id: uid(), role: 'assistant', content: md, at: new Date().toISOString() });
    saveHistory(hist);
    return true;
  }

  return false;
}

export async function sendMessage(text, hooks = {}) {
  const content = String(text || '').trim();
  if (!content) return;

  if (localCommand(content, hooks)) return;

  appendMessage('user', content);
  const hist = getHistory();
  hist.push({ id: uid(), role: 'user', content, at: new Date().toISOString() });
  saveHistory(hist);

  if (!hasApiKey()) {
    appendMessage('system', t('chat.needKey'));
    hooks.onOpenPanel?.('settings');
    return;
  }

  const s = getSettings();
  const ctxN = Math.max(8, Math.min(80, Number(s.contextMessages) || 40));
  const prior = getHistory()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-ctxN)
    .map((m) => ({ role: m.role, content: m.content }));

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...prior,
  ];

  const el = appendMessage('assistant', '', { streaming: true });
  hooks.onStatus?.('busy');

  try {
    const reply = await streamChatCompletion({
      baseUrl: s.baseUrl.replace(/\/$/, ''),
      apiKey: s.apiKey.trim(),
      model: s.model,
      messages,
      onDelta: (full) => {
        const { clean } = extractTool(full);
        updateMessageEl(el, clean || '…', { streaming: true });
      },
    });

    const { clean, actions } = extractTool(reply);
    const applied = applyActions(actions, hooks);
    updateMessageEl(el, clean || reply, { streaming: false, actions: applied });

    const hist2 = getHistory();
    hist2.push({ id: uid(), role: 'assistant', content: clean || reply, at: new Date().toISOString(), actions: applied });
    saveHistory(hist2);

    if (s.tts) speak(clean || reply, { lang: getLang() === 'ru' ? 'ru-RU' : 'en-US' });
  } catch (err) {
    const msg = `${t('chat.error')}: ${err.message || err}`;
    updateMessageEl(el, msg, { streaming: false });
  } finally {
    hooks.onStatus?.('ready');
  }
}

async function streamChatCompletion({ baseUrl, apiKey, model, messages, onDelta }) {
  const url = `${baseUrl}/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  // OpenRouter courtesy headers
  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'Shira Personal AI';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      stream: true,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`${res.status} ${res.statusText}${detail ? ' — ' + detail.slice(0, 280) : ''}`);
  }

  // Some providers may ignore stream=true and return JSON
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
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
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
        if (delta) {
          full += delta;
          onDelta?.(full);
        }
      } catch {
        /* partial json */
      }
    }
  }
  return full;
}
