import React from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Card } from '@/Components/Card'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { Campaign } from '@/types'

interface Props {
  campaigns: Campaign[]
}

export default function Index({ campaigns }: Props) {
  return (
    <AppLayout
      title="Campaigns"
      breadcrumbs={[{ label: 'Campaigns' }]}
    >
      <Head title="Campaigns" />

      <div className="max-w-4xl mx-auto">

        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">
              Your Campaigns
            </h1>
            <p className="text-xs text-[var(--color-text-dim)] mt-1 tracking-wide">
              {campaigns.length} {campaigns.length === 1 ? 'chronicle' : 'chronicles'} recorded
            </p>
          </div>
          <Button variant="rune" as="a" href="/campaigns/create">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  return (
    <Link href={`/campaigns/${campaign.id}`} className="block group">
      <div
        className="runic-card p-4 flex items-center gap-4 hover:border-[var(--color-muted)] transition-all duration-150 group-hover:bg-[var(--color-raised)]"
      >
        {/* Art style badge + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-heading text-base text-[var(--color-text-white)] tracking-wide truncate">
              {campaign.name}
            </h2>
            <Badge variant={campaign.is_active ? 'rune' : 'muted'}>
              {campaign.is_active ? 'Active' : 'Archived'}
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-text-dim)] truncate">
            {campaign.setting ? `${campaign.setting} · ` : ''}
            {campaign.dm_name ? `DM: ${campaign.dm_name}` : 'No DM set'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 shrink-0">
          <Stat label="Characters" value={campaign.characters_count ?? 0} />
          <Stat label="Sessions" value={campaign.game_sessions_count ?? 0} />
          <Stat label="NPCs" value={campaign.npcs_count ?? 0} />
        </div>

        {/* Arrow */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="text-[var(--color-border)] group-hover:text-[var(--color-rune)] transition-colors shrink-0"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="font-heading text-lg text-[var(--color-rune-bright)] leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mt-0.5">{label}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      {/* Runic circle decoration */}
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-20">
        <circle cx="40" cy="40" r="38" stroke="#d4a017" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="40" cy="40" r="26" stroke="#d4a017" strokeWidth="0.75" strokeDasharray="2 4" />
        <polygon points="40,10 68,25 68,55 40,70 12,55 12,25" stroke="#d4a017" strokeWidth="0.75" fill="none" />
        <circle cx="40" cy="40" r="3" fill="#d4a017" />
      </svg>
      <p className="font-heading text-[var(--color-text-dim)] tracking-widest uppercase text-sm">
        No chronicles yet
      </p>
      <p className="text-xs text-[var(--color-text-dim)] opacity-60 text-center max-w-xs">
        Begin your first campaign to track characters, sessions, and the stories you forge together.
      </p>
      <Button variant="rune" as="a" href="/campaigns/create" className="mt-2">
        Begin a Campaign
      </Button>
    </div>
  )
}
