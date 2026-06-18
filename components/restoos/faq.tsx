'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'

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
    <section id="faq" className="relative py-32 md:py-40">
      <div className="absolute inset-0 bg-muted/25" />
      <div className="relative mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-16 text-center">
          <span className="section-eyebrow mb-6">الأسئلة</span>
          <h2 className="font-display mt-6 text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            الأسئلة الشائعة
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q} className={cn('premium-bezel overflow-hidden transition-shadow duration-500', isOpen && 'shadow-[var(--shadow-md)]')}>
                <div className="premium-bezel-inner">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-foreground">{f.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/8 text-lg font-light text-primary"
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
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                      >
                        <p className="px-6 pb-6 leading-relaxed text-muted-foreground">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
