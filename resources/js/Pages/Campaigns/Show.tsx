import React, { useEffect, useRef, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { usePdfExport } from '@/hooks/usePdfExport'
import AppLayout from '@/Layouts/AppLayout'
import { Card, CardHeader } from '@/Components/Card'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { HpBar } from '@/Components/HpBar'
import { RuneDivider } from '@/Components/RuneDivider'
import { Campaign, Character, GameSession, Npc } from '@/types'

interface Props {
  campaign: Campaign & {
    characters: Character[]
    npcs: Npc[]
    game_sessions: GameSession[]
  }
  imageGenProvider: string
}

export default function Show({ campaign, imageGenProvider }: Props) {
  const activeSessions = campaign.game_sessions.slice(0, 5)
  const pdf = usePdfExport(`/campaigns/${campaign.id}/export-pdf`)

  // Party portrait state
  const initialPartyPath = campaign.party_image_path
    ? `/storage-file/${campaign.party_image_path}?t=${new Date(campaign.updated_at).getTime()}`
    : null
  const [partyImageUrl, setPartyImageUrl]   = useState<string | null>(initialPartyPath)
  const [partyGenStatus, setPartyGenStatus] = useState<string>(
    // Treat a stale 'generating'/'idle' from a previous session as idle — don't auto-poll
    ['generating', 'idle'].includes(campaign.party_image_generation_status ?? '')
      ? 'idle'
      : (campaign.party_image_generation_status ?? 'idle')
  )
  const [partyError, setPartyError]         = useState<string | null>(null)
  const partyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stop polling helper
  const stopPartyPoll = () => {
    if (partyPollRef.current) {
      clearInterval(partyPollRef.current)
      partyPollRef.current = null
    }
  }

  // Poll only while actively generating (triggered by the generate button)
  useEffect(() => {
    if (partyGenStatus !== 'generating') return

    stopPartyPoll()
    partyPollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/campaigns/${campaign.id}/party-portrait-status`)
        const data = await res.json()

        setPartyGenStatus(data.status)

        if (data.status === 'done' && data.party_image_path) {
          setPartyImageUrl(`/storage-file/${data.party_image_path}?t=${Date.now()}`)
          stopPartyPoll()
        } else if (data.status === 'failed') {
          stopPartyPoll()
        }
      } catch {
        // keep polling
      }
    }, 4000)

    return () => stopPartyPoll()
  }, [partyGenStatus])

  const handleGeneratePartyPortrait = async () => {
    setPartyError(null)
    setPartyGenStatus('generating')

    try {
      const res = await fetch(`/campaigns/${campaign.id}/generate-party-portrait`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPartyError(data.error ?? 'Generation failed.')
        setPartyGenStatus('failed')
      }
    } catch {
      setPartyError('Request failed.')
      setPartyGenStatus('failed')
    }
  }

  const handleCancelPartyPortrait = async () => {
    stopPartyPoll()
    setPartyGenStatus('idle')
    setPartyError(null)

    try {
      await fetch(`/campaigns/${campaign.id}/cancel-party-portrait`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
      })
    } catch {
      // best-effort
    }
  }

  const isGenerating = partyGenStatus === 'generating'

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name },
    ]}>
      <Head title={campaign.name} />

      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* ── Campaign header ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Party portrait — full width banner */}
          {(partyImageUrl || imageGenProvider === 'comfyui') && (
            <div className="relative w-full rounded border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-deep)' }}>
              {partyImageUrl ? (
                <img
                  src={partyImageUrl}
                  alt="Party portrait"
                  className="w-full block"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center">
                  <span className="text-xs text-[var(--color-text-dim)]">No party portrait yet</span>
                </div>
              )}

              {/* Generating overlay */}
              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                  <div className="w-8 h-8 border-2 border-[var(--color-rune)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[var(--color-text-dim)] tracking-widest uppercase">Generating party portrait…</span>
                  <Button variant="ghost" size="sm" onClick={handleCancelPartyPortrait}>
                    Cancel
                  </Button>
                </div>
              )}

              {/* Action buttons — bottom-right overlay */}
              {!isGenerating && imageGenProvider === 'comfyui' && (
                <div className="absolute bottom-2 right-2">
                  <Button variant="ghost" size="sm" onClick={handleGeneratePartyPortrait}>
                    {partyImageUrl ? 'Regenerate Portrait' : 'Generate Portrait'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {partyError && (
            <p className="text-xs text-[var(--color-danger)]">{partyError}</p>
          )}

          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl text-[var(--color-text-white)] tracking-widest uppercase leading-tight">
                {campaign.name}
              </h1>
              {campaign.setting && (
                <p className="text-xs text-[var(--color-rune)] tracking-widest uppercase mt-1">{campaign.setting}</p>
              )}
              {campaign.description && (
                <p className="text-sm text-[var(--color-text-dim)] mt-2 max-w-xl leading-relaxed">{campaign.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" onClick={pdf.trigger} disabled={pdf.status === 'pending'} size="sm">
                {pdf.status === 'pending' ? 'Generating PDF...' : pdf.status === 'done' ? 'PDF Saved!' : pdf.status === 'failed' ? 'Export Failed' : 'Export PDF'}
              </Button>
              <Button variant="ghost" as="a" href={`/campaigns/${campaign.id}/edit`} size="sm">
                Edit
              </Button>
              <Button variant="rune" as="a" href={`/campaigns/${campaign.id}/sessions/create`} size="sm">
                + New Session
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) {
                    router.delete(`/campaigns/${campaign.id}`)
                  }
                }}
                className="text-[var(--color-danger)] hover:border-[var(--color-danger)]"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* ── Characters ──────────────────────────────────────────────── */}
          <div className="col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
                Party
              </h2>
              <Button variant="ghost" size="sm" as="a" href={`/campaigns/${campaign.id}/characters/create`}>
                + Character
              </Button>
            </div>

            {campaign.characters.length === 0 ? (
              <EmptySection
                message="No characters yet"
                sub="Add party members to begin tracking their journey."
                action={{ label: '+ Add Character', href: `/campaigns/${campaign.id}/characters/create` }}
              />
            ) : (
              campaign.characters.map(char => (
                <CharacterCard key={char.id} character={char} campaignId={campaign.id} />
              ))
            )}

            <RuneDivider label="Sessions" />

            {/* Sessions */}
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
                Recent Sessions
              </h2>
              <Button variant="ghost" size="sm" as="a" href={`/campaigns/${campaign.id}/sessions`}>
                View All
              </Button>
            </div>

            {activeSessions.length === 0 ? (
              <EmptySection
                message="No sessions recorded"
                sub="Record your first session to unlock transcription and bardic summaries."
                action={{ label: '+ New Session', href: `/campaigns/${campaign.id}/sessions/create` }}
              />
            ) : (
              activeSessions.map(session => (
                <SessionRow key={session.id} session={session} campaignId={campaign.id} />
              ))
            )}
          </div>

          {/* ── Sidebar: NPCs + info ─────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Campaign info */}
            <Card>
              <CardHeader title="Campaign Info" />
              <dl className="flex flex-col gap-2 text-xs">
                {campaign.dm_name && <InfoRow label="DM" value={campaign.dm_name} />}
                <InfoRow label="Sessions" value={campaign.game_sessions.length} />
                <InfoRow label="Characters" value={campaign.characters.length} />
                <InfoRow label="NPCs" value={campaign.npcs.length} />
                <InfoRow label="Art Style" value={campaign.art_style} />
              </dl>
            </Card>

            {/* NPCs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-heading text-xs uppercase tracking-widest text-[var(--color-text-dim)]">NPCs</h2>
                <Button variant="ghost" size="sm" as="a" href={`/campaigns/${campaign.id}/npcs/create`}>+</Button>
              </div>
              {campaign.npcs.length === 0 ? (
                <p className="text-xs text-[var(--color-text-dim)] text-center py-4">No NPCs yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {campaign.npcs.slice(0, 6).map(npc => (
                    <NpcChip key={npc.id} npc={npc} campaignId={campaign.id} />
                  ))}
                  {campaign.npcs.length > 6 && (
                    <Link href={`/campaigns/${campaign.id}/npcs`} className="text-xs text-[var(--color-text-dim)] text-center hover:text-[var(--color-text-base)] transition-colors">
                      +{campaign.npcs.length - 6} more
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function CharacterCard({ character, campaignId }: { character: Character; campaignId: number }) {
  const mod = (score: number) => {
    const m = Math.floor((score - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  return (
    <Link href={`/campaigns/${campaignId}/characters/${character.id}`}>
      <div className="runic-card p-3 flex items-center gap-4 hover:border-[var(--color-muted)] transition-all group">
        {/* Portrait placeholder */}
        <div
          className="w-10 h-10 rounded shrink-0 overflow-hidden flex items-center justify-center text-[var(--color-rune)] border border-[var(--color-border)]"
          style={{ background: 'var(--color-deep)' }}
        >
          {character.portrait_path ? (
            <img
              src={`/storage-file/${character.portrait_path}?t=${new Date(character.updated_at).getTime()}`}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-heading text-base">{character.name[0]}</span>
          )}
        </div>

        {/* Name + class */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm text-[var(--color-text-white)] tracking-wide">{character.name}</span>
            <Badge variant="muted">{character.race}</Badge>
          </div>
          <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
            {character.class}{character.subclass ? ` · ${character.subclass}` : ''} · Level {character.level}
          </p>
          <HpBar current={character.current_hp} max={character.max_hp} showNumbers={false} className="mt-1.5 w-24" />
        </div>

        {/* Key stats */}
        <div className="flex gap-3 shrink-0 text-center">
          {(['strength','dexterity','constitution','intelligence','wisdom','charisma'] as const).slice(0,3).map(stat => (
            <div key={stat} className="text-center">
              <div className="text-xs font-heading text-[var(--color-rune-bright)]">{mod(character[stat])}</div>
              <div className="text-[10px] uppercase text-[var(--color-text-dim)]">{stat.slice(0,3)}</div>
            </div>
          ))}
        </div>

        {/* HP */}
        <div className="text-center shrink-0">
          <div className="text-sm font-heading text-[var(--color-text-white)]">{character.current_hp}/{character.max_hp}</div>
          <div className="text-[10px] uppercase text-[var(--color-text-dim)]">HP</div>
        </div>

        {/* AC */}
        <div className="text-center shrink-0">
          <div className="text-sm font-heading text-[var(--color-arcane)]">
            {character.inventory_items?.some(i => i.category === 'Shield' && i.equipped)
              ? <>{character.armor_class}<span className="text-xs text-[var(--color-text-dim)]">+2</span></>
              : character.armor_class
            }
          </div>
          <div className="text-[10px] uppercase text-[var(--color-text-dim)]">AC</div>
        </div>
      </div>
    </Link>
  )
}

function SessionRow({ session, campaignId }: { session: GameSession; campaignId: number }) {
  const statusVariant: Record<GameSession['transcription_status'], 'success' | 'warning' | 'danger' | 'muted' | 'arcane'> = {
    done: 'success',
    processing: 'arcane',
    pending: 'warning',
    failed: 'danger',
    none: 'muted',
    cancelled: 'muted',
  }

  return (
    <Link href={`/campaigns/${campaignId}/sessions/${session.id}`}>
      <div className="runic-card px-4 py-3 flex items-center gap-4 hover:border-[var(--color-muted)] transition-all">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {session.session_number && (
              <span className="text-xs text-[var(--color-rune)] font-mono">#{session.session_number}</span>
            )}
            <span className="font-heading text-sm text-[var(--color-text-white)] tracking-wide truncate">{session.title}</span>
          </div>
          {session.played_at && (
            <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
              {new Date(session.played_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <Badge variant={statusVariant[session.transcription_status]}>
          {session.transcription_status === 'none' ? 'No audio' : session.transcription_status}
        </Badge>
      </div>
    </Link>
  )
}

function NpcChip({ npc, campaignId }: { npc: Npc; campaignId: number }) {
  const attitudeColor = npc.attitude === 'friendly' ? 'var(--color-success)' : npc.attitude === 'hostile' ? 'var(--color-danger)' : 'var(--color-text-dim)'
  return (
    <Link href={`/campaigns/${campaignId}/npcs/${npc.id}`}>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-muted)] transition-colors" style={{ background: 'var(--color-deep)' }}>
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: attitudeColor }} />
        <span className="text-xs text-[var(--color-text-base)] truncate">{npc.name}</span>
        {npc.role && <span className="text-[10px] text-[var(--color-text-dim)] truncate ml-auto">{npc.role}</span>}
      </div>
    </Link>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-[var(--color-text-dim)] uppercase tracking-widest text-[10px]">{label}</dt>
      <dd className="text-[var(--color-text-base)] capitalize">{value}</dd>
    </div>
  )
}

function EmptySection({ message, sub, action }: { message: string; sub: string; action?: { label: string; href: string } }) {
  return (
    <div className="runic-card py-8 flex flex-col items-center gap-2 text-center">
      <p className="text-sm text-[var(--color-text-dim)]">{message}</p>
      <p className="text-xs text-[var(--color-text-dim)] opacity-60 max-w-xs">{sub}</p>
      {action && (
        <Button variant="ghost" size="sm" as="a" href={action.href} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
