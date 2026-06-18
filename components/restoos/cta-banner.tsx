'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

export function CtaBanner() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phone.trim().length < 3) return
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
      setName('')
      setPhone('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="cta" className="px-4 py-32 md:px-6 md:py-40">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.85, ease: [0.32, 0.72, 0, 1] }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[oklch(0.22_0.04_55)] px-6 py-20 text-center md:px-12 md:py-24"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 start-1/4 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />
          <div className="absolute -bottom-16 end-1/4 h-48 w-48 rounded-full bg-accent/15 blur-[60px]" />
        </div>

        <div className="relative">
          <h2 className="font-display mx-auto max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] font-normal leading-tight text-white">
            جاهز لتحويل مطعمك رقمياً؟
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/65">
            اترك رقمك وسنعاود الاتصال بك في أقرب وقت
          </p>

          {status === 'done' ? (
            <motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-12 text-lg font-medium text-white">
              تم الاستلام! سنتواصل معك قريباً
            </motion.p>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-12 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="الاسم (اختياري)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 flex-1 rounded-full border border-white/12 bg-white/8 px-5 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-500 focus:border-white/25 focus:bg-white/12"
              />
              <input
                type="tel"
                required
                placeholder="رقم الهاتف *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 flex-1 rounded-full border border-white/12 bg-white/8 px-5 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-500 focus:border-white/25 focus:bg-white/12"
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[oklch(0.22_0.04_55)] transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                style={{ transitionTimingFunction: 'var(--ease-premium)' }}
              >
                {status === 'sending' ? '...' : 'تواصل معنا'}
                <span className="grid size-7 place-items-center rounded-full bg-black/5 transition-transform duration-700 group-hover:translate-x-0.5">
                  <svg className="size-3.5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-4 text-sm text-red-300">فشل الإرسال، حاول مرة أخرى</p>
          )}
        </div>
      </motion.div>
    </section>
  )
}
