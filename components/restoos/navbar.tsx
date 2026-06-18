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
import { ThemeToggle } from '@/components/theme-toggle'
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
      { threshold: 0.5 },
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
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-5 md:px-6">
      <div
        className={cn(
          'mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full px-5 py-2.5 transition-all duration-700',
          scrolled ? 'glass shadow-[var(--shadow-md)]' : 'bg-transparent',
        )}
        style={{ transitionTimingFunction: 'var(--ease-premium)' }}
      >
        <Logo />

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="gap-1">
            {navLinks.map((l) => (
              <NavigationMenuItem key={l.href}>
                <NavigationMenuLink
                  href={l.href}
                  className={cn(
                    'relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-500',
                    activeSection === l.href.slice(1)
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {l.label}
                  {activeSection === l.href.slice(1) && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 -z-10 rounded-full bg-primary/8"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.55 }}
                    />
                  )}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#cta"
            className="group hidden md:inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)] transition-all duration-700 hover:scale-[1.02] active:scale-[0.98]"
            style={{ transitionTimingFunction: 'var(--ease-premium)' }}
          >
            تواصل معنا
            <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform duration-700 group-hover:translate-x-0.5 group-hover:-translate-y-px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
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
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="mx-auto mt-3 max-w-5xl overflow-hidden rounded-[1.75rem] glass p-3 shadow-[var(--shadow-lg)] md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                  className={cn(
                    'rounded-2xl px-4 py-3.5 text-sm font-medium transition-colors',
                    activeSection === l.href.slice(1) ? 'bg-primary/8 text-primary' : 'text-foreground hover:bg-muted',
                  )}
                >
                  {l.label}
                </motion.a>
              ))}
              <a
                href="#cta"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-center text-sm font-semibold text-primary-foreground"
              >
                تواصل معنا
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
