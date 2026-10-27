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
    'chat.placeholder': 'Сообщение…  /task купить тетрадь',
    'chat.hint': 'Команды: /task … · /remember … · /clear · /schedule',
    'chat.welcome': 'Я **Шира** — твой личный ассистент. Помню факты о тебе, веду задачи и знаю расписание группы 221461.\n\nПодключи API-ключ в настройках (рекомендую бесплатный Groq), и начнём.',
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
    'settings.provider': 'Провайдер',
    'settings.base': 'Base URL',
    'settings.model': 'Модель',
    'settings.key': 'API-ключ',
    'settings.keyHint': 'Хранится только в localStorage этого браузера. Никогда не попадает в репозиторий.',
    'settings.tts': 'Озвучивать ответы (ru-RU)',
    'settings.save': 'Сохранить',
    'settings.clearKey': 'Удалить ключ',
    'settings.setupTitle': 'Как подключить сильный ИИ',
    'settings.setupSteps': '<li>Зарегистрируйся на <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a> — бесплатный ключ за минуту.</li><li>Скопируй ключ. Провайдер <b>Groq</b> и модель <code>llama-3.3-70b-versatile</code> уже выбраны.</li><li>Нажми «Сохранить» и напиши что угодно в чат — ответы идут со стримингом.</li>',
    'settings.setupAlt': 'Альтернативы: OpenRouter (Gemini 2.0 Flash / Claude), OpenAI, или локальный llama.cpp / Ollama с OpenAI-совместимым URL.',
    'settings.ctx': 'Окно контекста (сообщений)',
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
    'chat.placeholder': 'Message…  /task buy a notebook',
    'chat.hint': 'Commands: /task … · /remember … · /clear · /schedule',
    'chat.welcome': 'I am **Shira** — your personal assistant. I keep facts about you, manage tasks, and know group 221461’s timetable.\n\nAdd an API key in Settings (free Groq recommended) and we can start.',
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
    'settings.provider': 'Provider',
    'settings.base': 'Base URL',
    'settings.model': 'Model',
    'settings.key': 'API key',
    'settings.keyHint': 'Stored only in this browser’s localStorage. Never committed to the repo.',
    'settings.tts': 'Speak replies (ru-RU)',
    'settings.save': 'Save',
    'settings.clearKey': 'Clear key',
    'settings.setupTitle': 'How to connect a strong model',
    'settings.setupSteps': '<li>Create a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a>.</li><li>Paste it here. Provider <b>Groq</b> and model <code>llama-3.3-70b-versatile</code> are preselected.</li><li>Save and chat — replies stream token by token.</li>',
    'settings.setupAlt': 'Also works with OpenRouter (Gemini / Claude), OpenAI, or local llama.cpp / Ollama via an OpenAI-compatible URL.',
    'settings.ctx': 'Context window (messages)',
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
