import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', glow = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`runic-card p-4 ${glow ? 'rune-glow' : ''} ${onClick ? 'cursor-pointer hover:border-[var(--color-muted)] transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--color-rune)] opacity-80">{icon}</span>}
        <div>
          <h3 className="text-sm font-heading text-[var(--color-text-white)] tracking-wider">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--color-text-dim)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="no-drag">{action}</div>}
    </div>
  )
}

interface StatBlockProps {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export function StatBlock({ label, value, sub, highlight = false }: StatBlockProps) {
  return (
    <div className="flex flex-col items-center p-2 rounded bg-[var(--color-deep)] border border-[var(--color-border)]">
      <span className={`text-lg font-heading font-bold leading-none ${highlight ? 'text-[var(--color-rune-bright)] rune-glow-text' : 'text-[var(--color-text-white)]'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-[var(--color-rune)] mt-0.5">{sub}</span>}
      <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] mt-1">{label}</span>
    </div>
  )
}
