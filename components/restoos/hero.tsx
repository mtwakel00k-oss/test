'use client'

import { motion } from 'framer-motion'
import { DashboardMockup } from './dashboard-mockup'

const avatars = [
  { bg: 'from-teal-500 to-emerald-600', label: 'م' },
  { bg: 'from-amber-500 to-orange-600', label: 'ك' },
  { bg: 'from-sky-500 to-blue-600', label: 'ف' },
]

const ease = [0.32, 0.72, 0, 1] as const

export function Hero() {
  return (
    <section className="hero-gradient relative overflow-hidden pb-32 pt-36 md:pt-44">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 start-1/4 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-1/3 end-0 h-[360px] w-[360px] rounded-full bg-accent/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease }}
            className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-primary/5 px-5 py-2"
          >
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-primary">الحل الرقمي الأول للمطاعم في الجزائر</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, ease, delay: 0.08 }}
            className="font-display mx-auto max-w-5xl text-[clamp(2.5rem,5.5vw,4.75rem)] font-normal leading-[1.08] tracking-tight text-foreground"
          >
            نظام نقاط البيع الذكي
            <span className="mt-2 block text-[0.72em] font-sans font-semibold text-muted-foreground">
              للمطاعم متعددة الفروع
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.18 }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            منصة سحابية متعددة المستأجرين تدير طلبات مطعمك، مطبخك، وتقاريرك — من مكان واحد.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.28 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            <a href="#cta" className="group btn-premium bg-primary text-primary-foreground shadow-[var(--shadow-lg),var(--shadow-glow)]">
              تواصل معنا
              <span className="btn-premium-icon">
                <svg className="size-4 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>
            <a href="#features" className="group btn-premium glass text-foreground hover:border-primary/20">
              <span className="btn-premium-icon bg-primary/10 text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </span>
              شاهد العرض
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.42 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <div className="flex -space-x-2.5 space-x-reverse">
              {avatars.map((a) => (
                <span
                  key={a.label}
                  className={`grid size-10 place-items-center rounded-full border-2 border-background bg-gradient-to-br ${a.bg} text-sm font-bold text-white shadow-md`}
                >
                  {a.label}
                </span>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              انضم إلى <span className="font-semibold text-foreground">+200 مطعم</span>
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease, delay: 0.55 }}
          className="relative mx-auto mt-24 max-w-5xl"
        >
          <div className="premium-bezel">
            <div className="premium-bezel-inner overflow-hidden shadow-[var(--shadow-2xl)]">
              <DashboardMockup />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
