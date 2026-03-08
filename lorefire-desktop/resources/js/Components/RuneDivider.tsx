import React from 'react'

interface RuneDividerProps {
  label?: string
}

// Minimal runic glyph SVG — a simplified angular sigil
const RuneGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 1 L13 7 L7 13 L1 7 Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7" />
    <path d="M7 4 L10 7 L7 10 L4 7 Z" stroke="currentColor" strokeWidth="0.75" fill="none" opacity="0.4" />
    <circle cx="7" cy="7" r="1" fill="currentColor" opacity="0.8" />
  </svg>
)

export function RuneDivider({ label }: RuneDividerProps) {
  return (
    <div className="rune-divider my-4 text-[var(--color-rune-dim)]">
      <RuneGlyph />
      {label && <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">{label}</span>}
      <RuneGlyph />
    </div>
  )
}
