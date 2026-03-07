import React, { useState, useRef, useEffect } from 'react'
import { Link } from '@inertiajs/react'
import ReactMarkdown from 'react-markdown'
import AppLayout from '@/Layouts/AppLayout'
import { Campaign } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  campaigns: Campaign[]
  hasLlm: boolean
}

const SUGGESTED_PROMPTS = [
  'What are the rules for grappling in 5e?',
  'Summarize my most recent session.',
  'What are the conditions and their effects?',
  'How does spellcasting concentration work?',
]

const CSRF_TOKEN = () =>
  (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? ''

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-dim)' }}>
        The Oracle consults the ether
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1 h-1 rounded-full animate-bounce"
          style={{ background: 'var(--color-rune)', animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  )
}

export default function OracleIndex({ campaigns, hasLlm }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeContext, setIncludeContext] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const userMsg: Message = { role: 'user', content: content.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // 1. Dispatch the job — returns reply_id immediately
      const body: Record<string, unknown> = { messages: nextMessages }
      if (includeContext) body.context = { campaigns }

      const dispatchRes = await fetch('/oracle/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': CSRF_TOKEN() },
        body: JSON.stringify(body),
      })

      const dispatchText = await dispatchRes.text()
      let dispatchData: Record<string, unknown>
      try {
        dispatchData = JSON.parse(dispatchText)
      } catch {
        setError(`Unexpected response from server (HTTP ${dispatchRes.status}).`)
        setLoading(false)
        return
      }

      if (!dispatchRes.ok || dispatchData.error) {
        setError((dispatchData.error as string) ?? 'Failed to reach the Oracle.')
        setLoading(false)
        return
      }

      const replyId = dispatchData.reply_id as number

      // 2. Poll the status endpoint
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/oracle/replies/${replyId}`)
          const statusData = await statusRes.json()

          if (statusData.status === 'done') {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setLoading(false)
            setMessages((prev) => [...prev, { role: 'assistant', content: statusData.reply }])
          } else if (statusData.status === 'failed') {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setLoading(false)
            setError('The Oracle failed to respond. Check your LLM settings.')
          }
          // 'pending' — keep polling
        } catch {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setLoading(false)
          setError('Lost contact with the Oracle. Try again.')
        }
      }, 1500)
    } catch (e) {
      setLoading(false)
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function clearConversation() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setMessages([])
    setError(null)
    setInput('')
    setLoading(false)
  }

  return (
    <AppLayout title="The Oracle">
      <div className="flex flex-col h-full max-h-[calc(100vh-48px-48px)]" style={{ minHeight: 0 }}>

        {/* ── No LLM notice ──────────────────────────────────────────── */}
        {!hasLlm && (
          <div
            className="runic-card mb-4 p-4 flex items-start gap-3"
            style={{ borderColor: 'var(--color-ember)', background: 'rgba(180,50,30,0.08)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ember)" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-base)' }}>
                No LLM provider is configured. The Oracle requires an AI model to function.
              </p>
              <Link href="/settings" className="text-sm underline mt-1 inline-block" style={{ color: 'var(--color-rune-bright)' }}>
                Configure in Settings
              </Link>
            </div>
          </div>
        )}

        {/* ── Header row ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="font-heading tracking-widest uppercase text-sm" style={{ color: 'var(--color-rune-bright)' }}>
              The Oracle
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
              Ask anything about your campaigns, characters, or the rules
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={includeContext}
                onClick={() => setIncludeContext((v) => !v)}
                className="relative inline-flex w-8 h-4 rounded-full transition-colors duration-150 focus:outline-none"
                style={{ background: includeContext ? 'var(--color-rune)' : 'var(--color-border)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-150"
                  style={{ transform: includeContext ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </button>
              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Include campaign data</span>
            </label>

            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="text-xs px-3 py-1 rounded border transition-colors"
                style={{ color: 'var(--color-text-dim)', borderColor: 'var(--color-border)', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-base)'; e.currentTarget.style.borderColor = 'var(--color-rune-dim)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-dim)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Messages area ──────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto rounded-lg mb-3 px-2 py-3"
          style={{ background: 'var(--color-abyss)', border: '1px solid var(--color-border)', minHeight: 0 }}
        >
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune-dim)" strokeWidth="1">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-dim)' }}>
                The Oracle awaits your question
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={!hasLlm}
                    className="text-xs px-3 py-1.5 rounded border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: 'var(--color-rune)', borderColor: 'var(--color-rune-dim)', background: 'var(--color-rune-glow)' }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] rounded-lg px-4 py-3 text-sm"
                    style={
                      msg.role === 'user'
                        ? { background: 'var(--color-deep)', border: '1px solid var(--color-rune-dim)', color: 'var(--color-text-white)' }
                        : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-base)' }
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none oracle-markdown">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <p className="text-xs mb-2 px-1" style={{ color: 'var(--color-ember)' }}>{error}</p>
        )}

        {/* ── Input bar ──────────────────────────────────────────────── */}
        <div
          className="flex items-end gap-2 rounded-lg p-2 shrink-0"
          style={{ background: 'var(--color-abyss)', border: '1px solid var(--color-border)' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasLlm || loading}
            placeholder={hasLlm ? 'Ask the Oracle… (Enter to send, Shift+Enter for newline)' : 'Configure an LLM provider in Settings to use the Oracle.'}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none py-1.5 px-2 placeholder:text-[var(--color-text-dim)] disabled:opacity-50"
            style={{ color: 'var(--color-text-base)', maxHeight: '160px', overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!hasLlm || loading || !input.trim()}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && hasLlm && !loading ? 'var(--color-rune-glow)' : 'transparent',
              border: '1px solid var(--color-rune-dim)',
              color: 'var(--color-rune-bright)',
            }}
            title="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .oracle-markdown p { margin: 0.4em 0; color: var(--color-text-base); }
        .oracle-markdown p:first-child { margin-top: 0; }
        .oracle-markdown p:last-child { margin-bottom: 0; }
        .oracle-markdown h1, .oracle-markdown h2, .oracle-markdown h3 {
          color: var(--color-text-white); font-weight: 600; margin: 0.6em 0 0.3em;
        }
        .oracle-markdown ul, .oracle-markdown ol {
          padding-left: 1.2em; margin: 0.4em 0; color: var(--color-text-base);
        }
        .oracle-markdown li { margin: 0.15em 0; }
        .oracle-markdown code {
          background: var(--color-deep); border: 1px solid var(--color-border);
          border-radius: 3px; padding: 0.1em 0.3em; font-size: 0.85em; color: var(--color-rune-bright);
        }
        .oracle-markdown pre {
          background: var(--color-deep); border: 1px solid var(--color-border);
          border-radius: 6px; padding: 0.75em 1em; overflow-x: auto; margin: 0.5em 0;
        }
        .oracle-markdown pre code { background: transparent; border: none; padding: 0; }
        .oracle-markdown strong { color: var(--color-text-white); }
        .oracle-markdown em { color: var(--color-text-bright); }
        .oracle-markdown hr { border: none; border-top: 1px solid var(--color-border); margin: 0.75em 0; }
        .oracle-markdown blockquote {
          border-left: 2px solid var(--color-rune-dim); padding-left: 0.75em;
          margin: 0.4em 0; color: var(--color-text-dim);
        }
      `}</style>
    </AppLayout>
  )
}
