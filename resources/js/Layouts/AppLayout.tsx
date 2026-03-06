import React from 'react'
import { Link, usePage } from '@inertiajs/react'
import { Toast } from '@/Components/Toast'

// Lorefire flame logo mark
const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer flame */}
    <path
      d="M14 26 C7 26 4 20 4 15 C4 10 7 7 10 5 C9 8 10 10 12 11 C11 8 12 4 14 2 C16 4 17 7 16 10 C18 8 19 5 18 3 C21 6 24 10 24 15 C24 20 21 26 14 26 Z"
      fill="#d4a017"
      opacity="0.9"
    />
    {/* Inner bright core */}
    <path
      d="M14 23 C10 23 8 19 8 16 C8 13 10 11 12 10 C11.5 12 12.5 13.5 14 14 C13 12 13.5 9.5 14 8 C15 10 15.5 12 14.5 14 C16 13 17 11.5 16.5 10 C18.5 12 20 14 20 17 C20 20 17.5 23 14 23 Z"
      fill="#f5c842"
      opacity="0.85"
    />
    {/* Hot core wisp */}
    <path
      d="M14 20 C12 20 11 18 11 16.5 C11 15 12 14 13 13.5 C13 15 13.5 16 14 16.5 C14.5 16 15 15 15 13.5 C16 14 17 15.5 17 17 C17 18.5 15.8 20 14 20 Z"
      fill="#fff9e0"
      opacity="0.7"
    />
  </svg>
)

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  match?: string
}

function SidebarIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const navItems: NavItem[] = [
  {
    label: 'Campaigns',
    href: '/campaigns',
    match: '/campaigns',
    icon: <SidebarIcon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  },
  {
    label: 'Characters',
    href: '/characters',
    match: '/characters',
    icon: <SidebarIcon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />,
  },
  {
    label: 'Oracle',
    href: '/oracle',
    match: '/oracle',
    icon: <SidebarIcon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z" />,
  },
  {
    label: 'Settings',
    href: '/settings',
    match: '/settings',
    icon: <SidebarIcon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  },
]

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export default function AppLayout({ children, title, breadcrumbs }: AppLayoutProps) {
  const { url } = usePage()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-void)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="w-16 relative flex flex-col items-center pb-4 shrink-0"
        style={{
          background: 'var(--color-abyss)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
          {/* Logo — sits below traffic lights (buttons at y=17, 12px tall → end at 29, logo top at 36) */}
          <Link href="/campaigns" className="no-drag opacity-90 hover:opacity-100 transition-opacity absolute" style={{ top: 44 }}>
            <LogoMark />
          </Link>

          {/* Nav — starts below logo zone */}
          <nav className="flex flex-col gap-1 w-full px-2 mt-[88px]">
            {navItems.map((item) => {
              const active = item.match ? url.startsWith(item.match) : url === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`
                    no-drag flex items-center justify-center w-full aspect-square rounded transition-all duration-150
                    ${active
                      ? 'text-[var(--color-rune-bright)] bg-[var(--color-rune-glow)] border border-[var(--color-rune-dim)]'
                      : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-base)] hover:bg-[var(--color-deep)]'
                    }
                  `}
                >
                  {item.icon}
                </Link>
              )
            })}
          </nav>

          {/* Spacer + bottom indicator */}
          <div className="mt-auto mb-2">
            <div
              className="w-1 h-8 rounded-full mx-auto"
              style={{ background: 'linear-gradient(to bottom, var(--color-rune-dim), transparent)', opacity: 0.4 }}
            />
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Title bar / header */}
          {(title || breadcrumbs) && (
            <header
              className="drag-region shrink-0 flex items-center gap-3 px-6 h-12 border-b"
              style={{
                background: 'var(--color-abyss)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Breadcrumbs */}
              {breadcrumbs && (
                <nav className="no-drag flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
                  {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-[var(--color-border)]">›</span>}
                      {crumb.href
                        ? <Link href={crumb.href} className="hover:text-[var(--color-text-base)] transition-colors">{crumb.label}</Link>
                        : <span className="text-[var(--color-text-bright)]">{crumb.label}</span>
                      }
                    </React.Fragment>
                  ))}
                </nav>
              )}

              {/* Title (if no breadcrumbs) */}
              {title && !breadcrumbs && (
                <h1 className="no-drag font-heading text-sm text-[var(--color-text-white)] tracking-widest uppercase">
                  {title}
                </h1>
              )}

              {/* Drag affordance hint */}
              <div className="ml-auto flex gap-1 opacity-20">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1 h-1 rounded-full bg-[var(--color-text-dim)]" />
                ))}
              </div>
            </header>
          )}

          {/* Page body */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>

      {/* Global toast notifications */}
      <Toast />
    </div>
  )
}
