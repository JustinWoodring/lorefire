import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  children: React.ReactNode
}

const inputBase = `
  w-full bg-[var(--color-deep)] border border-[var(--color-border)]
  rounded px-3 py-2 text-sm text-[var(--color-text-bright)]
  placeholder:text-[var(--color-text-dim)]
  focus:outline-none focus:border-[var(--color-rune)] focus:ring-1 focus:ring-[var(--color-rune-dim)]
  transition-colors
`.trim().replace(/\s+/g, ' ')

export function Input({ label, error, hint, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          {label}
        </label>
      )}
      <input className={`${inputBase} ${error ? 'border-[var(--color-danger)]' : ''} ${className}`} {...props} />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--color-text-dim)]">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          {label}
        </label>
      )}
      <textarea
        className={`${inputBase} resize-none min-h-[80px] ${error ? 'border-[var(--color-danger)]' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--color-text-dim)]">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, hint, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          {label}
        </label>
      )}
      <select
        className={`${inputBase} ${error ? 'border-[var(--color-danger)]' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--color-text-dim)]">{hint}</p>}
    </div>
  )
}
