import { setLang, t, getLang, syncDocumentMeta } from './i18n.js';
import {
  getSettings, saveSettings, clearApiKey, hasApiKey,
  applyProviderDefaults, applyPreset, wipeAllLocalData,
  defaultAssistantName, clampContextMessages, clampMaxTokens,
} from './settings.js';
import {
  showWelcome, sendMessage, stopGeneration,
  regenerateLast, isStreaming, warmupConnection,
  setPendingFiles, getPendingFiles, getHistory,
} from './chat.js';
import {
  listSessions, createSession, switchSession, deleteSession, getActiveSessionId,
} from './sessions.js';
import { getTasks, addTask, toggleTask, removeTask, openCount } from './tasks.js';
import { getMemories, addMemory, removeMemory, getProfile } from './memory.js';
import { loadSchedule, renderSchedulePanel, shiftDay, setToday, tryLiveRefresh } from './schedule.js';
import { startListening, stopListening, isListening, speechSupported, speak, ttsSupported } from './voice.js';
import { exportAll, importAll } from './storage.js';
import { isSupportedFile, readAttachments } from './files.js';

const $ = (id) => document.getElementById(id);

function toast(message, { error = false, ms = 3200 } = {}) {
  const host = $('toast-host');
  if (!host) {
    console.warn(message);
    return;
  }
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' error' : '');
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, ms);
}

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

function updateRegenVisibility() {
  const btn = $('btn-regen');
  if (!btn) return;
  const chatActive = document.querySelector('.panel.active')?.dataset.panel === 'chat';
  const hasAssistant = (getHistory() || []).some((m) => m.role === 'assistant');
  btn.hidden = !chatActive || !hasAssistant || isStreaming();
  btn.setAttribute('aria-label', t('chat.regenAria'));
  btn.title = t('chat.regenAria');
}

function setStreamingUi(on) {
  // Single stop control: send button toggles to Stop while streaming.
  $('btn-send').disabled = false;
  $('btn-send').textContent = on ? t('chat.stop') : t('chat.send');
  $('btn-send').classList.toggle('stop-mode', on);
  $('composer').classList.toggle('busy', on);
  updateRegenVisibility();
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
  updateRegenVisibility();
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

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'session-btn tap';
    openBtn.dataset.id = s.id;
    const title = document.createElement('span');
    title.className = 'session-title';
    title.textContent = s.title || 'Chat';
    openBtn.appendChild(title);
    openBtn.addEventListener('click', () => {
      stopGeneration();
      switchSession(s.id);
      showWelcome();
      renderSessions();
      openPanel('chat');
      setStreamingUi(false);
      updateRegenVisibility();
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'session-del tap';
    delBtn.dataset.del = s.id;
    delBtn.setAttribute('aria-label', t('aria.delete'));
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(s.id);
      showWelcome();
      renderSessions();
      updateRegenVisibility();
    });

    li.appendChild(openBtn);
    li.appendChild(delBtn);
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

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!task.done;
    cb.setAttribute('aria-label', t('aria.done'));
    cb.addEventListener('change', () => {
      toggleTask(task.id);
      renderTasks();
    });

    const text = document.createElement('div');
    text.className = 'task-text';
    text.textContent = task.text;

    const del = document.createElement('button');
    del.className = 'ghost-btn tap';
    del.type = 'button';
    del.setAttribute('aria-label', t('aria.delete'));
    del.textContent = '×';
    del.addEventListener('click', () => {
      removeTask(task.id);
      renderTasks();
    });

    li.appendChild(cb);
    li.appendChild(text);
    li.appendChild(del);
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
    const text = document.createElement('div');
    text.className = 'memory-text';
    text.textContent = p.text;
    li.appendChild(text);
    profileEl.appendChild(li);
  }
  const memories = getMemories();
  memEl.innerHTML = '';
  empty.hidden = memories.length > 0;
  for (const m of memories) {
    const li = document.createElement('li');
    li.className = 'memory-item';
    const text = document.createElement('div');
    text.className = 'memory-text';
    text.textContent = m.text;
    const del = document.createElement('button');
    del.className = 'ghost-btn tap';
    del.type = 'button';
    del.setAttribute('aria-label', t('aria.delete'));
    del.textContent = '×';
    del.addEventListener('click', () => {
      removeMemory(m.id);
      renderMemory();
    });
    li.appendChild(text);
    li.appendChild(del);
    memEl.appendChild(li);
  }
}

function fillSettingsForm() {
  const s = getSettings();
  $('set-name').value = s.name || defaultAssistantName(getLang());
  $('set-lang').value = s.lang || 'ru';
  $('set-group').value = s.scheduleGroup || '';
  $('set-preset').value = s.preset || 'smart';
  $('set-provider').value = s.provider || 'groq';
  $('set-base').value = s.baseUrl || '';
  $('set-model').value = s.model || '';
  $('set-key').value = s.apiKey || '';
  $('set-key').type = 'password';
  $('set-key').autocomplete = 'off';
  $('set-tts').checked = !!s.tts;
  $('set-latency').checked = s.showLatency !== false;
  $('set-ctx').value = clampContextMessages(s.contextMessages || 24);
  $('set-maxtok').value = clampMaxTokens(s.maxTokens || 1024);
  $('btn-tts').setAttribute('aria-pressed', s.tts ? 'true' : 'false');
  $('nokey-callout').hidden = hasApiKey();
  setStatus(hasApiKey() ? 'ready' : 'nokey');
  const glabel = $('schedule-group-label');
  if (glabel) glabel.textContent = s.scheduleGroup || '—';
}

