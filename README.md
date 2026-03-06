# 🔥 Lorefire

<img width="1056" height="800" alt="Screenshot 2026-03-06 at 8 20 58 AM" src="https://github.com/user-attachments/assets/d86597f8-4304-40c7-b542-4c48a4c74f49" />


> A local-first D&D 5e campaign companion for macOS. Record sessions, auto-transcribe with AI, generate bardic summaries, track characters, and build your campaign archive — all on your machine, no cloud required.

Built with [NativePHP](https://nativephp.com), [Laravel 12](https://laravel.com), [React](https://react.dev), and [Inertia.js](https://inertiajs.com).

> **Tested on Apple Silicon (M2).** Should work on other macOS hardware; Intel Macs are untested.

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 📚 | **Campaigns** | Manage multiple campaigns with party portraits and full session history |
| 🧙 | **Characters** | Full 5e character sheets — HP, spell slots, inventory, conditions, short/long rests |
| 📥 | **D&D Beyond Import** | Import characters directly from D&D Beyond |
| 🎙️ | **Session Recording** | Record audio at the table and transcribe locally with WhisperX |
| 📖 | **Bardic Summaries** | AI-generated epic prose recaps of your sessions |
| ⚔️ | **Encounter Tracker** | Auto-detect encounters from transcripts with round-by-round breakdowns |
| 🧝 | **NPC Roster** | Track campaign NPCs with attitudes, locations, and AI-generated portraits |
| 🔮 | **Oracle** | AI chat assistant with full access to your campaign and character data |
| 🎨 | **Art Generation** | Generate character portraits and scene art via ComfyUI, z.ai, or DALL-E |
| 📄 | **PDF Export** | Export campaign or session data to PDF |
| 🔍 | **Detail Extraction** | LLM-powered extraction of stat changes and NPC appearances from transcripts |

---

## 📦 Installation (Release Build)

1. Download the latest `.dmg` from the [Releases](https://github.com/JustinWoodring/lorefire/releases) page
2. Open the DMG and drag **Lorefire.app** to `/Applications`
3. Because the app is not notarized, macOS Gatekeeper will block it on first launch. Remove the quarantine flag:

```bash
xattr -rd com.apple.quarantine /Applications/Lorefire.app
```

4. Open the app normally — the onboarding wizard will guide you through the rest.

---

## 🚀 Getting Started (Development)

### Prerequisites

- macOS (Apple Silicon recommended)
- [Node.js](https://nodejs.org) 20+
- [PHP](https://php.net) 8.2+
- [Composer](https://getcomposer.org)

### Setup

```bash
# Clone the repo
git clone https://github.com/justinwoodring/lorefire.git
cd lorefire

# Install PHP dependencies
composer install

# Install Node dependencies
npm install

# Copy and configure environment
cp .env.example .env
php artisan key:generate

# Run database migrations
DB_DATABASE=$(pwd)/database/nativephp.sqlite php artisan migrate

# Build frontend assets
npm run build

# Start the app
php artisan native:serve
```

> **Note:** Make sure no other Vite process is already running on port 5173 before starting `native:serve`. You can check with `lsof -i :5173`.

---

## ⚙️ Configuration

All settings are configured inside the app via **Settings** (after onboarding). Nothing requires editing `.env` manually.

### 🎙️ Transcription (WhisperX)

Lorefire bundles [WhisperX](https://github.com/m-bain/whisperX) in a local Python virtual environment. Audio is **never sent off your device**.

On first launch, the app automatically installs the Python venv in the background. You can monitor progress in the onboarding wizard or in Settings.

| Setting | Description |
|---|---|
| **Model size** | `tiny` → `large-v3`. `base` is recommended for most Macs. Larger = more accurate but slower. |
| **Language** | Default `English`. Auto-detect and 9 other languages supported. |
| **HuggingFace Token** | Required for **speaker diarization** (identifying who said what). Free at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens). You must also accept the [pyannote model license](https://huggingface.co/pyannote/speaker-diarization-3.1). |

> **Large-v3 note:** Needs 8 GB+ RAM and will be noticeably slow on CPU. On an M2 with enough unified memory it works well.

### 🤖 LLM Provider (Summaries, Oracle, Art Prompts)

Pick one provider in Settings. API keys are stored locally in SQLite and never leave your machine except to call the chosen provider.

| Provider | Notes |
|---|---|
| **z.ai** *(recommended)* | GLM models via the z.ai Coding Plan. Supports `glm-4.6`, `glm-4.7`, `glm-4-flash`, and others. Get a key at [z.ai](https://z.ai). |
| **OpenAI** | Uses `gpt-4o-mini` by default. Requires an [OpenAI API key](https://platform.openai.com/api-keys). |
| **Anthropic** | Uses `claude-3-haiku`. Requires an [Anthropic API key](https://console.anthropic.com). |
| **Ollama** | Any locally running model (e.g. `llama3`, `mistral`). Requires [Ollama](https://ollama.com) running on `localhost:11434`. No API key needed. |
| **None** | Falls back to template-based summaries. All other features still work. |

### 🎨 Image Generation

Configure in Settings → **Image Generation**.

| Provider | Notes |
|---|---|
| **ComfyUI** *(local)* | Connects to your local [ComfyUI](https://github.com/comfyanonymous/ComfyUI) instance. Uses whatever checkpoint is currently loaded. Default URL: `http://localhost:8188`. See [ComfyUI setup](#-comfyui-setup) below. |
| **z.ai** | Uses your z.ai API key (configured above). Recommended model: `cogview-4-flash`. |
| **OpenAI DALL-E** | Uses your OpenAI API key. Recommended model: `dall-e-3`. |
| **None** | Disables image generation entirely. |

Two art styles are available: **Lifelike** (realistic fantasy painting) and **Comic** (graphic novel illustration). The default can be set globally in Settings and overridden per campaign.

---

## 🖼️ ComfyUI Setup

ComfyUI is optional — it lets you generate portraits and scene art locally using Stable Diffusion / FLUX models.

1. Install ComfyUI: [https://github.com/comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)
2. Download a checkpoint model (e.g. [FLUX.1-dev](https://huggingface.co/black-forest-labs/FLUX.1-dev) or any SD checkpoint) and place it in `ComfyUI/models/checkpoints/`
3. Start ComfyUI: `python main.py` — it runs on `http://localhost:8188` by default
4. In Lorefire Settings, set **Image Generation Provider** to `ComfyUI` and confirm the base URL

Lorefire submits generation jobs via the ComfyUI API. The active checkpoint in ComfyUI is used automatically — swap the model in ComfyUI to change the style.

---

## 🗂️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Laravel 12 |
| Desktop runtime | NativePHP / Electron 1.3 |
| Frontend | React 19 + TypeScript |
| Routing / SSR bridge | Inertia.js v2 |
| Styling | Tailwind CSS v4 |
| Build tool | Vite 7 |
| Database | SQLite (local, via NativePHP) |
| Transcription | WhisperX (local Python venv) |
| Queue | Laravel database queue |

---

## 📝 Notes

- **All data is local.** The SQLite database lives in `~/Library/Application Support/lorefire/` (production) or `~/Library/Application Support/lorefire-dev/` (dev).
- **No account required.** Nothing is synced to a server. Your campaigns stay on your machine.
- **Intel Mac / other hardware:** The app has only been tested on an M2 Mac. It may work on Intel Macs or other configurations, but this is untested. WhisperX in particular will be significantly slower without Apple Silicon's Neural Engine.
- **Transcription is CPU/ANE-bound.** On Apple Silicon, WhisperX uses the `mps` backend. Large audio files may take a few minutes even on `base` model.

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

&copy; 2026 Justin Woodring
