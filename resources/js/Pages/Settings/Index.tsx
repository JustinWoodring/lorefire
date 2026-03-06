import React, { useEffect, useRef, useState } from 'react'
import { Head, useForm, usePage, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Input, Select } from '@/Components/Input'
import { RuneDivider } from '@/Components/RuneDivider'
import { AppSettings, PageProps } from '@/types'

interface Props {
  settings: AppSettings
}

type PythonStatus = 'not_started' | 'running' | 'ready' | 'failed'

export default function Index({ settings }: Props) {
  const { python_setup } = usePage<PageProps>().props
  const [pythonStatus, setPythonStatus] = useState<PythonStatus>(python_setup?.status ?? 'not_started')
  const [pythonError, setPythonError] = useState<string | null>(python_setup?.error ?? null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data, setData, post, processing } = useForm({
    llm_provider:      settings.llm_provider ?? 'none',
    openai_api_key:    settings.openai_api_key ?? '',
    anthropic_api_key: settings.anthropic_api_key ?? '',
    ollama_base_url:   settings.ollama_base_url ?? 'http://localhost:11434',
    ollama_model:      settings.ollama_model ?? 'llama3',
    zai_api_key:       settings.zai_api_key ?? '',
    zai_model:         settings.zai_model ?? 'glm-4.6',
    zai_base_url:      settings.zai_base_url ?? 'https://api.z.ai/api/coding/paas/v4',
    whisperx_model:    settings.whisperx_model ?? 'base',
    whisperx_language: settings.whisperx_language ?? 'en',
    huggingface_token: settings.huggingface_token ?? '',
    default_art_style:   settings.default_art_style ?? 'lifelike',
    image_gen_provider:  settings.image_gen_provider ?? 'none',
    image_gen_model:     settings.image_gen_model ?? '',
    comfyui_base_url:    settings.comfyui_base_url ?? 'http://localhost:8188',
  })

  // Poll when running
  useEffect(() => {
    if (pythonStatus !== 'running') return
    pollRef.current = setInterval(() => {
      router.reload({
        only: ['python_setup'],
        onSuccess: (page) => {
          const ps = (page.props as PageProps).python_setup
          if (ps) {
            setPythonStatus(ps.status)
            setPythonError(ps.error ?? null)
            if (ps.status !== 'running' && pollRef.current) clearInterval(pollRef.current)
          }
        },
      })
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pythonStatus])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/settings')
  }

  const retrySetup = () => {
    setPythonStatus('running')
    router.post('/onboarding/retry-python', {}, {
      preserveScroll: true,
      onSuccess: () => setPythonStatus('running'),
    })
  }

  const statusConfig: Record<PythonStatus, { color: string; label: string; desc: string }> = {
    not_started: { color: 'var(--color-text-dim)',   label: 'Not Installed',   desc: 'The Python environment has not been set up yet.' },
    running:     { color: 'var(--color-warning)',    label: 'Installing…',     desc: 'WhisperX is being installed in the background. This may take a few minutes.' },
    ready:       { color: 'var(--color-success)',    label: 'Ready',           desc: 'WhisperX is installed and verified. Session transcription is available.' },
    failed:      { color: 'var(--color-danger)',     label: 'Install Failed',  desc: pythonError ?? 'An unknown error occurred. Check logs/python_setup.log for details.' },
  }
  const sc = statusConfig[pythonStatus]

  return (
    <AppLayout title="Settings" breadcrumbs={[{ label: 'Settings' }]}>
      <Head title="Settings" />

      <div className="max-w-xl mx-auto">
        <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-8">Settings</h1>

        <form onSubmit={submit} className="flex flex-col gap-5">

          {/* ── WhisperX ─────────────────────────────────────────── */}
          <RuneDivider label="Transcription (WhisperX)" />

          {/* Python venv status card */}
          <div
            className="flex items-start gap-3 p-4 rounded border"
            style={{ borderColor: sc.color }}
          >
            <StatusIcon status={pythonStatus} color={sc.color} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading tracking-wide" style={{ color: sc.color }}>{sc.label}</p>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5 leading-relaxed">{sc.desc}</p>
            </div>
            {(pythonStatus === 'failed' || pythonStatus === 'not_started') && (
              <Button type="button" variant="ghost" size="sm" onClick={retrySetup}>
                {pythonStatus === 'failed' ? 'Retry' : 'Install'}
              </Button>
            )}
          </div>

          <Select
            label="WhisperX Model"
            value={data.whisperx_model}
            onChange={e => setData('whisperx_model', e.target.value)}
            hint="Larger models are more accurate but slower. 'base' is a good default."
          >
            <option value="tiny">Tiny — Fastest, lowest accuracy</option>
            <option value="base">Base — Balanced (recommended)</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large-v3">Large v3 — Slowest, highest accuracy</option>
          </Select>

          <Select
            label="Language"
            value={data.whisperx_language}
            onChange={e => setData('whisperx_language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="auto">Auto-detect</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="nl">Dutch</option>
            <option value="pl">Polish</option>
            <option value="ja">Japanese</option>
          </Select>

          <Input
            label="HuggingFace Token"
            type="password"
            value={data.huggingface_token}
            onChange={e => setData('huggingface_token', e.target.value)}
            placeholder="hf_…"
            hint="Required for speaker diarization. Get one free at huggingface.co/settings/tokens — also accept the pyannote model license."
          />

          {/* ── LLM ───────────────────────────────────────────────── */}
          <RuneDivider label="AI Language Model" />

          <Select
            label="LLM Provider"
            value={data.llm_provider}
            onChange={e => setData('llm_provider', e.target.value)}
            hint="Used for bardic summaries and art prompt generation."
          >
            <option value="none">None — Use template fallbacks</option>
            <option value="zai">z.ai (recommended)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="ollama">Ollama (Local)</option>
          </Select>

          {data.llm_provider === 'zai' && (
            <div className="flex flex-col gap-3">
              <Input
                label="z.ai API Key"
                type="password"
                value={data.zai_api_key}
                onChange={e => setData('zai_api_key', e.target.value)}
                placeholder="zai-…"
                hint="Stored locally only. Get your key at z.ai."
              />
              <Input
                label="Model"
                value={data.zai_model}
                onChange={e => setData('zai_model', e.target.value)}
                placeholder="glm-4.6"
                hint="Any model supported by the endpoint, e.g. glm-4.6, glm-4.7, glm-4-flash."
              />
              <Input
                label="API Base URL"
                value={data.zai_base_url}
                onChange={e => setData('zai_base_url', e.target.value)}
                placeholder="https://api.z.ai/api/coding/paas/v4"
                hint="GLM Coding Plan endpoint. Default works with your coding plan subscription."
              />
            </div>
          )}

          {data.llm_provider === 'openai' && (
            <Input
              label="OpenAI API Key"
              type="password"
              value={data.openai_api_key}
              onChange={e => setData('openai_api_key', e.target.value)}
              placeholder="sk-…"
              hint="Stored locally only. Never sent to any server except OpenAI."
            />
          )}

          {data.llm_provider === 'anthropic' && (
            <Input
              label="Anthropic API Key"
              type="password"
              value={data.anthropic_api_key}
              onChange={e => setData('anthropic_api_key', e.target.value)}
              placeholder="sk-ant-…"
              hint="Stored locally only."
            />
          )}

          {data.llm_provider === 'ollama' && (
            <div className="flex flex-col gap-3">
              <Input
                label="Ollama Base URL"
                value={data.ollama_base_url}
                onChange={e => setData('ollama_base_url', e.target.value)}
                placeholder="http://localhost:11434"
              />
              <Input
                label="Model Name"
                value={data.ollama_model}
                onChange={e => setData('ollama_model', e.target.value)}
                placeholder="llama3, mistral, gemma…"
              />
            </div>
          )}

          {/* ── Art ───────────────────────────────────────────────── */}
          <RuneDivider label="Art Generation" />

          <Select
            label="Default Art Style"
            value={data.default_art_style}
            onChange={e => setData('default_art_style', e.target.value)}
            hint="Can be overridden per campaign."
          >
            <option value="lifelike">Lifelike — Realistic fantasy painting</option>
            <option value="comic">Comic — Graphic novel illustration</option>
          </Select>

          {/* ── Image Generation ──────────────────────────────────── */}
          <RuneDivider label="Image Generation" />

          <Select
            label="Image Generation Provider"
            value={data.image_gen_provider}
            onChange={e => {
              setData('image_gen_provider', e.target.value)
              // Set sensible default model when switching providers
              if (e.target.value === 'zai' && !data.image_gen_model) {
                setData('image_gen_model', 'glm-image')
              } else if (e.target.value === 'openai' && !data.image_gen_model) {
                setData('image_gen_model', 'dall-e-3')
              }
            }}
            hint="Used to generate character portraits and scene art."
          >
            <option value="none">None — Disable image generation</option>
            <option value="comfyui">ComfyUI (local instance)</option>
            <option value="zai">z.ai (uses your z.ai API key)</option>
            <option value="openai">OpenAI DALL-E (uses your OpenAI API key)</option>
          </Select>

          {data.image_gen_provider === 'comfyui' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[var(--color-text-dim)] -mt-1">
                Connects to your local ComfyUI instance. Uses whatever checkpoint is currently loaded.
              </p>
              <Input
                label="ComfyUI Base URL"
                value={data.comfyui_base_url}
                onChange={e => setData('comfyui_base_url', e.target.value)}
                placeholder="http://localhost:8188"
                hint="Base URL of your ComfyUI server."
              />
            </div>
          )}

          {data.image_gen_provider === 'zai' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[var(--color-text-dim)] -mt-1">
                Uses your z.ai API key and base URL configured above.
              </p>
              <Input
                label="Image Model"
                value={data.image_gen_model}
                onChange={e => setData('image_gen_model', e.target.value)}
                placeholder="cogview-4-flash"
                hint="z.ai image generation model. cogview-4-flash is fast and cost-effective."
              />
            </div>
          )}

          {data.image_gen_provider === 'openai' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[var(--color-text-dim)] -mt-1">
                Uses your OpenAI API key configured above.
              </p>
              <Input
                label="Image Model"
                value={data.image_gen_model}
                onChange={e => setData('image_gen_model', e.target.value)}
                placeholder="dall-e-3"
                hint="OpenAI image generation model. dall-e-3 is recommended."
              />
            </div>
          )}

          <div className="mt-4">
            <Button type="submit" variant="rune" disabled={processing}>
              {processing ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </form>

        {/* ── Attribution ───────────────────────────────────────────── */}
        <div className="mt-12 mb-6">
          <RuneDivider label="About Lorefire" />
        </div>

        <div className="flex flex-col gap-4">
          {/* App identity */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading tracking-widest uppercase text-sm" style={{ color: 'var(--color-rune-bright)' }}>
                Lorefire
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                Version 0.1.0 &mdash; Built for macOS (Apple Silicon)
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              &copy; {new Date().getFullYear()} Justin Woodring &mdash; MIT License
            </p>
          </div>

          {/* Open source credits */}
          <div
            className="rounded-lg p-4 grid grid-cols-2 gap-x-8 gap-y-2"
            style={{ background: 'var(--color-abyss)', border: '1px solid var(--color-border)' }}
          >
            <p className="col-span-2 text-xs font-heading tracking-widest uppercase mb-1" style={{ color: 'var(--color-text-dim)' }}>
              Open Source
            </p>
            {[
              ['Laravel', '12', 'https://laravel.com'],
              ['NativePHP', '1.3', 'https://nativephp.com'],
              ['React', '19', 'https://react.dev'],
              ['Inertia.js', '2', 'https://inertiajs.com'],
              ['Tailwind CSS', '4', 'https://tailwindcss.com'],
              ['Vite', '7', 'https://vite.dev'],
              ['react-markdown', '10', 'https://github.com/remarkjs/react-markdown'],
              ['WhisperX', '', 'https://github.com/m-bain/whisperX'],
            ].map(([name, version, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-xs group"
              >
                <span className="group-hover:underline" style={{ color: 'var(--color-text-base)' }}>{name}</span>
                {version && <span style={{ color: 'var(--color-text-dim)' }}>v{version}</span>}
              </a>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

function StatusIcon({ status, color }: { status: PythonStatus; color: string }) {
  if (status === 'running') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
        className="animate-spin shrink-0 mt-0.5"
      >
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
        <path d="M21 12a9 9 0 00-9-9" />
      </svg>
    )
  }
  if (status === 'ready') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="shrink-0 mt-0.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  )
}
