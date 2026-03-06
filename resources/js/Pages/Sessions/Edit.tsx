import React from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Input, Textarea } from '@/Components/Input'
import { Campaign, Character, GameSession } from '@/types'

interface Props {
  campaign: Campaign
  session: GameSession
  characters: Pick<Character, 'id' | 'name' | 'class' | 'level'>[]
}

export default function Edit({ campaign, session, characters }: Props) {
  const [processing, setProcessing] = React.useState(false)
  const [form, setForm] = React.useState({
    title: session.title,
    session_number: session.session_number?.toString() ?? '',
    played_at: session.played_at ?? '',
    dm_notes: session.dm_notes ?? '',
    key_events: session.key_events ?? '',
    next_session_notes: session.next_session_notes ?? '',
    summary: session.summary ?? '',
    participant_character_ids: session.participant_character_ids ?? [],
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
    router.put(`/campaigns/${campaign.id}/sessions/${session.id}`, form, {
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: session.title, href: `/campaigns/${campaign.id}/sessions/${session.id}` },
      { label: 'Edit' },
    ]}>
      <Head title={`Edit — ${session.title}`} />

      <div className="max-w-xl mx-auto">
        <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-8">Edit Session</h1>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input label="Session Title" value={form.title} onChange={e => set('title', e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Session Number" type="number" min={1} value={form.session_number} onChange={e => set('session_number', e.target.value)} />
            <Input label="Date Played" type="date" value={form.played_at} onChange={e => set('played_at', e.target.value)} />
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

          <Textarea label="DM Notes" value={form.dm_notes} onChange={e => set('dm_notes', e.target.value)} rows={3} />

          <Textarea
            label="Key Events"
            value={form.key_events}
            onChange={e => set('key_events', e.target.value)}
            placeholder="• Bullet-point the memorable moments from this session"
            rows={4}
          />

          <Textarea
            label="Next Session Notes"
            value={form.next_session_notes}
            onChange={e => set('next_session_notes', e.target.value)}
            placeholder="Prep notes and hooks for next time…"
            rows={3}
          />

          <Textarea label="Bardic Summary" value={form.summary} onChange={e => set('summary', e.target.value)} rows={6} hint="You can manually edit or override the AI-generated summary." />

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="rune" disabled={processing}>{processing ? 'Saving…' : 'Save Changes'}</Button>
            <Button type="button" variant="ghost" as="a" href={`/campaigns/${campaign.id}/sessions/${session.id}`}>Cancel</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
