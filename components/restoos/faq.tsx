'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Reveal } from './reveal'
import { Badge } from '@/components/ui/badge'

const faqs = [
  { q: 'هل يعمل النظام بدون إنترنت؟', a: 'النظام سحابي بالكامل ويحتاج اتصال بالإنترنت للعمل. جميع البيانات والطلبات مخزنة على خوادم Supabase السحابية.' },
  { q: 'كم مطعم يمكنني إدارته بحساب واحد؟', a: 'كل مطعم مستقل بقاعدة بياناته الخاصة. لوحة المالك (Owner) تتيح إدارة جميع المطاعم من مكان واحد.' },
  { q: 'هل يدعم الطباعة الحرارية؟', a: 'بالتأكيد، يدعم النظام معظم الطابعات الحرارية الشائعة لطباعة الإيصالات وتذاكر المطبخ.' },
  { q: 'ما هي تقنيات النظام؟', a: 'Next.js 16، Supabase، Tailwind CSS v4، shadcn/ui، TypeScript. مع WebAudio للأصوات و Recharts للرسوم البيانية.' },
  { q: 'هل يمكنني تجربة النظام مجاناً؟', a: 'نعم، يمكنك البدء مجاناً واستكشاف الميزات الأساسية قبل الترقية إلى خطة مدفوعة.' },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-muted/40 py-24">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal className="mb-12 text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium">
            الأسئلة الشائعة
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            الأسئلة الشائعة
          </h2>
        </Reveal>

        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <Reveal key={f.q} delay={i * 0.06}>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-foreground">{f.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-bg text-lg font-bold text-primary"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="px-6 pb-5 leading-relaxed text-muted-foreground">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}