import React from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Button } from '@/Components/Button'
import { Badge } from '@/Components/Badge'
import { Campaign } from '@/types'

interface Props {
  campaigns: Campaign[]
}

// The Dashboard is just a redirect alias to Campaigns for now
export default function Dashboard({ campaigns }: Props) {
  return (
    <AppLayout title="Lorefire">
      <Head title="Dashboard" />
      <div className="flex flex-col items-center justify-center h-full gap-8 py-16">
        <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="opacity-40">
          <polygon points="40,4 74,22 74,58 40,76 6,58 6,22" stroke="#d4a017" strokeWidth="1.5" fill="none" />
          <polygon points="40,16 62,28 62,52 40,64 18,52 18,28" stroke="#d4a017" strokeWidth="0.75" fill="none" opacity="0.5" />
          <circle cx="40" cy="40" r="6" fill="#d4a017" opacity="0.6" />
          <line x1="40" y1="4" x2="40" y2="16" stroke="#d4a017" strokeWidth="0.75" opacity="0.4" />
          <line x1="74" y1="22" x2="62" y2="28" stroke="#d4a017" strokeWidth="0.75" opacity="0.4" />
          <line x1="74" y1="58" x2="62" y2="52" stroke="#d4a017" strokeWidth="0.75" opacity="0.4" />
          <line x1="40" y1="64" x2="40" y2="76" stroke="#d4a017" strokeWidth="0.75" opacity="0.4" />
          <line x1="18" y1="52" x2="6" y2="58" stroke="#d4a017" strokeWidth="0.75" opacity="0.4" />
          <line x1="18" y1="28" x2="6" y2="22" stroke="#d4a017" strokeWidth="0.75" opacity="0.4" />
        </svg>

        <div className="text-center">
          <h1 className="font-heading text-3xl text-[var(--color-text-white)] tracking-widest uppercase mb-2">
            Lorefire
          </h1>
          <p className="text-sm text-[var(--color-text-dim)]">Your chronicles await.</p>
        </div>

        <Button variant="rune" as="a" href="/campaigns">
          Enter the Archive
        </Button>
      </div>
    </AppLayout>
  )
}
