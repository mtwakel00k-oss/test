'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'

const navLinks = [
  { label: 'الإمكانيات', href: '#capabilities' },
  { label: 'التسعير', href: '#pricing' },
  { label: 'الأسئلة', href: '#faq' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  const { scrollY } = useScroll()
  const backdropOpacity = useTransform(scrollY, [0, 50], [0, 1])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
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
      <motion.div
        className={cn(
          'absolute inset-0 border-b backdrop-blur-xl',
          scrolled ? 'border-white/8' : 'border-transparent',
        )}
        style={{ opacity: backdropOpacity }}
      >
        <div className="size-full bg-background/60" />
      </motion.div>

      <nav
        className={cn(
          'relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 transition-all duration-500 md:px-8',
          scrolled && 'py-3',
        )}
      >
        <motion.a
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 text-white">
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
                  ? 'text-amber-500'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {l.label}
              {activeSection === l.href.slice(1) && (
                <motion.span
                  layoutId="activeNav"
                  className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"
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
            className="hidden rounded-full border border-white/10 bg-background/40 backdrop-blur-sm px-5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/[0.04] md:inline-flex"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            تسجيل الدخول
          </motion.a>

          <motion.a
            href="/login"
            className="group hidden items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/50 md:inline-flex"
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
            className="mx-auto mt-3 max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-background/70 backdrop-blur-2xl p-3 shadow-2xl shadow-black/30 md:hidden"
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
                    activeSection === l.href.slice(1) ? 'bg-amber-500/10 text-amber-500' : 'text-foreground hover:bg-amber-500/5',
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
                  className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-background/40 px-6 py-3 text-center text-sm font-medium text-foreground transition-all hover:border-amber-500/50 hover:text-amber-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  تسجيل الدخول
                </motion.a>
                <motion.a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-amber-500/20"
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
