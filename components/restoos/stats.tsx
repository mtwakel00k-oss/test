"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

interface PlatformStats {
  restaurants: number
  orders: number
  rating: number
  uptime: number
}

const DEFAULT_STATS: PlatformStats = { restaurants: 200, orders: 50000, rating: 4.9, uptime: 99.9 }

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
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-US")
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null)
  const [run, setRun] = useState(false)
  const [stats, setStats] = useState<PlatformStats>(DEFAULT_STATS)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    fetch("/api/stats/public").then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setStats(d); setFetched(true) }
    }).catch(() => {})
  }, [])

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

  const items = [
    { value: stats.restaurants, prefix: "+", suffix: "", label: fetched ? "مطعم نشط" : "مطعم نشط" },
    { value: stats.orders, prefix: "+", suffix: "", label: fetched ? "طلب معالج" : "طلب معالج" },
    { value: stats.rating, prefix: "", suffix: "", label: "متوسط التقييم", decimals: 1 },
    { value: stats.uptime, prefix: "", suffix: "%", label: "وقت التشغيل", decimals: 1 },
  ]

  return (
    <section className="relative border-y border-border/50 py-24 md:py-32">
      <div className="absolute inset-0 bg-muted/30" />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto grid max-w-6xl grid-cols-2 gap-y-16 px-4 md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-x-reverse md:divide-border/40 md:px-6"
      >
        {items.map((s) => (
          <StatItem key={s.label} stat={s} run={run} />
        ))}
      </motion.div>
    </section>
  )
}

function StatItem({ stat, run }: { stat: { value: number; prefix: string; suffix: string; decimals?: number; label?: string }; run: boolean }) {
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
