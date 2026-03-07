import React, { useState, useRef, useEffect } from 'react'
import { Head, Link, router, useForm } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Card, CardHeader, StatBlock } from '@/Components/Card'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { HpBar } from '@/Components/HpBar'
import { RuneDivider } from '@/Components/RuneDivider'
import { Input } from '@/Components/Input'
import { Campaign, Character, InventoryItem, InventorySnapshot } from '@/types'

interface Props {
  campaign: Campaign | null
  character: Character
  imageGenProvider?: string | null
}

type Tab = 'stats' | 'spells' | 'inventory' | 'features' | 'notes'

const SKILLS: Array<{ name: string; ability: keyof Character }> = [
  { name: 'Acrobatics', ability: 'dexterity' },
  { name: 'Animal Handling', ability: 'wisdom' },
  { name: 'Arcana', ability: 'intelligence' },
  { name: 'Athletics', ability: 'strength' },
  { name: 'Deception', ability: 'charisma' },
  { name: 'History', ability: 'intelligence' },
  { name: 'Insight', ability: 'wisdom' },
  { name: 'Intimidation', ability: 'charisma' },
  { name: 'Investigation', ability: 'intelligence' },
  { name: 'Medicine', ability: 'wisdom' },
  { name: 'Nature', ability: 'intelligence' },
  { name: 'Perception', ability: 'wisdom' },
  { name: 'Performance', ability: 'charisma' },
  { name: 'Persuasion', ability: 'charisma' },
  { name: 'Religion', ability: 'intelligence' },
  { name: 'Sleight of Hand', ability: 'dexterity' },
  { name: 'Stealth', ability: 'dexterity' },
  { name: 'Survival', ability: 'wisdom' },
]

// D&D 5e spell slots by class+level
const SPELL_SLOT_CLASSES = ['Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard','Artificer','Eldritch Knight','Arcane Trickster']

