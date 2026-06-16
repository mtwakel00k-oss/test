'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

const particles = Array.from({ length: 14 })

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
    <section id="cta" className="px-5 py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-light px-6 py-16 text-center shadow-2xl shadow-primary/30">
        <div className="pointer-events-none absolute inset-0">
          {particles.map((_, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0 size-2 rounded-full bg-white/40"
              style={{ left: `${(i * 7 + 5) % 100}%` }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: '-220%', opacity: [0, 0.7, 0] }}
              transition={{
                duration: 5 + (i % 5),
                repeat: Infinity,
                delay: i * 0.4,
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
            className="text-balance text-3xl font-extrabold leading-tight text-white sm:text-4xl"
          >
            جاهز لتحويل مطعمك رقمياً؟
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85"
          >
            اترك رقمك وسنعاود الاتصال بك في أقرب وقت
          </motion.p>

          {status === 'done' ? (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 text-xl font-bold text-white"
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
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                placeholder="الاسم (اختياري)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-full bg-white/20 px-5 py-3 text-sm text-white placeholder:text-white/60 backdrop-blur outline-none ring-1 ring-white/30 focus:ring-white/60"
              />
              <input
                type="tel"
                required
                placeholder="رقم الهاتف *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 rounded-full bg-white/20 px-5 py-3 text-sm text-white placeholder:text-white/60 backdrop-blur outline-none ring-1 ring-white/30 focus:ring-white/60"
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="shrink-0 rounded-full bg-white px-8 py-3 text-base font-bold text-primary shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-70"
              >
                {status === 'sending' ? '...' : 'تواصل معنا'}
              </button>
            </motion.form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-sm text-red-200">فشل الإرسال، حاول مرة أخرى</p>
          )}
        </div>
      </div>
    </section>
  )
}
