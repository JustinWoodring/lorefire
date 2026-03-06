/**
 * ClassFeatures.tsx
 * Per-class sub-configurator rendered inside the Character Edit form.
 * Each section tracks class-specific resource pools and options that don't
 * fit cleanly into the generic character fields.
 *
 * Data is stored as a free-form JSON object in `class_features` on the
 * Character model, keyed by feature name (snake_case).
 */
import React from 'react'
import { RuneDivider } from '@/Components/RuneDivider'
import { Input, Select } from '@/Components/Input'

type CF = Record<string, unknown>

interface Props {
  characterClass: string
  level: number
  charisma: number
  wisdom: number
  proficiencyBonus: number
  value: CF
  onChange: (next: CF) => void
}

// ── helpers ────────────────────────────────────────────────────────────────

function mod(score: number) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function num(v: unknown, fallback = 0): number {
  const n = parseInt(String(v ?? ''), 10)
  return isNaN(n) ? fallback : n
}

function Field({
  label, hint, value, min = 0, max, onChange,
}: {
  label: string
  hint?: string
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal opacity-60">({hint})</span>}
      </label>
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => onChange(parseInt(e.target.value) || min)}
        className="w-full text-center bg-[var(--color-deep)] border border-[var(--color-border)] rounded py-1.5 text-[var(--color-text-white)] font-mono text-sm focus:outline-none focus:border-[var(--color-rune)]"
      />
    </div>
  )
}

