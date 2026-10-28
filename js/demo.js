import { getLang } from './i18n.js?v=20261028b';
import { hasApiKey } from './settings.js?v=20261028b';
import { lessonsFor } from './schedule.js?v=20261028b';
import { listTasks } from './tasks.js?v=20261028b';

export function isDemoMode() {
  return !hasApiKey();
}

export function featureTour() {
  const ru = getLang() === 'ru';
  return ru
    ? [
        'Стриминг-чат + агентный tool-loop (поиск, wiki, задачи, память)',
        'Расписание ТулГУ (группа настраивается), голос, вложения txt/md/pdf',
        'Несколько сессий, демо без ключа, ключ только в localStorage',
      ]
    : [
        'Streaming chat + agent tool-loop (search, wiki, tasks, memory)',
        'TulSU schedule (configurable group), voice, txt/md/pdf attachments',
        'Multi-session chats, no-key demo, API key only in localStorage',
      ];
}

export function getDemoReply(userText) {
  const ru = getLang() === 'ru';
  const q = String(userText || '').trim().toLowerCase();

  if (!q || q === 'help' || q === '/help') {
    return ru
      ? '**Демо-режим** (без API-ключа).\n\nПопробуй:\n- `/schedule` — пары на сегодня\n- `/tomorrow` — завтра\n- `/task …` — задача\n- `/remember …` — память\n\nИли спроси «что умеешь?» / «найди EM-алгоритм».\n\nЖивой ИИ: бесплатный ключ на [console.groq.com/keys](https://console.groq.com/keys) → Настройки → пресет **Smart**.'
      : '**Demo mode** (no API key).\n\nTry:\n- `/schedule` — today\n- `/tomorrow`\n- `/task …`\n- `/remember …`\n\nOr ask “what can you do?” / “look up EM algorithm”.\n\nLive AI: free key at [console.groq.com/keys](https://console.groq.com/keys) → Settings → **Smart** preset.';
  }

  if (/расписан|пар[аы]|сегодня|schedule|today|учёб|учеб/.test(q)) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
    const lessons = lessonsFor(today);
    const body = lessons.length
      ? lessons.map((l) => `• ${l.range?.label || l.time} ${l.subject} (${l.room || '—'})`).join('\n')
      : (ru ? 'На сегодня в кэше пар нет.' : 'No classes in cache for today.');
    return (ru ? '**Демо · расписание**\n\n' : '**Demo · schedule**\n\n') + body +
      (ru ? '\n\n_Вставь Groq-ключ для полного агента._' : '\n\n_Add a Groq key for the full agent._');
  }

  if (/задач|task|todo|открыт/.test(q)) {
    const tasks = listTasks().filter((x) => !x.done).slice(0, 8);
    const lines = tasks.length
      ? tasks.map((x) => `• ${x.text}`).join('\n')
      : (ru ? 'Открытых задач нет.' : 'No open tasks.');
    return (ru ? '**Демо · задачи**\n\n' : '**Demo · tasks**\n\n') + lines;
  }

  if (/em.?алг|em alg|expectation/.test(q) || /найди|look up|что такое|what is|wiki|поиск|search/.test(q)) {
    return ru
      ? 'В боевом режиме я вызвала бы `web_search` / `wiki_summary` и показала источники.\n\n**EM (Expectation–Maximization)** — итеративный метод оценки параметров со скрытыми переменными: E-шаг считает ожидания, M-шаг максимизирует правдоподобие.\n\n_Демо-ответ. Ключ Groq → реальный tool-loop._'
      : 'In live mode I’d call `web_search` / `wiki_summary` and show sources.\n\n**EM (Expectation–Maximization)** — iterative estimation with latent variables: E-step expectations, M-step maximize likelihood.\n\n_Demo reply. Groq key → real tool-loop._';
  }

  if (/умеешь|что ты|capabilities|what can|help|возможност/.test(q)) {
    return (ru ? 'Я **Ширениум**. В демо доступны команды и локальные данные. С ключом:\n\n' : 'I am **Shirenium**. Demo covers commands + local data. With a key:\n\n') +
      featureTour().map((x) => `• ${x}`).join('\n') +
      (ru
        ? '\n\nКлюч хранится **только** в localStorage и уходит **только** на выбранный API base URL (не на наш сервер — его нет).'
        : '\n\nYour key stays in **localStorage only** and is sent **only** to the configured API base URL (we have no server).');
  }

  return ru
    ? `Демо: поняла «${userText.slice(0, 120)}».\n\nБез ключа я отвечаю шаблонами + умею /schedule /task /remember.\n\nКлюч: [Groq Console](https://console.groq.com/keys) → Настройки → Smart (\`openai/gpt-oss-120b\`).`
    : `Demo: got “${userText.slice(0, 120)}”.\n\nWithout a key I use templates + /schedule /task /remember.\n\nKey: [Groq Console](https://console.groq.com/keys) → Settings → Smart (\`openai/gpt-oss-120b\`).`;
}
