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
    <section id="cta" className="px-5 py-28">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[3rem] bg-gradient-to-br from-primary via-primary to-emerald-600 px-8 py-24 text-center shadow-[0_32px_64px_-16px_rgba(34,197,94,0.3)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(oklch(1_0_0/0.15)_1.5px,transparent_1.5px)] bg-[length:32px_32px]" />
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0 size-3 rounded-full bg-white/40 blur-[1px]"
              style={{ left: `${(i * 3.33 + 2) % 100}%` }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: '-350%', opacity: [0, 0.7, 0] }}
              transition={{
                duration: 5 + (i % 5),
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <div className="relative">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-balance text-4xl font-black leading-tight text-white sm:text-6xl"
          >
            جاهز لتحويل مطعمك رقمياً؟
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/80"
          >
            اترك رقمك وسنعاود الاتصال بك في أقرب وقت
          </motion.p>

          {status === 'done' ? (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-10 text-xl font-bold text-white"
            >
              تم الاستلام! سنتواصل معك قريباً ✅
            </motion.p>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-10 flex max-w-lg flex-col gap-4 sm:flex-row"
            >
              <input
                type="text"
                placeholder="الاسم (اختياري)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-2xl bg-white/15 px-6 py-4 text-sm text-white placeholder:text-white/50 backdrop-blur outline-none ring-1 ring-white/20 transition-all focus:ring-white/50 focus:bg-white/20"
              />
              <input
                type="tel"
                required
                placeholder="رقم الهاتف *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 rounded-2xl bg-white/15 px-6 py-4 text-sm text-white placeholder:text-white/50 backdrop-blur outline-none ring-1 ring-white/20 transition-all focus:ring-white/50 focus:bg-white/20"
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="shrink-0 rounded-2xl bg-white px-8 py-4 text-base font-black text-primary shadow-[0_12px_24px_-8px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(255,255,255,0.5)] active:scale-95 disabled:opacity-70"
              >
                {status === 'sending' ? '...' : 'تواصل معنا ←'}
              </button>
            </motion.form>
          )}

          {status === 'error' && (
            <p className="mt-4 text-sm text-red-200">فشل الإرسال، حاول مرة أخرى</p>
          )}
        </div>
      </div>
    </section>
  )
}
