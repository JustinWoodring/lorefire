import React from 'react'
import { Link } from '@inertiajs/react'

type Variant = 'rune' | 'ghost' | 'danger' | 'muted'
type Size = 'sm' | 'md' | 'lg'

interface BaseProps {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
  disabled?: boolean
}

interface ButtonAsButton extends BaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {
  as?: 'button'
  href?: never
}

interface ButtonAsA extends BaseProps, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> {
  as: 'a'
  href: string
  /** Use a native <a> tag instead of Inertia's Link (required for file downloads / non-Inertia URLs) */
  native?: boolean
}

type ButtonProps = ButtonAsButton | ButtonAsA

const variantStyles: Record<Variant, string> = {
  rune:   'bg-transparent border border-[var(--color-rune)] text-[var(--color-rune-bright)] hover:bg-[var(--color-rune-glow)] hover:shadow-[0_0_12px_var(--color-rune-glow)]',
  ghost:  'bg-transparent border border-[var(--color-border)] text-[var(--color-text-base)] hover:border-[var(--color-muted)] hover:text-[var(--color-text-bright)]',
  danger: 'bg-transparent border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[rgba(192,57,43,0.12)]',
  muted:  'bg-[var(--color-raised)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text-base)]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1 text-xs tracking-wider',
  md: 'px-4 py-2 text-sm tracking-wide',
  lg: 'px-6 py-3 text-base tracking-wide',
}

export function Button(props: ButtonProps) {
  const { variant = 'ghost', size = 'md', className = '', children, disabled, as, ...rest } = props

  const base = 'inline-flex items-center gap-2 rounded transition-all duration-150 font-medium cursor-pointer select-none'
  const disabledStyle = disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
  const cls = `${base} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyle} ${className}`

  if (as === 'a') {
    const { href, native, ...anchorRest } = rest as ButtonAsA
    if (native) {
      return (
        <a href={href} className={cls} {...(anchorRest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} {...(anchorRest as Record<string, unknown>)}>
        {children}
      </Link>
    )
  }

  return (
    <button
      disabled={disabled}
      className={cls}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  )
}
