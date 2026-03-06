import React from 'react'

type BadgeVariant = 'rune' | 'arcane' | 'danger' | 'success' | 'warning' | 'muted'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const badgeStyles: Record<BadgeVariant, string> = {
  rune:    'border-[var(--color-rune-dim)] text-[var(--color-rune)] bg-[rgba(212,160,23,0.08)]',
  arcane:  'border-[var(--color-arcane-dim)] text-[var(--color-arcane)] bg-[rgba(107,127,255,0.08)]',
  danger:  'border-[var(--color-danger-dim)] text-[var(--color-danger)] bg-[rgba(192,57,43,0.08)]',
  success: 'border-[var(--color-success-dim)] text-[var(--color-success)] bg-[rgba(39,174,96,0.08)]',
  warning: 'border-[rgba(230,126,34,0.4)] text-[var(--color-warning)] bg-[rgba(230,126,34,0.08)]',
  muted:   'border-[var(--color-border)] text-[var(--color-text-dim)] bg-transparent',
}

export function Badge({ children, variant = 'muted', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] uppercase tracking-widest font-medium border rounded ${badgeStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
