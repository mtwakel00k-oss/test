'use client'

import { useEffect, useState } from 'react'
import { Logo } from './logo'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

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
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        hidden ? '-translate-y-full' : 'translate-y-0',
      )}
    >
      <div
        className={cn(
          'mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-6 py-3.5 transition-all duration-300',
          scrolled
            ? 'glass shadow-sm'
            : 'bg-transparent',
        )}
        style={{ width: 'calc(100% - 2rem)' }}
      >
        <Logo />

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navLinks.map((l) => (
              <NavigationMenuItem key={l.href}>
                <NavigationMenuLink
                  href={l.href}
                  className="text-sm font-medium text-muted-foreground/80 transition-colors hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted"
                >
                  {l.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-3">
          <a
            href="#cta"
            className="hidden md:inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
          >
            تواصل معنا
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <button
            type="button"
            aria-label="القائمة"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground md:hidden transition-colors hover:bg-muted"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-4 mt-2 rounded-2xl glass p-4 shadow-lg md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#cta"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-xl bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground"
            >
              تواصل معنا
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
