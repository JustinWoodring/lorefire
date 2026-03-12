import React, { useState, useEffect, useRef } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { Button } from '@/Components/Button'
import { Input, Select } from '@/Components/Input'
import { PageProps } from '@/types'

// ── Types ────────────────────────────────────────────────────────────
type Step = 'welcome' | 'python' | 'llm' | 'campaign' | 'done'
type PythonStatus = 'not_started' | 'running' | 'ready' | 'failed'

interface Props {
  python_status: PythonStatus
  python_error: string | null
}

// ── Runic sigil decoration ────────────────────────────────────────────
const RunicSigil = ({ size = 120, opacity = 0.15 }: { size?: number; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ opacity }}>
    <polygon points="60,4 112,32 112,88 60,116 8,88 8,32"
      stroke="#d4a017" strokeWidth="1.5" fill="none" />
    <polygon points="60,18 96,38 96,78 60,98 24,78 24,38"
      stroke="#d4a017" strokeWidth="0.75" fill="none" opacity="0.5" />
    <polygon points="60,32 80,44 80,68 60,80 40,68 40,44"
      stroke="#d4a017" strokeWidth="0.5" fill="none" opacity="0.3" />
    <line x1="60" y1="4" x2="60" y2="116" stroke="#d4a017" strokeWidth="0.4" opacity="0.2" />
    <line x1="8" y1="32" x2="112" y2="88" stroke="#d4a017" strokeWidth="0.4" opacity="0.2" />
    <line x1="112" y1="32" x2="8" y2="88" stroke="#d4a017" strokeWidth="0.4" opacity="0.2" />
    <circle cx="60" cy="60" r="6" fill="#d4a017" opacity="0.5" />
    <circle cx="60" cy="60" r="2" fill="#d4a017" opacity="0.9" />
  </svg>
)

