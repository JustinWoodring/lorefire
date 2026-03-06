import React from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Input, Textarea, Select } from '@/Components/Input'
import { Campaign } from '@/types'

interface Props {
  campaign: Campaign
}

export default function Create({ campaign }: Props) {
  const [processing, setProcessing] = React.useState(false)
  const [form, setForm] = React.useState({
    name: '',
    race: '',
    role: '',
    location: '',
    last_seen: '',
    tags: '',            // comma-separated string; parsed on submit
    voice_description: '',
    attitude: '' as '' | 'friendly' | 'neutral' | 'hostile',
    description: '',
    notes: '',
    is_alive: true,
  })

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    router.post(`/campaigns/${campaign.id}/npcs`, {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }, {
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: 'NPCs', href: `/campaigns/${campaign.id}/npcs` },
      { label: 'New NPC' },
    ]}>
      <Head title="New NPC" />

      <div className="max-w-xl mx-auto">
        <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-8">New NPC</h1>

        <form onSubmit={submit} className="flex flex-col gap-5">

          <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Race / Type" value={form.race} onChange={e => set('race', e.target.value)} placeholder="Human, Elf, Dragon…" />
            <Input label="Role / Title" value={form.role} onChange={e => set('role', e.target.value)} placeholder="Innkeeper, Guard Captain…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Where they're usually found" />
            <Input label="Last Seen" value={form.last_seen} onChange={e => set('last_seen', e.target.value)} placeholder="Session 3 – Waterdeep" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Attitude" value={form.attitude} onChange={e => set('attitude', e.target.value as typeof form.attitude)}>
              <option value="">Unknown</option>
              <option value="friendly">Friendly</option>
              <option value="neutral">Neutral</option>
              <option value="hostile">Hostile</option>
            </Select>
            <Input
              label="Tags"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="villain, merchant, ally (comma-separated)"
            />
          </div>

          <Input
            label="Voice / Mannerism Description"
            value={form.voice_description}
            onChange={e => set('voice_description', e.target.value)}
            placeholder="Gravelly voice, speaks in riddles…"
          />

          <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Physical appearance, mannerisms…" />

          <Textarea label="DM Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Secrets, plot hooks, motivations…" />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_alive}
              onChange={e => set('is_alive', e.target.checked)}
              className="w-4 h-4 rounded border border-[var(--color-border)] accent-[var(--color-rune)]"
            />
            <span className="text-sm text-[var(--color-text-base)]">Alive</span>
          </label>

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="rune" disabled={processing}>
              {processing ? 'Creating…' : 'Create NPC'}
            </Button>
            <Button type="button" variant="ghost" as="a" href={`/campaigns/${campaign.id}`}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
