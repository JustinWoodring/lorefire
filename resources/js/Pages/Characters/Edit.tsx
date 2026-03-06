import React, { useRef, useState, useEffect } from 'react'
import { Head, useForm } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Input, Textarea, Select } from '@/Components/Input'
import { RuneDivider } from '@/Components/RuneDivider'
import { ClassFeatures } from '@/Components/ClassFeatures'
import { Campaign, Character } from '@/types'

interface Props {
  campaign: Campaign | null
  character: Character
  campaigns?: Campaign[]
  imageGenProvider: string | null
}

const ALIGNMENTS = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil']
const CLASSES = ['Artificer','Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard']
const RACES = ['Dragonborn','Dwarf','Elf','Gnome','Half-Elf','Halfling','Half-Orc','Human','Tiefling','Other']

const SKILLS_LIST = [
  'acrobatics','animal_handling','arcana','athletics','deception','history',
  'insight','intimidation','investigation','medicine','nature','perception',
  'performance','persuasion','religion','sleight_of_hand','stealth','survival',
]
const ABILITIES = ['strength','dexterity','constitution','intelligence','wisdom','charisma']

export default function Edit({ campaign, character, campaigns, imageGenProvider }: Props) {
  const standalone = campaign === null

  const { data, setData, post, transform, processing, errors } = useForm({
    _method: 'PUT',
    name: character.name,
    player_name: character.player_name ?? '',
    race: character.race,
    subrace: character.subrace ?? '',
    class: character.class,
    subclass: character.subclass ?? '',
    level: character.level,
    background: character.background ?? '',
    alignment: character.alignment ?? '',
    experience_points: character.experience_points,
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    max_hp: character.max_hp,
    current_hp: character.current_hp,
    temp_hp: character.temp_hp,
    armor_class: character.armor_class,
    initiative_bonus: character.initiative_bonus,
    speed: character.speed,
    proficiency_bonus: character.proficiency_bonus,
    death_save_successes: character.death_save_successes,
    death_save_failures: character.death_save_failures,
    saving_throw_proficiencies: character.saving_throw_proficiencies ?? [],
    skill_proficiencies: character.skill_proficiencies ?? [],
    skill_expertises: character.skill_expertises ?? [],
    copper: character.copper,
    silver: character.silver,
    electrum: character.electrum,
    gold: character.gold,
    platinum: character.platinum,
    spellcasting_ability: character.spellcasting_ability ?? '',
    personality_traits: character.personality_traits ?? '',
    ideals: character.ideals ?? '',
    bonds: character.bonds ?? '',
    flaws: character.flaws ?? '',
    backstory: character.backstory ?? '',
    appearance_description: character.appearance_description ?? '',
    dnd_beyond_url: character.dnd_beyond_url ?? '',
    campaign_id: character.campaign_id?.toString() ?? '',
    class_features: (character.class_features ?? {}) as Record<string, unknown>,
    portrait: null as File | null,
    portrait_style: (character.portrait_style ?? 'lifelike') as 'lifelike' | 'renaissance' | 'comic',
  })

  // Coerce empty string campaign_id to null so the nullable|exists validation passes
  transform((d: any) => ({
    ...d,
    campaign_id: d.campaign_id === '' ? null : d.campaign_id,
  }))

  const portraitInputRef = useRef<HTMLInputElement>(null)
  const [portraitPreview, setPortraitPreview] = useState<string | null>(
    character.portrait_path ? `/storage-file/${character.portrait_path}?t=${new Date(character.updated_at).getTime()}` : null
  )

  // Portrait generation state
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
        setPortraitPreview(`/storage-file/${json.portrait_path}?t=${Date.now()}`)
        clearInterval(genPollRef.current!)
      } else if (json.status === 'failed') {
        clearInterval(genPollRef.current!)
      }
    }, 3000)
    return () => { if (genPollRef.current) clearInterval(genPollRef.current) }
  }, [genStatus])

  const handleGeneratePortrait = async () => {
    setGenStatus('generating')
    await fetch(`/characters/${character.id}/generate-portrait`, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ portrait_style: data.portrait_style }),
    })
  }

  const handleCancelGeneration = async () => {
    await fetch(`/characters/${character.id}/cancel-portrait`, { method: 'POST', headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' } })
    setGenStatus('failed')
    if (genPollRef.current) clearInterval(genPollRef.current)
  }

  const handlePortraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setData('portrait', file)
    if (file) setPortraitPreview(URL.createObjectURL(file))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (standalone) {
      post(`/characters/${character.id}`, { forceFormData: true })
    } else {
      post(`/campaigns/${campaign!.id}/characters/${character.id}`, { forceFormData: true })
    }
  }

  const cancelHref = standalone
    ? `/characters/${character.id}`
    : `/campaigns/${campaign!.id}/characters/${character.id}`

  const breadcrumbs = standalone
    ? [
        { label: 'Characters', href: '/characters' },
        { label: character.name, href: `/characters/${character.id}` },
        { label: 'Edit' },
      ]
    : [
        { label: 'Campaigns', href: '/campaigns' },
        { label: campaign!.name, href: `/campaigns/${campaign!.id}` },
        { label: character.name, href: `/campaigns/${campaign!.id}/characters/${character.id}` },
        { label: 'Edit' },
      ]

  const mod = (v: number) => { const m = Math.floor((v - 10) / 2); return m >= 0 ? `+${m}` : `${m}` }

  const toggleProficiency = (list: 'saving_throw_proficiencies' | 'skill_proficiencies' | 'skill_expertises', value: string) => {
    const current = data[list] as string[]
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    setData(list, next)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit ${character.name}`} />

      <div className="max-w-2xl mx-auto">
        <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-8">
          Edit Character
        </h1>

        <form onSubmit={submit} className="flex flex-col gap-5">

          {/* Identity */}
          <RuneDivider label="Identity" />

          {/* Portrait upload */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div
                className="w-20 h-20 rounded border border-[var(--color-border)] overflow-hidden flex items-center justify-center cursor-pointer hover:border-[var(--color-rune)] transition-colors relative"
                style={{ background: 'var(--color-deep)' }}
                onClick={() => portraitInputRef.current?.click()}
              >
                {genStatus === 'generating' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]/70 z-10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune)" strokeWidth="2" className="animate-spin">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                      <path d="M21 12a9 9 0 00-9-9" />
                    </svg>
                  </div>
                )}
                {portraitPreview ? (
                  <img src={portraitPreview} alt="Portrait" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-heading text-3xl text-[var(--color-rune)]">{character.name[0]}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 justify-center">
              <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-widest font-heading">Portrait</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => portraitInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-heading tracking-widest uppercase border border-[var(--color-border)] rounded text-[var(--color-text-dim)] hover:border-[var(--color-rune)] hover:text-[var(--color-rune)] transition-colors"
                >
                  {portraitPreview ? 'Change' : 'Upload'}
                </button>
                {imageGenProvider && imageGenProvider !== 'none' && (
                  <button
                    type="button"
                    onClick={handleGeneratePortrait}
                    disabled={genStatus === 'generating'}
                    className="px-3 py-1.5 text-xs font-heading tracking-widest uppercase border border-[var(--color-rune)] rounded text-[var(--color-rune)] hover:bg-[var(--color-rune)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {genStatus === 'generating' ? 'Generating…' : 'AI Portrait'}
                  </button>
                )}
                {genStatus === 'generating' && (
                  <button
                    type="button"
                    onClick={handleCancelGeneration}
                    className="px-3 py-1.5 text-xs font-heading tracking-widest uppercase border border-[var(--color-danger)] rounded text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {/* Portrait style toggle — only shown when AI provider is configured */}
              {imageGenProvider && imageGenProvider !== 'none' && (
                <div className="flex gap-1 mt-0.5">
                  {(['lifelike', 'renaissance', 'comic'] as const).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setData('portrait_style', style)}
                      className={[
                        'px-2 py-0.5 text-[10px] font-heading tracking-widest uppercase rounded border transition-colors',
                        data.portrait_style === style
                          ? 'border-[var(--color-rune)] text-[var(--color-rune)] bg-[var(--color-rune)]/10'
                          : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-rune)] hover:text-[var(--color-rune)]',
                      ].join(' ')}
                    >
                      {style === 'lifelike' ? 'Lifelike' : style === 'renaissance' ? 'Renaissance' : 'Comic'}
                    </button>
                  ))}
                </div>
              )}
              {genStatus === 'failed' && (
                <p className="text-xs text-[var(--color-danger)]">Generation failed. Try again.</p>
              )}
              {data.portrait && (
                <span className="text-xs text-[var(--color-rune)]">{data.portrait.name}</span>
              )}
              {errors.portrait && (
                <p className="text-xs text-[var(--color-danger)]">{errors.portrait}</p>
              )}
            </div>
            <input
              ref={portraitInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePortraitChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Character Name" value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} required autoFocus />
            <Input label="Player Name" value={data.player_name} onChange={e => setData('player_name', e.target.value)} placeholder="Optional" />
          </div>

          {/* Campaign assignment — only shown in standalone mode */}
          {standalone && campaigns && campaigns.length > 0 && (
            <Select label="Campaign (optional)" value={data.campaign_id} onChange={e => setData('campaign_id', e.target.value)}>
              <option value="">No campaign</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Select label="Race" value={data.race} onChange={e => setData('race', e.target.value)} error={errors.race}>
              <option value="">Select…</option>
              {RACES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Input label="Subrace" value={data.subrace} onChange={e => setData('subrace', e.target.value)} placeholder="Optional" />
            <Select label="Alignment" value={data.alignment} onChange={e => setData('alignment', e.target.value)}>
              <option value="">Select…</option>
              {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select label="Class" value={data.class} onChange={e => setData('class', e.target.value)} error={errors.class}>
              <option value="">Select…</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="Subclass" value={data.subclass} onChange={e => setData('subclass', e.target.value)} placeholder="Optional" />
            <Input label="Level" type="number" min={1} max={20} value={data.level} onChange={e => setData('level', parseInt(e.target.value))} error={errors.level} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Background" value={data.background} onChange={e => setData('background', e.target.value)} placeholder="Soldier, Sage, Outlander…" />
            <Input label="Experience Points" type="number" min={0} value={data.experience_points} onChange={e => setData('experience_points', parseInt(e.target.value) || 0)} />
          </div>

          <Input label="D&D Beyond URL" value={data.dnd_beyond_url} onChange={e => setData('dnd_beyond_url', e.target.value)} placeholder="https://dnd.wizards.com/characters/…" />

          {/* Ability Scores */}
          <RuneDivider label="Ability Scores" />

          <div className="grid grid-cols-6 gap-3">
            {([
              ['STR', 'strength'], ['DEX', 'dexterity'], ['CON', 'constitution'],
              ['INT', 'intelligence'], ['WIS', 'wisdom'], ['CHA', 'charisma']
            ] as [string, keyof typeof data][]).map(([label, key]) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">{label}</label>
                <input
                  type="number" min={1} max={30}
                  value={data[key] as number}
                  onChange={e => setData(key, parseInt(e.target.value) || 10)}
                  className="w-full text-center bg-[var(--color-deep)] border border-[var(--color-border)] rounded py-2 text-[var(--color-text-white)] font-heading text-lg focus:outline-none focus:border-[var(--color-rune)]"
                />
                <span className="text-xs text-[var(--color-rune)] font-mono">{mod(data[key] as number)}</span>
              </div>
            ))}
          </div>

          {/* Saving Throw Proficiencies */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mb-2">Saving Throw Proficiencies</p>
            <div className="flex flex-wrap gap-2">
              {ABILITIES.map(ab => {
                const active = (data.saving_throw_proficiencies as string[]).includes(ab)
                return (
                  <button
                    type="button"
                    key={ab}
                    onClick={() => toggleProficiency('saving_throw_proficiencies', ab)}
                    className={`px-3 py-1 rounded text-xs uppercase tracking-widest border transition-colors ${
                      active
                        ? 'border-[var(--color-rune)] text-[var(--color-rune-bright)] bg-[var(--color-rune)]/10'
                        : 'border-[var(--color-border)] text-[var(--color-text-dim)]'
                    }`}
                  >
                    {ab.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Skill Proficiencies */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mb-2">Skill Proficiencies</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS_LIST.map(skill => {
                const proficient = (data.skill_proficiencies as string[]).includes(skill)
                const expert = (data.skill_expertises as string[]).includes(skill)
                return (
                  <div key={skill} className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => toggleProficiency('skill_proficiencies', skill)}
                      className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider border transition-colors ${
                        proficient
                          ? 'border-[var(--color-rune)] text-[var(--color-rune-bright)] bg-[var(--color-rune)]/10'
                          : 'border-[var(--color-border)] text-[var(--color-text-dim)]'
                      }`}
                    >
                      {skill.replace(/_/g, ' ')}
                    </button>
                    {proficient && (
                      <button
                        type="button"
                        onClick={() => toggleProficiency('skill_expertises', skill)}
                        className={`text-[9px] uppercase tracking-widest ${expert ? 'text-[var(--color-rune-bright)]' : 'text-[var(--color-text-dim)]'}`}
                      >
                        {expert ? 'Expertise' : '+ expertise'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Combat */}
          <RuneDivider label="Combat & HP" />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Max HP" type="number" min={1} value={data.max_hp} onChange={e => setData('max_hp', parseInt(e.target.value) || 1)} />
            <Input label="Current HP" type="number" min={0} value={data.current_hp} onChange={e => setData('current_hp', parseInt(e.target.value) || 0)} />
            <Input label="Temp HP" type="number" min={0} value={data.temp_hp} onChange={e => setData('temp_hp', parseInt(e.target.value) || 0)} />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Input label="Armor Class" type="number" min={0} value={data.armor_class} onChange={e => setData('armor_class', parseInt(e.target.value) || 0)} />
            <Input label="Initiative Bonus" type="number" value={data.initiative_bonus} onChange={e => setData('initiative_bonus', parseInt(e.target.value) || 0)} />
            <Input label="Speed (ft)" type="number" min={0} value={data.speed} onChange={e => setData('speed', parseInt(e.target.value) || 30)} />
            <Input label="Prof. Bonus" type="number" min={2} max={6} value={data.proficiency_bonus} onChange={e => setData('proficiency_bonus', parseInt(e.target.value) || 2)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Death Save Successes" type="number" min={0} max={3} value={data.death_save_successes} onChange={e => setData('death_save_successes', parseInt(e.target.value) || 0)} />
            <Input label="Death Save Failures" type="number" min={0} max={3} value={data.death_save_failures} onChange={e => setData('death_save_failures', parseInt(e.target.value) || 0)} />
          </div>

          {/* Currency */}
          <RuneDivider label="Currency" />

          <div className="grid grid-cols-5 gap-3">
            <Input label="Copper" type="number" min={0} value={data.copper} onChange={e => setData('copper', parseInt(e.target.value) || 0)} />
            <Input label="Silver" type="number" min={0} value={data.silver} onChange={e => setData('silver', parseInt(e.target.value) || 0)} />
            <Input label="Electrum" type="number" min={0} value={data.electrum} onChange={e => setData('electrum', parseInt(e.target.value) || 0)} />
            <Input label="Gold" type="number" min={0} value={data.gold} onChange={e => setData('gold', parseInt(e.target.value) || 0)} />
            <Input label="Platinum" type="number" min={0} value={data.platinum} onChange={e => setData('platinum', parseInt(e.target.value) || 0)} />
          </div>

          {/* Spellcasting */}
          <RuneDivider label="Spellcasting" />

          <Select label="Spellcasting Ability" value={data.spellcasting_ability} onChange={e => setData('spellcasting_ability', e.target.value)}>
            <option value="">None / Not a caster</option>
            <option value="intelligence">Intelligence</option>
            <option value="wisdom">Wisdom</option>
            <option value="charisma">Charisma</option>
          </Select>

          {/* Class-specific features */}
          <ClassFeatures
            characterClass={data.class}
            level={data.level}
            charisma={data.charisma}
            wisdom={data.wisdom}
            proficiencyBonus={data.proficiency_bonus}
            value={data.class_features as Record<string, unknown>}
            onChange={cf => setData('class_features', cf)}
          />

          {/* Notes */}
          <RuneDivider label="Character Notes" />

          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Personality Traits" value={data.personality_traits} onChange={e => setData('personality_traits', e.target.value)} rows={3} />
            <Textarea label="Ideals" value={data.ideals} onChange={e => setData('ideals', e.target.value)} rows={3} />
            <Textarea label="Bonds" value={data.bonds} onChange={e => setData('bonds', e.target.value)} rows={3} />
            <Textarea label="Flaws" value={data.flaws} onChange={e => setData('flaws', e.target.value)} rows={3} />
          </div>

          <Textarea label="Backstory" value={data.backstory} onChange={e => setData('backstory', e.target.value)} rows={5} placeholder="The origin tale of your character…" />

          <Textarea
            label="Appearance Description"
            value={data.appearance_description}
            onChange={e => setData('appearance_description', e.target.value)}
            rows={3}
            placeholder="Tall with silver hair and amber eyes, wearing leather armor etched with runic symbols…"
            hint={imageGenProvider && imageGenProvider !== 'none' ? 'Used for AI portrait generation.' : undefined}
          />

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="rune" disabled={processing}>
              {processing ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="ghost" as="a" href={cancelHref}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
