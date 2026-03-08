import React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { Encounter, GameSession, Campaign } from '@/types'

// When loaded via the top-level /encounters route, each encounter has its
// game_session (with campaign) eager-loaded by the controller.
type EncounterWithSession = Encounter & {
  game_session: GameSession & { campaign: Campaign }
}

interface Props {
  encounters: EncounterWithSession[]
}

const STATUS_VARIANTS: Record<Encounter['status'], 'muted' | 'rune' | 'success'> = {
  auto_detected: 'muted',
  confirmed: 'success',
  dismissed: 'muted',
}

const STATUS_LABELS: Record<Encounter['status'], string> = {
  auto_detected: 'Auto-detected',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
}

export default function Index({ encounters }: Props) {
  const active = encounters.filter(e => e.status !== 'dismissed')
  const dismissed = encounters.filter(e => e.status === 'dismissed')

  return (
    <AppLayout breadcrumbs={[{ label: 'Encounters' }]}>
      <Head title="Encounters" />

      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">Encounters</h1>
            <p className="text-xs text-[var(--color-text-dim)] mt-1 tracking-wide">
              {active.length} active · {dismissed.length} dismissed
            </p>
          </div>
        </div>

        {encounters.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {active.map(enc => (
              <EncounterRow key={enc.id} encounter={enc} />
            ))}
            {dismissed.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mt-4 mb-1">Dismissed</p>
                {dismissed.map(enc => (
                  <EncounterRow key={enc.id} encounter={enc} dimmed />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function EncounterRow({ encounter, dimmed }: { encounter: EncounterWithSession; dimmed?: boolean }) {
  const session = encounter.game_session
  const campaign = session?.campaign

  const confirm = (e: React.MouseEvent) => {
    e.preventDefault()
    router.patch(`/encounters/${encounter.id}`, { status: 'confirmed' }, { preserveScroll: true })
  }

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    router.patch(`/encounters/${encounter.id}`, { status: 'dismissed' }, { preserveScroll: true })
  }

  return (
    <div className={`runic-card p-4 flex items-center gap-4 ${dimmed ? 'opacity-50' : ''}`}>
      {/* Round count */}
      <div
        className="w-12 h-12 rounded flex flex-col items-center justify-center border border-[var(--color-border)] shrink-0"
        style={{ background: 'var(--color-deep)' }}
      >
        <span className="font-heading text-lg text-[var(--color-rune)] leading-none">{encounter.round_count}</span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Rounds</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-heading text-sm text-[var(--color-text-white)] tracking-wide">
            {encounter.name ?? 'Unnamed Encounter'}
          </span>
          <Badge variant={STATUS_VARIANTS[encounter.status]}>{STATUS_LABELS[encounter.status]}</Badge>
        </div>
        {campaign && session && (
          <div className="flex items-center gap-1 flex-wrap">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="text-[10px] text-[var(--color-rune)] hover:underline opacity-80"
            >
              {campaign.name}
            </Link>
            <span className="text-[10px] text-[var(--color-text-dim)] opacity-40">›</span>
            <Link
              href={`/campaigns/${campaign.id}/sessions/${session.id}`}
              className="text-[10px] text-[var(--color-text-dim)] hover:underline"
            >
              {session.title}
            </Link>
          </div>
        )}
        {encounter.summary && (
          <p className="text-xs text-[var(--color-text-dim)] truncate mt-0.5">{encounter.summary}</p>
        )}
        {encounter.turns && encounter.turns.length > 0 && (
          <p className="text-[10px] text-[var(--color-text-dim)] opacity-60 mt-0.5">
            {encounter.turns.length} turns logged
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {encounter.status !== 'confirmed' && (
          <Button variant="ghost" size="sm" onClick={confirm}>Confirm</Button>
        )}
        {encounter.status !== 'dismissed' && (
          <Button variant="muted" size="sm" onClick={dismiss}>Dismiss</Button>
        )}
        <Link href={`/encounters/${encounter.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-20">
        <circle cx="40" cy="40" r="38" stroke="#d4a017" strokeWidth="1" strokeDasharray="4 3" />
        <path d="M25 55 L40 15 L55 55" stroke="#d4a017" strokeWidth="1" fill="none" />
        <path d="M30 42 L50 42" stroke="#d4a017" strokeWidth="0.75" />
        <circle cx="40" cy="40" r="3" fill="#d4a017" />
      </svg>
      <p className="font-heading text-[var(--color-text-dim)] tracking-widest uppercase text-sm">
        No encounters detected
      </p>
      <p className="text-xs text-[var(--color-text-dim)] opacity-60 text-center max-w-xs">
        Transcribe a session's audio to automatically detect combat encounters.
      </p>
    </div>
  )
}
