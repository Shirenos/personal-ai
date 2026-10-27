#!/usr/bin/env node
/**
 * Fetch TulSU group 221461 timetable into data/schedule.json
 * Run locally or via GitHub Actions. No API key required.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GROUP = '221461';
const BASE = 'https://tulsu.ru/schedule/queries';
const UA = 'personal-ai/1.0 (+https://github.com/Shirenos/personal-ai; timetable cache builder)';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'data', 'schedule.json');

async function getJson(endpoint, params) {
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${endpoint} → ${res.status}`);
  return res.json();
}

function parseRuDate(s) {
  const m = String(s || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

const dates = await getJson('GetDates.php', { search_value: GROUP });
const payload = await getJson('GetSchedule.php', {
  search_field: 'GROUP_P',
  search_value: GROUP,
});
if (!Array.isArray(payload)) throw new Error('Unexpected schedule payload');

const lessons = [];
for (const x of payload) {
  const date = parseRuDate(x.DATE_Z);
  const subject = String(x.DISCIP || '').trim();
  if (!date || !subject) continue;
  lessons.push({
    date,
    time: String(x.TIME_Z || ''),
    subject,
    kind: String(x.KOW || ''),
    type: String(x.CLASS || ''),
    room: String(x.AUD || ''),
    teacher: String(x.PREP || ''),
  });
}

const meta = {
  group: GROUP,
  source: `https://tulsu.ru/schedule/?group=${GROUP}`,
  min_date: dates?.MIN_DATE || null,
  max_date: dates?.MAX_DATE || null,
  updated_at: new Date().toISOString(),
  lessons,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
console.log(`Wrote ${lessons.length} lessons → ${outPath}`);
