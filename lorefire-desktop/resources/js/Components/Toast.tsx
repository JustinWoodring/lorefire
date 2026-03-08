import React, { useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'
import { PageProps } from '@/types'

interface ToastItem {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
}

let toastCounter = 0

export function Toast() {
  const { flash } = usePage<PageProps>().props
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const next: ToastItem[] = []
    if (flash?.success) next.push({ id: ++toastCounter, message: flash.success, variant: 'success' })
    if (flash?.error)   next.push({ id: ++toastCounter, message: flash.error,   variant: 'error'   })
    if (flash?.info)    next.push({ id: ++toastCounter, message: flash.info,     variant: 'info'    })
    if (next.length === 0) return
    setToasts(prev => [...prev, ...next])
  }, [flash?.success, flash?.error, flash?.info])

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => setToasts(prev => prev.slice(1)), 4000)
    return () => clearTimeout(timer)
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const colors = {
    success: { border: 'var(--color-success)',  text: 'var(--color-success)'  },
    error:   { border: 'var(--color-danger)',   text: 'var(--color-danger)'   },
    info:    { border: 'var(--color-rune)',      text: 'var(--color-rune-bright)' },
  }
  const c = colors[toast.variant]

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded border bg-[var(--color-surface)] shadow-lg min-w-[280px] max-w-sm"
      style={{ borderColor: c.border }}
    >
      <ToastIcon variant={toast.variant} />
      <p className="text-sm text-[var(--color-text-bright)] flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-[var(--color-text-dim)] hover:text-[var(--color-text-base)] transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function ToastIcon({ variant }: { variant: ToastItem['variant'] }) {
  if (variant === 'success') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" className="shrink-0 mt-0.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
  if (variant === 'error') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" className="shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune)" strokeWidth="2" className="shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}
