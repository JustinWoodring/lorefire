import React, { useEffect, useRef, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { PageProps } from '@/types'

type OverlayState = 'hidden' | 'visible' | 'fading'

// Large animated flame — reuses the same paths as the sidebar LogoMark
function FlameIcon({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 18px #d4a01788)' }}
    >
      <path
        d="M14 26 C7 26 4 20 4 15 C4 10 7 7 10 5 C9 8 10 10 12 11 C11 8 12 4 14 2 C16 4 17 7 16 10 C18 8 19 5 18 3 C21 6 24 10 24 15 C24 20 21 26 14 26 Z"
        fill="#d4a017" opacity="0.9"
      />
      <path
        d="M14 23 C10 23 8 19 8 16 C8 13 10 11 12 10 C11.5 12 12.5 13.5 14 14 C13 12 13.5 9.5 14 8 C15 10 15.5 12 14.5 14 C16 13 17 11.5 16.5 10 C18.5 12 20 14 20 17 C20 20 17.5 23 14 23 Z"
        fill="#f5c842" opacity="0.85"
      />
      <path
        d="M14 20 C12 20 11 18 11 16.5 C11 15 12 14 13 13.5 C13 15 13.5 16 14 16.5 C14.5 16 15 15 15 13.5 C16 14 17 15.5 17 17 C17 18.5 15.8 20 14 20 Z"
        fill="#fff9e0" opacity="0.7"
      />
    </svg>
  )
}

export function SplashOverlay() {
  const { python_setup } = usePage<PageProps>().props
  const initiallyRunning = python_setup?.status === 'running'

  const [overlayState, setOverlayState] = useState<OverlayState>(initiallyRunning ? 'visible' : 'hidden')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start polling while visible
  useEffect(() => {
    if (overlayState !== 'visible') return

    pollRef.current = setInterval(() => {
      router.reload({ only: ['python_setup'] })
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [overlayState])

  // React to status changes from polling
  useEffect(() => {
    if (overlayState !== 'visible') return
    const status = python_setup?.status
    if (status === 'ready' || status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current)
      setOverlayState('fading')
      setTimeout(() => setOverlayState('hidden'), 700)
    }
  }, [python_setup?.status])

  if (overlayState === 'hidden') return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 drag-region"
      style={{
        background: 'var(--color-void)',
        opacity: overlayState === 'fading' ? 0 : 1,
        transition: 'opacity 0.7s ease',
      }}
    >
      {/* Flame */}
      <div style={{ animation: 'splash-pulse 2.4s ease-in-out infinite' }}>
        <FlameIcon size={80} />
      </div>

      {/* Title + status */}
      <div className="flex flex-col items-center gap-3 no-drag">
        <h1
          className="font-heading text-3xl tracking-[0.5em] uppercase"
          style={{ color: 'var(--color-rune-bright)', textShadow: '0 0 24px #d4a01744' }}
        >
          Lorefire
        </h1>
        <p className="text-xs tracking-widest uppercase font-mono" style={{ color: 'var(--color-text-dim)' }}>
          Setting up transcription engine…
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-2 no-drag">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--color-rune)',
              animation: `splash-dot 1.2s ease-in-out ${i * 200}ms infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-pulse {
          0%, 100% { transform: scale(1);   opacity: 1;    }
          50%       { transform: scale(1.06); opacity: 0.85; }
        }
        @keyframes splash-dot {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0);    }
          40%           { opacity: 1;   transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