// ── Step indicator ────────────────────────────────────────────────────
const STEPS: { key: Step; label: string }[] = [
  { key: 'welcome',  label: 'Welcome'    },
  { key: 'python',   label: 'Transcription' },
  { key: 'llm',      label: 'AI Engine'  },
  { key: 'campaign', label: 'First Campaign' },
  { key: 'done',     label: 'Ready'      },
]

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current)
  return (
    <div className="flex items-center gap-0 mb-12">
      {STEPS.map((s, i) => {
        const done    = i < idx
        const active  = i === idx
        const future  = i > idx
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1">
              <div className={`
                w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-mono transition-all duration-300
                ${done   ? 'bg-[var(--color-rune)] border-[var(--color-rune)] text-[var(--color-void)]' : ''}
                ${active ? 'border-[var(--color-rune-bright)] text-[var(--color-rune-bright)] shadow-[0_0_8px_var(--color-rune)]' : ''}
                ${future ? 'border-[var(--color-border)] text-[var(--color-text-dim)]' : ''}
              `}>
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-[9px] uppercase tracking-widest whitespace-nowrap ${active ? 'text-[var(--color-rune-bright)]' : 'text-[var(--color-text-dim)]'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mt-[-10px] mx-1 transition-all duration-300 ${done ? 'bg-[var(--color-rune-dim)]' : 'bg-[var(--color-border)]'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function Onboarding({ python_status, python_error }: Props) {
  const { python_setup } = usePage<PageProps>().props
  const [step, setStep] = useState<Step>('welcome')
  const [llmProvider, setLlmProvider] = useState('none')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3')
  const [zaiKey, setZaiKey] = useState('')
  const [zaiModel, setZaiModel] = useState('gpt-4o')
  const [whisperModel, setWhisperModel] = useState('base')
  const [campaignName, setCampaignName] = useState('')
  const [dmName, setDmName] = useState('')
  const [savingLlm, setSavingLlm] = useState(false)
  const [savingCampaign, setSavingCampaign] = useState(false)

  // Poll python status while running — use shared python_setup prop
  const [currentPythonStatus, setCurrentPythonStatus] = useState<PythonStatus>(
    python_setup?.status ?? python_status
  )
  const [currentPythonError, setCurrentPythonError] = useState<string | null>(
    python_setup?.error ?? python_error ?? null
  )
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync from shared prop when page updates
  useEffect(() => {
    if (python_setup) {
      setCurrentPythonStatus(python_setup.status)
      setCurrentPythonError(python_setup.error ?? null)
    }
  }, [python_setup?.status, python_setup?.error])

  useEffect(() => {
    if (currentPythonStatus === 'running') {
      pollRef.current = setInterval(() => {
        router.reload({
          only: ['python_setup'],
        })
      }, 3000)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [currentPythonStatus])

  const saveLlmSettings = () => {
    setSavingLlm(true)
    router.post('/onboarding/settings', {
      llm_provider: llmProvider,
      openai_api_key: openaiKey,
      anthropic_api_key: anthropicKey,
      ollama_base_url: ollamaUrl,
      ollama_model: ollamaModel,
      zai_api_key: zaiKey,
      zai_model: zaiModel,
      whisperx_model: whisperModel,
    }, {
      preserveScroll: true,
      onFinish: () => setSavingLlm(false),
      onSuccess: () => setStep('campaign'),
    })
  }

  const finish = () => {
    setSavingCampaign(true)
    router.post('/onboarding/complete', {
      campaign_name: campaignName,
      dm_name: dmName,
    }, {
      onFinish: () => setSavingCampaign(false),
    })
  }

  const skipCampaign = () => {
    router.post('/onboarding/complete', { campaign_name: '', dm_name: '' })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: 'var(--color-void)' }}
    >
      <Head title="Welcome to Lorefire" />

      {/* Background runic decoration */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <RunicSigil size={600} opacity={0.025} />
      </div>

      <div className="relative w-full max-w-lg">
        <StepBar current={step} />

        <div className="runic-card p-8 flex flex-col gap-6">

          {/* ── Step: Welcome ─────────────────────────────────────── */}
          {step === 'welcome' && (
            <>
              <div className="flex flex-col items-center gap-4 text-center">
                <RunicSigil size={80} opacity={0.6} />
                <div>
                  <h1 className="font-heading text-3xl text-[var(--color-text-white)] tracking-widest uppercase mb-2">
                    Welcome, Chronicler
                  </h1>
                  <p className="text-sm text-[var(--color-text-dim)] leading-relaxed max-w-sm">
                    Lorefire is your local-first chronicle for 5e campaigns — built for the table, running entirely on your machine.
                    Let's take a few moments to get everything ready.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm">
                <FeatureRow icon="🎙" label="Session Recording" desc="Record your sessions and auto-transcribe with WhisperX" />
                <FeatureRow icon="⚔" label="Combat Tracker" desc="Auto-detect encounters and break down every round" />
                <FeatureRow icon="📖" label="Bardic Summaries" desc="AI-generated epic prose summaries of your sessions" />
                <FeatureRow icon="🎨" label="Scene Art Prompts" desc="Generate FLUX/SD art prompts for key moments" />
              </div>

              <Button variant="rune" onClick={() => setStep('python')} className="mt-2 self-end">
                Begin Setup
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Button>
            </>
          )}

          {/* ── Step: Python / WhisperX ───────────────────────────── */}
          {step === 'python' && (
            <>
              <div>
                <h2 className="font-heading text-xl text-[var(--color-text-white)] tracking-widest uppercase mb-1">
                  Transcription Engine
                </h2>
                <p className="text-sm text-[var(--color-text-dim)] leading-relaxed">
                  Lorefire bundles <strong className="text-[var(--color-text-bright)]">WhisperX</strong> — a local AI transcription engine — in a Python virtual environment.
                  This runs entirely on your machine; no audio ever leaves your device.
                </p>
              </div>

              <Select
                label="Whisper Model Size"
                value={whisperModel}
                onChange={e => setWhisperModel(e.target.value)}
                hint="Larger models are more accurate but slower. 'base' is recommended for most Macs."
              >
                <option value="tiny">tiny — fastest, lowest accuracy</option>
                <option value="base">base — good balance (recommended)</option>
                <option value="small">small — better accuracy, ~2×slower</option>
                <option value="medium">medium — high accuracy, ~5×slower</option>
                <option value="large-v3">large-v3 — best accuracy, slow, needs 8GB+ RAM</option>
              </Select>

              {/* Diarization note */}
              <div className="rounded border border-[var(--color-border)] p-3 flex flex-col gap-1.5" style={{ background: 'var(--color-abyss)' }}>
                <p className="text-[10px] uppercase tracking-widest font-heading" style={{ color: 'var(--color-text-dim)' }}>Speaker Diarization (optional)</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                  To identify who said what, add a HuggingFace token in Settings after setup.
                  You must also <strong className="text-[var(--color-text-base)]">accept the model licenses</strong> while logged into the same HF account:
                </p>
                <ul className="flex flex-col gap-0.5 ml-2">
                  {[
                    'huggingface.co/pyannote/speaker-diarization-3.1',
                    'huggingface.co/pyannote/segmentation-3.0',
                  ].map(url => (
                    <li key={url} className="text-[11px] font-mono" style={{ color: 'var(--color-rune)' }}>{url}</li>
                  ))}
                </ul>
              </div>

              {/* Status block */}
              <PythonStatusBlock
                status={currentPythonStatus}
                error={currentPythonError}
              />

              <div className="flex items-center justify-between mt-2">
                <Button variant="ghost" onClick={() => setStep('welcome')}>
                  Back
                </Button>
                <div className="flex gap-2">
                  {currentPythonStatus === 'failed' && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCurrentPythonStatus('running')
                        router.post('/onboarding/retry-python', {}, {
                          onSuccess: () => setCurrentPythonStatus('running'),
                        })
                      }}
                    >
                      Retry
                    </Button>
                  )}
                  <Button
                    variant="rune"
                    disabled={currentPythonStatus === 'running'}
                    onClick={() => setStep('llm')}
                  >
                    {currentPythonStatus === 'running' ? 'Setting up…' : 'Continue'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Step: LLM ─────────────────────────────────────────── */}
          {step === 'llm' && (
            <>
              <div>
                <h2 className="font-heading text-xl text-[var(--color-text-white)] tracking-widest uppercase mb-1">
                  AI Engine
                </h2>
                <p className="text-sm text-[var(--color-text-dim)] leading-relaxed">
                  Optional: connect an LLM to generate <strong className="text-[var(--color-text-bright)]">bardic summaries</strong> and
                  {' '}<strong className="text-[var(--color-text-bright)]">art prompts</strong>.
                  You can skip this and set it up later in Settings.
                </p>
              </div>

              <Select
                label="AI Provider"
                value={llmProvider}
                onChange={e => setLlmProvider(e.target.value)}
              >
                <option value="none">None — use template fallback</option>
                <option value="zai">z.ai (recommended)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="ollama">Ollama (local)</option>
              </Select>

              {llmProvider === 'zai' && (
                <div className="flex flex-col gap-3">
                  <Input
                    label="z.ai API Key"
                    type="password"
                    value={zaiKey}
                    onChange={e => setZaiKey(e.target.value)}
                    placeholder="zai-…"
                    hint="Get your key at z.ai. Stored locally only."
                  />
                  <Input
                    label="Model"
                    value={zaiModel}
                    onChange={e => setZaiModel(e.target.value)}
                    placeholder="gpt-4o"
                    hint="Any model supported by z.ai, e.g. gpt-4o, grok-3, claude-3-5-sonnet."
                  />
                </div>
              )}

              {llmProvider === 'openai' && (
                <Input
                  label="OpenAI API Key"
                  type="password"
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  placeholder="sk-…"
                />
              )}
              {llmProvider === 'anthropic' && (
                <Input
                  label="Anthropic API Key"
                  type="password"
                  value={anthropicKey}
                  onChange={e => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-…"
                />
              )}
              {llmProvider === 'ollama' && (
                <div className="flex flex-col gap-3">
                  <Input
                    label="Ollama Base URL"
                    value={ollamaUrl}
                    onChange={e => setOllamaUrl(e.target.value)}
                  />
                  <Input
                    label="Model Name"
                    value={ollamaModel}
                    onChange={e => setOllamaModel(e.target.value)}
                    placeholder="llama3, mistral…"
                  />
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <Button variant="ghost" onClick={() => setStep('python')}>Back</Button>
                <Button variant="rune" disabled={savingLlm} onClick={saveLlmSettings}>
                  {savingLlm ? 'Saving…' : 'Continue'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </>
          )}

          {/* ── Step: First Campaign ─────────────────────────────────── */}
          {step === 'campaign' && (
            <>
              <div>
                <h2 className="font-heading text-xl text-[var(--color-text-white)] tracking-widest uppercase mb-1">
                  Begin Your Chronicle
                </h2>
                <p className="text-sm text-[var(--color-text-dim)] leading-relaxed">
                  Create your first campaign now, or skip and do it from the Campaigns screen.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Input
                  label="Campaign Name"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="The Lost Mines, Curse of Strahd…"
                  autoFocus
                />
                <Input
                  label="DM Name"
                  value={dmName}
                  onChange={e => setDmName(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <Button variant="ghost" onClick={() => setStep('llm')}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={skipCampaign}>Skip</Button>
                  <Button
                    variant="rune"
                    disabled={savingCampaign || !campaignName.trim()}
                    onClick={finish}
                  >
                    {savingCampaign ? 'Creating…' : 'Create Campaign'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Step: Done ────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-6 text-center py-4">
              <div className="relative">
                <RunicSigil size={80} opacity={0.8} />
                <svg
                  className="absolute inset-0 m-auto"
                  width="28" height="28" viewBox="0 0 24 24"
                  fill="none" stroke="var(--color-rune)" strokeWidth="2.5"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h2 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-2">
                  The Archive Awaits
                </h2>
                <p className="text-sm text-[var(--color-text-dim)] leading-relaxed max-w-sm">
                  Everything is set up. Your chronicles, characters, and sessions are ready to be written.
                </p>
              </div>
              <Button variant="rune" as="a" href="/campaigns" className="mt-2">
                Enter the Archive
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function FeatureRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded border border-[var(--color-border)] bg-[var(--color-deep)]">
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div>
        <p className="text-[var(--color-text-bright)] font-heading text-xs uppercase tracking-wider">{label}</p>
        <p className="text-[var(--color-text-dim)] text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function PythonStatusBlock({
  status,
  error,
}: {
  status: Props['python_status']
  error: string | null
}) {
  const configs = {
    not_started: {
      color: 'var(--color-text-dim)',
      border: 'var(--color-border)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
      ),
      title: 'Setup Queued',
      body: 'The Python environment will be set up in the background.',
    },
    running: {
      color: 'var(--color-warning)',
      border: 'var(--color-warning)',
      icon: <Spinner />,
      title: 'Setting Up…',
      body: 'Installing WhisperX and dependencies. This may take a few minutes.',
    },
    ready: {
      color: 'var(--color-success)',
      border: 'var(--color-success)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
      title: 'Ready',
      body: 'WhisperX is installed and verified. Session transcription is available.',
    },
    failed: {
      color: 'var(--color-danger)',
      border: 'var(--color-danger)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      ),
      title: 'Setup Failed',
      body: error ?? 'An unknown error occurred. Check logs/python_setup.log for details.',
    },
  }

  const c = configs[status]

  return (
    <div
      className="flex items-start gap-3 p-4 rounded border"
      style={{ borderColor: c.border, color: c.color }}
    >
      <span className="shrink-0 mt-0.5">{c.icon}</span>
      <div>
        <p className="text-sm font-heading tracking-wide">{c.title}</p>
        <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{c.body}</p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  )
}
