'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        animate={{ y: [0, -20, 0], opacity: [0.08, 0.12, 0.08] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -right-32 h-[600px] w-[600px] rounded-full bg-accent blur-[160px]"
      />
      <motion.div
        animate={{ y: [0, 20, 0], opacity: [0.06, 0.1, 0.06] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-40 -left-32 h-[500px] w-[500px] rounded-full bg-primary blur-[140px]"
      />
      <motion.div
        animate={{ y: [0, -12, 0], opacity: [0.04, 0.08, 0.04] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-1/4 left-1/3 h-[300px] w-[300px] rounded-full bg-accent blur-[120px]"
      />
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  )
}

function AnimatedText({ children, delay = 0, className = '' }: { children: string; delay?: number; className?: string }) {
  const words = children.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            initial={{ y: '100%', rotateX: -90 }}
            animate={{ y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, ease, delay: delay + i * 0.04 }}
            className="inline-block origin-bottom"
          >
            {word}
            {i < words.length - 1 && '\u00A0'}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

function FloatingMockup() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 800], [0, 80])
  const springY = useSpring(y, { stiffness: 120, damping: 30 })
  const rotateX = useTransform(scrollY, [0, 800], [2, -2])
  const springRotateX = useSpring(rotateX, { stiffness: 120, damping: 30 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.2, ease, delay: 0.4 }}
      style={{ y: springY, rotateX: springRotateX }}
      className="relative w-full perspective-[1200px]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-5xl">
        <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-b from-primary/8 via-accent/5 to-transparent blur-3xl" />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] shadow-primary/10 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/5"
        >
          <div className="flex items-center gap-2 border-b border-border/30 bg-muted/30 px-5 py-3.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
            <div className="mx-auto rounded-md bg-background px-10 py-1 text-[11px] text-muted-foreground">
              app.restoos.dz
            </div>
          </div>
          <div className="flex">
            <aside className="hidden w-40 shrink-0 bg-zinc-950 p-4 sm:block">
              <div className="mb-5 flex items-center gap-2 text-white">
                <span className="grid size-7 place-items-center rounded-lg bg-primary text-[10px] font-bold">R</span>
                <span className="text-xs font-bold">RestoOS</span>
              </div>
              <div className="flex flex-col gap-1">
                {['لوحة التحكم', 'الطلبات', 'المطبخ', 'القائمة', 'الزبائن', 'التقارير'].map((it, idx) => (
                  <div
                    key={it}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium ${idx === 0 ? 'bg-accent text-white' : 'text-white/50'}`}
                  >
                    {it}
                  </div>
                ))}
              </div>
            </aside>
            <div className="flex-1 bg-muted/15 p-5 dark:bg-zinc-950/50">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">نظرة عامة</span>
                <span className="rounded-md bg-accent/10 px-2.5 py-1 text-[10px] font-medium text-accent">اليوم</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'إجمالي المبيعات', value: '45,500', badge: '+12%', color: 'text-accent bg-accent/10' },
                  { label: 'الطلبات اليوم', value: '127', badge: 'جديد', color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'الزبائن', value: '89', badge: '+8', color: 'text-primary bg-primary/10' },
                  { label: 'التقييم', value: '4.9', badge: 'ممتاز', color: 'text-amber-600 bg-amber-50' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.08, duration: 0.6, ease }}
                    className="rounded-xl border border-border/60 bg-white p-3 shadow-sm dark:bg-zinc-900"
                  >
                    <p className="mb-1 text-[9px] text-muted-foreground">{s.label}</p>
                    <p className="text-base font-extrabold text-foreground">{s.value}</p>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold ${s.color}`}>{s.badge}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-border/60 bg-white p-4 shadow-sm dark:bg-zinc-900">
                <p className="mb-2.5 text-[10px] font-bold text-foreground">المبيعات الأسبوعية</p>
                <svg viewBox="0 0 320 90" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartFill2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B9D6B" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#8B9D6B" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M0 70 C 40 60, 60 30, 100 38 S 170 10, 210 28 S 280 55, 320 22"
                    fill="none"
                    stroke="#8B9D6B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.8, ease, delay: 1.0 }}
                  />
                  <motion.path
                    d="M0 70 C 40 60, 60 30, 100 38 S 170 10, 210 28 S 280 55, 320 22 L 320 90 L 0 90 Z"
                    fill="url(#chartFill2)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 1.4, ease }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-32 md:pt-40">
      <FloatingOrbs />

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <motion.div className="relative lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.8, ease }}
              className="mb-6 h-0.5 w-16 origin-right rounded-full bg-accent/70"
            />

            <h1 className="font-display text-[clamp(2.6rem,5.5vw,4.5rem)] font-normal leading-[0.95] tracking-tight text-foreground">
              <AnimatedText delay={0.1}>نظام نقاط البيع</AnimatedText>
              <span className="relative mx-2 inline-block h-[1em] w-[1.2em] overflow-hidden rounded-full align-middle ring-2 ring-accent/20">
                <span
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: 'url(https://picsum.photos/seed/resto-hero/200/200)' }}
                />
              </span>
              <br />
              <AnimatedText delay={0.3}>الذكي للمطاعم</AnimatedText>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.5 }}
              className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              منصة سحابية متعددة المستأجرين تدير طلبات مطعمك، مطبخك، وتقاريرك من مكان واحد. حل رقمي متكامل للمطاعم والسلسلات.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.65 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <motion.a
                href="#cta"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors duration-500 hover:bg-primary/90"
              >
                تواصل معنا
                <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-all duration-500 group-hover:translate-x-0.5">
                  <svg className="size-3.5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </motion.a>
              <motion.a
                href="#features"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-3 rounded-full border border-border/50 bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-all duration-500 hover:border-accent/30 hover:bg-accent/5"
              >
                <span className="grid size-7 place-items-center rounded-full bg-accent/10 text-accent">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </span>
                شاهد العرض
              </motion.a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-12 flex items-center gap-5"
            >
              <div className="flex -space-x-3 space-x-reverse">
                {[
                  { bg: 'bg-accent', label: 'م' },
                  { bg: 'bg-primary', label: 'ك' },
                  { bg: 'bg-emerald-500', label: 'ف' },
                ].map((a) => (
                  <motion.span
                    key={a.label}
                    whileHover={{ scale: 1.1, y: -2 }}
                    className={`grid size-11 place-items-center rounded-full border-2 border-background ${a.bg} text-sm font-bold text-white shadow-md`}
                  >
                    {a.label}
                  </motion.span>
                ))}
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">+200 مطعم</span>
                <span className="text-muted-foreground"> يثقون بنا</span>
              </div>
            </motion.div>
          </motion.div>

          <div className="relative lg:col-span-7">
            <FloatingMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
