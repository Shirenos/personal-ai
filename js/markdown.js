function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMarkdown(src) {
  let text = String(src ?? '');
  const fences = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = fences.length;
    fences.push(`<pre><code class="lang-${escapeHtml(lang)}">${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
    return `\u0000FENCE${i}\u0000`;
  });

  text = escapeHtml(text);

  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^\*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = text.split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;
  let inBq = false;

  const closeLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
    if (inBq) { out.push('</blockquote>'); inBq = false; }
  };

  for (const line of lines) {
    if (line.startsWith('\u0000FENCE')) {
      closeLists();
      const i = Number(line.replace(/\u0000FENCE|\u0000/g, ''));
      out.push(fences[i] || '');
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.+)/);
    const ol = line.match(/^\s*\d+\.\s+(.+)/);
    const bq = line.match(/^&gt;\s?(.*)/);
    const h = line.match(/^(#{1,3})\s+(.+)/);
    if (ul) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (inBq) { out.push('</blockquote>'); inBq = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${ul[1]}</li>`);
    } else if (ol) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inBq) { out.push('</blockquote>'); inBq = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${ol[1]}</li>`);
    } else if (bq) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inBq) { out.push('<blockquote>'); inBq = true; }
      out.push(`<p>${bq[1]}</p>`);
    } else if (h) {
      closeLists();
      const level = h[1].length;
      out.push(`<h${level + 2}>${h[2]}</h${level + 2}>`);
    } else if (line.trim() === '') {
      closeLists();
    } else {
      closeLists();
      out.push(`<p>${line}</p>`);
    }
  }
  closeLists();
  return out.join('\n');
}
