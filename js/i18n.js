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
    'chat.cleared': 'Чат очищен.',
    'chat.running_tools': 'Выполняю инструменты…',
    'chat.welcome': 'Я **Шира** — личный ассистент в браузере.',
    'status.nokey': 'Демо · нужен ключ',
    'status.ready': 'Готова',
    'status.busy': 'Отвечаю…',
    'status.demo': 'Демо-режим',
    'tasks.placeholder': 'Новая задача…',
    'tasks.add': 'Добавить',
    'tasks.empty': 'Пока нет задач. Добавь здесь или напиши /task в чате.',
    'tasks.needtext': 'Укажи текст: /task купить тетрадь',
    'tasks.added': 'Задача добавлена',
    'schedule.group': 'Группа',
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
    'memory.needtext': 'Укажи факт: /remember я люблю коротко',
    'memory.added': 'Запомнено',
    'settings.name': 'Имя ассистента',
    'settings.lang': 'Язык интерфейса',
    'settings.preset': 'Пресет модели',
    'settings.provider': 'Провайдер',
    'settings.base': 'Base URL',
    'settings.model': 'Модель',
    'settings.key': 'API-ключ',
    'settings.keyHint': 'Ключ хранится только в localStorage этого браузера. Уходит только на указанный Base URL — у нас нет сервера, ключ на GitHub Pages не отправляется.',
    'settings.tts': 'Озвучивать ответы',
    'settings.save': 'Сохранить',
    'settings.clearKey': 'Удалить ключ',
    'settings.wipe': 'Стереть все данные',
    'settings.wipeConfirm': 'Удалить ключ, чаты, задачи и память из этого браузера?',
    'settings.setupTitle': 'Как подключить сильный ИИ',
    'settings.setupSteps': '<li>Бесплатный ключ: <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>.</li><li>Пресет <b>Smart</b> = <code>openai/gpt-oss-120b</code>; для скорости — <b>Fast</b> (<code>openai/gpt-oss-20b</code>).</li><li>Ключ остаётся в localStorage и уходит только на Base URL провайдера.</li><li>Без ключа работает демо-режим с командами и расписанием.</li>',
    'settings.setupAlt': 'Также: OpenRouter, OpenAI, или локальный Ollama / llama.cpp с OpenAI-совместимым URL.',
    'settings.ctx': 'Окно контекста (сообщений)',
    'settings.maxTokens': 'Макс. токенов ответа',
    'settings.latency': 'Показывать задержку (ms)',
    'settings.saved': 'Настройки сохранены.',
    'settings.group': 'Группа расписания (ТулГУ)',
    'settings.groupHint': 'По умолчанию 221461. Можно сменить на свою группу или оставить и править data/schedule.json.',
    'settings.securityTitle': 'Безопасность',
    'settings.metaNote': 'Язык UI: RU/EN. Title и meta description для GitHub SEO остаются на английском (намеренно) — UI переключается отдельно.',
    'welcome.title': 'Привет, я Шира',
    'welcome.body': 'Личный ИИ в браузере: чат, память, задачи, расписание, поиск и голос. Без ключа — демо; с Groq — полноценный агент.',
    'welcome.hint': 'Нажми подсказку или введи команду. Ключ → Настройки.',
    'empty.s1': 'Расписание на сегодня',
    'empty.s2': 'Что завтра?',
    'empty.s3': 'Добавить задачу',
    'empty.s4': 'Запомнить факт',
    'empty.s5': 'Справка',
    'help.text': '**Команды**\n- `/task текст` — задача\n- `/remember факт` — память\n- `/schedule` / `/today` — пары сегодня\n- `/tomorrow` — завтра\n- `/clear` — очистить чат\n- `/help` — эта справка\n- `/demo` — подсказки демо\n\nС ключом: веб-поиск, Wikipedia, калькулятор, напоминания, вложения.',
    'err.nokey': 'Нужен API-ключ для полного ИИ. Пока доступен **демо-режим** — или вставь ключ Groq в Настройках (хранится только локально).',
    'err.badkey': 'Неверный API-ключ (401/403). Проверь ключ в Настройках или получи новый на console.groq.com/keys.',
    'err.ratelimit': 'Лимит запросов (429). Подожди минуту или переключись на Fast / другой провайдер.',
    'err.offline': 'Нет сети или API недоступен. Проверь интернет и Base URL.',
    'err.model': 'Модель недоступна (404). Выбери пресет Smart/Fast в Настройках.',
    'err.generic': 'Ошибка API',
    'err.aborted': 'Остановлено',
    'err.files': 'Не удалось прочитать файл',
    'err.voice': 'Голосовой ввод недоступен в этом браузере (Safari/Firefox часто без Web Speech). Используй клавиатуру.',
    'onboard.title': 'Добро пожаловать в Ширу',
    'onboard.p1': 'Это статический сайт на GitHub Pages — **без своего бэкенда**.',
    'onboard.p2': 'API-ключ хранится только в localStorage и отправляется только на выбранный Base URL (Groq / OpenAI / …).',
    'onboard.p3': 'Ключ: console.groq.com/keys → вставь в Настройки → пресет Smart. Или сразу жми «Демо».',
    'onboard.demo': 'Продолжить в демо',
    'onboard.settings': 'Открыть настройки',
    'onboard.dismiss': 'Понятно',
    'hero.badge': 'Portfolio · browser-only',
    'hero.cta': 'Открыть чат',
    'hero.demo': 'Демо без ключа',
    'sessions.title': 'Чаты',
    'attach.title': 'Прикрепить файл',
    'doc.title': 'Shira — Personal AI Assistant',
    'doc.desc': 'Browser-based personal AI: streaming chat, memory, tasks, university schedule, web tools and voice. API key stays in localStorage only.',
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
    'chat.cleared': 'Chat cleared.',
    'chat.running_tools': 'Running tools…',
    'chat.welcome': 'I am **Shira** — a personal assistant in the browser.',
    'status.nokey': 'Demo · key needed',
    'status.ready': 'Ready',
    'status.busy': 'Responding…',
    'status.demo': 'Demo mode',
    'tasks.placeholder': 'New task…',
    'tasks.add': 'Add',
    'tasks.empty': 'No tasks yet. Add one here or type /task in chat.',
    'tasks.needtext': 'Provide text: /task buy a notebook',
    'tasks.added': 'Task added',
    'schedule.group': 'Group',
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
    'memory.needtext': 'Provide a fact: /remember I like short answers',
    'memory.added': 'Saved to memory',
    'settings.name': 'Assistant name',
    'settings.lang': 'UI language',
    'settings.preset': 'Model preset',
    'settings.provider': 'Provider',
    'settings.base': 'Base URL',
    'settings.model': 'Model',
    'settings.key': 'API key',
    'settings.keyHint': 'Stored only in this browser’s localStorage. Sent only to the Base URL you set — we have no server; nothing is posted to GitHub Pages.',
    'settings.tts': 'Speak replies',
    'settings.save': 'Save',
    'settings.clearKey': 'Clear key',
    'settings.wipe': 'Wipe all data',
    'settings.wipeConfirm': 'Delete key, chats, tasks and memory from this browser?',
    'settings.setupTitle': 'How to connect a strong model',
    'settings.setupSteps': '<li>Free key: <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>.</li><li><b>Smart</b> = <code>openai/gpt-oss-120b</code>; <b>Fast</b> = <code>openai/gpt-oss-20b</code>.</li><li>Key stays in localStorage and is sent only to the provider Base URL.</li><li>Without a key, demo mode still runs commands and schedule.</li>',
    'settings.setupAlt': 'Also: OpenRouter, OpenAI, or local Ollama / llama.cpp via an OpenAI-compatible URL.',
    'settings.ctx': 'Context window (messages)',
    'settings.maxTokens': 'Max reply tokens',
    'settings.latency': 'Show latency (ms)',
    'settings.saved': 'Settings saved.',
    'settings.group': 'Schedule group (TulSU)',
    'settings.groupHint': 'Default 221461. Change to your group or edit data/schedule.json.',
    'settings.securityTitle': 'Security',
    'settings.metaNote': 'UI language: RU/EN. Document title & meta stay English for GitHub SEO (intentional); UI toggles separately.',
    'welcome.title': 'Hi, I’m Shira',
    'welcome.body': 'Personal AI in the browser: chat, memory, tasks, schedule, search and voice. No key → demo; with Groq → full agent.',
    'welcome.hint': 'Tap a suggestion or type a command. Key → Settings.',
    'empty.s1': 'Today’s schedule',
    'empty.s2': 'What’s tomorrow?',
    'empty.s3': 'Add a task',
    'empty.s4': 'Remember a fact',
    'empty.s5': 'Help',
    'help.text': '**Commands**\n- `/task text` — add task\n- `/remember fact` — memory\n- `/schedule` / `/today` — today’s classes\n- `/tomorrow`\n- `/clear` — clear chat\n- `/help` — this help\n- `/demo` — demo tips\n\nWith a key: web search, Wikipedia, calculator, reminders, attachments.',
    'err.nokey': 'API key needed for full AI. **Demo mode** still works — or paste a Groq key in Settings (local only).',
    'err.badkey': 'Invalid API key (401/403). Check Settings or create a new key at console.groq.com/keys.',
    'err.ratelimit': 'Rate limited (429). Wait a minute or switch to Fast / another provider.',
    'err.offline': 'Offline or API unreachable. Check network and Base URL.',
    'err.model': 'Model unavailable (404). Pick Smart/Fast in Settings.',
    'err.generic': 'API error',
    'err.aborted': 'Aborted',
    'err.files': 'Could not read file',
    'err.voice': 'Voice input isn’t available in this browser (Safari/Firefox often lack Web Speech). Use the keyboard.',
    'onboard.title': 'Welcome to Shira',
    'onboard.p1': 'This is a static GitHub Pages site — **no backend of ours**.',
    'onboard.p2': 'Your API key lives only in localStorage and is sent only to the Base URL you choose (Groq / OpenAI / …).',
    'onboard.p3': 'Get a key at console.groq.com/keys → paste in Settings → Smart preset. Or continue in Demo.',
    'onboard.demo': 'Continue in demo',
    'onboard.settings': 'Open settings',
    'onboard.dismiss': 'Got it',
    'hero.badge': 'Portfolio · browser-only',
    'hero.cta': 'Open chat',
    'hero.demo': 'Demo without key',
    'sessions.title': 'Chats',
    'attach.title': 'Attach file',
    'doc.title': 'Shira — Personal AI Assistant',
    'doc.desc': 'Browser-based personal AI: streaming chat, memory, tasks, university schedule, web tools and voice. API key stays in localStorage only.',
  },
};

let lang = 'ru';

const META = {
  // Intentional: keep EN title/description for GitHub / OG SEO; UI language is separate.
  title: 'Shira — Personal AI Assistant',
  description:
    'Browser-based personal AI assistant with streaming chat, memory, tasks, university schedule, web tools and voice. Your API key stays in localStorage only.',
};

export function syncDocumentMeta() {
  document.title = META.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', META.description);
  const ogt = document.querySelector('meta[property="og:title"]');
  if (ogt) ogt.setAttribute('content', META.title);
  const ogd = document.querySelector('meta[property="og:description"]');
  if (ogd) ogd.setAttribute('content', META.description);
  document.documentElement.lang = lang;
}

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
  syncDocumentMeta();
  return lang;
}

export function t(key, fallback = '') {
  return (STR[lang] && STR[lang][key]) || (STR.ru[key]) || fallback || key;
}

export function getLang() {
  return lang;
}
