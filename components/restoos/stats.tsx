'use client'

import { useEffect, useRef, useState } from 'react'

const stats = [
  { value: 200, prefix: '+', suffix: '', label: 'مطعم نشط', icon: '🏢' },
  { value: 50000, prefix: '+', suffix: '', label: 'طلب معالج', icon: '🍔' },
  { value: 4.9, prefix: '', suffix: '★', label: 'متوسط التقييم', decimals: 1, icon: '⭐' },
  { value: 99.9, prefix: '', suffix: '%', label: 'وقت التشغيل', decimals: 1, icon: '⚡' },
]

function useCountUp(target: number, decimals = 0, run = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const duration = 2000
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
    <div className="relative px-4 text-center group">
      <div className="mb-4 text-3xl opacity-80 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-6">
        {stat.icon}
      </div>
      <p className="text-5xl font-black tracking-tight text-foreground sm:text-6xl">
        <span className="bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
          {stat.prefix}
          {display}
          {stat.suffix}
        </span>
      </p>
      <p className="mt-3 text-lg font-bold text-muted-foreground/80 uppercase tracking-wide">{stat.label}</p>
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
      ([e]) => {
        if (e.isIntersecting) {
          setRun(true)
          obs.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(oklch(0.52_0.18_145/0.03)_1px,transparent_1px)] bg-[length:32px_32px]" />
      
      <div
        ref={ref}
        className="relative mx-auto grid max-w-6xl grid-cols-2 gap-y-16 px-5 md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-x-reverse md:divide-border/50"
      >
        {stats.map((s) => (
          <StatItem key={s.label} stat={s} run={run} />
        ))}
      </div>
    </section>
  )
}
