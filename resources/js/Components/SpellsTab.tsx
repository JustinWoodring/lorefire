import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { CharacterSpell } from '@/types'
import { Button } from '@/Components/Button'
import { Input, Select, Textarea } from '@/Components/Input'

// ── Spell school colours ──────────────────────────────────────────────
const SCHOOL_COLORS: Record<string, string> = {
  abjuration:    '#4a90d9',
  conjuration:   '#a259e6',
  divination:    '#e6c459',
  enchantment:   '#e659a2',
  evocation:     '#e67359',
  illusion:      '#59b8e6',
  necromancy:    '#59e6a2',
  transmutation: '#9be659',
}

const SCHOOLS = Object.keys(SCHOOL_COLORS)

const SPELL_LEVEL_LABELS: Record<number, string> = {
  0: 'Cantrips',
  1: '1st Level',
  2: '2nd Level',
  3: '3rd Level',
  4: '4th Level',
  5: '5th Level',
  6: '6th Level',
  7: '7th Level',
  8: '8th Level',
  9: '9th Level',
}

// ── Suggested spells by class ─────────────────────────────────────────
// A curated set of iconic spells per class to seed the "quick add" picker.
// level 0 = cantrip.
const CLASS_SPELL_SUGGESTIONS: Record<string, Array<{ name: string; level: number; school: string; casting_time: string; range: string; components: string; duration: string; concentration: boolean; ritual: boolean }>> = {
  Artificer: [
    { name: 'Mending',            level: 0, school: 'transmutation', casting_time: '1 minute', range: 'Touch', components: 'V, S, M', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Cure Wounds',        level: 1, school: 'evocation',     casting_time: '1 action',  range: 'Touch', components: 'V, S',     duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Faerie Fire',        level: 1, school: 'evocation',     casting_time: '1 action',  range: '60 ft', components: 'V',        duration: '1 minute',      concentration: true,  ritual: false },
    { name: 'Web',                level: 2, school: 'conjuration',   casting_time: '1 action',  range: '60 ft', components: 'V, S, M',  duration: '1 hour',        concentration: true,  ritual: false },
  ],
  Barbarian: [],
  Bard: [
    { name: 'Vicious Mockery',    level: 0, school: 'enchantment',   casting_time: '1 action',  range: '60 ft', components: 'V',       duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Prestidigitation',   level: 0, school: 'transmutation', casting_time: '1 action',  range: '10 ft', components: 'V, S',    duration: '1 hour',        concentration: false, ritual: false },
    { name: 'Charm Person',       level: 1, school: 'enchantment',   casting_time: '1 action',  range: '30 ft', components: 'V, S',    duration: '1 hour',        concentration: false, ritual: false },
    { name: 'Healing Word',       level: 1, school: 'evocation',     casting_time: '1 bonus action', range: '60 ft', components: 'V', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Hypnotic Pattern',   level: 3, school: 'illusion',      casting_time: '1 action',  range: '120 ft', components: 'S, M',  duration: '1 minute',      concentration: true,  ritual: false },
    { name: 'Dimension Door',     level: 4, school: 'conjuration',   casting_time: '1 action',  range: '500 ft', components: 'V',     duration: 'Instantaneous', concentration: false, ritual: false },
  ],
  Cleric: [
    { name: 'Sacred Flame',       level: 0, school: 'evocation',     casting_time: '1 action',  range: '60 ft', components: 'V, S',    duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Guidance',           level: 0, school: 'divination',    casting_time: '1 action',  range: 'Touch', components: 'V, S',    duration: '1 minute',      concentration: true,  ritual: false },
    { name: 'Cure Wounds',        level: 1, school: 'evocation',     casting_time: '1 action',  range: 'Touch', components: 'V, S',    duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Healing Word',       level: 1, school: 'evocation',     casting_time: '1 bonus action', range: '60 ft', components: 'V', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Bless',              level: 1, school: 'enchantment',   casting_time: '1 action',  range: '30 ft', components: 'V, S, M', duration: '1 minute',     concentration: true,  ritual: false },
    { name: 'Spiritual Weapon',   level: 2, school: 'evocation',     casting_time: '1 bonus action', range: '60 ft', components: 'V, S', duration: '1 minute',  concentration: false, ritual: false },
    { name: 'Spirit Guardians',   level: 3, school: 'conjuration',   casting_time: '1 action',  range: 'Self (15 ft)', components: 'V, S, M', duration: '10 minutes', concentration: true, ritual: false },
    { name: 'Banishment',         level: 4, school: 'abjuration',    casting_time: '1 action',  range: '60 ft', components: 'V, S, M', duration: '1 minute',     concentration: true,  ritual: false },
  ],
  Druid: [
    { name: 'Shillelagh',         level: 0, school: 'transmutation', casting_time: '1 bonus action', range: 'Touch', components: 'V, S, M', duration: '1 minute', concentration: false, ritual: false },
    { name: 'Thorn Whip',         level: 0, school: 'transmutation', casting_time: '1 action',  range: '30 ft', components: 'V, S, M', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Healing Word',       level: 1, school: 'evocation',     casting_time: '1 bonus action', range: '60 ft', components: 'V', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Entangle',           level: 1, school: 'conjuration',   casting_time: '1 action',  range: '90 ft', components: 'V, S',    duration: '1 minute',      concentration: true,  ritual: false },
    { name: 'Moonbeam',           level: 2, school: 'evocation',     casting_time: '1 action',  range: '120 ft', components: 'V, S, M', duration: '1 minute',    concentration: true,  ritual: false },
    { name: 'Call Lightning',     level: 3, school: 'conjuration',   casting_time: '1 action',  range: '120 ft', components: 'V, S',  duration: '10 minutes',    concentration: true,  ritual: false },
    { name: 'Polymorph',          level: 4, school: 'transmutation', casting_time: '1 action',  range: '60 ft', components: 'V, S, M', duration: '1 hour',       concentration: true,  ritual: false },
  ],
  Fighter: [],
  Monk: [],
  Paladin: [
    { name: 'Bless',              level: 1, school: 'enchantment',   casting_time: '1 action',  range: '30 ft', components: 'V, S, M', duration: '1 minute',      concentration: true,  ritual: false },
    { name: 'Shield of Faith',    level: 1, school: 'abjuration',    casting_time: '1 bonus action', range: '60 ft', components: 'V, S, M', duration: '10 minutes', concentration: true, ritual: false },
    { name: 'Divine Smite',       level: 1, school: 'evocation',     casting_time: '1 bonus action', range: 'Self', components: 'V',      duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Aid',                level: 2, school: 'abjuration',    casting_time: '1 action',  range: '30 ft', components: 'V, S, M', duration: '8 hours',       concentration: false, ritual: false },
    { name: 'Aura of Vitality',   level: 3, school: 'evocation',     casting_time: '1 action',  range: 'Self (30 ft)', components: 'V', duration: '1 minute',      concentration: true,  ritual: false },
  ],
  Ranger: [
    { name: 'Hunter\'s Mark',     level: 1, school: 'divination',    casting_time: '1 bonus action', range: '90 ft', components: 'V',  duration: '1 hour',        concentration: true,  ritual: false },
    { name: 'Ensnaring Strike',   level: 1, school: 'conjuration',   casting_time: '1 bonus action', range: 'Self', components: 'V',    duration: '1 minute',      concentration: true,  ritual: false },
    { name: 'Spike Growth',       level: 2, school: 'transmutation', casting_time: '1 action',  range: '150 ft', components: 'V, S, M', duration: '10 minutes',   concentration: true,  ritual: false },
    { name: 'Lightning Arrow',    level: 3, school: 'transmutation', casting_time: '1 bonus action', range: 'Self', components: 'V, S', duration: 'Instantaneous', concentration: false, ritual: false },
  ],
  Rogue: [],
  Sorcerer: [
    { name: 'Fire Bolt',          level: 0, school: 'evocation',     casting_time: '1 action',  range: '120 ft', components: 'V, S',   duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Prestidigitation',   level: 0, school: 'transmutation', casting_time: '1 action',  range: '10 ft', components: 'V, S',    duration: '1 hour',        concentration: false, ritual: false },
    { name: 'Mage Armor',         level: 1, school: 'abjuration',    casting_time: '1 action',  range: 'Touch', components: 'V, S, M', duration: '8 hours',       concentration: false, ritual: false },
    { name: 'Thunderwave',        level: 1, school: 'evocation',     casting_time: '1 action',  range: 'Self (15 ft)', components: 'V, S', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Scorching Ray',      level: 2, school: 'evocation',     casting_time: '1 action',  range: '120 ft', components: 'V, S',   duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Fireball',           level: 3, school: 'evocation',     casting_time: '1 action',  range: '150 ft', components: 'V, S, M', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Banishment',         level: 4, school: 'abjuration',    casting_time: '1 action',  range: '60 ft', components: 'V, S, M', duration: '1 minute',       concentration: true,  ritual: false },
  ],
  Warlock: [
    { name: 'Eldritch Blast',     level: 0, school: 'evocation',     casting_time: '1 action',  range: '120 ft', components: 'V, S',   duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Minor Illusion',     level: 0, school: 'illusion',      casting_time: '1 action',  range: '30 ft', components: 'S, M',    duration: '1 minute',      concentration: false, ritual: false },
    { name: 'Hex',                level: 1, school: 'enchantment',   casting_time: '1 bonus action', range: '90 ft', components: 'V, S, M', duration: '1 hour',  concentration: true,  ritual: false },
    { name: 'Hunger of Hadar',    level: 3, school: 'conjuration',   casting_time: '1 action',  range: '150 ft', components: 'V, S, M', duration: '1 minute',    concentration: true,  ritual: false },
    { name: 'Banishment',         level: 4, school: 'abjuration',    casting_time: '1 action',  range: '60 ft', components: 'V, S, M', duration: '1 minute',      concentration: true,  ritual: false },
  ],
  Wizard: [
    { name: 'Fire Bolt',          level: 0, school: 'evocation',     casting_time: '1 action',  range: '120 ft', components: 'V, S',   duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Mage Hand',          level: 0, school: 'conjuration',   casting_time: '1 action',  range: '30 ft', components: 'V, S',    duration: '1 minute',      concentration: false, ritual: false },
    { name: 'Minor Illusion',     level: 0, school: 'illusion',      casting_time: '1 action',  range: '30 ft', components: 'S, M',    duration: '1 minute',      concentration: false, ritual: false },
    { name: 'Mage Armor',         level: 1, school: 'abjuration',    casting_time: '1 action',  range: 'Touch', components: 'V, S, M', duration: '8 hours',       concentration: false, ritual: false },
    { name: 'Magic Missile',      level: 1, school: 'evocation',     casting_time: '1 action',  range: '120 ft', components: 'V, S',   duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Shield',             level: 1, school: 'abjuration',    casting_time: '1 reaction', range: 'Self',  components: 'V, S',   duration: '1 round',       concentration: false, ritual: false },
    { name: 'Misty Step',         level: 2, school: 'conjuration',   casting_time: '1 bonus action', range: 'Self', components: 'V',  duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Fireball',           level: 3, school: 'evocation',     casting_time: '1 action',  range: '150 ft', components: 'V, S, M', duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Counterspell',       level: 3, school: 'abjuration',    casting_time: '1 reaction', range: '60 ft', components: 'S',      duration: 'Instantaneous', concentration: false, ritual: false },
    { name: 'Polymorph',          level: 4, school: 'transmutation', casting_time: '1 action',  range: '60 ft', components: 'V, S, M', duration: '1 hour',        concentration: true,  ritual: false },
    { name: 'Forcecage',          level: 7, school: 'evocation',     casting_time: '1 action',  range: '100 ft', components: 'V, S, M', duration: '1 hour',       concentration: false, ritual: false },
  ],
  Other: [],
}

// ── Blank spell form ──────────────────────────────────────────────────
const BLANK_SPELL = {
  name: '',
  level: 1,
  school: '',
  casting_time: '1 action',
  range: '',
  components: '',
  duration: '',
  concentration: false,
  ritual: false,
  description: '',
  is_prepared: false,
}

type SpellForm = typeof BLANK_SPELL

// ── Props ─────────────────────────────────────────────────────────────
interface Props {
  characterId: number
  characterClass: string
  spells: CharacterSpell[]
}

// ── Main component ────────────────────────────────────────────────────
export function SpellsTab({ characterId, characterClass, spells }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSpell, setEditingSpell] = useState<CharacterSpell | null>(null)
  const [form, setForm] = useState<SpellForm>(BLANK_SPELL)
  const [submitting, setSubmitting] = useState(false)
  const [expandedSpell, setExpandedSpell] = useState<number | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = CLASS_SPELL_SUGGESTIONS[characterClass] ?? CLASS_SPELL_SUGGESTIONS['Other']

  const openAdd = () => {
    setEditingSpell(null)
    setForm(BLANK_SPELL)
    setShowSuggestions(suggestions.length > 0)
    setModalOpen(true)
  }

  const openEdit = (spell: CharacterSpell) => {
    setEditingSpell(spell)
    setForm({
      name: spell.name,
      level: spell.level,
      school: spell.school ?? '',
      casting_time: spell.casting_time ?? '1 action',
      range: spell.range ?? '',
      components: spell.components ?? '',
      duration: spell.duration ?? '',
      concentration: spell.concentration,
      ritual: spell.ritual,
      description: spell.description ?? '',
      is_prepared: spell.is_prepared,
    })
    setShowSuggestions(false)
    setModalOpen(true)
  }

  const applySuggestion = (s: typeof suggestions[0]) => {
    setForm({
      name: s.name,
      level: s.level,
      school: s.school,
      casting_time: s.casting_time,
      range: s.range,
      components: s.components,
      duration: s.duration,
      concentration: s.concentration,
      ritual: s.ritual,
      description: '',
      is_prepared: s.level === 0, // cantrips always prepared
    })
    setShowSuggestions(false)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingSpell(null)
    setShowSuggestions(false)
  }

  const submitSpell = () => {
    setSubmitting(true)
    const payload = {
      ...form,
      concentration: form.concentration ? 1 : 0,
      ritual: form.ritual ? 1 : 0,
      is_prepared: form.is_prepared ? 1 : 0,
    }
    if (editingSpell) {
      router.patch(`/characters/${characterId}/spells/${editingSpell.id}`, payload, {
        preserveScroll: true,
        onFinish: () => { setSubmitting(false); closeModal() },
      })
    } else {
      router.post(`/characters/${characterId}/spells`, payload, {
        preserveScroll: true,
        onFinish: () => { setSubmitting(false); closeModal() },
      })
    }
  }

  const deleteSpell = (spell: CharacterSpell) => {
    if (!confirm(`Remove ${spell.name} from this character's spell list?`)) return
    router.delete(`/characters/${characterId}/spells/${spell.id}`, { preserveScroll: true })
  }

  const togglePrepared = (spell: CharacterSpell) => {
    if (spell.level === 0) return // cantrips always prepared
    router.patch(`/characters/${characterId}/spells/${spell.id}/prepare`, {}, { preserveScroll: true })
  }

  // Group by level
  const byLevel = spells.reduce<Record<number, CharacterSpell[]>>((acc, s) => {
    ;(acc[s.level] ??= []).push(s)
    return acc
  }, {})
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          {spells.length} spell{spells.length !== 1 ? 's' : ''} known
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={openAdd}>
          + Add Spell
        </Button>
      </div>

      {/* Empty state */}
      {spells.length === 0 && (
        <div
          className="flex flex-col items-center gap-2 py-10 rounded border border-dashed text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm text-[var(--color-text-dim)]">No spells added yet.</p>
          {suggestions.length > 0 && (
            <p className="text-xs text-[var(--color-text-dim)]">
              Click <span className="text-[var(--color-rune)]">+ Add Spell</span> to pick from {characterClass} suggestions or enter one manually.
            </p>
          )}
        </div>
      )}

      {/* Spell list grouped by level */}
      {levels.map(level => (
        <div key={level} className="flex flex-col gap-1">
          <p
            className="text-[10px] uppercase tracking-widest font-heading mb-1"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {SPELL_LEVEL_LABELS[level] ?? `Level ${level}`}
          </p>
          {byLevel[level].sort((a, b) => a.name.localeCompare(b.name)).map(spell => (
            <SpellRow
              key={spell.id}
              spell={spell}
              expanded={expandedSpell === spell.id}
              onToggleExpand={() => setExpandedSpell(expandedSpell === spell.id ? null : spell.id)}
              onEdit={() => openEdit(spell)}
              onDelete={() => deleteSpell(spell)}
              onTogglePrepared={() => togglePrepared(spell)}
            />
          ))}
        </div>
      ))}

      {/* Add / Edit modal */}
      {modalOpen && (
        <SpellModal
          editing={editingSpell}
          form={form}
          setForm={setForm}
          submitting={submitting}
          suggestions={showSuggestions ? suggestions : []}
          onSuggestion={applySuggestion}
          onDismissSuggestions={() => setShowSuggestions(false)}
          onSubmit={submitSpell}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

// ── Spell row ─────────────────────────────────────────────────────────
function SpellRow({
  spell, expanded, onToggleExpand, onEdit, onDelete, onTogglePrepared,
}: {
  spell: CharacterSpell
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onTogglePrepared: () => void
}) {
  const schoolColor = SCHOOL_COLORS[spell.school?.toLowerCase() ?? ''] ?? 'var(--color-text-dim)'
  const isCantrip = spell.level === 0

  return (
    <div
      className="rounded border transition-colors"
      style={{
        borderColor: expanded ? 'var(--color-rune-dim)' : 'var(--color-border)',
        background: 'var(--color-deep)',
      }}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Prepared pip — cantrips always lit */}
        <button
          type="button"
          title={isCantrip ? 'Cantrips are always prepared' : spell.is_prepared ? 'Prepared — click to unprepare' : 'Unprepared — click to prepare'}
          onClick={onTogglePrepared}
          className="shrink-0 w-3 h-3 rounded-full border transition-colors"
          style={{
            borderColor: (isCantrip || spell.is_prepared) ? 'var(--color-rune)' : 'var(--color-border)',
            background: (isCantrip || spell.is_prepared) ? 'var(--color-rune)' : 'transparent',
            cursor: isCantrip ? 'default' : 'pointer',
          }}
        />

        {/* Name + badges */}
        <button
          type="button"
          className="flex-1 text-left text-sm text-[var(--color-text-bright)] hover:text-[var(--color-text-white)] truncate"
          onClick={onToggleExpand}
        >
          {spell.name}
        </button>

        {/* Tags */}
        <div className="flex items-center gap-1 shrink-0">
          {spell.concentration && (
            <span className="px-1 py-0 text-[9px] rounded border border-[var(--color-warning)]/50 text-[var(--color-warning)] font-mono leading-4">C</span>
          )}
          {spell.ritual && (
            <span className="px-1 py-0 text-[9px] rounded border border-[var(--color-rune-dim)] text-[var(--color-rune)] font-mono leading-4">R</span>
          )}
          {spell.school && (
            <span
              className="hidden sm:inline px-1.5 py-0 text-[9px] rounded uppercase tracking-widest leading-4"
              style={{ color: schoolColor, borderColor: schoolColor + '50', border: '1px solid' }}
            >
              {spell.school.slice(0, 3)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-rune)] transition-colors"
            title="Edit spell"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
            title="Remove spell"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-3 pb-3 pt-0 flex flex-col gap-1.5 border-t text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-dim)' }}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {spell.casting_time && <Detail label="Casting Time" value={spell.casting_time} />}
            {spell.range && <Detail label="Range" value={spell.range} />}
            {spell.components && <Detail label="Components" value={spell.components} />}
            {spell.duration && <Detail label="Duration" value={spell.duration} />}
          </div>
          {spell.description && (
            <p className="mt-1 leading-relaxed" style={{ color: 'var(--color-text-base)' }}>
              {spell.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="uppercase tracking-widest text-[9px]">{label}: </span>
      <span style={{ color: 'var(--color-text-base)' }}>{value}</span>
    </div>
  )
}

// ── Spell modal ───────────────────────────────────────────────────────
function SpellModal({
  editing, form, setForm, submitting,
  suggestions, onSuggestion, onDismissSuggestions,
  onSubmit, onClose,
}: {
  editing: CharacterSpell | null
  form: SpellForm
  setForm: React.Dispatch<React.SetStateAction<SpellForm>>
  submitting: boolean
  suggestions: typeof CLASS_SPELL_SUGGESTIONS[string]
  onSuggestion: (s: typeof CLASS_SPELL_SUGGESTIONS[string][0]) => void
  onDismissSuggestions: () => void
  onSubmit: () => void
  onClose: () => void
}) {
  const set = <K extends keyof SpellForm>(k: K, v: SpellForm[K]) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-lg flex flex-col max-h-[90vh] overflow-hidden"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="font-heading text-sm uppercase tracking-widest text-[var(--color-text-white)]">
            {editing ? 'Edit Spell' : 'Add Spell'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text-white)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Suggestions picker */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                  Quick Add — {Object.entries(CLASS_SPELL_SUGGESTIONS).find(([, v]) => v === suggestions)?.[0] ?? ''} Spells
                </p>
                <button
                  type="button"
                  onClick={onDismissSuggestions}
                  className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-rune)] uppercase tracking-widest"
                >
                  Enter manually →
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => onSuggestion(s)}
                    className="flex items-center gap-3 px-3 py-2 rounded text-left hover:bg-[var(--color-rune)]/10 transition-colors"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <span
                      className="text-[9px] uppercase tracking-widest w-12 shrink-0"
                      style={{ color: SCHOOL_COLORS[s.school] ?? 'var(--color-text-dim)' }}
                    >
                      {s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`}
                    </span>
                    <span className="text-sm text-[var(--color-text-bright)] flex-1">{s.name}</span>
                    {s.concentration && (
                      <span className="text-[9px] text-[var(--color-warning)] font-mono">C</span>
                    )}
                    {s.ritual && (
                      <span className="text-[9px] text-[var(--color-rune)] font-mono">R</span>
                    )}
                  </button>
                ))}
              </div>
              <div
                className="border-t pt-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={onDismissSuggestions}
                  className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-rune)] transition-colors"
                >
                  + Enter a custom spell instead
                </button>
              </div>
            </div>
          )}

          {/* Manual form — shown when no suggestions or after dismissal */}
          {suggestions.length === 0 && (
            <div className="flex flex-col gap-4">
              <ManualSpellForm form={form} set={set} />
            </div>
          )}

          {/* Pre-filled form after suggestion applied */}
          {suggestions.length === 0 && form.name !== '' && null /* already shown above */}

          {/* After a suggestion is picked (suggestions dismissed, form populated) */}
          {!suggestions.length && (
            <div className="flex flex-col gap-3">
              {/* intentionally empty — ManualSpellForm above handles it */}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="rune"
            disabled={submitting || !form.name.trim() || suggestions.length > 0}
            onClick={onSubmit}
          >
            {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Spell'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ManualSpellForm({
  form, set,
}: {
  form: SpellForm
  set: <K extends keyof SpellForm>(k: K, v: SpellForm[K]) => void
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input
            label="Spell Name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Fireball, Hex, Cure Wounds…"
            autoFocus
          />
        </div>
        <Select
          label="Level"
          value={String(form.level)}
          onChange={e => set('level', parseInt(e.target.value))}
        >
          <option value="0">Cantrip</option>
          {[1,2,3,4,5,6,7,8,9].map(l => (
            <option key={l} value={l}>{l}{l===1?'st':l===2?'nd':l===3?'rd':'th'} Level</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="School"
          value={form.school}
          onChange={e => set('school', e.target.value)}
        >
          <option value="">Unknown</option>
          {SCHOOLS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
        <Input
          label="Casting Time"
          value={form.casting_time}
          onChange={e => set('casting_time', e.target.value)}
          placeholder="1 action"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Range"
          value={form.range}
          onChange={e => set('range', e.target.value)}
          placeholder="60 ft, Touch, Self…"
        />
        <Input
          label="Duration"
          value={form.duration}
          onChange={e => set('duration', e.target.value)}
          placeholder="Instantaneous, 1 minute…"
        />
      </div>

      <Input
        label="Components"
        value={form.components}
        onChange={e => set('components', e.target.value)}
        placeholder="V, S, M (a pinch of sulfur)"
      />

      <Textarea
        label="Description (optional)"
        value={form.description}
        onChange={e => set('description', e.target.value)}
        rows={3}
        placeholder="Brief description or notes…"
      />

      {/* Toggles */}
      <div className="flex flex-wrap gap-3">
        {form.level > 0 && (
          <ToggleChip
            label="Prepared"
            active={form.is_prepared}
            onClick={() => set('is_prepared', !form.is_prepared)}
            hint="Toggle to mark this spell prepared"
          />
        )}
        <ToggleChip
          label="Concentration"
          active={form.concentration}
          onClick={() => set('concentration', !form.concentration)}
        />
        <ToggleChip
          label="Ritual"
          active={form.ritual}
          onClick={() => set('ritual', !form.ritual)}
        />
      </div>
    </>
  )
}

function ToggleChip({ label, active, onClick, hint }: { label: string; active: boolean; onClick: () => void; hint?: string }) {
  return (
    <button
      type="button"
      title={hint}
      onClick={onClick}
      className="px-3 py-1.5 rounded text-xs uppercase tracking-widest border transition-colors"
      style={{
        borderColor: active ? 'var(--color-rune)' : 'var(--color-border)',
        color: active ? 'var(--color-rune-bright)' : 'var(--color-text-dim)',
        background: active ? 'var(--color-rune)1a' : 'transparent',
      }}
    >
      {label}
    </button>
  )
}
