import { setLang, t, getLang } from './i18n.js';
import { getSettings, saveSettings, clearApiKey, hasApiKey, applyProviderDefaults, PROVIDERS } from './settings.js';
import { showWelcome, sendMessage, clearHistory } from './chat.js';
import { getTasks, addTask, toggleTask, removeTask, openCount } from './tasks.js';
import { getMemories, addMemory, removeMemory, getProfile } from './memory.js';
import { loadSchedule, renderSchedulePanel, shiftDay, setToday, tryLiveRefresh } from './schedule.js';
import { startListening, stopListening, isListening, speechSupported } from './voice.js';
import { exportAll, importAll } from './storage.js';

const $ = (id) => document.getElementById(id);

function setStatus(kind) {
  const dot = $('api-dot');
  const text = $('api-status-text');
  if (!hasApiKey()) {
    dot.className = 'dot';
    text.textContent = t('status.nokey');
    return;
  }
  if (kind === 'busy') {
    dot.className = 'dot warn';
    text.textContent = t('status.busy');
  } else {
    dot.className = 'dot ok';
    text.textContent = t('status.ready');
  }
}

function openPanel(name) {
  document.querySelectorAll('.panel').forEach((p) => {
    const on = p.dataset.panel === name;
    p.classList.toggle('active', on);
    p.hidden = !on;
  });
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === name);
  });
  $('panel-title').textContent = t('nav.' + name);
  closeSidebar();
  if (name === 'tasks') renderTasks();
  if (name === 'memory') renderMemory();
  if (name === 'schedule') renderSchedulePanel();
  if (name === 'settings') fillSettingsForm();
}

function openSidebar() {
  $('sidebar').classList.add('open');
  $('backdrop').hidden = false;
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('backdrop').hidden = true;
}

function renderTasks() {
  const list = $('task-list');
  const empty = $('tasks-empty');
  const tasks = getTasks();
  list.innerHTML = '';
  $('tasks-badge').hidden = openCount() === 0;
  $('tasks-badge').textContent = String(openCount());
  if (!tasks.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.innerHTML = `
      <input type="checkbox" ${task.done ? 'checked' : ''} aria-label="done" />
      <div class="task-text"></div>
      <button class="ghost-btn" type="button" data-del>✕</button>
    `;
    li.querySelector('.task-text').textContent = task.text;
    li.querySelector('input').addEventListener('change', () => {
      toggleTask(task.id);
      renderTasks();
    });
    li.querySelector('[data-del]').addEventListener('click', () => {
      removeTask(task.id);
      renderTasks();
    });
    list.appendChild(li);
  }
}

function renderMemory() {
  const profileEl = $('profile-list');
  const memEl = $('memory-list');
  const empty = $('memory-empty');
  profileEl.innerHTML = '';
  for (const p of getProfile()) {
    const li = document.createElement('li');
    li.className = 'memory-item';
    li.innerHTML = `<div class="memory-text"></div>`;
    li.querySelector('.memory-text').textContent = p.text;
    profileEl.appendChild(li);
  }
  const memories = getMemories();
  memEl.innerHTML = '';
  empty.hidden = memories.length > 0;
  for (const m of memories) {
    const li = document.createElement('li');
    li.className = 'memory-item';
    li.innerHTML = `
      <div class="memory-text"></div>
      <button class="ghost-btn" type="button" data-del>✕</button>
    `;
    li.querySelector('.memory-text').textContent = m.text;
    li.querySelector('[data-del]').addEventListener('click', () => {
      removeMemory(m.id);
      renderMemory();
    });
    memEl.appendChild(li);
  }
}

function fillSettingsForm() {
  const s = getSettings();
  $('set-name').value = s.name || 'Шира';
  $('set-lang').value = s.lang || 'ru';
  $('set-provider').value = s.provider || 'groq';
  $('set-base').value = s.baseUrl || '';
  $('set-model').value = s.model || '';
  $('set-key').value = s.apiKey || '';
  $('set-tts').checked = !!s.tts;
  const ctx = $('set-ctx');
  if (ctx) ctx.value = s.contextMessages || 40;
  $('btn-tts').setAttribute('aria-pressed', s.tts ? 'true' : 'false');
  $('nokey-callout').hidden = hasApiKey();
  setStatus(hasApiKey() ? 'ready' : 'nokey');
}

function applyBrand() {
  const s = getSettings();
  $('brand-name').textContent = s.name || 'Шира';
  document.title = `${s.name || 'Шира'} — Personal AI Assistant`;
}

function autosize() {
  const ta = $('input');
  ta.style.height = 'auto';
  ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
}

