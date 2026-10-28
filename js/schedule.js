import { t, getLang } from './i18n.js';
import { getSettings } from './settings.js';

let cache = null;
let viewDate = null;

function moscowNow() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseTimeRange(s) {
  const m = String(s).match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return {
    start: Number(m[1]) * 60 + Number(m[2]),
    end: Number(m[3]) * 60 + Number(m[4]),
    label: `${m[1].padStart(2, '0')}:${m[2]} – ${m[3].padStart(2, '0')}:${m[4]}`,
  };
}

export async function loadSchedule() {
  const res = await fetch(`data/schedule.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('schedule fetch failed');
  cache = await res.json();
  if (!viewDate) viewDate = moscowNow().date;
  return cache;
}

export function getCache() {
  return cache;
}

export function getViewDate() {
  return viewDate || moscowNow().date;
}

export function shiftDay(delta) {
  const d = new Date(getViewDate() + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  viewDate = d.toISOString().slice(0, 10);
  return viewDate;
}

export function setToday() {
  viewDate = moscowNow().date;
  return viewDate;
}

export function lessonsFor(dateStr) {
  if (!cache) return [];
  return (cache.lessons || [])
    .filter((l) => l.date === dateStr)
    .map((l) => ({ ...l, range: parseTimeRange(l.time) }))
    .sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
}

export function formatDayTitle(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const locale = getLang() === 'ru' ? 'ru-RU' : 'en-US';
  const label = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const today = moscowNow().date;
  const suffix = dateStr === today ? (getLang() === 'ru' ? ' · сегодня' : ' · today') : '';
  return label.charAt(0).toUpperCase() + label.slice(1) + suffix;
}

export function renderSchedulePanel() {
  if (!cache) return;
  const dateStr = getViewDate();
  const list = lessonsFor(dateStr);
  const now = moscowNow();
  document.getElementById('schedule-day-title').textContent = formatDayTitle(dateStr);
  const grp = cache.group || getSettings().scheduleGroup || '221461';
  document.getElementById('schedule-meta').textContent =
    `${grp} · ${t('schedule.updated')}: ${formatUpdated(cache.updated_at)} · ${cache.lessons?.length || 0}`;
  const glabel = document.getElementById('schedule-group-label');
  if (glabel) glabel.textContent = grp;

  const el = document.getElementById('schedule-list');
  const empty = document.getElementById('schedule-empty');
  el.innerHTML = '';
  if (!list.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  for (const lesson of list) {
    const card = document.createElement('article');
    card.className = 'lesson-card';
    const isNow = dateStr === now.date && lesson.range &&
      now.minutes >= lesson.range.start && now.minutes <= lesson.range.end;
    if (isNow) card.classList.add('lesson-now');
    card.innerHTML = `
      <div class="lesson-time">${lesson.range?.label || lesson.time}${isNow ? (getLang() === 'ru' ? ' · сейчас' : ' · now') : ''}</div>
      <div class="lesson-subject">${escape(lesson.subject)}</div>
      <div class="lesson-meta">${escape([lesson.kind, lesson.room, lesson.teacher].filter(Boolean).join(' · '))}</div>
    `;
    el.appendChild(card);
  }
}

function formatUpdated(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(getLang() === 'ru' ? 'ru-RU' : 'en-US', {
      timeZone: 'Europe/Moscow',
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }) + ' (Europe/Moscow)';
  } catch {
    return iso;
  }
}

function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Try live TulSU JSON; usually fails due to CORS — then keep cache. */
export async function tryLiveRefresh() {
  const group = (getSettings().scheduleGroup || '221461').trim() || '221461';
  const urls = [
    `https://tulsu.ru/schedule/queries/GetSchedule.php?search_field=GROUP_P&search_value=${encodeURIComponent(group)}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, mode: 'cors' });
      if (!res.ok) continue;
      const payload = await res.json();
      if (!Array.isArray(payload)) continue;
      const lessons = payload.map((x) => ({
        date: parseRuDate(x.DATE_Z),
        time: String(x.TIME_Z || ''),
        subject: x.DISCIP || '',
        kind: x.KOW || '',
        type: x.CLASS || '',
        room: x.AUD || '',
        teacher: x.PREP || '',
      })).filter((l) => l.date && l.subject);
      cache = {
        group,
        source: `https://tulsu.ru/schedule/?group=${encodeURIComponent(group)}`,
        updated_at: new Date().toISOString(),
        lessons,
        live: true,
      };
      return { ok: true, cache };
    } catch {
      /* CORS or network */
    }
  }
  return { ok: false, reason: 'cors', cache };
}

function parseRuDate(s) {
  const m = String(s || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function scheduleBlockForPrompt(days = 3) {
  if (!cache) return '## Schedule\n- (not loaded)';
  const start = moscowNow().date;
  const lines = [`## University schedule (group ${cache.group || getSettings().scheduleGroup || '221461'}, Europe/Moscow)`];
  for (let i = 0; i < days; i++) {
    const d = new Date(start + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const lessons = lessonsFor(iso);
    lines.push(`### ${iso}${i === 0 ? ' (today)' : ''}`);
    if (!lessons.length) lines.push('- no classes');
    else for (const l of lessons) {
      lines.push(`- ${l.range?.label || l.time}: ${l.subject} · ${l.kind || ''} · ${l.room || ''} · ${l.teacher || ''}`);
    }
  }
  lines.push(`Cache updated: ${cache.updated_at || 'unknown'}`);
  return lines.join('\n');
}
