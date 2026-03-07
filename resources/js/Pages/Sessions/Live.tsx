import React, { useState, useRef, useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import ReactMarkdown from 'react-markdown'
import AppLayout from '@/Layouts/AppLayout'
import { Card, CardHeader } from '@/Components/Card'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { HpBar } from '@/Components/HpBar'
import { useRecording } from '@/Contexts/RecordingContext'
import { Campaign, GameSession, Character, InventoryItem, CharacterSpell } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  campaign: Campaign
  session: GameSession
  characters: Character[]
  hasLlm: boolean
  campaignContext: Campaign
}

type LiveTab = 'characters' | 'oracle' | 'session'

// ── Helpers ───────────────────────────────────────────────────────────────────

function csrf(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? ''
}

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Oracle mini-panel ─────────────────────────────────────────────────────────

interface OracleMessage { role: 'user' | 'assistant'; content: string }

function OraclePanel({ campaignContext, hasLlm }: { campaignContext: Campaign; hasLlm: boolean }) {
  const [messages, setMessages] = useState<OracleMessage[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const pollRef                 = useRef<ReturnType<typeof setInterval> | null>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  async function send(content: string) {
    if (!content.trim() || loading) return
    const userMsg: OracleMessage = { role: 'user', content: content.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/oracle/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ messages: next, context: { campaigns: [campaignContext] } }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to reach the Oracle.'); setLoading(false); return }
      const replyId = data.reply_id as number
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`/oracle/replies/${replyId}`)
          const sd = await sr.json()
          if (sd.status === 'done') {
            clearInterval(pollRef.current!); pollRef.current = null; setLoading(false)
            setMessages(prev => [...prev, { role: 'assistant', content: sd.reply }])
          } else if (sd.status === 'failed') {
            clearInterval(pollRef.current!); pollRef.current = null; setLoading(false)
            setError('The Oracle failed to respond.')
          }
        } catch {
          clearInterval(pollRef.current!); pollRef.current = null; setLoading(false)
          setError('Lost contact with the Oracle.')
        }
      }, 1500)
    } catch {
      setLoading(false); setError('Network error — check your connection.')
    }
  }

  if (!hasLlm) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>No LLM provider configured.</p>
        <a href="/settings" className="text-xs underline" style={{ color: 'var(--color-rune)' }}>Open Settings</a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col gap-2 mt-4">
            <p className="text-xs text-center tracking-widest uppercase" style={{ color: 'var(--color-text-dim)' }}>
              Ask the Oracle
            </p>
            {[
              'What are the rules for grappling?',
              'Summarize the current session.',
              'How does concentration work?',
              'What happens when a character drops to 0 HP?',
            ].map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-left text-xs px-3 py-2 rounded transition-colors"
                style={{ background: 'var(--color-abyss)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] px-3 py-2 rounded text-xs leading-relaxed prose prose-invert prose-xs"
              style={m.role === 'user'
                ? { background: 'var(--color-rune-glow)', border: '1px solid var(--color-rune-dim)', color: 'var(--color-text-bright)' }
                : { background: 'var(--color-abyss)', border: '1px solid var(--color-border)', color: 'var(--color-text-base)' }
              }
            >
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1 px-2">
            <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-text-dim)' }}>
              Consulting the ether
            </span>
            {[0,1,2].map(i => (
              <span key={i} className="inline-block w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--color-rune)', animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-400 px-2">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Ask anything…"
            className="flex-1 resize-none rounded px-3 py-2 text-xs outline-none"
            style={{ background: 'var(--color-deep)', border: '1px solid var(--color-border)', color: 'var(--color-text-bright)' }}
          />
          <Button variant="rune" size="sm" onClick={() => send(input)} disabled={loading || !input.trim()}>
            Ask
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Character live card ───────────────────────────────────────────────────────

function CharacterCard({ character, campaignId }: { character: Character; campaignId: number }) {
  const standalone = !character.campaign_id
  const baseUrl    = standalone
    ? `/characters/${character.id}`
    : `/campaigns/${campaignId}/characters/${character.id}`
  const spellSlotsUrl = standalone
    ? `/characters/${character.id}/spell-slots`
    : `/campaigns/${campaignId}/characters/${character.id}/spell-slots`
  const restUrl = standalone
    ? `/characters/${character.id}/rest`
    : `/campaigns/${campaignId}/characters/${character.id}/rest`
  const classFeaturesUrl = standalone
    ? `/characters/${character.id}/class-features`
    : `/campaigns/${campaignId}/characters/${character.id}/class-features`

  const [tab, setTab]               = useState<'combat' | 'spells' | 'inventory'>('combat')
  const [restConfirm, setRestConfirm] = useState<'short' | 'long' | null>(null)
  const [hpInput, setHpInput]       = useState('')
  const [hpMode, setHpMode]         = useState<'damage' | 'heal' | null>(null)

  // Local mirror of character HP so we can update without full reload
  const [currentHp, setCurrentHp]   = useState(character.current_hp)
  const [tempHp, setTempHp]         = useState(character.temp_hp)

  // Local mirror of spell slots used
  const [slotsUsed, setSlotsUsed]   = useState<Record<string, number>>(character.spell_slots_used ?? {})

  // Local mirror of class features (for lay on hands etc.)
  const [classFeatures, setClassFeatures] = useState<Record<string, unknown>>(character.class_features ?? {})

  const hasSpellSlots = !!(character.spell_slots && Object.keys(character.spell_slots).length > 0)

  // Lay on Hands — fall back to level*5 for Paladins who haven't saved keys yet
  const defaultLayMax = character.class === 'Paladin' ? character.level * 5 : null
  const layMax     = typeof classFeatures.lay_on_hands_max === 'number'
    ? classFeatures.lay_on_hands_max
    : defaultLayMax
  const layCurrent = typeof classFeatures.lay_on_hands_current === 'number'
    ? classFeatures.lay_on_hands_current
    : layMax  // default to full pool on first render
  const hasLayOnHands = layMax !== null && layCurrent !== null

  const adjustLay = async (delta: number) => {
    if (!hasLayOnHands) return
    const next = Math.max(0, Math.min(layMax!, layCurrent! + delta))
    setClassFeatures(prev => ({ ...prev, lay_on_hands_current: next }))
    // If max was never persisted, write it now alongside current
    const updates: Record<string, number> = { lay_on_hands_current: next }
    if (typeof classFeatures.lay_on_hands_max !== 'number' && layMax !== null) {
      updates.lay_on_hands_max = layMax
      setClassFeatures(prev => ({ ...prev, lay_on_hands_max: layMax }))
    }
    await fetch(classFeaturesUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
      body: JSON.stringify({ updates }),
    })
  }

  // ── HP actions ────────────────────────────────────────────────────────────

  const applyHp = async (mode: 'damage' | 'heal') => {
    const amount = parseInt(hpInput)
    if (isNaN(amount) || amount <= 0) return

    const max = character.max_hp
    let next = currentHp

    if (mode === 'damage') {
      let remaining = amount
      if (tempHp > 0) {
        const absorbed = Math.min(tempHp, remaining)
        setTempHp(t => t - absorbed)
        remaining -= absorbed
      }
      next = Math.max(0, next - remaining)
    } else {
      next = Math.min(max, next + amount)
    }

    setCurrentHp(next)
    setHpInput('')
    setHpMode(null)

    // Persist via PATCH
    await fetch(`/characters/${character.id}/hp`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
      body: JSON.stringify({ current_hp: next, temp_hp: tempHp }),
    })
  }

  const doRest = (type: 'short' | 'long') => {
    router.post(`${restUrl}/${type}`, {}, {
      preserveScroll: true,
      onSuccess: () => setRestConfirm(null),
    })
  }

  const toggleSlot = async (level: number, action: 'use' | 'recover') => {
    const key   = String(level)
    const used  = slotsUsed[key] ?? 0
    const max   = (character.spell_slots?.[key] ?? 0) as number
    const next  = action === 'use' ? Math.min(max, used + 1) : Math.max(0, used - 1)
    setSlotsUsed(prev => ({ ...prev, [key]: next }))
    await fetch(spellSlotsUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
      body: JSON.stringify({ level, action }),
    })
  }

  // ── HP pct colour ─────────────────────────────────────────────────────────

  const hpPct = character.max_hp > 0 ? (currentHp / character.max_hp) * 100 : 0
  const hpColor = hpPct > 60 ? 'var(--color-hp-full)' : hpPct > 25 ? 'var(--color-hp-mid)' : 'var(--color-hp-low)'

  return (
    <div className="runic-card flex flex-col gap-0">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {/* Portrait thumb */}
        {character.portrait_path && (
          <img
            src={`/storage-file/${character.portrait_path}`}
            alt={character.name}
            className="w-10 h-12 object-cover rounded shrink-0"
            style={{ border: '1px solid var(--color-border)' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm tracking-widest uppercase truncate" style={{ color: 'var(--color-text-white)' }}>
            {character.name}
          </p>
          <p className="text-[10px] truncate" style={{ color: 'var(--color-text-dim)' }}>
            {character.race} {character.class} · Lv {character.level}
            {character.player_name && ` · ${character.player_name}`}
          </p>
        </div>
        <a href={`${baseUrl}/edit`} className="text-[10px] shrink-0 hover:underline" style={{ color: 'var(--color-rune)' }}>
          Edit
        </a>
      </div>

      {/* ── HP block ──────────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col gap-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-heading font-bold" style={{ color: hpColor }}>{currentHp}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>/ {character.max_hp}</span>
            {tempHp > 0 && <span className="text-xs" style={{ color: 'var(--color-arcane)' }}>+{tempHp} tmp</span>}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setHpMode(hpMode === 'damage' ? null : 'damage')}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${hpMode === 'damage' ? 'bg-red-800 text-red-200' : 'text-[var(--color-text-dim)] hover:text-red-300'}`}
              style={hpMode !== 'damage' ? { background: 'var(--color-deep)' } : {}}
            >
              Damage
            </button>
            <button
              onClick={() => setHpMode(hpMode === 'heal' ? null : 'heal')}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${hpMode === 'heal' ? 'bg-green-900 text-green-200' : 'text-[var(--color-text-dim)] hover:text-green-300'}`}
              style={hpMode !== 'heal' ? { background: 'var(--color-deep)' } : {}}
            >
              Heal
            </button>
          </div>
        </div>

        {/* HP bar */}
        <div className="hp-bar-track w-full">
          <div className="hp-bar-fill" style={{ width: `${Math.max(0, Math.min(100, hpPct))}%`, backgroundColor: hpColor, boxShadow: `0 0 6px ${hpColor}55` }} />
        </div>

        {/* HP input row */}
        {hpMode && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={hpInput}
              onChange={e => setHpInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyHp(hpMode) }}
              placeholder={hpMode === 'damage' ? 'Damage amount' : 'Heal amount'}
              autoFocus
              className="flex-1 text-xs px-2 py-1 rounded outline-none"
              style={{ background: 'var(--color-deep)', border: '1px solid var(--color-border)', color: 'var(--color-text-bright)' }}
            />
            <button
              onClick={() => applyHp(hpMode)}
              className="text-xs px-3 py-1 rounded font-heading tracking-widest"
              style={hpMode === 'damage'
                ? { background: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.4)' }
                : { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
              }
            >
              {hpMode === 'damage' ? 'Apply Damage' : 'Heal'}
            </button>
          </div>
        )}
      </div>

      {/* ── Quick stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x text-center" style={{ borderBottom: '1px solid var(--color-border)', divideBorderColor: 'var(--color-border)' }}>
        {[
          { label: 'AC',   value: character.armor_class },
          { label: 'Init', value: mod(character.dexterity) },
          { label: 'Spd',  value: `${character.speed}ft` },
        ].map(({ label, value }) => (
          <div key={label} className="py-2 flex flex-col items-center gap-0.5" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>{label}</span>
            <span className="text-sm font-heading font-bold" style={{ color: 'var(--color-text-bright)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Sub-tabs ──────────────────────────────────────────────────────── */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
        {(['combat', 'spells', 'inventory'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-[10px] uppercase tracking-widest py-1.5 transition-colors ${tab === t ? 'text-[var(--color-rune-bright)]' : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-base)]'}`}
            style={tab === t ? { borderBottom: '2px solid var(--color-rune)' } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: '320px' }}>

        {/* Combat tab */}
        {tab === 'combat' && (
          <div className="flex flex-col gap-3">
            {/* Rest buttons */}
            {restConfirm ? (
              <div className="flex flex-col gap-2 p-2 rounded" style={{ background: 'var(--color-deep)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs text-center" style={{ color: 'var(--color-text-dim)' }}>
                  {restConfirm === 'short' ? 'Short rest?' : 'Long rest? (restores HP, slots, abilities)'}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setRestConfirm(null)} className="flex-1">Cancel</Button>
                  <Button size="sm" variant="rune" onClick={() => doRest(restConfirm)} className="flex-1">Confirm</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setRestConfirm('short')} className="flex-1">Short Rest</Button>
                <Button size="sm" variant="ghost" onClick={() => setRestConfirm('long')} className="flex-1">Long Rest</Button>
              </div>
            )}

            {/* Ability scores */}
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'STR', key: 'strength' as const },
                { label: 'DEX', key: 'dexterity' as const },
                { label: 'CON', key: 'constitution' as const },
                { label: 'INT', key: 'intelligence' as const },
                { label: 'WIS', key: 'wisdom' as const },
                { label: 'CHA', key: 'charisma' as const },
              ].map(({ label, key }) => (
                <div key={label} className="flex flex-col items-center py-1 rounded" style={{ background: 'var(--color-deep)', border: '1px solid var(--color-border)' }}>
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>{label}</span>
                  <span className="text-sm font-bold font-heading" style={{ color: 'var(--color-text-bright)' }}>{character[key]}</span>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--color-rune)' }}>{mod(character[key] as number)}</span>
                </div>
              ))}
            </div>

            {/* Lay on Hands */}
            {hasLayOnHands && (
              <div className="flex flex-col gap-1.5 p-2 rounded" style={{ background: 'var(--color-deep)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>Lay on Hands</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-rune-bright)' }}>{layCurrent} / {layMax} HP</span>
                </div>
                <div className="hp-bar-track w-full">
                  <div className="hp-bar-fill" style={{
                    width: `${layMax! > 0 ? Math.max(0, Math.min(100, (layCurrent! / layMax!) * 100)) : 0}%`,
                    backgroundColor: 'var(--color-rune)',
                    boxShadow: '0 0 6px var(--color-rune)',
                  }} />
                </div>
                <div className="flex gap-1">
                  {[1, 5, 10].map(amt => (
                    <button key={`loh-use-${amt}`} onClick={() => adjustLay(-amt)} disabled={layCurrent === 0}
                      className="flex-1 text-[9px] py-0.5 rounded disabled:opacity-30 transition-colors"
                      style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' }}>
                      −{amt}
                    </button>
                  ))}
                  {[1, 5, 10].map(amt => (
                    <button key={`loh-heal-${amt}`} onClick={() => adjustLay(amt)} disabled={layCurrent === layMax}
                      className="flex-1 text-[9px] py-0.5 rounded disabled:opacity-30 transition-colors"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions */}
            {character.conditions && character.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {character.conditions.map(c => (
                  <Badge key={c.id} variant="danger">{c.name}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spells tab */}
        {tab === 'spells' && (
          <div className="flex flex-col gap-3">
            {hasSpellSlots && character.spell_slots && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>
                  Spell Slots · click to use · right-click to recover
                </p>
                {Object.entries(character.spell_slots)
                  .filter(([, max]) => (max as number) > 0)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([level, maxRaw]) => {
                    const max  = maxRaw as number
                    const used = slotsUsed[level] ?? 0
                    const rem  = max - used
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <span className="text-[9px] uppercase tracking-widest shrink-0 w-12" style={{ color: 'var(--color-text-dim)' }}>
                          {level === '0' ? 'Cantrip' : `Lv ${level}`}
                        </span>
                        <div className="flex gap-1 flex-wrap flex-1">
                          {Array.from({ length: max }).map((_, i) => {
                            const isUsed = i >= rem
                            return (
                              <button
                                key={i}
                                onClick={() => !isUsed && toggleSlot(Number(level), 'use')}
                                onContextMenu={e => { e.preventDefault(); isUsed && toggleSlot(Number(level), 'recover') }}
                                className={`w-5 h-5 rounded-full border transition-all ${isUsed ? 'border-[var(--color-border)] bg-transparent opacity-30 cursor-context-menu' : 'border-[var(--color-rune)] bg-[var(--color-rune)] cursor-pointer hover:brightness-125'}`}
                              />
                            )
                          })}
                        </div>
                        <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--color-text-dim)' }}>{rem}/{max}</span>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Prepared spells list */}
            {character.spells && character.spells.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-dim)' }}>Known / Prepared</p>
                {character.spells
                  .filter(s => s.is_prepared || s.level === 0)
                  .sort((a, b) => a.level - b.level)
                  .map(spell => (
                    <div key={spell.id} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'var(--color-deep)', border: '1px solid var(--color-border)' }}>
                      <span className="text-[9px] font-mono shrink-0" style={{ color: 'var(--color-rune-dim)' }}>
                        {spell.level === 0 ? 'C' : spell.level}
                      </span>
                      <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-bright)' }}>{spell.name}</span>
                      {spell.concentration && <span className="text-[8px]" style={{ color: 'var(--color-arcane)' }}>C</span>}
                      {spell.ritual      && <span className="text-[8px]" style={{ color: 'var(--color-text-dim)' }}>R</span>}
                    </div>
                  ))}
              </div>
            )}

            {(!character.spells || character.spells.length === 0) && !hasSpellSlots && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-dim)' }}>No spells recorded.</p>
            )}
          </div>
        )}

        {/* Inventory tab */}
        {tab === 'inventory' && (
          <div className="flex flex-col gap-1">
            {!character.inventory_items || character.inventory_items.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-dim)' }}>No inventory items.</p>
            ) : (
              character.inventory_items.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'var(--color-deep)', border: '1px solid var(--color-border)' }}>
                  <span className="text-xs flex-1 truncate" style={{ color: item.equipped ? 'var(--color-text-white)' : 'var(--color-text-base)' }}>
                    {item.name}
                  </span>
                  {item.quantity > 1 && <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--color-text-dim)' }}>×{item.quantity}</span>}
                  {item.equipped && <span className="text-[8px] uppercase tracking-widest shrink-0" style={{ color: 'var(--color-rune)' }}>Eq</span>}
                  {item.attuned && <span className="text-[8px] uppercase tracking-widest shrink-0" style={{ color: 'var(--color-arcane)' }}>At</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Session panel ─────────────────────────────────────────────────────────────

function SessionPanel({ campaign, session }: { campaign: Campaign; session: GameSession }) {
  const { isRecording, recordingSeconds, isUploading, uploadProgress, stopRecording, activeSessionId } = useRecording()
  const isThisSession = activeSessionId === session.id

  const sessionUrl = `/campaigns/${campaign.id}/sessions/${session.id}`

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Session info */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-dim)' }}>
          {session.session_number ? `Session #${session.session_number}` : 'Session'}
        </p>
        <p className="font-heading text-lg tracking-widest uppercase" style={{ color: 'var(--color-text-white)' }}>
          {session.title}
        </p>
        {session.played_at && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
            {new Date(session.played_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>

      {/* Recording control */}
      <div className="runic-card p-3 flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>Recording</p>
        {isThisSession && isRecording && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono" style={{ color: '#f87171' }}>
                {fmtTime(recordingSeconds)}
              </span>
            </div>
            <Button variant="danger" size="sm" onClick={stopRecording}>
              Stop Recording
            </Button>
          </div>
        )}
        {isThisSession && isUploading && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs" style={{ color: '#fbbf24' }}>{uploadProgress ?? 'Saving…'}</span>
          </div>
        )}
        {!isThisSession && !isRecording && (
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            Recording controls are on the{' '}
            <a href={sessionUrl} className="underline" style={{ color: 'var(--color-rune)' }}>session page</a>.
          </p>
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>Quick Links</p>
        <a href={sessionUrl} className="flex items-center gap-2 text-xs hover:underline" style={{ color: 'var(--color-rune)' }}>
          Full Session Page →
        </a>
        <a href={`/campaigns/${campaign.id}`} className="flex items-center gap-2 text-xs hover:underline" style={{ color: 'var(--color-rune)' }}>
          Campaign Overview →
        </a>
      </div>

      {/* Session notes preview */}
      {session.dm_notes && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-dim)' }}>DM Notes</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-base)' }}>
            {session.dm_notes}
          </p>
        </div>
      )}
      {session.key_events && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-dim)' }}>Key Events</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-base)' }}>
            {session.key_events}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Live({ campaign, session, characters, hasLlm, campaignContext }: Props) {
  const [tab, setTab] = useState<LiveTab>('characters')
  const { isRecording, activeSessionId } = useRecording()
  const isThisSession = activeSessionId === session.id

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: session.title, href: `/campaigns/${campaign.id}/sessions/${session.id}` },
      { label: 'Live' },
    ]}>
      <Head title={`Live · ${session.title}`} />

      <div className="flex flex-col gap-0">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            {isThisSession && isRecording && (
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <h1 className="font-heading text-base tracking-widest uppercase" style={{ color: 'var(--color-text-white)' }}>
              Live — {session.title}
            </h1>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 ml-auto">
            {([
              { key: 'characters', label: `Characters (${characters.length})` },
              { key: 'oracle',     label: 'Oracle' },
              { key: 'session',    label: 'Session' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`text-xs px-3 py-1.5 rounded uppercase tracking-widest font-heading transition-colors ${
                  tab === key
                    ? 'text-[var(--color-rune-bright)] bg-[var(--color-rune-glow)] border border-[var(--color-rune-dim)]'
                    : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-base)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Characters grid ───────────────────────────────────────────── */}
        {tab === 'characters' && (
          characters.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                No characters assigned to this session.{' '}
                <a href={`/campaigns/${campaign.id}/sessions/${session.id}/edit`} className="underline" style={{ color: 'var(--color-rune)' }}>
                  Edit session
                </a>{' '}
                to add participants.
              </p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(300px, 1fr))`,
                alignItems: 'start',
              }}
            >
              {characters.map(char => (
                <CharacterCard key={char.id} character={char} campaignId={campaign.id} />
              ))}
            </div>
          )
        )}

        {/* ── Oracle ────────────────────────────────────────────────────── */}
        {tab === 'oracle' && (
          <div className="runic-card flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 12rem)' }}>
            <OraclePanel campaignContext={campaignContext} hasLlm={hasLlm} />
          </div>
        )}

        {/* ── Session info ──────────────────────────────────────────────── */}
        {tab === 'session' && (
          <div className="runic-card overflow-y-auto" style={{ maxHeight: '100%' }}>
            <SessionPanel campaign={campaign} session={session} />
          </div>
        )}

      </div>
    </AppLayout>
  )
}