async function boot() {
  const s = getSettings();
  setLang(s.lang || 'ru');
  applyBrand();
  fillSettingsForm();
  showWelcome();
  renderTasks();
  renderMemory();
  setStatus(hasApiKey() ? 'ready' : 'nokey');

  try {
    await loadSchedule();
    renderSchedulePanel();
  } catch (e) {
    console.warn(e);
  }

  // Navigation
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => openPanel(btn.dataset.panel));
  });
  $('btn-menu').addEventListener('click', openSidebar);
  $('backdrop').addEventListener('click', closeSidebar);

  $('btn-lang').addEventListener('click', () => {
    const next = getLang() === 'ru' ? 'en' : 'ru';
    saveSettings({ lang: next });
    setLang(next);
    applyBrand();
    $('panel-title').textContent = t('nav.' + (document.querySelector('.panel.active')?.dataset.panel || 'chat'));
    renderSchedulePanel();
    setStatus(hasApiKey() ? 'ready' : 'nokey');
  });

  $('btn-new-chat').addEventListener('click', () => {
    clearHistory();
    openPanel('chat');
    showWelcome();
  });

  // Chat
  const send = async () => {
    const text = $('input').value;
    if (!text.trim()) return;
    $('input').value = '';
    autosize();
    $('btn-send').disabled = true;
    await sendMessage(text, {
      onTasksChanged: renderTasks,
      onMemoryChanged: renderMemory,
      onOpenPanel: openPanel,
      onCompleteTask: (id) => { toggleTask(id); renderTasks(); },
      onStatus: setStatus,
    });
    $('btn-send').disabled = false;
    setStatus(hasApiKey() ? 'ready' : 'nokey');
  };
  $('btn-send').addEventListener('click', send);
  $('input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  $('input').addEventListener('input', autosize);

  // Voice
  if (!speechSupported()) $('btn-mic').style.opacity = '.35';
  $('btn-mic').addEventListener('click', () => {
    if (isListening()) {
      stopListening();
      $('btn-mic').classList.remove('listening');
      return;
    }
    const ok = startListening({
      lang: getLang() === 'ru' ? 'ru-RU' : 'en-US',
      onPartial: (t) => { $('input').value = t; autosize(); },
      onFinal: (t) => { $('input').value = t; autosize(); },
      onEnd: () => $('btn-mic').classList.remove('listening'),
      onError: () => $('btn-mic').classList.remove('listening'),
    });
    if (ok) $('btn-mic').classList.add('listening');
  });

  $('btn-tts').addEventListener('click', () => {
    const s = getSettings();
    const next = !s.tts;
    saveSettings({ tts: next });
    $('btn-tts').setAttribute('aria-pressed', next ? 'true' : 'false');
    $('set-tts').checked = next;
  });

  // Tasks
  $('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addTask($('task-input').value, 'ui');
    $('task-input').value = '';
    renderTasks();
  });

  // Memory
  $('memory-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addMemory($('memory-input').value);
    $('memory-input').value = '';
    renderMemory();
  });
  $('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shira-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      importAll(data);
      location.reload();
    } catch (err) {
      alert(String(err.message || err));
    }
  });

  // Schedule
  $('btn-sched-prev').addEventListener('click', () => { shiftDay(-1); renderSchedulePanel(); });
  $('btn-sched-next').addEventListener('click', () => { shiftDay(1); renderSchedulePanel(); });
  $('btn-sched-today').addEventListener('click', () => { setToday(); renderSchedulePanel(); });
  $('btn-sched-refresh').addEventListener('click', async () => {
    const r = await tryLiveRefresh();
    if (!r.ok) {
      alert(t('schedule.cors'));
      await loadSchedule();
    }
    renderSchedulePanel();
  });

  // Settings
  $('set-provider').addEventListener('change', () => {
    const defs = applyProviderDefaults($('set-provider').value);
    $('set-base').value = defs.baseUrl;
    $('set-model').value = defs.model;
  });
  $('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const next = saveSettings({
      name: $('set-name').value.trim() || 'Шира',
      lang: $('set-lang').value,
      provider: $('set-provider').value,
      baseUrl: $('set-base').value.trim(),
      model: $('set-model').value.trim(),
      apiKey: $('set-key').value.trim(),
      tts: $('set-tts').checked,
      contextMessages: Number($('set-ctx')?.value || 40),
    });
    setLang(next.lang);
    applyBrand();
    fillSettingsForm();
    alert(t('settings.saved'));
  });
  $('btn-clear-key').addEventListener('click', () => {
    clearApiKey();
    fillSettingsForm();
  });
}

boot();
