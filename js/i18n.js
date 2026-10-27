const STR = {
  ru: {
    'brand.sub': 'Personal AI',
    'nav.chat': 'Чат',
    'nav.tasks': 'Задачи',
    'nav.schedule': 'Расписание',
    'nav.memory': 'Память',
    'nav.settings': 'Настройки',
    'chat.new': 'Новый чат',
    'chat.send': 'Отправить',
    'chat.stop': 'Стоп',
    'chat.regen': 'Ещё раз',
    'chat.stopped': 'Остановлено',
    'chat.placeholder': 'Сообщение…  /task купить тетрадь',
    'chat.hint': 'Команды: /task · /remember · /schedule · /tomorrow · /clear · /help',
    'chat.welcome': 'Я **Шира** — умный и быстрый личный ассистент. Память, задачи, расписание 221461, стриминг.\n\nВ настройках: ключ Groq. Пресет **Smart** (70B) или **Fast** (8B Instant).',
    'chat.needKey': 'Чтобы я отвечала как полноценный ИИ, вставь API-ключ в **Настройках**. Бесплатный вариант: [Groq](https://console.groq.com/keys) → модель `llama-3.3-70b-versatile`.',
    'chat.thinking': 'Думаю…',
    'chat.error': 'Ошибка запроса',
    'status.nokey': 'Нужен API-ключ',
    'status.ready': 'Готова',
    'status.busy': 'Отвечаю…',
    'tasks.placeholder': 'Новая задача…',
    'tasks.add': 'Добавить',
    'tasks.empty': 'Пока нет задач. Добавь здесь или напиши /task в чате.',
    'schedule.group': 'Группа 221461 · ТулГУ',
    'schedule.today': 'Сегодня',
    'schedule.refresh': 'Обновить',
    'schedule.empty': 'На этот день пар нет.',
    'schedule.updated': 'Кэш обновлён',
    'schedule.cors': 'Сайт ТулГУ блокирует браузерный запрос (CORS). Показан локальный кэш.',
    'memory.placeholder': 'Факт о тебе…',
    'memory.add': 'Запомнить',
    'memory.export': 'Экспорт',
    'memory.import': 'Импорт',
    'memory.profile': 'Профиль',
    'memory.named': 'Заметки',
    'memory.empty': 'Пока пусто. Добавь факт выше или напиши /remember в чате.',
    'settings.name': 'Имя ассистента',
    'settings.lang': 'Язык интерфейса',
    'settings.preset': 'Пресет модели',
    'settings.provider': 'Провайдер',
    'settings.base': 'Base URL',
    'settings.model': 'Модель',
    'settings.key': 'API-ключ',
    'settings.keyHint': 'Хранится только в localStorage этого браузера. Никогда не попадает в репозиторий.',
    'settings.tts': 'Озвучивать ответы (ru-RU)',
    'settings.save': 'Сохранить',
    'settings.clearKey': 'Удалить ключ',
    'settings.setupTitle': 'Как подключить сильный ИИ',
    'settings.setupSteps': '<li>Ключ на <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a> (бесплатно).</li><li>Пресет <b>Smart</b> = Llama 3.3 70B; для скорости выбери <b>Fast</b> (8B Instant).</li><li>Сохрани ключ и пиши в чат — стриминг + память/задачи/расписание.</li>',
    'settings.setupAlt': 'Альтернативы: OpenRouter (Gemini 2.0 Flash / Claude), OpenAI, или локальный llama.cpp / Ollama с OpenAI-совместимым URL.',
    'settings.ctx': 'Окно контекста (сообщений)',
    'settings.maxTokens': 'Макс. токенов ответа',
    'settings.latency': 'Показывать задержку (ms / TTFT)',
    'settings.saved': 'Настройки сохранены.',
  },
  en: {
    'brand.sub': 'Personal AI',
    'nav.chat': 'Chat',
    'nav.tasks': 'Tasks',
    'nav.schedule': 'Schedule',
    'nav.memory': 'Memory',
    'nav.settings': 'Settings',
    'chat.new': 'New chat',
    'chat.send': 'Send',
    'chat.stop': 'Stop',
    'chat.regen': 'Retry',
    'chat.stopped': 'Stopped',
    'chat.placeholder': 'Message…  /task buy a notebook',
    'chat.hint': 'Commands: /task · /remember · /schedule · /tomorrow · /clear · /help',
    'chat.welcome': 'I am **Shira** — a fast, capable personal assistant. Memory, tasks, group 221461 schedule, streaming.\n\nIn Settings: Groq key. Preset **Smart** (70B) or **Fast** (8B Instant).',
    'chat.needKey': 'To answer as a full AI, paste an API key in **Settings**. Free option: [Groq](https://console.groq.com/keys) → model `llama-3.3-70b-versatile`.',
    'chat.thinking': 'Thinking…',
    'chat.error': 'Request failed',
    'status.nokey': 'API key needed',
    'status.ready': 'Ready',
    'status.busy': 'Responding…',
    'tasks.placeholder': 'New task…',
    'tasks.add': 'Add',
    'tasks.empty': 'No tasks yet. Add one here or type /task in chat.',
    'schedule.group': 'Group 221461 · TulSU',
    'schedule.today': 'Today',
    'schedule.refresh': 'Refresh',
    'schedule.empty': 'No classes this day.',
    'schedule.updated': 'Cache updated',
    'schedule.cors': 'TulSU blocks browser requests (CORS). Showing local cache.',
    'memory.placeholder': 'A fact about you…',
    'memory.add': 'Remember',
    'memory.export': 'Export',
    'memory.import': 'Import',
    'memory.profile': 'Profile',
    'memory.named': 'Notes',
    'memory.empty': 'Empty for now. Add a fact above or type /remember in chat.',
    'settings.name': 'Assistant name',
    'settings.lang': 'UI language',
    'settings.preset': 'Model preset',
    'settings.provider': 'Provider',
    'settings.base': 'Base URL',
    'settings.model': 'Model',
    'settings.key': 'API key',
    'settings.keyHint': 'Stored only in this browser’s localStorage. Never committed to the repo.',
    'settings.tts': 'Speak replies (ru-RU)',
    'settings.save': 'Save',
    'settings.clearKey': 'Clear key',
    'settings.setupTitle': 'How to connect a strong model',
    'settings.setupSteps': '<li>Free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a>.</li><li><b>Smart</b> = Llama 3.3 70B; pick <b>Fast</b> (8B Instant) for lower latency.</li><li>Save and chat — streaming with memory/tasks/schedule tools.</li>',
    'settings.setupAlt': 'Also works with OpenRouter (Gemini / Claude), OpenAI, or local llama.cpp / Ollama via an OpenAI-compatible URL.',
    'settings.ctx': 'Context window (messages)',
    'settings.maxTokens': 'Max reply tokens',
    'settings.latency': 'Show latency (ms / TTFT)',
    'settings.saved': 'Settings saved.',
  },
};

let lang = 'ru';

export function setLang(l) {
  lang = STR[l] ? l : 'ru';
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n');
    if (STR[lang][k] != null) el.textContent = STR[lang][k];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const k = el.getAttribute('data-i18n-placeholder');
    if (STR[lang][k] != null) el.setAttribute('placeholder', STR[lang][k]);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const k = el.getAttribute('data-i18n-html');
    if (STR[lang][k] != null) el.innerHTML = STR[lang][k];
  });
  const btn = document.getElementById('btn-lang');
  if (btn) btn.textContent = lang.toUpperCase();
  return lang;
}

export function t(key, fallback = '') {
  return (STR[lang] && STR[lang][key]) || (STR.ru[key]) || fallback || key;
}

export function getLang() {
  return lang;
}
