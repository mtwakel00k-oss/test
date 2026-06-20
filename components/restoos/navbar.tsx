'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'الميزات', href: '#features' },
  { label: 'كيف يعمل', href: '#how' },
  { label: 'التسعير', href: '#pricing' },
  { label: 'الأسئلة', href: '#faq' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { threshold: 0.4 },
    )

    navLinks.forEach((link) => {
      const el = document.querySelector(link.href)
      if (el) observer.observe(el)
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5 transition-all duration-500 md:px-8',
          scrolled
            ? 'border-b border-border bg-background/80 backdrop-blur-xl'
            : 'border-b border-transparent',
        )}
      >
        <a href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
              <path d="M5 2v20" />
              <path d="M9 2v20" />
              <path d="M18 2a3 3 0 0 0-3 3v6h3" />
              <path d="M18 11v11" />
            </svg>
          </span>
          <span className="font-display text-xl tracking-tight text-foreground">
            Resto<span className="text-primary">OS</span>
          </span>
        </a>

        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                'relative px-4 py-2 text-sm font-medium transition-colors duration-300',
                activeSection === l.href.slice(1)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {l.label}
              {activeSection === l.href.slice(1) && (
                <motion.span
                  layoutId="activeNav"
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.55 }}
                />
              )}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#login"
            className="hidden rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:border-primary hover:text-primary md:inline-flex"
          >
            تسجيل الدخول
          </a>
          <a
            href="#cta"
            className="group hidden items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98] md:inline-flex"
          >
            تواصل معنا
            <svg className="size-4 rtl:rotate-180 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
          <button
            type="button"
            aria-label="القائمة"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative grid size-10 place-items-center rounded-full border border-border/50 bg-card/80 md:hidden"
          >
            <span className={cn('absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-500', open ? 'rotate-45' : '-translate-y-1.5')} />
            <span className={cn('absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-500', open ? 'opacity-0' : 'opacity-100')} />
            <span className={cn('absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-500', open ? '-rotate-45' : 'translate-y-1.5')} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="mx-auto mt-2 max-w-sm overflow-hidden rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl p-3 shadow-lg md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 + i * 0.04 }}
                  className={cn(
                    'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    activeSection === l.href.slice(1) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                  )}
                >
                  {l.label}
                </motion.a>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                <a
                  href="#login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-center text-sm font-medium text-foreground"
                >
                  تسجيل الدخول
                </a>
                <a
                  href="#cta"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  تواصل معنا
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