export default function Show({ campaign, character, imageGenProvider }: Props) {
  const standalone = campaign === null
  const [tab, setTab] = useState<Tab>('stats')
  const [showImport, setShowImport] = useState(false)
  const [restConfirm, setRestConfirm] = useState<'short' | 'long' | null>(null)

  // Portrait generation polling
  const [livePortraitPath, setLivePortraitPath] = useState<string | null>(
    character.portrait_path ? `/storage-file/${character.portrait_path}?t=${new Date(character.updated_at).getTime()}` : null
  )
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'done' | 'failed'>(
    character.portrait_generation_status ?? 'idle'
  )
  const genPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (genStatus !== 'generating') return
    genPollRef.current = setInterval(async () => {
      const res = await fetch(`/characters/${character.id}/portrait-status`)
      if (!res.ok) return
      const json = await res.json()
      setGenStatus(json.status)
      if (json.status === 'done' && json.portrait_path) {
        setLivePortraitPath(`/storage-file/${json.portrait_path}?t=${Date.now()}`)
        clearInterval(genPollRef.current!)
      } else if (json.status === 'failed') {
        clearInterval(genPollRef.current!)
      }
    }, 3000)
    return () => { if (genPollRef.current) clearInterval(genPollRef.current) }
  }, [genStatus])

  const handleCancelGeneration = async () => {
    await fetch(`/characters/${character.id}/cancel-portrait`, { method: 'POST', headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' } })
    setGenStatus('failed')
    if (genPollRef.current) clearInterval(genPollRef.current)
  }

  const importForm = useForm({ dnd_beyond_url: character.dnd_beyond_url ?? '' })

  const importUrl = standalone
    ? `/characters/${character.id}/import-dnd-beyond`
    : `/campaigns/${campaign!.id}/characters/${character.id}/import-dnd-beyond`

  const deleteHref = standalone
    ? `/characters/${character.id}`
    : `/campaigns/${campaign!.id}/characters/${character.id}`

  const editHref = standalone
    ? `/characters/${character.id}/edit`
    : `/campaigns/${campaign!.id}/characters/${character.id}/edit`

  const restBaseUrl = standalone
    ? `/characters/${character.id}/rest`
    : `/campaigns/${campaign!.id}/characters/${character.id}/rest`

  const spellSlotsUrl = standalone
    ? `/characters/${character.id}/spell-slots`
    : `/campaigns/${campaign!.id}/characters/${character.id}/spell-slots`

  const classFeaturesUrl = `/characters/${character.id}/class-features`

  const submitImport = (e: React.FormEvent) => {
    e.preventDefault()
    importForm.post(importUrl, {
      onSuccess: () => setShowImport(false),
    })
  }

  const doRest = (type: 'short' | 'long') => {
    router.post(`${restBaseUrl}/${type}`, {}, { preserveScroll: true })
    setRestConfirm(null)
  }

  const toggleSlot = (level: number, action: 'use' | 'recover') => {
    router.patch(spellSlotsUrl, { level, action }, { preserveScroll: true })
  }

  const mod = (score: number) => {
    const m = Math.floor((score - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  const skillMod = (skill: (typeof SKILLS)[0]) => {
    const abilityScore = character[skill.ability] as number
    const base = Math.floor((abilityScore - 10) / 2)
    const key = skill.name.toLowerCase().replace(/ /g, '_')
    const hasProficiency = character.skill_proficiencies?.some(s => s.toLowerCase() === key)
    const hasExpertise = character.skill_expertises?.some(s => s.toLowerCase() === key)
    const bonus = hasExpertise
      ? character.proficiency_bonus * 2
      : hasProficiency
        ? character.proficiency_bonus
        : 0
    const total = base + bonus
    return { value: total >= 0 ? `+${total}` : `${total}`, proficient: hasProficiency || hasExpertise, expert: hasExpertise }
  }

  const abilities = [
    { label: 'STR', key: 'strength' as const },
    { label: 'DEX', key: 'dexterity' as const },
    { label: 'CON', key: 'constitution' as const },
    { label: 'INT', key: 'intelligence' as const },
    { label: 'WIS', key: 'wisdom' as const },
    { label: 'CHA', key: 'charisma' as const },
  ]

  const hasSpellSlots = SPELL_SLOT_CLASSES.some(c => character.class?.includes(c))
    || (character.spell_slots && Object.keys(character.spell_slots).length > 0)

  return (
    <AppLayout breadcrumbs={
      standalone
        ? [{ label: 'Characters', href: '/characters' }, { label: character.name }]
        : [
            { label: 'Campaigns', href: '/campaigns' },
            { label: campaign!.name, href: `/campaigns/${campaign!.id}` },
            { label: character.name },
          ]
    }>
      <Head title={standalone ? character.name : `${character.name} — ${campaign!.name}`} />

      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* ── Character header ─────────────────────────────────────── */}
        <div className="runic-card p-5 flex items-start gap-5">
          {/* Portrait */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <div
              className="w-24 h-32 rounded overflow-hidden flex items-center justify-center border border-[var(--color-border)] relative"
              style={{ background: 'var(--color-deep)' }}
            >
              {genStatus === 'generating' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]/70 z-10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune)" strokeWidth="2" className="animate-spin">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                    <path d="M21 12a9 9 0 00-9-9" />
                  </svg>
                </div>
              )}
              {livePortraitPath ? (
                <img
                  src={livePortraitPath}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-heading text-2xl text-[var(--color-rune)]">{character.name[0]}</span>
              )}
            </div>
            {genStatus === 'generating' && (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="px-2 py-0.5 text-[10px] font-heading tracking-widest uppercase border border-[var(--color-danger)] rounded text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">{character.name}</h1>
              <Badge variant="rune">Level {character.level}</Badge>
              {character.conditions && character.conditions.length > 0 && (
                <Badge variant="warning">Conditions</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-dim)] mt-0.5">
              {character.race}{character.subrace ? ` (${character.subrace})` : ''} · {character.class}{character.subclass ? ` — ${character.subclass}` : ''}
              {character.background ? ` · ${character.background}` : ''}
            </p>
            {character.player_name && (
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5 opacity-60">Played by {character.player_name}</p>
            )}

            <HpBar current={character.current_hp} max={character.max_hp} temp={character.temp_hp} className="mt-3 max-w-xs" />
          </div>

          {/* Combat stats */}
          <div className="flex gap-3 shrink-0">
            {(() => {
              const shieldEquipped = character.inventory_items?.some(
                i => i.category === 'Shield' && i.equipped
              )
              return shieldEquipped
                ? <StatBlock label="AC" value={`${character.armor_class}+2`} sub="Sh" />
                : <StatBlock label="AC" value={character.armor_class} />
            })()}
            <StatBlock label="Init" value={mod(character.dexterity)} />
            <StatBlock label="Speed" value={`${character.speed}ft`} />
            <StatBlock label="Prof" value={`+${character.proficiency_bonus}`} highlight />
          </div>

          <div className="shrink-0 flex gap-2 flex-wrap justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowImport(v => !v)}>
              D&amp;D Beyond
            </Button>
            <Button variant="ghost" size="sm" as="a" href={editHref}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Delete "${character.name}"? This cannot be undone.`)) {
                  router.delete(deleteHref)
                }
              }}
              className="text-[var(--color-danger)] hover:border-[var(--color-danger)]"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* ── Rest buttons ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {restConfirm === null ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRestConfirm('short')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
                Short Rest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRestConfirm('long')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Long Rest
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-dim)]">
                {restConfirm === 'short'
                  ? 'Short rest: recover per-short-rest resources?'
                  : 'Long rest: restore HP and all resources?'}
              </span>
              <Button variant="rune" size="sm" onClick={() => doRest(restConfirm)}>Confirm</Button>
              <Button variant="ghost" size="sm" onClick={() => setRestConfirm(null)}>Cancel</Button>
            </div>
          )}
          <span className="text-[10px] text-[var(--color-text-dim)] opacity-50 ml-auto">
            HP {character.current_hp}/{character.max_hp}
            {character.temp_hp > 0 && ` (+${character.temp_hp} temp)`}
          </span>
        </div>

        {/* ── D&D Beyond import panel ──────────────────────────────── */}
        {showImport && (
          <div className="runic-card p-4 border border-[var(--color-rune-dim)]">
            <p className="text-xs text-[var(--color-rune)] uppercase tracking-widest font-heading mb-3">Import from D&amp;D Beyond</p>
            <p className="text-xs text-[var(--color-text-dim)] mb-3 leading-relaxed">
              Paste your D&amp;D Beyond character URL. The character must be set to public sharing.
              This will overwrite stats, class, race, and HP from D&amp;D Beyond data.
            </p>
            <form onSubmit={submitImport} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="Character URL"
                  value={importForm.data.dnd_beyond_url}
                  onChange={e => importForm.setData('dnd_beyond_url', e.target.value)}
                  placeholder="https://www.dndbeyond.com/profile/.../characters/12345"
                  error={importForm.errors.dnd_beyond_url}
                />
              </div>
              <Button type="submit" variant="rune" size="sm" disabled={importForm.processing}>
                {importForm.processing ? 'Importing…' : 'Import'}
              </Button>
            </form>
          </div>
        )}

        {/* ── Ability scores ────────────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-2">
          {abilities.map(({ label, key }) => (
            <div key={key} className="runic-card p-3 flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">{label}</span>
              <span className="font-heading text-xl text-[var(--color-text-white)] leading-none">{character[key]}</span>
              <span className="text-sm text-[var(--color-rune)] font-mono">{mod(character[key] as number)}</span>
            </div>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {(['stats', 'spells', 'inventory', 'features', 'notes'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`
                px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors border-b-2 -mb-px
                ${tab === t
                  ? 'border-[var(--color-rune)] text-[var(--color-rune-bright)]'
                  : 'border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-base)]'
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────── */}
        {tab === 'stats' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Saving throws */}
            <Card>
              <CardHeader title="Saving Throws" />
              <div className="flex flex-col gap-1">
                {abilities.map(({ label, key }) => {
                  const base = Math.floor((character[key] as number - 10) / 2)
                  const prof = character.saving_throw_proficiencies?.some(s => s.toLowerCase() === key) ?? false
                  const total = base + (prof ? character.proficiency_bonus : 0)
                  return (
                    <SkillRow key={key} label={label} value={total >= 0 ? `+${total}` : `${total}`} proficient={prof} />
                  )
                })}
              </div>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader title="Skills" />
              <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                {SKILLS.map(skill => {
                  const s = skillMod(skill)
                  return (
                    <SkillRow key={skill.name} label={skill.name} value={s.value} proficient={s.proficient ?? false} expert={s.expert} />
                  )
                })}
              </div>
            </Card>

            {/* Currency */}
            <Card>
              <CardHeader title="Currency" />
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'CP', value: character.copper, color: '#b87333' },
                  { label: 'SP', value: character.silver, color: '#a8a9ad' },
                  { label: 'EP', value: character.electrum, color: '#b0e0e6' },
                  { label: 'GP', value: character.gold, color: '#ffd700' },
                  { label: 'PP', value: character.platinum, color: '#e5e4e2' },
                ].map(c => (
                  <div key={c.label} className="flex flex-col items-center p-2 rounded border border-[var(--color-border)] bg-[var(--color-deep)]">
                    <span className="text-base font-heading leading-none" style={{ color: c.color }}>{c.value}</span>
                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mt-1">{c.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Death saves */}
            {character.current_hp === 0 && (
              <Card>
                <CardHeader title="Death Saves" />
                <div className="flex gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--color-success)] uppercase tracking-widest">Successes</span>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full border ${i < character.death_save_successes ? 'bg-[var(--color-success)] border-[var(--color-success)]' : 'border-[var(--color-border)]'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--color-danger)] uppercase tracking-widest">Failures</span>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full border ${i < character.death_save_failures ? 'bg-[var(--color-danger)] border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Class Features display ─────────────────────────────────── */}
        {tab === 'stats' && (character.class_features && Object.keys(character.class_features).length > 0 || character.class === 'Paladin') && (
          <Card>
            <CardHeader title={`${character.class} Features`} />
            <ClassFeaturesDisplay
              cf={character.class_features ?? {}}
              updateUrl={classFeaturesUrl}
              characterClass={character.class}
              level={character.level}
            />
          </Card>
        )}

        {tab === 'spells' && (
          <div className="flex flex-col gap-3">
            {/* ── Spell slot tracker ──────────────────────────────── */}
            {hasSpellSlots && character.spell_slots && Object.keys(character.spell_slots).length > 0 && (
              <Card>
                <CardHeader
                  title="Spell Slots"
                  subtitle="Click a pip to use · right-click to recover"
                />
                <div className="flex flex-col gap-3">
                  {Object.entries(character.spell_slots)
                    .filter(([, max]) => (max as number) > 0)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, maxRaw]) => {
                      const max = maxRaw as number
                      const used = (character.spell_slots_used?.[level] ?? 0) as number
                      const remaining = max - used
                      return (
                        <div key={level} className="flex items-center gap-3">
                          <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] w-16 shrink-0">
                            {level === '0' ? 'Cantrip' : `Level ${level}`}
                          </span>
                          <div className="flex gap-1.5 flex-wrap flex-1">
                            {Array.from({ length: max }).map((_, i) => {
                              const isUsed = i >= remaining
                              return (
                                <button
                                  key={i}
                                  title={isUsed ? 'Right-click to recover' : 'Click to use slot'}
                                  onClick={() => !isUsed && toggleSlot(Number(level), 'use')}
                                  onContextMenu={e => { e.preventDefault(); isUsed && toggleSlot(Number(level), 'recover') }}
                                  className={`
                                    w-6 h-6 rounded-full border transition-all duration-150
                                    ${isUsed
                                      ? 'border-[var(--color-border)] bg-transparent cursor-context-menu opacity-40'
                                      : 'border-[var(--color-rune)] bg-[var(--color-rune)] cursor-pointer hover:brightness-125'
                                    }
                                  `}
                                />
                              )
                            })}
                          </div>
                          <span className="text-xs font-mono text-[var(--color-text-dim)] shrink-0">
                            {remaining}/{max}
                          </span>
                        </div>
                      )
                    })}
                </div>
                <p className="text-[10px] text-[var(--color-text-dim)] opacity-50 mt-2">
                  Left-click to use a slot · Right-click an empty slot to recover it · Long rest restores all slots
                </p>
              </Card>
            )}

            {/* ── Spell list ───────────────────────────────────────── */}
            {!character.spells || character.spells.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)] text-center py-8">No spells recorded.</p>
            ) : (
              Object.entries(
                character.spells.reduce((acc, spell) => {
                  const lvl = spell.level
                  if (!acc[lvl]) acc[lvl] = []
                  acc[lvl].push(spell)
                  return acc
                }, {} as Record<number, typeof character.spells>)
              ).sort(([a],[b]) => Number(a) - Number(b)).map(([level, spells]) => (
                <div key={level}>
                  <p className="text-xs uppercase tracking-widest text-[var(--color-rune)] mb-2">
                    {level === '0' ? 'Cantrips' : `Level ${level} Spells`}
                  </p>
                  {spells!.map(spell => (
                    <div key={spell.id} className="runic-card px-3 py-2 mb-1 flex items-center gap-2">
                      {spell.is_prepared && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rune)] shrink-0" />}
                      <span className="text-sm text-[var(--color-text-bright)]">{spell.name}</span>
                      {spell.school && <span className="text-[10px] text-[var(--color-text-dim)] ml-auto">{spell.school}</span>}
                      {spell.concentration && <Badge variant="arcane">C</Badge>}
                      {spell.ritual && <Badge variant="muted">R</Badge>}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'inventory' && (
          <InventoryTab character={character} />
        )}

        {tab === 'features' && (
          <div className="flex flex-col gap-2">
            {!character.features || character.features.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)] text-center py-8">No features recorded.</p>
            ) : (
              character.features.map(feat => (
                <div key={feat.id} className="runic-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-heading text-[var(--color-text-white)]">{feat.name}</span>
                    {feat.source && <Badge variant="muted">{feat.source}</Badge>}
                    {feat.has_uses && feat.max_uses && (
                      <Badge variant={feat.uses_remaining === 0 ? 'danger' : 'rune'}>
                        {feat.uses_remaining}/{feat.max_uses}
                      </Badge>
                    )}
                  </div>
                  {feat.description && (
                    <p className="text-xs text-[var(--color-text-dim)] leading-relaxed">{feat.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Personality Traits', value: character.personality_traits },
              { label: 'Ideals', value: character.ideals },
              { label: 'Bonds', value: character.bonds },
              { label: 'Flaws', value: character.flaws },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardHeader title={label} />
                <p className="text-sm text-[var(--color-text-base)] leading-relaxed">
                  {value ?? <span className="text-[var(--color-text-dim)] italic">Not set</span>}
                </p>
              </Card>
            ))}
            {character.backstory && (
              <Card className="col-span-2">
                <CardHeader title="Backstory" />
                <p className="text-sm text-[var(--color-text-base)] leading-relaxed whitespace-pre-wrap">{character.backstory}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function SkillRow({ label, value, proficient, expert }: { label: string; value: string; proficient: boolean; expert?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${expert ? 'bg-[var(--color-rune-bright)]' : proficient ? 'bg-[var(--color-rune-dim)]' : 'border border-[var(--color-border)]'}`} />
      <span className="text-xs text-[var(--color-text-base)] flex-1">{label}</span>
      <span className={`text-xs font-mono ${proficient ? 'text-[var(--color-rune-bright)]' : 'text-[var(--color-text-dim)]'}`}>{value}</span>
    </div>
  )
}

type CF = Record<string, unknown>

function csrfToken(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? ''
}

async function patchClassFeatures(url: string, updates: Record<string, unknown>) {
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
    body: JSON.stringify({ updates }),
  })
}

function ClassFeaturesDisplay({ cf, updateUrl, characterClass, level }: { cf: CF; updateUrl: string; characterClass?: string; level?: number }) {
  const [local, setLocal] = useState<CF>({ ...cf })

  // Lay on Hands — fall back to level*5 for Paladins who haven't saved keys yet
  const defaultLayMax = characterClass === 'Paladin' && level ? level * 5 : null
  const layMax = typeof local.lay_on_hands_max === 'number'
    ? local.lay_on_hands_max
    : defaultLayMax
  const layCurrent = typeof local.lay_on_hands_current === 'number'
    ? local.lay_on_hands_current
    : layMax  // default to full pool on first render
  const hasLayOnHands = layMax !== null && layCurrent !== null

  const adjustLay = async (delta: number) => {
    if (!hasLayOnHands) return
    const next = Math.max(0, Math.min(layMax!, layCurrent! + delta))
    setLocal(prev => ({ ...prev, lay_on_hands_current: next }))
    // If max was never persisted, write it now alongside current
    const updates: Record<string, number> = { lay_on_hands_current: next }
    if (typeof local.lay_on_hands_max !== 'number' && layMax !== null) {
      updates.lay_on_hands_max = layMax
      setLocal(prev => ({ ...prev, lay_on_hands_max: layMax }))
    }
    await patchClassFeatures(updateUrl, updates)
  }

  // Generic display for all other keys
  const skipKeys = new Set(['lay_on_hands_max', 'lay_on_hands_current'])
  const genericEntries = Object.entries(local).filter(
    ([k, v]) => !skipKeys.has(k) && v !== null && v !== '' && v !== false && v !== 0
  )

  const formatKey = (k: string) =>
    k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const formatVal = (v: unknown): string => {
    if (typeof v === 'boolean') return v ? 'Yes' : 'No'
    if (Array.isArray(v)) return v.join(', ')
    return String(v)
  }

  if (!hasLayOnHands && genericEntries.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Lay on Hands interactive tracker */}
      {hasLayOnHands && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>
              Lay on Hands
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--color-rune-bright)' }}>
              {layCurrent} / {layMax} HP
            </span>
          </div>
          {/* Pool bar */}
          <div className="hp-bar-track w-full">
            <div
              className="hp-bar-fill"
              style={{
                width: `${layMax! > 0 ? Math.max(0, Math.min(100, (layCurrent! / layMax!) * 100)) : 0}%`,
                backgroundColor: 'var(--color-rune)',
                boxShadow: '0 0 6px var(--color-rune)',
              }}
            />
          </div>
          <div className="flex gap-2">
            {[1, 5, 10].map(amt => (
              <button
                key={`use-${amt}`}
                onClick={() => adjustLay(-amt)}
                disabled={layCurrent === 0}
                className="flex-1 text-[10px] px-2 py-1 rounded transition-colors disabled:opacity-30"
                style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                −{amt}
              </button>
            ))}
            {[1, 5, 10].map(amt => (
              <button
                key={`heal-${amt}`}
                onClick={() => adjustLay(amt)}
                disabled={layCurrent === layMax}
                className="flex-1 text-[10px] px-2 py-1 rounded transition-colors disabled:opacity-30"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                +{amt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generic key-value pairs for everything else */}
      {genericEntries.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {genericEntries.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">{formatKey(key)}:</span>
              <span className="text-xs font-mono text-[var(--color-rune-bright)]">{formatVal(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

const ITEM_CATEGORIES = [
  'Weapon', 'Armor', 'Shield', 'Ammunition', 'Potion', 'Scroll',
  'Wondrous Item', 'Ring', 'Rod', 'Staff', 'Wand', 'Gear', 'Tool',
  'Mount', 'Vehicle', 'Trade Good', 'Treasure', 'Other',
]

const WEAPON_PROPERTIES = [
  'Finesse', 'Light', 'Heavy', 'Reach', 'Thrown', 'Two-Handed',
  'Versatile', 'Ammunition', 'Loading', 'Range', 'Special',
]

function cpToDisplay(cp: number): string {
  if (cp === 0) return '—'
  const pp = Math.floor(cp / 1000)
  const gp = Math.floor((cp % 1000) / 100)
  const sp = Math.floor((cp % 100) / 10)
  const rem = cp % 10
  const parts: string[] = []
  if (pp) parts.push(`${pp}pp`)
  if (gp) parts.push(`${gp}gp`)
  if (sp) parts.push(`${sp}sp`)
  if (rem) parts.push(`${rem}cp`)
  return parts.join(' ')
}

type ItemFormData = {
  name: string
  category: string
  quantity: string
  weight: string
  value_cp: string
  equipped: boolean
  attuned: boolean
  is_magical: boolean
  requires_attunement: boolean
  description: string
  properties: string[]
}

const emptyItemForm = (): ItemFormData => ({
  name: '',
  category: '',
  quantity: '1',
  weight: '0',
  value_cp: '0',
  equipped: false,
  attuned: false,
  is_magical: false,
  requires_attunement: false,
  description: '',
  properties: [],
})

function itemToFormData(item: InventoryItem): ItemFormData {
  return {
    name: item.name,
    category: item.category ?? '',
    quantity: String(item.quantity),
    weight: String(item.weight),
    value_cp: String(item.value_cp),
    equipped: item.equipped,
    attuned: item.attuned,
    is_magical: item.is_magical,
    requires_attunement: item.requires_attunement,
    description: item.description ?? '',
    properties: item.properties ?? [],
  }
}

function InventoryTab({ character }: { character: Character }) {
  const items = character.inventory_items ?? []
  const snapshots = character.inventory_snapshots ?? []

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [viewingSnapshot, setViewingSnapshot] = useState<InventorySnapshot | null>(null)

  const inventoryBase = `/characters/${character.id}/inventory`

  // Totals
  const totalWeight = items.reduce((s, i) => s + Number(i.weight) * i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + i.value_cp * i.quantity, 0)
  const attuned = items.filter(i => i.attuned).length

  const toggleEquip = (item: InventoryItem) => {
    router.patch(`${inventoryBase}/${item.id}/equip`, {}, { preserveScroll: true })
  }

  const toggleAttune = (item: InventoryItem) => {
    router.patch(`${inventoryBase}/${item.id}/attune`, {}, { preserveScroll: true })
  }

  const deleteItem = (item: InventoryItem) => {
    if (!confirm(`Remove "${item.name}" from inventory?`)) return
    router.delete(`${inventoryBase}/${item.id}`, { preserveScroll: true })
  }

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setShowForm(false)
  }

  const cancelEdit = () => setEditingId(null)
  const cancelAdd = () => setShowForm(false)

  const saveSnapshot = () => {
    if (!snapshotLabel.trim()) return
    router.post(
      `${inventoryBase}/snapshots`,
      { label: snapshotLabel.trim(), snapshot_type: 'manual' },
      {
        preserveScroll: true,
        onSuccess: () => setSnapshotLabel(''),
      }
    )
  }

  const deleteSnapshot = (snap: InventorySnapshot) => {
    if (!confirm(`Delete snapshot "${snap.label}"?`)) return
    router.delete(`${inventoryBase}/snapshots/${snap.id}`, { preserveScroll: true })
  }

  // Group items by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, InventoryItem[]>)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Summary bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-6 text-xs text-[var(--color-text-dim)]">
        <span><span className="font-mono text-[var(--color-text-base)]">{items.length}</span> items</span>
        <span><span className="font-mono text-[var(--color-text-base)]">{totalWeight.toFixed(1)}</span> lb total</span>
        <span><span className="font-mono text-[var(--color-text-base)]">{cpToDisplay(totalValue)}</span> total value</span>
        {attuned > 0 && (
          <span><span className="font-mono text-[var(--color-rune-bright)]">{attuned}/3</span> attuned</span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSnapshots(v => !v)}>
            {showSnapshots ? 'Hide History' : 'History'}
          </Button>
          <Button variant="rune" size="sm" onClick={() => { setShowForm(v => !v); setEditingId(null) }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Item
          </Button>
        </div>
      </div>

      {/* ── Add item form ─────────────────────────────────────────── */}
      {showForm && (
        <ItemForm
          characterId={character.id}
          onCancel={cancelAdd}
          onSuccess={cancelAdd}
        />
      )}

      {/* ── Snapshot panel ────────────────────────────────────────── */}
      {showSnapshots && (
        <div className="runic-card p-4 flex flex-col gap-3 border border-[var(--color-border)]">
          <p className="text-xs uppercase tracking-widest text-[var(--color-rune)] font-heading">Inventory History</p>

          {/* Save new snapshot */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Snapshot label"
                value={snapshotLabel}
                onChange={e => setSnapshotLabel(e.target.value)}
                placeholder='e.g. "Campaign Start" or "After Session 4"'
              />
            </div>
            <Button variant="rune" size="sm" onClick={saveSnapshot} disabled={!snapshotLabel.trim()}>
              Save Snapshot
            </Button>
          </div>

          {/* Snapshot list */}
          {snapshots.length === 0 ? (
            <p className="text-xs text-[var(--color-text-dim)] text-center py-2">No snapshots yet.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {[...snapshots].reverse().map(snap => (
                <div key={snap.id} className="flex items-center gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[var(--color-text-bright)]">{snap.label}</span>
                    {snap.game_session && (
                      <span className="text-[10px] text-[var(--color-text-dim)] ml-2">
                        — {snap.game_session.title ?? `Session ${snap.game_session.session_number}`}
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--color-text-dim)] ml-2">
                      {new Date(snap.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-dim)] ml-2">
                      ({snap.items.length} items)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewingSnapshot(snap === viewingSnapshot ? null : snap)}>
                    {viewingSnapshot?.id === snap.id ? 'Close' : 'View'}
                  </Button>
                  <button
                    onClick={() => deleteSnapshot(snap)}
                    className="text-[var(--color-danger)] opacity-60 hover:opacity-100 text-xs px-1"
                    title="Delete snapshot"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Snapshot viewer */}
          {viewingSnapshot && (
            <div className="border border-[var(--color-rune-dim)] rounded p-3 mt-1">
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-rune)] mb-2">
                {viewingSnapshot.label}
              </p>
              {viewingSnapshot.items.length === 0 ? (
                <p className="text-xs text-[var(--color-text-dim)]">Empty inventory at this point.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {viewingSnapshot.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {item.equipped && <div className="w-1 h-1 rounded-full bg-[var(--color-rune)] shrink-0" />}
                      <span className="text-[var(--color-text-bright)] flex-1">{item.name}</span>
                      {item.quantity > 1 && <span className="text-[var(--color-text-dim)]">×{item.quantity}</span>}
                      {item.is_magical && <Badge variant="arcane">M</Badge>}
                      {item.attuned && <Badge variant="rune">A</Badge>}
                      {item.category && <span className="text-[var(--color-text-dim)]">{item.category}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Item list ─────────────────────────────────────────────── */}
      {items.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--color-text-dim)] text-center py-8">No items recorded.</p>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]) => (
          <div key={category}>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-rune)] mb-1">{category}</p>
            <div className="flex flex-col gap-1">
              {catItems.map(item => (
                editingId === item.id ? (
                  <ItemForm
                    key={item.id}
                    characterId={character.id}
                    item={item}
                    onCancel={cancelEdit}
                    onSuccess={cancelEdit}
                  />
                ) : (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onEquip={() => toggleEquip(item)}
                    onAttune={() => toggleAttune(item)}
                    onEdit={() => startEdit(item)}
                    onDelete={() => deleteItem(item)}
                  />
                )
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ItemRow({
  item,
  onEquip,
  onAttune,
  onEdit,
  onDelete,
}: {
  item: InventoryItem
  onEquip: () => void
  onAttune: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="runic-card">
      <div className="px-3 py-2 flex items-center gap-2">
        {/* Equip toggle */}
        <button
          onClick={onEquip}
          title={item.equipped ? 'Unequip' : 'Equip'}
          className={`w-3 h-3 rounded-full border shrink-0 transition-colors ${
            item.equipped
              ? 'bg-[var(--color-rune)] border-[var(--color-rune)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
          }`}
        />

        {/* Name + expand */}
        <button
          className="flex-1 text-left text-sm text-[var(--color-text-bright)] hover:text-[var(--color-text-white)] transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          {item.name}
        </button>

        {/* Quantity */}
        {item.quantity !== 1 && (
          <span className="text-xs font-mono text-[var(--color-text-dim)] shrink-0">×{item.quantity}</span>
        )}

        {/* Weight */}
        {Number(item.weight) > 0 && (
          <span className="text-[10px] text-[var(--color-text-dim)] shrink-0">{Number(item.weight) * item.quantity}lb</span>
        )}

        {/* Value */}
        {item.value_cp > 0 && (
          <span className="text-[10px] font-mono text-[var(--color-text-dim)] shrink-0">{cpToDisplay(item.value_cp)}</span>
        )}

        {/* Badges */}
        {item.is_magical && <Badge variant="arcane">Magical</Badge>}
        {item.attuned && <Badge variant="rune">Attuned</Badge>}

        {/* Attune toggle */}
        {item.requires_attunement && !item.attuned && (
          <button
            onClick={onAttune}
            className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-rune)] transition-colors shrink-0"
            title="Attune"
          >
            Attune
          </button>
        )}
        {item.attuned && (
          <button
            onClick={onAttune}
            className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors shrink-0"
            title="Remove attunement"
          >
            Unattune
          </button>
        )}

        {/* Edit / Delete */}
        <button
          onClick={onEdit}
          className="text-[var(--color-text-dim)] hover:text-[var(--color-rune)] transition-colors shrink-0 text-xs px-1"
          title="Edit"
        >
          ✎
        </button>
        <button
          onClick={onDelete}
          className="text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors shrink-0 text-xs px-1"
          title="Delete"
        >
          ✕
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-2 pt-0 border-t border-[var(--color-border)] mt-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[var(--color-text-dim)]">
            {item.description && (
              <p className="w-full leading-relaxed text-[var(--color-text-base)]">{item.description}</p>
            )}
            {item.properties && item.properties.length > 0 && (
              <span>Properties: <span className="text-[var(--color-text-base)]">{item.properties.join(', ')}</span></span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemForm({
  characterId,
  item,
  onCancel,
  onSuccess,
}: {
  characterId: number
  item?: InventoryItem
  onCancel: () => void
  onSuccess: () => void
}) {
  const isEdit = !!item
  const [form, setForm] = useState<ItemFormData>(item ? itemToFormData(item) : emptyItemForm())

  const set = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const toggleProp = (prop: string) => {
    setForm(prev => ({
      ...prev,
      properties: prev.properties.includes(prop)
        ? prev.properties.filter(p => p !== prop)
        : [...prev.properties, prop],
    }))
  }

  const [processing, setProcessing] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    const payload = {
      ...form,
      quantity: parseInt(form.quantity) || 1,
      weight: parseFloat(form.weight) || 0,
      value_cp: parseInt(form.value_cp) || 0,
    }
    const url = isEdit
      ? `/characters/${characterId}/inventory/${item!.id}`
      : `/characters/${characterId}/inventory`
    if (isEdit) {
      router.patch(url, payload, {
        preserveScroll: true,
        onSuccess: () => { setProcessing(false); onSuccess() },
        onError: () => setProcessing(false),
      })
    } else {
      router.post(url, payload, {
        preserveScroll: true,
        onSuccess: () => { setProcessing(false); onSuccess() },
        onError: () => setProcessing(false),
      })
    }
  }

  return (
    <form onSubmit={submit} className="runic-card p-4 flex flex-col gap-3 border border-[var(--color-rune-dim)]">
      <p className="text-xs uppercase tracking-widest text-[var(--color-rune)] font-heading">
        {isEdit ? `Edit: ${item!.name}` : 'Add Item'}
      </p>

      {/* Row 1: name + category */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">Category</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="bg-[var(--color-deep)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-base)] focus:outline-none focus:border-[var(--color-rune)]"
          >
            <option value="">— None —</option>
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: qty + weight + value */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={e => set('quantity', e.target.value)}
        />
        <Input
          label="Weight (lb)"
          type="number"
          min="0"
          step="0.1"
          value={form.weight}
          onChange={e => set('weight', e.target.value)}
        />
        <Input
          label="Value (cp)"
          type="number"
          min="0"
          value={form.value_cp}
          onChange={e => set('value_cp', e.target.value)}
        />
      </div>

      {/* Row 3: checkboxes */}
      <div className="flex flex-wrap gap-4">
        {([
          ['equipped', 'Equipped'],
          ['is_magical', 'Magical'],
          ['requires_attunement', 'Requires Attunement'],
          ['attuned', 'Attuned'],
        ] as [keyof ItemFormData, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={e => set(key, e.target.checked)}
              className="accent-[var(--color-rune)]"
            />
            <span className="text-xs text-[var(--color-text-base)]">{label}</span>
          </label>
        ))}
      </div>

      {/* Row 4: weapon properties */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mb-1">Weapon Properties</p>
        <div className="flex flex-wrap gap-1.5">
          {WEAPON_PROPERTIES.map(prop => (
            <button
              key={prop}
              type="button"
              onClick={() => toggleProp(prop)}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                form.properties.includes(prop)
                  ? 'border-[var(--color-rune)] bg-[var(--color-rune)] text-[var(--color-deep)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-muted)]'
              }`}
            >
              {prop}
            </button>
          ))}
        </div>
      </div>

      {/* Row 5: description */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={2}
          className="bg-[var(--color-deep)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-base)] focus:outline-none focus:border-[var(--color-rune)] resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="rune" size="sm" disabled={processing}>
          {processing ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
        </Button>
      </div>
    </form>
  )
}
