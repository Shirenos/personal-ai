# Shira — Personal AI Assistant

A serious, browser-based personal AI assistant. Chat with streaming replies, long-lived memory, tasks, TulSU class schedule, and voice — powered by **your** OpenAI-compatible API key (stored only in `localStorage`).

**Live:** [shirenos.github.io/personal-ai](https://shirenos.github.io/personal-ai/)

![Status](https://img.shields.io/badge/status-MVP-2ea44f)
![Stack](https://img.shields.io/badge/stack-vanilla%20JS-111)
![Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-222)
![License](https://img.shields.io/badge/license-MIT-green)

## Why this exists

Most “AI wrappers” are either demos or SaaS. Shira is a **local-first shell** you can show in a portfolio: polished UI, real persistence, university schedule integration, and a strong system prompt that injects profile, memories, open tasks, and the next days of classes into every request.

## Features

| Area | What works |
|------|------------|
| **Chat** | Streaming OpenAI-compatible completions, Markdown rendering, slash commands |
| **Memory** | Profile facts + named notes; export/import JSON; injected into the system prompt |
| **Tasks** | Panel + `/task …`; assistant can create tasks via a structured `tool` block |
| **Schedule** | Group **221461** (TulSU) from cached JSON; day navigation; `/schedule` |
| **Voice** | Web Speech API — mic (ru-RU / en-US) + optional TTS for replies |
| **Settings** | Assistant name, RU/EN UI, provider presets, context window size, API key |

### Recommended free setup

1. Create a key at [console.groq.com/keys](https://console.groq.com/keys)
2. Pick a preset in Settings:
   - **Smart** — `llama-3.3-70b-versatile` (default, best quality on Groq)
   - **Fast** — `llama-3.1-8b-instant` (lowest latency)
   - **Gemma 2 9B** — another fast Groq option
3. Paste the key → Save → chat

Streaming, stop/regenerate, latency (ms / TTFT), relevant-memory injection, and tool actions are on by default.

Also works with **OpenRouter** (e.g. Gemini 2.0 Flash), **OpenAI**, or any local OpenAI-compatible server.

> The API key never leaves your browser storage and is never committed to this repository.

## Architecture

```
index.html          UI shell (dark graphite)
css/styles.css      Premium B&W layout
js/
  app.js            Wiring / panels
  chat.js           System prompt, streaming, tool actions
  memory.js         Profile + notes
  tasks.js          Todo persistence
  schedule.js       TulSU cache + live refresh attempt
  settings.js       Providers & localStorage config
  voice.js          STT / TTS
  i18n.js           RU / EN
  markdown.js       Lightweight Markdown → HTML
  storage.js        Namespaced localStorage + backup
data/schedule.json  Cached timetable for group 221461
```

Every model call gets a **rich system prompt**: identity, capabilities, tool protocol, profile facts, open tasks, and the next few schedule days. The assistant can append a fenced `tool` JSON block; the UI executes `add_task`, `remember`, and `open_panel` and shows confirmation chips.

## Schedule data

TulSU publishes JSON at `tulsu.ru/schedule/queries/`. Browsers usually cannot call it directly (CORS), so the app ships `data/schedule.json` and a nightly GitHub Action refreshes it.

```bash
node scripts/update-schedule.mjs   # regenerate data/schedule.json
```

In the UI, **Refresh** tries a live fetch and falls back to the cache with a clear message if CORS blocks it.

## Local run

No build step. Any static server:

```bash
python3 -m http.server 8080 --directory .
# open http://127.0.0.1:8080
```

Or open via GitHub Pages after deploy.

## Privacy

- Chat history, memories, tasks, and the API key live in **your** browser `localStorage`
- Export/import is a single JSON file you control
- Clearing site data removes everything

## Roadmap

- Optional cloud sync behind the user’s own backend
- Deeper tool calling (calendar write, file notes)
- PWA install + offline shell

## License

MIT © Shiren ([Shirenos](https://github.com/Shirenos))
