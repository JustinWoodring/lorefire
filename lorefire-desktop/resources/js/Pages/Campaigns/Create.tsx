import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Input, Textarea, Select } from '@/Components/Input'
import { RuneDivider } from '@/Components/RuneDivider'

export default function Create() {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    dm_name: '',
    setting: '',
    description: '',
    notes: '',
    art_style: 'lifelike',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/campaigns')
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Campaigns', href: '/campaigns' }, { label: 'New Campaign' }]}>
      <Head title="New Campaign" />

      <div className="max-w-xl mx-auto">
        <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-8">
          New Campaign
        </h1>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input
            label="Campaign Name"
            value={data.name}
            onChange={e => setData('name', e.target.value)}
            error={errors.name}
            placeholder="The Sunken Keep of Valdris…"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="DM Name"
              value={data.dm_name}
              onChange={e => setData('dm_name', e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Setting"
              value={data.setting}
              onChange={e => setData('setting', e.target.value)}
              placeholder="Forgotten Realms, Homebrew…"
            />
          </div>

          <Textarea
            label="Description"
            value={data.description}
            onChange={e => setData('description', e.target.value)}
            placeholder="A brief description of the campaign premise…"
            rows={3}
          />

          <RuneDivider label="Art Settings" />

          <Select
            label="Art Style"
            value={data.art_style}
            onChange={e => setData('art_style', e.target.value)}
            hint="Used for AI-generated scene art prompts"
          >
            <option value="lifelike">Lifelike — Realistic fantasy painting</option>
            <option value="comic">Comic — Graphic novel illustration</option>
          </Select>

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="rune" disabled={processing}>
              {processing ? 'Creating…' : 'Create Campaign'}
            </Button>
            <Button type="button" variant="ghost" as="a" href="/campaigns">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
