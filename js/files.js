const TEXT_EXT = /\.(txt|md|markdown|csv|json|log|js|ts|py|html|css)$/i;
const PDF_EXT = /\.pdf$/i;
const IMG_EXT = /\.(png|jpe?g|webp|gif)$/i;
const MAX_CHARS = 12000;
const MAX_FILES = 4;

export function isSupportedFile(file) {
  const n = file?.name || '';
  const type = file?.type || '';
  return (
    TEXT_EXT.test(n) ||
    PDF_EXT.test(n) ||
    IMG_EXT.test(n) ||
    type.startsWith('text/') ||
    type.startsWith('image/') ||
    type === 'application/pdf'
  );
}

function isImageFile(file) {
  const n = file?.name || '';
  const type = file?.type || '';
  return type.startsWith('image/') || IMG_EXT.test(n);
}

function friendlyReadError(err) {
  const name = err?.name || '';
  const msg = err?.message || String(err || 'read failed');
  const notFound =
    name === 'NotFoundError' ||
    /could not be found|not found|не найден/i.test(msg);
  const lang = (document.documentElement.lang || 'ru').toLowerCase().startsWith('en')
    ? 'en'
    : 'ru';
  if (notFound) {
    return new Error(
      lang === 'en'
        ? 'The file is no longer available (gallery temp files often expire on Android). Attach it again.'
        : 'Файл больше недоступен (временные файлы галереи на Android часто исчезают). Прикрепите ещё раз.'
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

/** Snapshot file bytes immediately — Android/Yandex gallery URIs can vanish before send. */
async function snapshotBlob(file) {
  try {
    const buf = await file.arrayBuffer();
    return new Blob([buf], { type: file.type || 'application/octet-stream' });
  } catch (e) {
    throw friendlyReadError(e);
  }
}

export async function readAttachments(fileList) {
  const files = [...(fileList || [])].slice(0, MAX_FILES);
  const out = [];
  for (const file of files) {
    try {
      if (isImageFile(file)) {
        const dataUrl = await readAsDataURL(file);
        out.push({
          kind: 'image',
          name: file.name || 'image',
          size: file.size,
          mime: file.type || 'image/jpeg',
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
    } catch (e) {
      throw friendlyReadError(e);
    }
  }
  return out;
}

function readAsText(file) {
  return snapshotBlob(file).then(
    (blob) =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result || '');
        r.onerror = () => reject(friendlyReadError(r.error || new Error('read failed')));
        r.readAsText(blob);
      })
  );
}

function readAsDataURL(file) {
  return snapshotBlob(file).then(
    (blob) =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result || '');
        r.onerror = () => reject(friendlyReadError(r.error || new Error('read failed')));
        r.readAsDataURL(blob);
      })
  );
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
  const blob = await snapshotBlob(file);
  const buf = await blob.arrayBuffer();
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
      parts.push(`### Image: ${a.name}\n(${a.note || 'Image attached.'})`);
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
