'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const stats = [
  { value: 200, prefix: '+', suffix: '', label: 'مطعم نشط' },
  { value: 50000, prefix: '+', suffix: '', label: 'طلب معالج' },
  { value: 4.9, prefix: '', suffix: '', label: 'متوسط التقييم', decimals: 1 },
  { value: 99.9, prefix: '', suffix: '%', label: 'وقت التشغيل', decimals: 1 },
]

function useCountUp(target: number, decimals = 0, run = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const duration = 2200
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target])
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US')
}

function StatItem({ stat, run }: { stat: (typeof stats)[number]; run: boolean }) {
  const display = useCountUp(stat.value, stat.decimals ?? 0, run)
  return (
    <div className="relative px-4 text-center">
      <p className="font-display text-5xl font-normal tracking-tight text-foreground sm:text-6xl">
        {stat.prefix}{display}{stat.suffix}
      </p>
      <p className="mt-3 text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">{stat.label}</p>
    </div>
  )
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null)
  const [run, setRun] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRun(true); obs.disconnect() } },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="relative border-y border-border/50 py-24 md:py-32">
      <div className="absolute inset-0 bg-muted/40" />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="relative mx-auto grid max-w-6xl grid-cols-2 gap-y-16 px-4 md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-x-reverse md:divide-border/40 md:px-6"
      >
        {stats.map((s) => (
          <StatItem key={s.label} stat={s} run={run} />
        ))}
      </motion.div>
    </section>
  )
}
