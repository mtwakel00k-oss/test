'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const features = [
  {
    title: 'متعدد المستأجرين',
    desc: 'كل مطعم له قاعدة بيانات مستقلة. إدارة سلسلة مطاعم من لوحة واحدة.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: 'نقطة البيع (POS)',
    desc: 'كاشير سريع مع طباعة إيصالات حرارية وأصوات تنبيه فورية.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'شاشة المطبخ (KDS)',
    desc: 'الطلبات تصل للمطبخ مباشرة. تحديث الحالة بدون ورق.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'لوحة تحكم المدير',
    desc: 'إحصائيات المبيعات، ساعات الذروة، أفضل المنتجات، والتقييمات.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: '3 لغات',
    desc: 'عربي، English، Français مع ذاكرة منفصلة لكل واجهة.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    title: 'صلاحيات وأمان',
    desc: 'أدوار منفصلة (كاشير/شيف/مدير/مالك) ونظام جلسات آمن.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
]

function TiltCard({
  children,
  className,
  accent,
}: {
  children: React.ReactNode
  className?: string
  accent?: 'primary' | 'accent'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glow, setGlow] = useState({ x: 50, y: 50 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setTilt({ x: (y - 0.5) * -10, y: (x - 0.5) * 10 })
    setGlow({ x: x * 100, y: y * 100 })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setGlow({ x: 50, y: 50 })
  }

  const glowColor =
    accent === 'accent'
      ? 'rgba(255,56,100,0.15)'
      : 'rgba(45,212,191,0.15)'

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.03, y: -6 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 90, damping: 16 }}
      style={{ perspective: '800px' }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/50 bg-card backdrop-blur-xl p-6 shadow-xl shadow-black/20 transition-all duration-500 hover:border-border/80 md:p-8',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${glow.x}% ${glow.y}%, ${glowColor}, transparent 40%)`,
        }}
      />
      <div
        className="relative h-full"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {children}
      </div>
    </motion.div>
  )
}

export function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-32 md:py-44">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(40px, -60px) scale(1.05); }
          50% { transform: translate(-20px, 40px) scale(0.95); }
          75% { transform: translate(-50px, -30px) scale(1.02); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, 50px) scale(1.03); }
          66% { transform: translate(-40px, -20px) scale(0.97); }
        }
      `}</style>

      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute -left-48 -top-48 size-[800px] animate-[float_14s_ease-in-out_infinite] rounded-full bg-primary/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 size-[700px] animate-[float-slow_18s_ease-in-out_infinite] rounded-full bg-accent/15 blur-[140px]" />
      <div className="pointer-events-none absolute left-1/4 top-1/3 size-[500px] animate-[float_20s_ease-in-out_infinite_3s] rounded-full bg-primary/8 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 size-[450px] animate-[float-slow_22s_ease-in-out_infinite_5s] rounded-full bg-accent/8 blur-[120px]" />

      {/* Gradient border line */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 bottom-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 md:px-8" dir="rtl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-primary" />
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.15] tracking-tight text-foreground">
              كل ما تحتاجه في منصة واحدة
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              أدوات متكاملة صُممت خصيصاً لتسريع عمل مطعمك من الطلب حتى التقرير.
            </p>
          </motion.div>
        </div>

        <div className="relative mt-24 grid grid-cols-1 gap-5 md:mt-32 md:grid-cols-3 md:grid-rows-[auto_auto_auto]">
          {/* Hero card — large, teal */}
          <TiltCard className="md:col-span-2 md:row-span-2" accent="primary">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-primary/30 blur-xl" />
                  <div className="relative grid size-12 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 md:size-14">
                    <motion.div
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="size-6 md:size-7"
                    >
                      {features[0].svg}
                    </motion.div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-[0.15em] text-primary uppercase">
                  الميزة الأساسية
                </span>
              </div>
              <div>
                <h3 className="font-display text-2xl font-normal leading-snug text-foreground md:text-3xl">
                  {features[0].title}
                </h3>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                  {features[0].desc}
                </p>
              </div>
            </div>
          </TiltCard>

          {/* POS — magenta */}
          <TiltCard accent="accent">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-accent/30 blur-lg" />
                <div className="relative grid size-10 place-items-center rounded-lg bg-accent text-white shadow-lg shadow-accent/20 md:size-12">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="size-5 md:size-6"
                  >
                    {features[1].svg}
                  </motion.div>
                </div>
              </div>
              <h3 className="font-display text-lg font-normal text-foreground md:text-xl">
                {features[1].title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {features[1].desc}
              </p>
            </div>
          </TiltCard>

          {/* KDS — teal */}
          <TiltCard accent="primary">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/30 blur-lg" />
                <div className="relative grid size-10 place-items-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20 md:size-12">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="size-5 md:size-6"
                  >
                    {features[2].svg}
                  </motion.div>
                </div>
              </div>
              <h3 className="font-display text-lg font-normal text-foreground md:text-xl">
                {features[2].title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {features[2].desc}
              </p>
            </div>
          </TiltCard>

          {/* Dashboard — magenta, wide */}
          <TiltCard className="md:col-span-2" accent="accent">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-xl bg-accent/30 blur-xl" />
                <div className="relative grid size-12 place-items-center rounded-xl bg-accent text-white shadow-lg shadow-accent/20 md:size-14">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="size-6 md:size-7"
                  >
                    {features[3].svg}
                  </motion.div>
                </div>
              </div>
              <div>
                <h3 className="font-display text-xl font-normal text-foreground md:text-2xl">
                  {features[3].title}
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                  {features[3].desc}
                </p>
              </div>
            </div>
          </TiltCard>

          {/* Languages — teal */}
          <TiltCard accent="primary">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/30 blur-lg" />
                <div className="relative grid size-10 place-items-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20 md:size-12">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="size-5 md:size-6"
                  >
                    {features[4].svg}
                  </motion.div>
                </div>
              </div>
              <h3 className="font-display text-lg font-normal text-foreground md:text-xl">
                {features[4].title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {features[4].desc}
              </p>
            </div>
          </TiltCard>

          {/* Security — magenta */}
          <TiltCard accent="accent">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-accent/30 blur-lg" />
                <div className="relative grid size-10 place-items-center rounded-lg bg-accent text-white shadow-lg shadow-accent/20 md:size-12">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="size-5 md:size-6"
                  >
                    {features[5].svg}
                  </motion.div>
                </div>
              </div>
              <h3 className="font-display text-lg font-normal text-foreground md:text-xl">
                {features[5].title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {features[5].desc}
              </p>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  )
}
