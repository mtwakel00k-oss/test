'use client'

import { motion } from 'framer-motion'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { SparklesText } from '@/components/ui/sparkles-text'
import { DashboardMockup } from './dashboard-mockup'

const avatars = [
  { bg: 'bg-gradient-to-br from-rose-400 to-pink-500', label: 'م' },
  { bg: 'bg-gradient-to-br from-amber-400 to-orange-500', label: 'ك' },
  { bg: 'bg-gradient-to-br from-sky-400 to-blue-500', label: 'ف' },
]

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  return (
    <section className="hero-gradient relative overflow-hidden pb-24 pt-36 md:pt-44">
      <div className="animate-orb pointer-events-none absolute -left-20 top-24 size-72 rounded-full bg-primary/30 blur-[90px]" />
      <div className="animate-orb pointer-events-none absolute -right-16 top-48 size-80 rounded-full bg-sky-300/30 blur-[100px]" style={{ animationDelay: '3s' }} />

      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur"
        >
          <AnimatedShinyText shimmerWidth={80}>الحل الرقمي الأول للمطاعم في الجزائر</AnimatedShinyText>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
          className="mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          <SparklesText
            text="نظام نقاط البيع الذكي"
            colors={{ first: '#22c55e', second: '#06b6d4' }}
            className="text-4xl sm:text-5xl md:text-6xl"
          />
          <span className="mt-2 block text-foreground">للمطاعم متعددة الفروع</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
        >
          منصة سحابية متعددة المستأجرين تدير طلبات مطعمك، مطبخك، وتقاريرك — من مكان واحد.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.25 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#cta"
            className="rounded-full bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/40"
          >
            تواصل معنا
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-8 py-3.5 text-base font-bold text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
          >
            <span>شاهد العرض</span>
            <span className="text-primary">▶</span>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-7 flex items-center justify-center gap-3"
        >
          <div className="flex -space-x-3 space-x-reverse">
            {avatars.map((a) => (
              <span
                key={a.label}
                className={`grid size-9 place-items-center rounded-full border-2 border-white text-sm font-bold text-white ${a.bg}`}
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
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease, delay: 0.45 }}
          className="relative mx-auto mt-16 max-w-3xl"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  )
}