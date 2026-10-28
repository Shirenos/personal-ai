import { setLang, t, getLang, syncDocumentMeta } from './i18n.js';
import {
  getSettings, saveSettings, clearApiKey, hasApiKey,
  applyProviderDefaults, applyPreset, wipeAllLocalData,
} from './settings.js';
import {
  showWelcome, sendMessage, stopGeneration,
  regenerateLast, isStreaming, warmupConnection,
  setPendingFiles, getPendingFiles,
} from './chat.js';
import {
  listSessions, createSession, switchSession, deleteSession, getActiveSessionId,
} from './sessions.js';
import { getTasks, addTask, toggleTask, removeTask, openCount } from './tasks.js';
import { getMemories, addMemory, removeMemory, getProfile } from './memory.js';
import { loadSchedule, renderSchedulePanel, shiftDay, setToday, tryLiveRefresh } from './schedule.js';
import { startListening, stopListening, isListening, speechSupported, speak, ttsSupported } from './voice.js';
import { exportAll, importAll } from './storage.js';
import { isSupportedFile } from './files.js';

const $ = (id) => document.getElementById(id);

function setStatus(kind) {
  const dot = $('api-dot');
  const text = $('api-status-text');
  if (!hasApiKey()) {
    dot.className = 'dot';
    text.textContent = t('status.demo');
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

function setStreamingUi(on) {
  $('btn-stop').hidden = !on;
  $('btn-send').disabled = false;
  $('btn-send').textContent = on ? t('chat.stop') : t('chat.send');
  $('btn-send').classList.toggle('stop-mode', on);
  $('composer').classList.toggle('busy', on);
  $('btn-regen').disabled = on;
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
  if (name === 'chat') {
    const hero = $('hero-strip');
    if (hero && listSessions().some((s) => true)) {
      /* keep hero until user dismisses via CTA */
    }
  }
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

function renderSessions() {
  const ul = $('session-list');
  if (!ul) return;
  const active = getActiveSessionId();
  const sessions = listSessions().slice(0, 24);
  ul.innerHTML = '';
  for (const s of sessions) {
    const li = document.createElement('li');
    li.className = 'session-item' + (s.id === active ? ' active' : '');
    li.innerHTML = `
      <button type="button" class="session-btn tap" data-id="${s.id}">
        <span class="session-title"></span>
      </button>
      <button type="button" class="session-del tap" data-del="${s.id}" aria-label="Delete">×</button>
    `;
    li.querySelector('.session-title').textContent = s.title || 'Chat';
    li.querySelector('[data-id]').addEventListener('click', () => {
      stopGeneration();
      switchSession(s.id);
      showWelcome();
      renderSessions();
      openPanel('chat');
      setStreamingUi(false);
    });
    li.querySelector('[data-del]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(s.id);
      showWelcome();
      renderSessions();
    });
    ul.appendChild(li);
  }
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
      <button class="ghost-btn tap" type="button" data-del aria-label="Delete">×</button>
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
      <button class="ghost-btn tap" type="button" data-del aria-label="Delete">×</button>
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
  $('set-group').value = s.scheduleGroup || '221461';
  $('set-preset').value = s.preset || 'smart';
  $('set-provider').value = s.provider || 'groq';
  $('set-base').value = s.baseUrl || '';
  $('set-model').value = s.model || '';
  $('set-key').value = s.apiKey || '';
  $('set-tts').checked = !!s.tts;
  $('set-latency').checked = s.showLatency !== false;
  $('set-ctx').value = s.contextMessages || 24;
  $('set-maxtok').value = s.maxTokens || 1024;
  $('btn-tts').setAttribute('aria-pressed', s.tts ? 'true' : 'false');
  $('nokey-callout').hidden = hasApiKey();
  setStatus(hasApiKey() ? 'ready' : 'nokey');
}

function applyBrand() {
  const s = getSettings();
  $('brand-name').textContent = s.name || 'Шира';
  syncDocumentMeta();
}

function autosize() {
  const ta = $('input');
  ta.style.height = 'auto';
  ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
}

function renderAttachBar() {
  const bar = $('attach-bar');
  const files = getPendingFiles();
  if (!files.length) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  bar.hidden = false;
  bar.innerHTML = files.map((f, i) =>
    `<span class="attach-chip">${escapeHtml(f.name)} <button type="button" data-rm="${i}" aria-label="Remove">×</button></span>`
  ).join('');
  bar.querySelectorAll('[data-rm]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-rm'));
      const next = getPendingFiles().filter((_, i) => i !== idx);
      setPendingFiles(next);
      renderAttachBar();
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dismissOnboard(markDone = true) {
  $('onboard').hidden = true;
  if (markDone) saveSettings({ onboardingDone: true });
}

function maybeShowOnboard() {
  const s = getSettings();
  if (!s.onboardingDone) {
    $('onboard').hidden = false;
  }
}

const chatHooks = () => ({
  onTasksChanged: renderTasks,
  onMemoryChanged: renderMemory,
  onScheduleChanged: renderSchedulePanel,
  onSessionsChanged: renderSessions,
  onFilesCleared: () => { setPendingFiles([]); renderAttachBar(); },
  onNeedKey: () => openPanel('settings'),
  onStreamStart: () => { setStreamingUi(true); setStatus('busy'); },
  onStreamEnd: () => { setStreamingUi(false); setStatus(hasApiKey() ? 'ready' : 'nokey'); },
  onAssistantDone: (text) => {
    const s = getSettings();
    if (s.tts && ttsSupported()) {
      speak(text, { lang: getLang() === 'ru' ? 'ru-RU' : 'en-US' });
    }
  },
});

async function boot() {
  const s = getSettings();
  setLang(s.lang || 'ru');
  applyBrand();
  fillSettingsForm();
  showWelcome();
  renderTasks();
  renderMemory();
  renderSessions();
  setStatus(hasApiKey() ? 'ready' : 'nokey');
  setStreamingUi(false);
  warmupConnection();
  maybeShowOnboard();

  if (!speechSupported()) {
    $('btn-mic').classList.add('disabled');
    $('btn-mic').title = t('err.voice');
  }
  if (!ttsSupported()) {
    $('btn-tts').classList.add('disabled');
  }

  try {
    await loadSchedule();
    renderSchedulePanel();
  } catch (e) {
    console.warn(e);
  }

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
    showWelcome();
    setStatus(hasApiKey() ? 'ready' : 'nokey');
    if (!isStreaming()) setStreamingUi(false);
  });

  $('btn-new-chat').addEventListener('click', () => {
    stopGeneration();
    createSession();
    openPanel('chat');
    showWelcome();
    renderSessions();
    setStreamingUi(false);
  });

  $('btn-hero-chat')?.addEventListener('click', () => {
    $('hero-strip').hidden = true;
    openPanel('chat');
    $('input').focus();
  });
  $('btn-hero-demo')?.addEventListener('click', () => {
    $('hero-strip').hidden = true;
    openPanel('chat');
    $('input').value = '/help';
    $('input').focus();
  });

  $('onboard-demo')?.addEventListener('click', () => {
    dismissOnboard(true);
    openPanel('chat');
    $('input').value = 'что умеешь?';
    $('input').focus();
  });
  $('onboard-settings')?.addEventListener('click', () => {
    dismissOnboard(true);
    openPanel('settings');
  });
  $('onboard-dismiss')?.addEventListener('click', () => dismissOnboard(true));

  $('btn-stop').addEventListener('click', () => stopGeneration());
  $('btn-regen').addEventListener('click', async () => {
    if (isStreaming()) return;
    openPanel('chat');
    await regenerateLast(chatHooks());
  });

  const sendOrStop = async () => {
    if (isStreaming()) {
      stopGeneration();
      return;
    }
    const text = $('input').value;
    if (!text.trim() && !getPendingFiles().length) return;
    $('input').value = '';
    autosize();
    $('hero-strip').hidden = true;
    await sendMessage(text, chatHooks());
    renderSessions();
    setStatus(hasApiKey() ? 'ready' : 'nokey');
  };
  $('btn-send').addEventListener('click', sendOrStop);
  $('input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendOrStop();
    }
    if (e.key === 'Escape' && isStreaming()) stopGeneration();
  });
  $('input').addEventListener('input', autosize);

  $('btn-attach').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', () => {
    const picked = [...($('file-input').files || [])].filter(isSupportedFile).slice(0, 4);
    setPendingFiles([...(getPendingFiles() || []), ...picked].slice(0, 4));
    $('file-input').value = '';
    renderAttachBar();
  });

  $('btn-mic').addEventListener('click', () => {
    if (!speechSupported()) {
      alert(t('err.voice'));
      return;
    }
    if (isListening()) {
      stopListening();
      $('btn-mic').classList.remove('listening');
      return;
    }
    const ok = startListening({
      lang: getLang() === 'ru' ? 'ru-RU' : 'en-US',
      onPartial: (txt) => { $('input').value = txt; autosize(); },
      onFinal: (txt) => { $('input').value = txt; autosize(); },
      onEnd: () => $('btn-mic').classList.remove('listening'),
      onError: () => {
        $('btn-mic').classList.remove('listening');
        alert(t('err.voice'));
      },
    });
    if (ok) $('btn-mic').classList.add('listening');
  });

  $('btn-tts').addEventListener('click', () => {
    if (!ttsSupported()) {
      alert(t('err.voice'));
      return;
    }
    const cur = getSettings();
    const next = !cur.tts;
    saveSettings({ tts: next });
    $('btn-tts').setAttribute('aria-pressed', next ? 'true' : 'false');
    $('set-tts').checked = next;
  });

  $('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addTask($('task-input').value, 'ui');
    $('task-input').value = '';
    renderTasks();
  });

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

  $('set-preset').addEventListener('change', () => {
    const id = $('set-preset').value;
    if (id === 'custom') return;
    const defs = applyPreset(id);
    $('set-provider').value = defs.provider;
    $('set-base').value = defs.baseUrl;
    $('set-model').value = defs.model;
  });
  $('set-provider').addEventListener('change', () => {
    const defs = applyProviderDefaults($('set-provider').value);
    $('set-base').value = defs.baseUrl;
    $('set-model').value = defs.model;
    $('set-preset').value = 'custom';
  });
  $('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const next = saveSettings({
      name: $('set-name').value.trim() || 'Шира',
      lang: $('set-lang').value,
      scheduleGroup: ($('set-group').value.trim() || '221461'),
      preset: $('set-preset').value,
      provider: $('set-provider').value,
      baseUrl: $('set-base').value.trim(),
      model: $('set-model').value.trim(),
      apiKey: $('set-key').value.trim(),
      tts: $('set-tts').checked,
      showLatency: $('set-latency').checked,
      contextMessages: Number($('set-ctx')?.value || 24),
      maxTokens: Number($('set-maxtok')?.value || 1024),
    });
    setLang(next.lang);
    applyBrand();
    fillSettingsForm();
    warmupConnection();
    const glabel = $('schedule-group-label');
    if (glabel) glabel.textContent = next.scheduleGroup;
    alert(t('settings.saved'));
  });
  $('btn-clear-key').addEventListener('click', () => {
    clearApiKey();
    fillSettingsForm();
  });
  $('btn-wipe').addEventListener('click', () => {
    if (!confirm(t('settings.wipeConfirm'))) return;
    wipeAllLocalData();
    location.reload();
  });
}

boot();