function PoolRow({
  label, current, max, hint, onCurrentChange, onMaxChange,
}: {
  label: string; current: number; max: number; hint?: string
  onCurrentChange: (n: number) => void; onMaxChange: (n: number) => void
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mb-1">
          {label} {hint && <span className="opacity-60 normal-case tracking-normal">({hint})</span>}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={max} value={current}
            onChange={e => onCurrentChange(parseInt(e.target.value) || 0)}
            className="w-20 text-center bg-[var(--color-deep)] border border-[var(--color-border)] rounded py-1.5 text-[var(--color-text-white)] font-mono text-sm focus:outline-none focus:border-[var(--color-rune)]"
          />
          <span className="text-[var(--color-text-dim)]">/</span>
          <input
            type="number" min={0} value={max}
            onChange={e => onMaxChange(parseInt(e.target.value) || 0)}
            className="w-20 text-center bg-[var(--color-deep)] border border-[var(--color-border)] rounded py-1.5 text-[var(--color-text-dim)] font-mono text-sm focus:outline-none focus:border-[var(--color-rune)]"
          />
          <span className="text-[10px] text-[var(--color-text-dim)]">remaining / max</span>
        </div>
      </div>
    </div>
  )
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border transition-colors shrink-0 ${checked ? 'bg-[var(--color-rune)] border-[var(--color-rune)]' : 'border-[var(--color-border)]'}`}
      />
      <span className="text-xs text-[var(--color-text-base)]">{label}</span>
    </label>
  )
}

// ── per-class sections ──────────────────────────────────────────────────────

function Paladin({ level, charisma, profBon, cf, set }: { level: number; charisma: number; profBon: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const layMax = level * 5
  const chaMod = Math.floor((charisma - 10) / 2)
  const cdCharges = level >= 6 ? 2 : 1

  return (
    <>
      <RuneDivider label="Paladin" />

      {/* Lay on Hands */}
      <PoolRow
        label="Lay on Hands" hint={`max = level × 5 = ${layMax}`}
        current={num(cf.lay_on_hands_current, layMax)}
        max={num(cf.lay_on_hands_max, layMax)}
        onCurrentChange={v => set('lay_on_hands_current', v)}
        onMaxChange={v => set('lay_on_hands_max', v)}
      />

      {/* Channel Divinity */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mb-2">
          Channel Divinity <span className="opacity-60 normal-case tracking-normal">({cdCharges} charge{cdCharges > 1 ? 's' : ''}/short rest)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {['Sacred Weapon', 'Turn the Unholy', 'Abjure Enemy', 'Vow of Enmity'].map(opt => (
            <CheckRow
              key={opt} label={opt}
              checked={Boolean(Array.isArray(cf.channel_divinity_options) && (cf.channel_divinity_options as string[]).includes(opt))}
              onChange={on => {
                const current = Array.isArray(cf.channel_divinity_options) ? (cf.channel_divinity_options as string[]) : []
                set('channel_divinity_options', on ? [...current, opt] : current.filter(x => x !== opt))
              }}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field label="CD Used" value={num(cf.channel_divinity_used, 0)} min={0} max={cdCharges} onChange={v => set('channel_divinity_used', v)} />
          <Field label="CD Max" value={num(cf.channel_divinity_max, cdCharges)} min={1} max={cdCharges} onChange={v => set('channel_divinity_max', v)} />
        </div>
      </div>

      {/* Aura of Protection */}
      {level >= 6 && (
        <div className="runic-card p-3">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-rune)] mb-1">Aura of Protection</p>
          <p className="text-xs text-[var(--color-text-dim)]">
            Allies within 10 ft gain <span className="text-[var(--color-rune-bright)] font-mono">{mod(charisma)}</span> to saving throws (CHA mod = {chaMod >= 0 ? '+' : ''}{chaMod}).
          </p>
          {level >= 18 && (
            <p className="text-xs text-[var(--color-text-dim)] mt-1">Aura expands to 30 ft at level 18.</p>
          )}
        </div>
      )}

      {/* Divine Smite */}
      <div className="runic-card p-3">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-rune)] mb-1">Divine Smite</p>
        <p className="text-xs text-[var(--color-text-dim)]">
          Expend a spell slot on hit: 2d8 radiant + 1d8 per slot level above 1st (max 5d8). +1d8 vs undead/fiends.
        </p>
      </div>

      {/* Blessed Warrior / Fighting Style */}
      <div>
        <Select
          label="Fighting Style"
          value={String(cf.fighting_style ?? '')}
          onChange={e => set('fighting_style', e.target.value)}
        >
          <option value="">— None selected —</option>
          {['Blessed Warrior','Defense','Dueling','Great Weapon Fighting','Protection','Blind Fighting','Interception'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {/* Sacred Oath */}
      <div>
        <Select
          label="Sacred Oath"
          value={String(cf.sacred_oath ?? '')}
          onChange={e => set('sacred_oath', e.target.value)}
        >
          <option value="">— None selected —</option>
          {['Oath of Devotion','Oath of the Ancients','Oath of Vengeance','Oath of Conquest','Oath of Redemption','Oath of Glory','Oath of the Watchers','Oathbreaker'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </div>

      {/* Divine Health / misc flags */}
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Divine Health (immune to disease)" checked={Boolean(cf.divine_health)} onChange={v => set('divine_health', v)} />
        {level >= 14 && <CheckRow label="Cleansing Touch used" checked={Boolean(cf.cleansing_touch_used)} onChange={v => set('cleansing_touch_used', v)} />}
      </div>
    </>
  )
}

function Barbarian({ level, cf, set }: { level: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const ragesMax = level >= 20 ? 99 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2
  const rageDmg = level >= 16 ? 4 : level >= 9 ? 3 : level >= 1 ? 2 : 2

  return (
    <>
      <RuneDivider label="Barbarian" />
      <PoolRow
        label="Rage Charges" hint={`${ragesMax} per long rest, +${rageDmg} damage while raging`}
        current={num(cf.rage_charges_current, ragesMax)}
        max={num(cf.rage_charges_max, ragesMax)}
        onCurrentChange={v => set('rage_charges_current', v)}
        onMaxChange={v => set('rage_charges_max', v)}
      />
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Currently Raging" checked={Boolean(cf.is_raging)} onChange={v => set('is_raging', v)} />
        {level >= 7 && <CheckRow label="Feral Instinct active" checked={Boolean(cf.feral_instinct)} onChange={v => set('feral_instinct', v)} />}
      </div>
      <Select label="Primal Path" value={String(cf.primal_path ?? '')} onChange={e => set('primal_path', e.target.value)}>
        <option value="">— None selected —</option>
        {['Path of the Berserker','Path of the Totem Warrior','Path of Wild Magic','Path of the Beast','Path of the Zealot','Path of the Battlerager','Path of Storm Herald','Path of the Ancestral Guardian'].map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </Select>
    </>
  )
}

function Bard({ level, charisma, profBon, cf, set }: { level: number; charisma: number; profBon: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const inspirationDice = level >= 15 ? 'd12' : level >= 10 ? 'd10' : level >= 5 ? 'd8' : 'd6'
  const inspirationMax = Math.max(1, Math.floor((charisma - 10) / 2))

  return (
    <>
      <RuneDivider label="Bard" />
      <PoolRow
        label={`Bardic Inspiration (${inspirationDice})`} hint={`CHA mod = ${inspirationMax} per short/long rest`}
        current={num(cf.bardic_inspiration_current, inspirationMax)}
        max={num(cf.bardic_inspiration_max, inspirationMax)}
        onCurrentChange={v => set('bardic_inspiration_current', v)}
        onMaxChange={v => set('bardic_inspiration_max', v)}
      />
      {level >= 2 && (
        <div className="flex flex-wrap gap-4">
          <CheckRow label="Jack of All Trades" checked={Boolean(cf.jack_of_all_trades)} onChange={v => set('jack_of_all_trades', v)} />
          <CheckRow label="Song of Rest used this rest" checked={Boolean(cf.song_of_rest_used)} onChange={v => set('song_of_rest_used', v)} />
        </div>
      )}
      <Select label="Bard College" value={String(cf.bard_college ?? '')} onChange={e => set('bard_college', e.target.value)}>
        <option value="">— None selected —</option>
        {['College of Lore','College of Valor','College of Glamour','College of Swords','College of Eloquence','College of Creation','College of Spirits','College of Whispers'].map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
    </>
  )
}

function Cleric({ level, wisdom, cf, set }: { level: number; wisdom: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const cdCharges = level >= 18 ? 3 : level >= 6 ? 2 : 1

  return (
    <>
      <RuneDivider label="Cleric" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Channel Divinity Used" value={num(cf.channel_divinity_used, 0)} min={0} max={cdCharges} onChange={v => set('channel_divinity_used', v)} />
        <Field label="CD Max" hint={`${cdCharges}/short rest`} value={num(cf.channel_divinity_max, cdCharges)} min={1} max={cdCharges} onChange={v => set('channel_divinity_max', v)} />
      </div>
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Divine Intervention attempted this level" checked={Boolean(cf.divine_intervention_used)} onChange={v => set('divine_intervention_used', v)} />
      </div>
      <Select label="Divine Domain" value={String(cf.divine_domain ?? '')} onChange={e => set('divine_domain', e.target.value)}>
        <option value="">— None selected —</option>
        {['Life','Light','Trickery','Knowledge','Nature','Tempest','War','Death','Arcana','Forge','Grave','Order','Peace','Twilight'].map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>
    </>
  )
}

function Druid({ level, cf, set }: { level: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const wildShapeMax = level >= 20 ? 99 : 2

  return (
    <>
      <RuneDivider label="Druid" />
      <PoolRow
        label="Wild Shape Charges" hint="2/short rest"
        current={num(cf.wild_shape_current, wildShapeMax)}
        max={num(cf.wild_shape_max, wildShapeMax)}
        onCurrentChange={v => set('wild_shape_current', v)}
        onMaxChange={v => set('wild_shape_max', v)}
      />
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Currently Wild Shaped" checked={Boolean(cf.is_wild_shaped)} onChange={v => set('is_wild_shaped', v)} />
        {level >= 18 && <CheckRow label="Beast Spells available" checked={Boolean(cf.beast_spells)} onChange={v => set('beast_spells', v)} />}
      </div>
      <Select label="Druid Circle" value={String(cf.druid_circle ?? '')} onChange={e => set('druid_circle', e.target.value)}>
        <option value="">— None selected —</option>
        {['Circle of the Land','Circle of the Moon','Circle of Dreams','Circle of the Shepherd','Circle of Spores','Circle of Stars','Circle of Wildfire'].map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
    </>
  )
}

function Fighter({ level, cf, set }: { level: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const actionSurgeMax = level >= 17 ? 2 : 1
  const secondWindMax = 1

  return (
    <>
      <RuneDivider label="Fighter" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Action Surge Used" value={num(cf.action_surge_used, 0)} min={0} max={actionSurgeMax} onChange={v => set('action_surge_used', v)} />
        <Field label="Second Wind Used" value={num(cf.second_wind_used, 0)} min={0} max={secondWindMax} onChange={v => set('second_wind_used', v)} />
      </div>
      {level >= 9 && (
        <Field label="Indomitable Uses Remaining" hint="1-3/long rest" value={num(cf.indomitable_remaining, level >= 17 ? 3 : level >= 13 ? 2 : 1)} min={0} max={3} onChange={v => set('indomitable_remaining', v)} />
      )}
      <Select label="Fighting Style" value={String(cf.fighting_style ?? '')} onChange={e => set('fighting_style', e.target.value)}>
        <option value="">— None selected —</option>
        {['Archery','Blind Fighting','Defense','Dueling','Great Weapon Fighting','Interception','Protection','Superior Technique','Thrown Weapon Fighting','Two-Weapon Fighting','Unarmed Fighting'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      <Select label="Martial Archetype" value={String(cf.martial_archetype ?? '')} onChange={e => set('martial_archetype', e.target.value)}>
        <option value="">— None selected —</option>
        {['Battle Master','Champion','Eldritch Knight','Arcane Archer','Cavalier','Echo Knight','Psi Warrior','Rune Knight','Samurai','Purple Dragon Knight'].map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </Select>
    </>
  )
}

function Monk({ level, wisdom, cf, set }: { level: number; wisdom: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const kiMax = level

  return (
    <>
      <RuneDivider label="Monk" />
      <PoolRow
        label="Ki Points" hint={`${kiMax} per short/long rest`}
        current={num(cf.ki_points_current, kiMax)}
        max={num(cf.ki_points_max, kiMax)}
        onCurrentChange={v => set('ki_points_current', v)}
        onMaxChange={v => set('ki_points_max', v)}
      />
      {level >= 3 && (
        <Field label="Stunning Strike DCs used" value={num(cf.stunning_strike_uses, 0)} min={0} onChange={v => set('stunning_strike_uses', v)} />
      )}
      <div className="flex flex-wrap gap-4">
        {level >= 14 && <CheckRow label="Diamond Soul (proficiency on all saves)" checked={Boolean(cf.diamond_soul)} onChange={v => set('diamond_soul', v)} />}
        {level >= 18 && <CheckRow label="Empty Body active" checked={Boolean(cf.empty_body_active)} onChange={v => set('empty_body_active', v)} />}
      </div>
      <Select label="Monastic Tradition" value={String(cf.monastic_tradition ?? '')} onChange={e => set('monastic_tradition', e.target.value)}>
        <option value="">— None selected —</option>
        {['Way of the Open Hand','Way of Shadow','Way of the Four Elements','Way of the Drunken Master','Way of the Kensei','Way of the Sun Soul','Way of the Astral Self','Way of Mercy'].map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </Select>
    </>
  )
}

function Ranger({ level, cf, set }: { level: number; cf: CF; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <RuneDivider label="Ranger" />
      <Select label="Favored Enemy" value={String(cf.favored_enemy ?? '')} onChange={e => set('favored_enemy', e.target.value)}>
        <option value="">— None selected —</option>
        {['Aberrations','Beasts','Celestials','Constructs','Dragons','Elementals','Fey','Fiends','Giants','Monstrosities','Oozes','Plants','Undead','Humanoids (two types)'].map(e => (
          <option key={e} value={e}>{e}</option>
        ))}
      </Select>
      <Select label="Natural Explorer Terrain" value={String(cf.natural_explorer_terrain ?? '')} onChange={e => set('natural_explorer_terrain', e.target.value)}>
        <option value="">— None selected —</option>
        {['Arctic','Coast','Desert','Forest','Grassland','Mountain','Swamp','Underdark'].map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </Select>
      {level >= 3 && (
        <div className="flex flex-wrap gap-4">
          <CheckRow label="Primeval Awareness used" checked={Boolean(cf.primeval_awareness_used)} onChange={v => set('primeval_awareness_used', v)} />
        </div>
      )}
      <Select label="Ranger Archetype" value={String(cf.ranger_archetype ?? '')} onChange={e => set('ranger_archetype', e.target.value)}>
        <option value="">— None selected —</option>
        {['Beast Master','Hunter','Fey Wanderer','Gloom Stalker','Horizon Walker','Monster Slayer','Swarmkeeper'].map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </Select>
    </>
  )
}

function Rogue({ level, cf, set }: { level: number; cf: CF; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <RuneDivider label="Rogue" />
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Sneak Attack eligible" checked={Boolean(cf.sneak_attack_eligible)} onChange={v => set('sneak_attack_eligible', v)} />
        {level >= 5 && <CheckRow label="Uncanny Dodge ready" checked={Boolean(cf.uncanny_dodge_ready)} onChange={v => set('uncanny_dodge_ready', v)} />}
        {level >= 7 && <CheckRow label="Evasion active" checked={Boolean(cf.evasion_active)} onChange={v => set('evasion_active', v)} />}
      </div>
      {level >= 9 && (
        <Field label="Blindsense Range (ft)" value={num(cf.blindsense_range, 10)} min={0} onChange={v => set('blindsense_range', v)} />
      )}
      {level >= 11 && (
        <Field label="Reliable Talent (min 10 on proficient checks)" value={10} min={10} max={10} onChange={() => {}} />
      )}
      <Select label="Roguish Archetype" value={String(cf.roguish_archetype ?? '')} onChange={e => set('roguish_archetype', e.target.value)}>
        <option value="">— None selected —</option>
        {['Thief','Assassin','Arcane Trickster','Inquisitive','Mastermind','Scout','Soulknife','Swashbuckler','Phantom'].map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </Select>
    </>
  )
}

function Sorcerer({ level, charisma, profBon, cf, set }: { level: number; charisma: number; profBon: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const spMax = level >= 20 ? 20 : level * 2

  return (
    <>
      <RuneDivider label="Sorcerer" />
      <PoolRow
        label="Sorcery Points" hint={`${spMax} per long rest`}
        current={num(cf.sorcery_points_current, spMax)}
        max={num(cf.sorcery_points_max, spMax)}
        onCurrentChange={v => set('sorcery_points_current', v)}
        onMaxChange={v => set('sorcery_points_max', v)}
      />
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Metamagic: Careful Spell" checked={Boolean(cf.metamagic_careful)} onChange={v => set('metamagic_careful', v)} />
        <CheckRow label="Metamagic: Distant Spell" checked={Boolean(cf.metamagic_distant)} onChange={v => set('metamagic_distant', v)} />
        <CheckRow label="Metamagic: Empowered Spell" checked={Boolean(cf.metamagic_empowered)} onChange={v => set('metamagic_empowered', v)} />
        <CheckRow label="Metamagic: Extended Spell" checked={Boolean(cf.metamagic_extended)} onChange={v => set('metamagic_extended', v)} />
        <CheckRow label="Metamagic: Heightened Spell" checked={Boolean(cf.metamagic_heightened)} onChange={v => set('metamagic_heightened', v)} />
        <CheckRow label="Metamagic: Quickened Spell" checked={Boolean(cf.metamagic_quickened)} onChange={v => set('metamagic_quickened', v)} />
        <CheckRow label="Metamagic: Subtle Spell" checked={Boolean(cf.metamagic_subtle)} onChange={v => set('metamagic_subtle', v)} />
        <CheckRow label="Metamagic: Twinned Spell" checked={Boolean(cf.metamagic_twinned)} onChange={v => set('metamagic_twinned', v)} />
      </div>
      <Select label="Sorcerous Origin" value={String(cf.sorcerous_origin ?? '')} onChange={e => set('sorcerous_origin', e.target.value)}>
        <option value="">— None selected —</option>
        {['Draconic Bloodline','Wild Magic','Divine Soul','Shadow Magic','Storm Sorcery','Aberrant Mind','Clockwork Soul'].map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </Select>
    </>
  )
}

function Warlock({ level, charisma, profBon, cf, set }: { level: number; charisma: number; profBon: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1
  const slotCount = level >= 11 ? 3 : level >= 2 ? 2 : 1

  return (
    <>
      <RuneDivider label="Warlock" />
      <PoolRow
        label={`Pact Magic Slots (level ${slotLevel})`} hint={`${slotCount} slots/short rest`}
        current={num(cf.pact_slots_current, slotCount)}
        max={num(cf.pact_slots_max, slotCount)}
        onCurrentChange={v => set('pact_slots_current', v)}
        onMaxChange={v => set('pact_slots_max', v)}
      />
      {level >= 11 && (
        <PoolRow
          label="Mystic Arcanum Uses" hint="1 per long rest each"
          current={num(cf.mystic_arcanum_used, 0)}
          max={num(cf.mystic_arcanum_max, level >= 17 ? 4 : level >= 15 ? 3 : level >= 13 ? 2 : 1)}
          onCurrentChange={v => set('mystic_arcanum_used', v)}
          onMaxChange={v => set('mystic_arcanum_max', v)}
        />
      )}
      <div className="flex flex-wrap gap-4">
        {level >= 1 && <CheckRow label="Dark One's Blessing active" checked={Boolean(cf.dark_ones_blessing)} onChange={v => set('dark_ones_blessing', v)} />}
      </div>
      <Select label="Otherworldly Patron" value={String(cf.patron ?? '')} onChange={e => set('patron', e.target.value)}>
        <option value="">— None selected —</option>
        {['The Fiend','The Archfey','The Great Old One','The Celestial','The Hexblade','The Fathomless','The Genie','The Undying','Undead'].map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </Select>
      <Select label="Pact Boon" value={String(cf.pact_boon ?? '')} onChange={e => set('pact_boon', e.target.value)}>
        <option value="">— None selected —</option>
        {['Pact of the Blade','Pact of the Chain','Pact of the Tome','Pact of the Talisman'].map(b => (
          <option key={b} value={b}>{b}</option>
        ))}
      </Select>
    </>
  )
}

function Wizard({ level, cf, set }: { level: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const arcaneRecoverySlots = Math.ceil(level / 2)

  return (
    <>
      <RuneDivider label="Wizard" />
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Arcane Recovery used today" checked={Boolean(cf.arcane_recovery_used)} onChange={v => set('arcane_recovery_used', v)} />
        {level >= 18 && <CheckRow label="Spell Mastery (cast at will)" checked={Boolean(cf.spell_mastery)} onChange={v => set('spell_mastery', v)} />}
        {level >= 20 && <CheckRow label="Signature Spells ready" checked={Boolean(cf.signature_spells)} onChange={v => set('signature_spells', v)} />}
      </div>
      <div className="runic-card p-3">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-rune)] mb-1">Arcane Recovery</p>
        <p className="text-xs text-[var(--color-text-dim)]">
          Once per day on short rest, recover up to <span className="text-[var(--color-rune-bright)] font-mono">{arcaneRecoverySlots}</span> combined spell slot levels (max 5th level slots).
        </p>
      </div>
      <Select label="Arcane Tradition" value={String(cf.arcane_tradition ?? '')} onChange={e => set('arcane_tradition', e.target.value)}>
        <option value="">— None selected —</option>
        {['School of Abjuration','School of Conjuration','School of Divination','School of Enchantment','School of Evocation','School of Illusion','School of Necromancy','School of Transmutation','Bladesinging','Order of Scribes','Chronurgy','Graviturgy'].map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </Select>
    </>
  )
}

function Artificer({ level, cf, set }: { level: number; cf: CF; set: (k: string, v: unknown) => void }) {
  const infusionsKnown = level >= 14 ? 8 : level >= 10 ? 6 : level >= 6 ? 4 : 2

  return (
    <>
      <RuneDivider label="Artificer" />
      <Field label="Infusions Known" value={num(cf.infusions_known, infusionsKnown)} min={0} onChange={v => set('infusions_known', v)} />
      <Field label="Infused Items (max = known / 2)" value={num(cf.infused_items, Math.floor(infusionsKnown / 2))} min={0} onChange={v => set('infused_items', v)} />
      <div className="flex flex-wrap gap-4">
        <CheckRow label="Magical Tinkering ready" checked={Boolean(cf.magical_tinkering)} onChange={v => set('magical_tinkering', v)} />
        {level >= 7 && <CheckRow label="Flash of Genius reaction ready" checked={Boolean(cf.flash_of_genius_ready)} onChange={v => set('flash_of_genius_ready', v)} />}
      </div>
      <Select label="Artificer Specialist" value={String(cf.specialist ?? '')} onChange={e => set('specialist', e.target.value)}>
        <option value="">— None selected —</option>
        {['Alchemist','Armorer','Artillerist','Battle Smith'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
    </>
  )
}

// ── main export ─────────────────────────────────────────────────────────────

export function ClassFeatures({ characterClass, level, charisma, wisdom, proficiencyBonus, value, onChange }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...value, [key]: val })
  const cf = value

  const commonProps = { level, cf, set }

  switch (characterClass) {
    case 'Artificer': return <Artificer {...commonProps} />
    case 'Barbarian': return <Barbarian {...commonProps} />
    case 'Bard':      return <Bard {...commonProps} charisma={charisma} profBon={proficiencyBonus} />
    case 'Cleric':    return <Cleric {...commonProps} wisdom={wisdom} />
    case 'Druid':     return <Druid {...commonProps} />
    case 'Fighter':   return <Fighter {...commonProps} />
    case 'Monk':      return <Monk {...commonProps} wisdom={wisdom} />
    case 'Paladin':   return <Paladin {...commonProps} charisma={charisma} profBon={proficiencyBonus} />
    case 'Ranger':    return <Ranger {...commonProps} />
    case 'Rogue':     return <Rogue {...commonProps} />
    case 'Sorcerer':  return <Sorcerer {...commonProps} charisma={charisma} profBon={proficiencyBonus} />
    case 'Warlock':   return <Warlock {...commonProps} charisma={charisma} profBon={proficiencyBonus} />
    case 'Wizard':    return <Wizard {...commonProps} />
    default:          return null
  }
}
