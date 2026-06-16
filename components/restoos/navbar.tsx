'use client'

import { useEffect, useState } from 'react'
import { Logo } from './logo'

const navLinks = [
  { label: 'الميزات', href: '#features' },
  { label: 'كيف يعمل', href: '#how' },
  { label: 'التسعير', href: '#pricing' },
  { label: 'الأسئلة', href: '#faq' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 20)
      setHidden(y > lastY && y > 240)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-500 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div
        className={`mx-auto mt-3 flex max-w-6xl items-center justify-between gap-4 rounded-full px-5 py-3 transition-all duration-300 ${
          scrolled
            ? 'border border-border/70 bg-white/70 shadow-lg shadow-primary/5 backdrop-blur-xl'
            : 'border border-transparent bg-transparent'
        }`}
        style={{ width: 'calc(100% - 1.5rem)' }}
      >
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#cta"
            className="hidden rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 md:inline-block"
          >
            تواصل معنا
          </a>
          <button
            type="button"
            aria-label="القائمة"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-border bg-white/70 text-foreground md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-3 mt-2 rounded-2xl border border-border bg-white/95 p-4 shadow-xl backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary-bg hover:text-primary"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#cta"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-primary px-6 py-2.5 text-center text-sm font-bold text-primary-foreground"
            >
              ابدأ الآن
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
