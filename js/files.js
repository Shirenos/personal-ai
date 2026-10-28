const TEXT_EXT = /\.(txt|md|markdown|csv|json|log|js|ts|py|html|css)$/i;
const PDF_EXT = /\.pdf$/i;
const IMG_EXT = /\.(png|jpe?g|webp|gif)$/i;
const MAX_CHARS = 12000;
const MAX_FILES = 4;

export function isSupportedFile(file) {
  const n = file?.name || '';
  return TEXT_EXT.test(n) || PDF_EXT.test(n) || IMG_EXT.test(n) || (file?.type || '').startsWith('text/');
}

export async function readAttachments(fileList) {
  const files = [...(fileList || [])].slice(0, MAX_FILES);
  const out = [];
  for (const file of files) {
    if (IMG_EXT.test(file.name) || (file.type || '').startsWith('image/')) {
      const dataUrl = await readAsDataURL(file);
      out.push({
        kind: 'image',
        name: file.name,
        size: file.size,
        mime: file.type,
        dataUrl,
        text: '',
        note: 'Image attached. Vision reply requires a vision-capable model (e.g. OpenRouter).',
      });
      continue;
    }
    if (PDF_EXT.test(file.name) || file.type === 'application/pdf') {
      const text = await extractPdfText(file);
      out.push({
        kind: 'pdf',
        name: file.name,
        size: file.size,
        text: text.slice(0, MAX_CHARS),
      });
      continue;
    }
    const text = await readAsText(file);
    out.push({
      kind: 'text',
      name: file.name,
      size: file.size,
      text: String(text).slice(0, MAX_CHARS),
    });
  }
  return out;
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result || '');
    r.onerror = () => reject(r.error || new Error('read failed'));
    r.readAsText(file);
  });
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result || '');
    r.onerror = () => reject(r.error || new Error('read failed'));
    r.readAsDataURL(file);
  });
}

async function extractPdfText(file) {
  // Lazy-load pdf.js from CDN
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs', true);
  }
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    return '[PDF: pdf.js failed to load — paste text instead]';
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = Math.min(doc.numPages, 12);
  let text = '';
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(' ') + '\n';
    if (text.length > MAX_CHARS) break;
  }
  return text.trim() || '[PDF had no extractable text]';
}

function loadScript(src, module = false) {
  return new Promise((resolve, reject) => {
    if (module) {
      import(src)
        .then((mod) => {
          window.pdfjsLib = mod;
          resolve(mod);
        })
        .catch(reject);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(s);
  });
}

export function attachmentsToPrompt(atts) {
  if (!atts?.length) return '';
  const parts = ['## Attached files'];
  for (const a of atts) {
    if (a.kind === 'image') {
      parts.push(`### Image: ${a.name}\n(${a.note})`);
    } else {
      parts.push(`### ${a.name}\n\`\`\`\n${a.text}\n\`\`\``);
    }
  }
  return parts.join('\n');
}

export function visionPartsFromAttachments(atts) {
  const images = (atts || []).filter((a) => a.kind === 'image' && a.dataUrl);
  return images.map((a) => ({
    type: 'image_url',
    image_url: { url: a.dataUrl },
  }));
}

export async function extractTextFromFiles(fileList) {
  const atts = await readAttachments(fileList);
  return attachmentsToPrompt(atts);
}
