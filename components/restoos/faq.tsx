'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
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
    <section id="faq" className="relative py-28">
      <div className="absolute inset-0 bg-muted/30" />
      <div className="relative mx-auto max-w-3xl px-5">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-5 px-5 py-2 text-sm font-medium rounded-xl border-primary/20 bg-primary/5 text-primary">
            الأسئلة
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            الأسئلة الشائعة
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div
                key={f.q}
                className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen ? 'border-primary/20 bg-card shadow-md' : 'border-border/50 bg-card/50 hover:border-border'
                }`}
              >
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
                    className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-bold text-primary"
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
                      <p className="px-6 pb-6 leading-relaxed text-muted-foreground">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
