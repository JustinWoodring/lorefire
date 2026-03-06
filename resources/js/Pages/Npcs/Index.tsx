import React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { Campaign, Npc } from '@/types'

interface Props {
  campaign: Campaign
  npcs: Npc[]
}

const ATTITUDE_VARIANTS: Record<NonNullable<Npc['attitude']>, 'success' | 'muted' | 'danger'> = {
  friendly: 'success',
  neutral: 'muted',
  hostile: 'danger',
}

export default function Index({ campaign, npcs }: Props) {
  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: 'NPCs' },
    ]}>
      <Head title={`NPCs — ${campaign.name}`} />

      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">NPCs</h1>
            <p className="text-xs text-[var(--color-text-dim)] mt-1 tracking-wide">
              {npcs.length} {npcs.length === 1 ? 'character' : 'characters'} catalogued
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" as="a" href={`/campaigns/${campaign.id}`}>
              Back to Campaign
            </Button>
            <Button variant="rune" as="a" href={`/campaigns/${campaign.id}/npcs/create`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add NPC
            </Button>
          </div>
        </div>

        {npcs.length === 0 ? (
          <EmptyState campaign={campaign} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {npcs.map(npc => (
              <NpcCard key={npc.id} campaign={campaign} npc={npc} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function NpcCard({ campaign, npc }: { campaign: Campaign; npc: Npc }) {
  return (
    <Link href={`/campaigns/${campaign.id}/npcs/${npc.id}`} className="block group">
      <div className="runic-card p-4 flex items-start gap-3 hover:border-[var(--color-muted)] transition-all duration-150 group-hover:bg-[var(--color-raised)] h-full">

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded flex items-center justify-center border border-[var(--color-border)] shrink-0 mt-0.5"
          style={{ background: 'var(--color-deep)' }}
        >
          <span className="font-heading text-base text-[var(--color-rune)]">{npc.name[0]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-heading text-sm text-[var(--color-text-white)] tracking-wide">{npc.name}</span>
            {!npc.is_alive && <Badge variant="danger">Deceased</Badge>}
            {npc.attitude && (
              <Badge variant={ATTITUDE_VARIANTS[npc.attitude]}>
                {npc.attitude.charAt(0).toUpperCase() + npc.attitude.slice(1)}
              </Badge>
            )}
          </div>

          {(npc.race || npc.role) && (
            <p className="text-xs text-[var(--color-text-dim)] truncate">
              {[npc.race, npc.role].filter(Boolean).join(' · ')}
            </p>
          )}

          {npc.location && (
            <p className="text-[10px] text-[var(--color-text-dim)] opacity-60 mt-0.5 truncate">
              {npc.location}
            </p>
          )}

          {npc.description && (
            <p className="text-xs text-[var(--color-text-dim)] mt-1 leading-relaxed line-clamp-2">
              {npc.description}
            </p>
          )}
        </div>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="text-[var(--color-border)] group-hover:text-[var(--color-rune)] transition-colors shrink-0 mt-1"
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
        <path d="M32 28 Q40 20 48 28 L50 55 L40 58 L30 55 Z" stroke="#d4a017" strokeWidth="0.75" fill="none" />
        <circle cx="40" cy="26" r="5" stroke="#d4a017" strokeWidth="0.75" fill="none" />
      </svg>
      <p className="font-heading text-[var(--color-text-dim)] tracking-widest uppercase text-sm">
        No NPCs yet
      </p>
      <p className="text-xs text-[var(--color-text-dim)] opacity-60 text-center max-w-xs">
        Populate your world with the allies, enemies, and strangers your party will encounter.
      </p>
      <Button variant="rune" as="a" href={`/campaigns/${campaign.id}/npcs/create`} className="mt-2">
        Add First NPC
      </Button>
    </div>
  )
}
