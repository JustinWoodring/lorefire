import React from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { Campaign, GameSession } from '@/types'

interface Props {
  campaign: Campaign
  sessions: GameSession[]
}

const STATUS_VARIANTS: Record<GameSession['transcription_status'], 'muted' | 'warning' | 'arcane' | 'success' | 'danger'> = {
  none: 'muted',
  pending: 'warning',
  processing: 'arcane',
  done: 'success',
  failed: 'danger',
  cancelled: 'muted',
}

const STATUS_LABELS: Record<GameSession['transcription_status'], string> = {
  none: 'No Audio',
  pending: 'Pending',
  processing: 'Transcribing',
  done: 'Transcribed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Index({ campaign, sessions }: Props) {
  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: 'Sessions' },
    ]}>
      <Head title={`Sessions — ${campaign.name}`} />

      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">Sessions</h1>
            <p className="text-xs text-[var(--color-text-dim)] mt-1 tracking-wide">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} recorded
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" as="a" href={`/campaigns/${campaign.id}`}>
              Back to Campaign
            </Button>
            <Button variant="rune" as="a" href={`/campaigns/${campaign.id}/sessions/create`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Session
            </Button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <EmptyState campaign={campaign} />
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map(s => (
              <SessionRow key={s.id} campaign={campaign} session={s} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function SessionRow({ campaign, session }: { campaign: Campaign; session: GameSession }) {
  const duration = formatDuration(session.duration_seconds)
  const date = formatDate(session.played_at)

  return (
    <Link href={`/campaigns/${campaign.id}/sessions/${session.id}`} className="block group">
      <div className="runic-card p-4 flex items-center gap-4 hover:border-[var(--color-muted)] transition-all duration-150 group-hover:bg-[var(--color-raised)]">

        {/* Session number badge */}
        <div
          className="w-10 h-10 rounded flex items-center justify-center border border-[var(--color-border)] shrink-0"
          style={{ background: 'var(--color-deep)' }}
        >
          <span className="font-heading text-sm text-[var(--color-rune)]">
            {session.session_number ?? '?'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-heading text-sm text-[var(--color-text-white)] tracking-wide">{session.title}</span>
            <Badge variant={STATUS_VARIANTS[session.transcription_status]}>
              {STATUS_LABELS[session.transcription_status]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
            {date && <span>{date}</span>}
            {duration && <span>· {duration}</span>}
            {session.encounters && session.encounters.length > 0 && (
              <span>· {session.encounters.length} encounter{session.encounters.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          {session.summary && (
            <p className="text-xs text-[var(--color-text-dim)] mt-1 truncate opacity-70">{session.summary}</p>
          )}
        </div>

        {/* Waveform icon if audio present */}
        {session.audio_path && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className="text-[var(--color-rune-dim)] shrink-0"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="text-[var(--color-border)] group-hover:text-[var(--color-rune)] transition-colors shrink-0"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  )
}

function EmptyState({ campaign }: { campaign: Campaign }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-20">
        <circle cx="40" cy="40" r="38" stroke="#d4a017" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="40" cy="40" r="26" stroke="#d4a017" strokeWidth="0.75" strokeDasharray="2 4" />
        <circle cx="40" cy="40" r="8" stroke="#d4a017" strokeWidth="0.75" fill="none" />
        <line x1="40" y1="14" x2="40" y2="66" stroke="#d4a017" strokeWidth="0.5" strokeDasharray="2 3" />
      </svg>
      <p className="font-heading text-[var(--color-text-dim)] tracking-widest uppercase text-sm">
        No sessions yet
      </p>
      <p className="text-xs text-[var(--color-text-dim)] opacity-60 text-center max-w-xs">
        Record your first session to begin tracking encounters, transcripts, and the tales you tell.
      </p>
      <Button variant="rune" as="a" href={`/campaigns/${campaign.id}/sessions/create`} className="mt-2">
        Record First Session
      </Button>
    </div>
  )
}
