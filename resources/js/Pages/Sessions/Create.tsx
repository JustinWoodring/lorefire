import React from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Input, Textarea } from '@/Components/Input'
import { Campaign, Character } from '@/types'

interface Props {
  campaign: Campaign
  characters: Pick<Character, 'id' | 'name' | 'class' | 'level'>[]
}

export default function Create({ campaign, characters }: Props) {
  const [processing, setProcessing] = React.useState(false)
  const [form, setForm] = React.useState({
    title: '',
    session_number: '',
    played_at: '',
    dm_notes: '',
    key_events: '',
    next_session_notes: '',
    participant_character_ids: [] as number[],
  })

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const toggleParticipant = (id: number) => {
    setForm(f => ({
      ...f,
      participant_character_ids: f.participant_character_ids.includes(id)
        ? f.participant_character_ids.filter(x => x !== id)
        : [...f.participant_character_ids, id],
    }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    router.post(`/campaigns/${campaign.id}/sessions`, form, {
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: 'New Session' },
    ]}>
      <Head title="New Session" />

      <div className="max-w-xl mx-auto">
        <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-8">New Session</h1>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input
            label="Session Title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="The Siege of Silverhold…"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Session Number"
              type="number"
              min={1}
              value={form.session_number}
              onChange={e => set('session_number', e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Date Played"
              type="date"
              value={form.played_at}
              onChange={e => set('played_at', e.target.value)}
            />
          </div>

          {/* Participants */}
          {characters.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mb-2">Participating Characters</p>
              <div className="flex flex-wrap gap-2">
                {characters.map(c => {
                  const active = form.participant_character_ids.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleParticipant(c.id)}
                      className={`
                        px-3 py-1.5 rounded text-xs border transition-colors
                        ${active
                          ? 'bg-[var(--color-rune)] border-[var(--color-rune)] text-[var(--color-deep)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-rune-dim)]'
                        }
                      `}
                    >
                      {c.name} <span className="opacity-60">{c.class} {c.level}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Textarea
            label="DM Notes"
            value={form.dm_notes}
            onChange={e => set('dm_notes', e.target.value)}
            placeholder="Pre-session notes, planned beats, etc."
            rows={3}
          />

          <Textarea
            label="Key Events"
            value={form.key_events}
            onChange={e => set('key_events', e.target.value)}
            placeholder="• Party defeated the bandit leader&#10;• Discovered the secret passage&#10;• Theron leveled up"
            rows={4}
          />

          <Textarea
            label="Next Session Notes"
            value={form.next_session_notes}
            onChange={e => set('next_session_notes', e.target.value)}
            placeholder="Prep notes for next time…"
            rows={3}
          />

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="rune" disabled={processing}>{processing ? 'Creating…' : 'Create Session'}</Button>
            <Button type="button" variant="ghost" as="a" href={`/campaigns/${campaign.id}`}>Cancel</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
