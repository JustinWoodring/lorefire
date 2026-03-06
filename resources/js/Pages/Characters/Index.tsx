import React from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { HpBar } from '@/Components/HpBar'
import { Campaign, Character } from '@/types'

interface Props {
  campaign: Campaign | null
  characters: Character[]
  campaigns?: Campaign[]
}

export default function Index({ campaign, characters, campaigns }: Props) {
  const standalone = campaign === null

  const breadcrumbs = standalone
    ? [{ label: 'Characters' }]
    : [
        { label: 'Campaigns', href: '/campaigns' },
        { label: campaign!.name, href: `/campaigns/${campaign!.id}` },
        { label: 'Characters' },
      ]

  const createHref = standalone
    ? '/characters/create'
    : `/campaigns/${campaign!.id}/characters/create`

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={standalone ? 'Characters' : `Characters — ${campaign!.name}`} />

      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">
              {standalone ? 'All Characters' : 'Party'}
            </h1>
            <p className="text-xs text-[var(--color-text-dim)] mt-1 tracking-wide">
              {characters.length} {characters.length === 1 ? 'adventurer' : 'adventurers'}
              {!standalone && ` in ${campaign!.name}`}
            </p>
          </div>
          <div className="flex gap-2">
            {!standalone && (
              <Button variant="ghost" as="a" href={`/campaigns/${campaign!.id}`}>
                Back to Campaign
              </Button>
            )}
            <Button variant="rune" as="a" href={createHref}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Character
            </Button>
          </div>
        </div>

        {characters.length === 0 ? (
          <EmptyState createHref={createHref} />
        ) : (
          <div className="flex flex-col gap-3">
            {characters.map(c => (
              <CharacterRow key={c.id} campaign={campaign} character={c} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function CharacterRow({ campaign, character }: { campaign: Campaign | null; character: Character }) {
  const standalone = campaign === null
  const href = standalone
    ? `/characters/${character.id}`
    : `/campaigns/${campaign!.id}/characters/${character.id}`

  const mod = (score: number) => {
    const m = Math.floor((score - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  return (
    <Link href={href} className="block group">
      <div className="runic-card p-4 flex items-center gap-5 hover:border-[var(--color-muted)] transition-all duration-150 group-hover:bg-[var(--color-raised)]">

        {/* Avatar */}
        <div
          className="w-12 h-12 rounded flex items-center justify-center border border-[var(--color-border)] shrink-0 overflow-hidden"
          style={{ background: 'var(--color-deep)' }}
        >
          {character.portrait_path
            ? <img
                src={`/storage-file/${character.portrait_path}`}
                alt={character.name}
                className="w-full h-full object-cover object-top"
              />
            : <span className="font-heading text-lg text-[var(--color-rune)]">{character.name[0]}</span>
          }
        </div>

        {/* Name + class */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-heading text-base text-[var(--color-text-white)] tracking-wide">{character.name}</span>
            <Badge variant="rune">Lv {character.level}</Badge>
            {standalone && character.campaign && (
              <Badge variant="muted">{character.campaign.name}</Badge>
            )}
            {character.conditions && character.conditions.length > 0 && (
              <Badge variant="warning">Conditions</Badge>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-dim)] truncate">
            {character.race} {character.class}
            {character.subclass ? ` — ${character.subclass}` : ''}
            {character.player_name ? ` · ${character.player_name}` : ''}
          </p>
          <HpBar current={character.current_hp} max={character.max_hp} temp={character.temp_hp} className="mt-2 max-w-[180px]" />
        </div>

        {/* Ability score mods */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {(['strength','dexterity','constitution','intelligence','wisdom','charisma'] as const).map(ab => (
            <div key={ab} className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">{ab.slice(0,3)}</div>
              <div className="text-sm font-mono text-[var(--color-rune-bright)]">{mod(character[ab])}</div>
            </div>
          ))}
        </div>

        {/* Combat stats */}
        <div className="flex items-center gap-4 shrink-0">
          <Stat
            label="AC"
            value={
              character.inventory_items?.some(i => i.category === 'Shield' && i.equipped)
                ? `${character.armor_class}+2`
                : character.armor_class
            }
          />
          <Stat label="Speed" value={`${character.speed}ft`} />
        </div>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="text-[var(--color-border)] group-hover:text-[var(--color-rune)] transition-colors shrink-0"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="font-heading text-base text-[var(--color-rune-bright)] leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mt-0.5">{label}</div>
    </div>
  )
}

function EmptyState({ createHref }: { createHref: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-20">
        <circle cx="40" cy="40" r="38" stroke="#d4a017" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="40" cy="40" r="26" stroke="#d4a017" strokeWidth="0.75" strokeDasharray="2 4" />
        <path d="M40 20 L40 60 M28 30 L52 30 M28 40 L52 40 M28 50 L52 50" stroke="#d4a017" strokeWidth="0.75" />
        <circle cx="40" cy="40" r="3" fill="#d4a017" />
      </svg>
      <p className="font-heading text-[var(--color-text-dim)] tracking-widest uppercase text-sm">
        No adventurers yet
      </p>
      <p className="text-xs text-[var(--color-text-dim)] opacity-60 text-center max-w-xs">
        Add your first character to begin tracking the party's journey.
      </p>
      <Button variant="rune" as="a" href={createHref} className="mt-2">
        Add First Character
      </Button>
    </div>
  )
}
