/** Client-side tool runners for the agent loop (no backend). */

function clampText(s, n = 3500) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, signal: opts.signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** DuckDuckGo Instant Answer (try direct, then allorigins). */
export async function webSearch(query, { signal } = {}) {
  const q = String(query || '').trim();
  if (!q) return { ok: false, error: 'empty query', results: [] };

  const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  let data = null;
  try {
    data = await fetchJson(ddgUrl, { signal, headers: { Accept: 'application/json' } });
  } catch {
    try {
      const proxied = await fetchJson(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(ddgUrl)}`,
        { signal }
      );
      data = typeof proxied === 'string' ? JSON.parse(proxied) : proxied;
    } catch (e) {
      // fall through to Wikipedia-only
      data = null;
    }
  }

  const results = [];
  if (data?.AbstractText) {
    results.push({
      title: data.Heading || q,
      snippet: data.AbstractText,
      url: data.AbstractURL || '',
      source: 'DuckDuckGo',
    });
  }
  for (const t of data?.RelatedTopics || []) {
    if (t.Text && t.FirstURL) {
      results.push({
        title: t.Text.split(' - ')[0].slice(0, 80),
        snippet: t.Text,
        url: t.FirstURL,
        source: 'DuckDuckGo',
      });
    } else if (Array.isArray(t.Topics)) {
      for (const x of t.Topics.slice(0, 3)) {
        if (x.Text && x.FirstURL) {
          results.push({
            title: x.Text.split(' - ')[0].slice(0, 80),
            snippet: x.Text,
            url: x.FirstURL,
            source: 'DuckDuckGo',
          });
        }
      }
    }
    if (results.length >= 6) break;
  }

  // Always enrich with Wikipedia search (CORS-friendly)
  try {
    const wikiLang = /[а-яё]/i.test(q) ? 'ru' : 'en';
    const search = await fetchJson(
      `https://${wikiLang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=4&namespace=0&format=json&origin=*`,
      { signal }
    );
    const titles = search?.[1] || [];
    const descs = search?.[2] || [];
    const urls = search?.[3] || [];
    for (let i = 0; i < titles.length; i++) {
      results.push({
        title: titles[i],
        snippet: descs[i] || '',
        url: urls[i],
        source: 'Wikipedia',
      });
    }
  } catch { /* ignore */ }

  // dedupe by url/title
  const seen = new Set();
  const uniq = [];
  for (const r of results) {
    const key = (r.url || r.title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push({ ...r, snippet: clampText(r.snippet, 400) });
  }
  return { ok: true, query: q, results: uniq.slice(0, 8) };
}

export async function wikiSummary(titleOrQuery, { signal } = {}) {
  const q = String(titleOrQuery || '').trim();
  if (!q) return { ok: false, error: 'empty' };
  const lang = /[а-яё]/i.test(q) ? 'ru' : 'en';
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g, '_'))}`;
    const data = await fetchJson(url, { signal, headers: { Accept: 'application/json' } });
    return {
      ok: true,
      title: data.title,
      snippet: clampText(data.extract || '', 1200),
      url: data.content_urls?.desktop?.page || data.content_urls?.mobile?.page || '',
      source: 'Wikipedia',
      thumbnail: data.thumbnail?.source || '',
    };
  } catch (e) {
    // try search then summary
    try {
      const search = await fetchJson(
        `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=1&namespace=0&format=json&origin=*`,
        { signal }
      );
      const title = search?.[1]?.[0];
      if (!title) return { ok: false, error: 'not found' };
      return wikiSummary(title, { signal });
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  }
}

/** Safe math evaluator — numbers and + - * / % ( ) . only */
export function calculate(expression) {
  const expr = String(expression || '').trim();
  if (!expr) return { ok: false, error: 'empty' };
  if (!/^[0-9+\-*/%().\s^eE]+$/.test(expr)) {
    return { ok: false, error: 'unsupported characters' };
  }
  const normalized = expr.replace(/\^/g, '**');
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${normalized});`);
    const value = fn();
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, error: 'non-finite result' };
    }
    return { ok: true, expression: expr, value };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export async function setReminder({ text, minutes = 5 } = {}) {
  const body = String(text || 'Напоминание от Ширы').slice(0, 120);
  const ms = Math.max(1, Number(minutes) || 5) * 60 * 1000;
  if (!('Notification' in window)) {
    return { ok: false, error: 'notifications unsupported' };
  }
  let perm = Notification.permission;
  if (perm === 'default') {
    try { perm = await Notification.requestPermission(); } catch { /* ignore */ }
  }
  if (perm !== 'granted') {
    return { ok: false, error: 'permission denied', whenMinutes: minutes };
  }
  setTimeout(() => {
    try {
      new Notification('Shirenium', { body, tag: 'shirenium-reminder-' + Date.now() });
    } catch { /* ignore */ }
  }, ms);
  return { ok: true, text: body, minutes: Math.max(1, Number(minutes) || 5) };
}

export function formatToolResultsForModel(results) {
  const lines = ['## Tool results'];
  for (const r of results) {
    lines.push(`### ${r.type}`);
    if (r.type === 'web_search' && r.data?.results) {
      for (const item of r.data.results) {
        lines.push(`- [${item.title}](${item.url}) (${item.source}): ${item.snippet}`);
      }
      if (!r.data.results.length) lines.push('- (no results)');
    } else if (r.type === 'wiki' && r.data) {
      if (r.data.ok) lines.push(`- **${r.data.title}**: ${r.data.snippet} — ${r.data.url}`);
      else lines.push(`- error: ${r.data.error}`);
    } else if (r.type === 'calculate' && r.data) {
      lines.push(r.data.ok ? `- ${r.data.expression} = ${r.data.value}` : `- error: ${r.data.error}`);
    } else {
      lines.push(`- ${JSON.stringify(r.data).slice(0, 800)}`);
    }
  }
  return lines.join('\n');
}

export async function executeToolCalls(tools, { signal } = {}) {
  const out = [];
  for (const tool of tools || []) {
    const name = (tool.name || tool.type || '').toLowerCase();
    const args = tool.args || tool.arguments || tool || {};
    try {
      if (name === 'web_search' || name === 'search') {
        const data = await webSearch(args.query || args.q || '', { signal });
        out.push({ type: 'web_search', data });
      } else if (name === 'wiki_summary' || name === 'wiki' || name === 'wikipedia') {
        const data = await wikiSummary(args.title || args.query || args.q || '', { signal });
        out.push({ type: 'wiki', data });
      } else if (name === 'calculate' || name === 'calc' || name === 'math') {
        const data = calculate(args.expression || args.expr || args.q || '');
        out.push({ type: 'calculate', data });
      } else if (name === 'set_reminder' || name === 'reminder') {
        const data = await setReminder({
          text: args.text || args.message || '',
          minutes: args.minutes ?? args.in_minutes ?? 5,
        });
        out.push({ type: 'set_reminder', data });
      } else {
        out.push({ type: name || 'unknown', data: { ok: false, error: 'unknown tool' } });
      }
    } catch (e) {
      out.push({ type: name || 'error', data: { ok: false, error: String(e.message || e) } });
    }
  }
  return out;
}
