import React from 'react'

interface HpBarProps {
  current: number
  max: number
  temp?: number
  showNumbers?: boolean
  className?: string
}

export function HpBar({ current, max, temp = 0, showNumbers = true, className = '' }: HpBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const color = pct > 60 ? 'var(--color-hp-full)' : pct > 25 ? 'var(--color-hp-mid)' : 'var(--color-hp-low)'

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showNumbers && (
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-heading font-bold" style={{ color }}>{current}</span>
          <span className="text-xs text-[var(--color-text-dim)]">/ {max}</span>
          {temp > 0 && <span className="text-xs text-[var(--color-arcane)]">+{temp} tmp</span>}
        </div>
      )}
      <div className="hp-bar-track w-full">
        <div
          className="hp-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}55` }}
        />
      </div>
    </div>
  )
}
