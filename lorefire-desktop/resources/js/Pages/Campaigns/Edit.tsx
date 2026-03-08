import React, { useRef, useState } from 'react'
import { Head, useForm } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Input, Textarea, Select } from '@/Components/Input'
import { RuneDivider } from '@/Components/RuneDivider'
import { Campaign } from '@/types'

interface Props {
  campaign: Campaign
}

export default function Edit({ campaign }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    _method: 'PUT',
    name: campaign.name,
    dm_name: campaign.dm_name ?? '',
    setting: campaign.setting ?? '',
    description: campaign.description ?? '',
    notes: campaign.notes ?? '',
    art_style: campaign.art_style,
    is_active: campaign.is_active,
    party_image: null as File | null,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(
    campaign.party_image_path ? `/storage-file/${campaign.party_image_path}` : null
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setData('party_image', file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // forceFormData ensures the file is sent as multipart/form-data
    post(`/campaigns/${campaign.id}`, { forceFormData: true })
  }

  return (
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: 'Edit' },
    ]}>
      <Head title={`Edit — ${campaign.name}`} />

      <div className="max-w-xl mx-auto">
        <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase mb-8">
          Edit Campaign
        </h1>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input label="Campaign Name" value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="DM Name" value={data.dm_name} onChange={e => setData('dm_name', e.target.value)} />
            <Input label="Setting" value={data.setting} onChange={e => setData('setting', e.target.value)} />
          </div>
          <Textarea label="Description" value={data.description} onChange={e => setData('description', e.target.value)} rows={3} />
          <Textarea label="Notes" value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3} />

          <RuneDivider label="Party Photo" />

          {/* Party photo upload */}
          <div className="flex flex-col gap-3">
            {preview && (
              <img
                src={preview}
                alt="Party photo preview"
                className="w-full max-h-48 object-cover rounded border border-[var(--color-border)]"
              />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-heading tracking-widest uppercase border border-[var(--color-border)] rounded text-[var(--color-text-dim)] hover:border-[var(--color-rune)] hover:text-[var(--color-rune)] transition-colors"
              >
                {preview ? 'Change Photo' : 'Upload Photo'}
              </button>
              {preview && campaign.party_image_path && (
                <span className="text-xs text-[var(--color-text-dim)] italic">Current photo shown above</span>
              )}
              {data.party_image && (
                <span className="text-xs text-[var(--color-rune)]">{data.party_image.name}</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {errors.party_image && (
              <p className="text-xs text-[var(--color-danger)]">{errors.party_image}</p>
            )}
          </div>

          <RuneDivider label="Art Settings" />

          <Select label="Art Style" value={data.art_style} onChange={e => setData('art_style', e.target.value as 'comic' | 'lifelike')}>
            <option value="lifelike">Lifelike</option>
            <option value="comic">Comic</option>
          </Select>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-base)] cursor-pointer">
            <input
              type="checkbox"
              checked={data.is_active}
              onChange={e => setData('is_active', e.target.checked)}
              className="accent-[var(--color-rune)]"
            />
            Active campaign
          </label>

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="rune" disabled={processing}>{processing ? 'Saving…' : 'Save Changes'}</Button>
            <Button type="button" variant="ghost" as="a" href={`/campaigns/${campaign.id}`}>Cancel</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
