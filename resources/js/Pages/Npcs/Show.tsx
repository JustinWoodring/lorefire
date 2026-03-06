import React from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Card, CardHeader } from '@/Components/Card'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { Campaign, Npc } from '@/types'

interface Props {
  campaign: Campaign
  npc: Npc
}

const ATTITUDE_VARIANTS: Record<NonNullable<Npc['attitude']>, 'success' | 'muted' | 'danger'> = {
  friendly: 'success',
  neutral: 'muted',
  hostile: 'danger',
}

export default function Show({ campaign, npc }: Props) {
  const destroy = () => {
    if (confirm(`Remove ${npc.name} from the campaign?`)) {
      router.delete(`/campaigns/${campaign.id}/npcs/${npc.id}`)
    }
  }

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: 'NPCs', href: `/campaigns/${campaign.id}/npcs` },
      { label: npc.name },
    ]}>
      <Head title={`${npc.name} — ${campaign.name}`} />

      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header card */}
        <div className="runic-card p-5 flex items-start gap-4">

          {/* Avatar */}
          <div
            className="w-16 h-16 rounded shrink-0 flex items-center justify-center border border-[var(--color-border)]"
            style={{ background: 'var(--color-deep)' }}
          >
            <span className="font-heading text-2xl text-[var(--color-rune)]">{npc.name[0]}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">{npc.name}</h1>
              {!npc.is_alive && <Badge variant="danger">Deceased</Badge>}
              {npc.attitude && (
                <Badge variant={ATTITUDE_VARIANTS[npc.attitude]}>
                  {npc.attitude.charAt(0).toUpperCase() + npc.attitude.slice(1)}
                </Badge>
              )}
              {npc.tags && npc.tags.map(tag => (
                <Badge key={tag} variant="muted">{tag}</Badge>
              ))}
            </div>

            {(npc.race || npc.role) && (
              <p className="text-sm text-[var(--color-text-dim)]">
                {[npc.race, npc.role].filter(Boolean).join(' · ')}
              </p>
            )}

            {npc.location && (
              <p className="text-xs text-[var(--color-text-dim)] opacity-60 mt-0.5">
                <span className="mr-1">Location:</span>{npc.location}
                {npc.last_seen && <span className="ml-3 opacity-70">Last seen: {npc.last_seen}</span>}
              </p>
            )}

            {!npc.location && npc.last_seen && (
              <p className="text-xs text-[var(--color-text-dim)] opacity-60 mt-0.5">
                Last seen: {npc.last_seen}
              </p>
            )}

            {npc.voice_description && (
              <p className="text-xs text-[var(--color-text-dim)] italic mt-1">"{npc.voice_description}"</p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="sm" as="a" href={`/campaigns/${campaign.id}/npcs/${npc.id}/edit`}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={destroy}>
              Delete
            </Button>
          </div>
        </div>

        {/* Description */}
        {npc.description && (
          <Card>
            <CardHeader title="Description" />
            <p className="text-sm text-[var(--color-text-base)] leading-relaxed whitespace-pre-wrap">
              {npc.description}
            </p>
          </Card>
        )}

        {/* DM Notes */}
        {npc.notes && (
          <Card>
            <CardHeader title="DM Notes" />
            <p className="text-sm text-[var(--color-text-base)] leading-relaxed whitespace-pre-wrap">
              {npc.notes}
            </p>
          </Card>
        )}

        {/* Meta info */}
        <Card>
          <CardHeader title="Details" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Campaign" value={campaign.name} />
            <Detail label="Status" value={npc.is_alive ? 'Alive' : 'Deceased'} />
            {npc.race && <Detail label="Race / Type" value={npc.race} />}
            {npc.role && <Detail label="Role / Title" value={npc.role} />}
            {npc.location && <Detail label="Location" value={npc.location} />}
            {npc.last_seen && <Detail label="Last Seen" value={npc.last_seen} />}
            {npc.attitude && <Detail label="Attitude" value={npc.attitude.charAt(0).toUpperCase() + npc.attitude.slice(1)} />}
            {npc.voice_description && <Detail label="Voice" value={npc.voice_description} />}
          </div>
          {npc.tags && npc.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {npc.tags.map(tag => (
                <Badge key={tag} variant="muted">{tag}</Badge>
              ))}
            </div>
          )}
        </Card>

      </div>
    </AppLayout>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--color-text-bright)]">{value}</p>
    </div>
  )
}