function applyBrand() {
  const s = getSettings();
  $('brand-name').textContent = s.name || defaultAssistantName(getLang());
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
  bar.innerHTML = '';
  files.forEach((f, i) => {
    const chip = document.createElement('span');
    chip.className = 'attach-chip';
    chip.appendChild(document.createTextNode(f.name + ' '));
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.dataset.rm = String(i);
    rm.setAttribute('aria-label', t('aria.remove'));
    rm.textContent = '×';
    rm.addEventListener('click', () => {
      const idx = Number(rm.dataset.rm);
      const next = getPendingFiles().filter((_, j) => j !== idx);
      setPendingFiles(next);
      renderAttachBar();
    });
    chip.appendChild(rm);
    bar.appendChild(chip);
  });
}

function dismissOnboard(markDone = true) {
  $('onboard').hidden = true;
  if (markDone) saveSettings({ onboardingDone: true });
}

function trapOnboardFocus() {
  const root = $('onboard');
  const card = root?.querySelector('.onboard-card');
  if (!root || !card || root.hidden) return;
  const focusables = () => [...card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && el.offsetParent !== null);
  const list = focusables();
  (list[0] || card).focus();
  const onKey = (e) => {
    if (root.hidden) {
      document.removeEventListener('keydown', onKey, true);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissOnboard(true);
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', onKey, true);
}

function maybeShowOnboard() {
  const s = getSettings();
  if (!s.onboardingDone) {
    $('onboard').hidden = false;
    trapOnboardFocus();
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
  onStreamEnd: () => {
    setStreamingUi(false);
    setStatus(hasApiKey() ? 'ready' : 'nokey');
    updateRegenVisibility();
  },
  onAssistantDone: (text) => {
    updateRegenVisibility();
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
  updateRegenVisibility();
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
    updateRegenVisibility();
  });

  $('btn-new-chat').addEventListener('click', () => {
    stopGeneration();
    createSession();
    openPanel('chat');
    showWelcome();
    renderSessions();
    setStreamingUi(false);
    updateRegenVisibility();
  });

  $('onboard-demo')?.addEventListener('click', () => {
    dismissOnboard(true);
    openPanel('chat');
    $('input').value = t('onboard.demoPrompt');
    $('input').focus();
  });
  $('onboard-settings')?.addEventListener('click', () => {
    dismissOnboard(true);
    openPanel('settings');
  });
  $('onboard-dismiss')?.addEventListener('click', () => dismissOnboard(true));

  $('btn-regen').addEventListener('click', async () => {
    if (isStreaming()) return;
    openPanel('chat');
    await regenerateLast(chatHooks());
    updateRegenVisibility();
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
    await sendMessage(text, chatHooks());
    renderSessions();
    setStatus(hasApiKey() ? 'ready' : 'nokey');
    updateRegenVisibility();
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
  $('file-input').addEventListener('change', async () => {
    const picked = [...($('file-input').files || [])].filter(isSupportedFile).slice(0, 4);
    // Clear input immediately; keep File refs only long enough to snapshot bytes.
    $('file-input').value = '';
    if (!picked.length) return;
    try {
      const atts = await readAttachments(picked);
      setPendingFiles([...(getPendingFiles() || []), ...atts].slice(0, 4));
      renderAttachBar();
    } catch (e) {
      toast(`${t('err.files')}: ${e.message || e}`, { error: true });
    }
  });

  $('btn-mic').addEventListener('click', () => {
    if (!speechSupported()) {
      toast(t('err.voice'), { error: true });
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
        toast(t('err.voice'), { error: true });
      },
    });
    if (ok) $('btn-mic').classList.add('listening');
  });

  $('btn-tts').addEventListener('click', () => {
    if (!ttsSupported()) {
      toast(t('err.voice'), { error: true });
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
    a.download = `shirenium-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const hasSettings = data?.data && Object.prototype.hasOwnProperty.call(data.data, 'settings');
      let importSettings = false;
      if (hasSettings) {
        importSettings = confirm(t('toast.importSettingsWarn'));
      }
      importAll(data, { importSettings });
      toast(t('toast.importOk'));
      setTimeout(() => location.reload(), 400);
    } catch (err) {
      toast(String(err.message || err), { error: true });
    }
  });

  $('btn-sched-prev').addEventListener('click', () => { shiftDay(-1); renderSchedulePanel(); });
  $('btn-sched-next').addEventListener('click', () => { shiftDay(1); renderSchedulePanel(); });
  $('btn-sched-today').addEventListener('click', () => { setToday(); renderSchedulePanel(); });
  $('btn-sched-refresh').addEventListener('click', async () => {
    const r = await tryLiveRefresh();
    if (!r.ok) {
      toast(t('schedule.cors'), { error: true });
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
      name: $('set-name').value.trim() || defaultAssistantName($('set-lang').value),
      lang: $('set-lang').value,
      scheduleGroup: ($('set-group').value.trim() || ''),
      preset: $('set-preset').value,
      provider: $('set-provider').value,
      baseUrl: $('set-base').value.trim(),
      model: $('set-model').value.trim(),
      apiKey: $('set-key').value.trim(),
      tts: $('set-tts').checked,
      showLatency: $('set-latency').checked,
      contextMessages: clampContextMessages($('set-ctx')?.value || 24),
      maxTokens: clampMaxTokens($('set-maxtok')?.value || 1024),
    });
    setLang(next.lang);
    applyBrand();
    fillSettingsForm();
    warmupConnection();
    const glabel = $('schedule-group-label');
    if (glabel) glabel.textContent = next.scheduleGroup || '—';
    toast(t('settings.saved'));
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
