'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'

const navLinks = [
  { label: 'الإمكانيات', href: '#capabilities' },
  { label: 'التسعير', href: '#pricing' },
  { label: 'الأسئلة', href: '#faq' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
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

    return () => observer.disconnect()
  }, [])

  return (
    <header className="relative z-50 border-b border-white/8 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-8">
        <motion.a
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-malachite to-forest shadow-lg shadow-malachite/30 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
              <path d="M5 2v20" />
              <path d="M9 2v20" />
              <path d="M18 2a3 3 0 0 0-3 3v6h3" />
              <path d="M18 11v11" />
            </svg>
          </span>
          <span className="font-display text-xl tracking-tight text-foreground">
            Simploo
          </span>
        </motion.a>

        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((l) => (
            <motion.a
              key={l.href}
              href={l.href}
              className={cn(
                'relative rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeSection === l.href.slice(1)
                  ? 'text-malachite'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {l.label}
              {activeSection === l.href.slice(1) && (
                <motion.span
                  layoutId="activeNav"
                  className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-malachite shadow-sm shadow-malachite/50"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.55 }}
                />
              )}
            </motion.a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />

          <motion.a
            href="/login"
            className="hidden rounded-full border border-white/10 bg-background/40 backdrop-blur-sm px-5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-malachite/50 hover:text-malachite hover:bg-malachite/10 md:inline-flex"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            تسجيل الدخول
          </motion.a>

          <motion.a
            href="/login"
            className="group hidden items-center gap-2 rounded-full bg-malachite px-5 py-2 text-sm font-semibold text-evergreen shadow-lg shadow-malachite/30 transition-all hover:shadow-malachite/50 md:inline-flex"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            ابدأ مجاناً
            <svg className="size-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </motion.a>

          <motion.button
            type="button"
            aria-label="القائمة"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-background/50 backdrop-blur-sm md:hidden"
            whileTap={{ scale: 0.9 }}
          >
            <span className={cn('absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-300', open ? 'rotate-45' : '-translate-y-1.5')} />
            <span className={cn('absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-300', open ? 'opacity-0' : 'opacity-100')} />
            <span className={cn('absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-300', open ? '-rotate-45' : 'translate-y-1.5')} />
          </motion.button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="mx-auto mt-0 max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-background/70 backdrop-blur-2xl p-3 shadow-2xl shadow-black/30 md:hidden"
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
                    activeSection === l.href.slice(1) ? 'bg-malachite/10 text-malachite' : 'text-foreground hover:bg-malachite/10',
                  )}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {l.label}
                </motion.a>
              ))}
              <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <motion.a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-background/40 px-6 py-3 text-center text-sm font-medium text-foreground transition-all hover:border-malachite/50 hover:text-malachite"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  تسجيل الدخول
                </motion.a>
                <motion.a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-malachite px-6 py-3 text-center text-sm font-semibold text-evergreen shadow-lg shadow-malachite/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ابدأ مجاناً
                </motion.a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
