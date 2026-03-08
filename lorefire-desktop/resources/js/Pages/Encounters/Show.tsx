import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Card, CardHeader } from '@/Components/Card'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { RuneDivider } from '@/Components/RuneDivider'
import { Campaign, GameSession, Encounter, EncounterTurn } from '@/types'

interface Props {
  campaign: Campaign
  session: GameSession
  encounter: Encounter & { turns: EncounterTurn[] }
}

const ACTION_COLORS: Record<string, string> = {
  attack: 'var(--color-danger)',
  spell: 'var(--color-arcane)',
  heal: 'var(--color-success)',
  move: 'var(--color-text-dim)',
  bonus_action: 'var(--color-warning)',
  reaction: 'var(--color-rune)',
  other: 'var(--color-text-dim)',
}

function formatSecond(s: number | null) {
  if (s === null) return null
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Show({ campaign, session, encounter }: Props) {
  const [statusUpdating, setStatusUpdating] = useState(false)

  const rounds = encounter.turns.reduce((acc, turn) => {
    if (!acc[turn.round_number]) acc[turn.round_number] = []
    acc[turn.round_number].push(turn)
    return acc
  }, {} as Record<number, EncounterTurn[]>)

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)

  const setStatus = (status: Encounter['status']) => {
    setStatusUpdating(true)
    router.patch(`/encounters/${encounter.id}`, { status }, {
      preserveScroll: true,
      onFinish: () => setStatusUpdating(false),
    })
  }

  const totalDamage = encounter.turns.reduce((sum, t) => sum + (t.damage_dealt ?? 0), 0)
  const totalHealing = encounter.turns.reduce((sum, t) => sum + (t.healing_done ?? 0), 0)
  const crits = encounter.turns.filter(t => t.is_critical).length
  const uniqueActors = [...new Set(encounter.turns.map(t => t.actor_name))]

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: session.title, href: `/campaigns/${campaign.id}/sessions/${session.id}` },
      { label: 'Encounters', href: `/encounters/${encounter.id}` },
      { label: encounter.name ?? 'Encounter' },
    ]}>
      <Head title={`${encounter.name ?? 'Encounter'} — ${session.title}`} />

      <div className="max-w-4xl mx-auto flex flex-col gap-5">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="runic-card p-5 flex items-start gap-4">
          <div
            className="w-14 h-14 rounded flex flex-col items-center justify-center border border-[var(--color-border)] shrink-0"
            style={{ background: 'var(--color-deep)' }}
          >
            <span className="font-heading text-xl text-[var(--color-rune)] leading-none">{encounter.round_count}</span>
            <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Rounds</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-heading text-xl text-[var(--color-text-white)] tracking-widest uppercase">
                {encounter.name ?? 'Unnamed Encounter'}
              </h1>
              <Badge variant={encounter.status === 'confirmed' ? 'success' : encounter.status === 'dismissed' ? 'muted' : 'warning'}>
                {encounter.status === 'auto_detected' ? 'Auto-detected' : encounter.status.charAt(0).toUpperCase() + encounter.status.slice(1)}
              </Badge>
            </div>
            <p className="text-xs text-[var(--color-text-dim)]">Session: {session.title}</p>
            {encounter.summary && (
              <p className="text-sm text-[var(--color-text-base)] mt-2 leading-relaxed">{encounter.summary}</p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {encounter.status !== 'confirmed' && (
              <Button variant="rune" size="sm" disabled={statusUpdating} onClick={() => setStatus('confirmed')}>
                Confirm
              </Button>
            )}
            {encounter.status !== 'dismissed' && (
              <Button variant="ghost" size="sm" disabled={statusUpdating} onClick={() => setStatus('dismissed')}>
                Dismiss
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Combatants" value={uniqueActors.length} />
          <StatCard label="Total Damage" value={totalDamage} color="var(--color-danger)" />
          <StatCard label="Total Healing" value={totalHealing} color="var(--color-success)" />
          <StatCard label="Critical Hits" value={crits} color="var(--color-rune-bright)" />
        </div>

        {/* ── Combatant list ────────────────────────────────────────── */}
        {uniqueActors.length > 0 && (
          <Card>
            <CardHeader title="Combatants" />
            <div className="flex flex-wrap gap-2">
              {uniqueActors.map(actor => {
                const actorTurns = encounter.turns.filter(t => t.actor_name === actor)
                const dmg = actorTurns.reduce((s, t) => s + (t.damage_dealt ?? 0), 0)
                const heal = actorTurns.reduce((s, t) => s + (t.healing_done ?? 0), 0)
                const isPC = actorTurns.some(t => t.actor_type === 'pc')
                return (
                  <div key={actor} className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-deep)]">
                    <span className="text-xs font-heading text-[var(--color-text-bright)]">{actor}</span>
                    <Badge variant={isPC ? 'rune' : 'muted'}>{isPC ? 'PC' : 'NPC'}</Badge>
                    {dmg > 0 && <span className="text-[10px] text-[var(--color-danger)] font-mono">{dmg} dmg</span>}
                    {heal > 0 && <span className="text-[10px] text-[var(--color-success)] font-mono">{heal} heal</span>}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── Round-by-round timeline ───────────────────────────────── */}
        {encounter.turns.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--color-text-dim)]">
            No turn data recorded for this encounter.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <RuneDivider label="Combat Timeline" />

            {roundNumbers.map(roundNum => (
              <div key={roundNum}>
                {/* Round header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                  <span className="text-[10px] uppercase tracking-widest text-[var(--color-rune)] font-mono px-2">
                    Round {roundNum}
                  </span>
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                </div>

                {/* Turns */}
                <div className="flex flex-col gap-1.5 pl-2">
                  {rounds[roundNum]
                    .sort((a, b) => a.turn_order - b.turn_order)
                    .map(turn => (
                      <TurnRow key={turn.id} turn={turn} />
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function TurnRow({ turn }: { turn: EncounterTurn }) {
  const actionColor = turn.action_type ? (ACTION_COLORS[turn.action_type] ?? ACTION_COLORS.other) : ACTION_COLORS.other
  const time = formatSecond(turn.transcript_second)
  const isPC = turn.actor_type === 'pc'

  return (
    <div className="runic-card px-3 py-2 flex items-center gap-3">
      {/* Turn order number */}
      <span className="font-mono text-[10px] text-[var(--color-text-dim)] w-4 shrink-0 text-right">
        {turn.turn_order}
      </span>

      {/* Actor dot + name */}
      <div className="flex items-center gap-1.5 min-w-[110px] shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPC ? 'bg-[var(--color-rune)]' : 'bg-[var(--color-text-dim)]'}`} />
        <span className={`text-xs font-heading truncate ${isPC ? 'text-[var(--color-rune-bright)]' : 'text-[var(--color-text-base)]'}`}>
          {turn.actor_name}
        </span>
      </div>

      {/* Action type tag */}
      {turn.action_type && (
        <span
          className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0"
          style={{ borderColor: actionColor, color: actionColor }}
        >
          {turn.action_type.replace(/_/g, ' ')}
        </span>
      )}

      {/* Description */}
      <p className="text-xs text-[var(--color-text-dim)] flex-1 truncate">
        {turn.action_description ?? '—'}
        {turn.target_name && <span className="text-[var(--color-text-base)]"> → {turn.target_name}</span>}
      </p>

      {/* Numbers */}
      <div className="flex items-center gap-2 shrink-0">
        {turn.is_critical && (
          <Badge variant="rune">CRIT</Badge>
        )}
        {(turn.damage_dealt ?? 0) > 0 && (
          <span className="text-xs font-mono text-[var(--color-danger)]">-{turn.damage_dealt}</span>
        )}
        {(turn.healing_done ?? 0) > 0 && (
          <span className="text-xs font-mono text-[var(--color-success)]">+{turn.healing_done}</span>
        )}
        {time && (
          <span className="text-[10px] font-mono text-[var(--color-text-dim)] opacity-50">{time}</span>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="runic-card p-3 flex flex-col items-center gap-1">
      <span className="font-heading text-2xl leading-none" style={{ color: color ?? 'var(--color-rune-bright)' }}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">{label}</span>
    </div>
  )
}
