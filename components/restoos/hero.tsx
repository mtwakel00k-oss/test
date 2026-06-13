'use client'

import { motion } from 'framer-motion'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { SparklesText } from '@/components/ui/sparkles-text'
import { DashboardMockup } from './dashboard-mockup'

const avatars = [
  { bg: 'bg-gradient-to-br from-emerald-400 to-green-600', label: 'م' },
  { bg: 'bg-gradient-to-br from-amber-400 to-orange-600', label: 'ك' },
  { bg: 'bg-gradient-to-br from-sky-400 to-blue-600', label: 'ف' },
]

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  return (
    <section className="hero-gradient relative overflow-hidden pb-28 pt-40 md:pt-48">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <svg className="absolute -top-[10%] left-[5%] h-[70%] w-[90%] opacity-20 blur-[120px]" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="400" fill="oklch(0.52 0.18 145)" />
          <circle cx="800" cy="500" r="300" fill="oklch(0.65 0.25 180)" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(oklch(0.52_0.18_145/0.05)_1.5px,transparent_1.5px)] bg-[length:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mb-8 inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary backdrop-blur"
        >
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          <AnimatedShinyText shimmerWidth={80}>الحل الرقمي الأول للمطاعم في الجزائر</AnimatedShinyText>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
          className="mx-auto max-w-4xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <SparklesText
            text="نظام نقاط البيع الذكي"
            colors={{ first: 'oklch(0.52 0.18 145)', second: 'oklch(0.65 0.25 180)' }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
          />
          <span className="mt-3 block bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">للمطاعم متعددة الفروع</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl"
        >
          منصة سحابية متعددة المستأجرين تدير طلبات مطعمك، مطبخك، وتقاريرك — من مكان واحد.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#cta"
            className="group relative inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 hover:shadow-3xl hover:shadow-primary/40"
          >
            تواصل معنا
            <svg className="size-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2.5 rounded-2xl border border-border glass px-8 py-4 text-base font-bold text-foreground transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </span>
            شاهد العرض
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <div className="flex -space-x-2 space-x-reverse">
            {avatars.map((a) => (
              <span
                key={a.label}
                className={`grid size-10 place-items-center rounded-full border-2 border-background text-sm font-bold text-white shadow-md ${a.bg}`}
              >
                {a.label}
              </span>
            ))}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            انضم إلى <span className="font-bold text-foreground">+200 مطعم</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease, delay: 0.5 }}
          className="relative mx-auto mt-20 max-w-4xl"
        >
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent blur-3xl" />
          <div className="overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
            <DashboardMockup />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
