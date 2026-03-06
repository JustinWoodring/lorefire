# Lorefire

A local-first D&D campaign companion desktop app for macOS (Apple Silicon). Manage campaigns, characters, sessions, and NPCs — with AI-powered transcription, session summaries, scene art generation, and an Oracle chat interface.

Built with [NativePHP](https://nativephp.com), [Laravel 12](https://laravel.com), [React](https://react.dev), and [Inertia.js](https://inertiajs.com).

---

## Features

- **Campaigns** — Create and manage multiple D&D campaigns with party portraits
- **Characters** — Full character sheets with HP, spells, inventory, conditions, and D&D Beyond import
- **Sessions** — Session log with audio recording, WhisperX transcription, bardic summaries, and scene art prompts
- **Encounters** — Auto-detected encounter tracking from transcripts with turn-by-turn breakdowns
- **NPCs** — Campaign NPC roster with attitudes, locations, and portraits
- **Oracle** — AI chat interface with access to your campaign and character data; ask rules questions or campaign-specific questions
- **Extract Session Details** — LLM-powered extraction of character stat changes and NPC appearances from transcripts
- **Art Generation** — Character portraits and scene art via ComfyUI, z.ai, or OpenAI DALL-E
- **PDF Export** — Export campaign or session data to PDF

---

## Requirements

- macOS (Apple Silicon / M-series)
- Node.js 20+
- PHP 8.2+
- Composer

Optional (for transcription):
- Python 3.10+ with WhisperX
- HuggingFace token (for speaker diarization)

Optional (for AI features):
- An LLM provider API key: [z.ai](https://z.ai), [OpenAI](https://platform.openai.com), [Anthropic](https://anthropic.com), or a local [Ollama](https://ollama.com) instance

---

## Setup

```bash
# Clone the repo
git clone https://github.com/justinwoodring/lorefire.git
cd lorefire

# Install PHP dependencies
composer install

# Install Node dependencies
npm install

# Copy environment file
cp .env.example .env
php artisan key:generate

# Run migrations against the NativePHP SQLite database
DB_DATABASE=$(pwd)/database/nativephp.sqlite php artisan migrate

# Build frontend assets
npm run build

# Start the NativePHP desktop app
php artisan native:serve
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Laravel 12 |
| Desktop runtime | NativePHP / Electron 1.3 |
| Frontend | React 19 + TypeScript |
| Routing / SSR bridge | Inertia.js v2 |
| Styling | Tailwind CSS v4 |
| Build tool | Vite 7 |
| Database | SQLite (local, via NativePHP) |
| Queue | Laravel database queue |
| Transcription | WhisperX (local Python) |
| Markdown rendering | react-markdown v10 |

---

## LLM Providers

All LLM calls (summaries, art prompts, extraction, Oracle) use whichever provider you configure in Settings:

- **z.ai** — GLM models (glm-4.6, glm-4.7, glm-4-flash). Recommended.
- **OpenAI** — gpt-4o-mini
- **Anthropic** — claude-3-haiku
- **Ollama** — any locally running model

API keys are stored locally in SQLite and never leave your machine except to call the configured provider.

---

## License

MIT — see [LICENSE](./LICENSE)

&copy; 2026 Justin Woodring
