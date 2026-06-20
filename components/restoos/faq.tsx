'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

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
    <section id="faq" className="relative py-32 md:py-44">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            الأسئلة الشائعة
          </h2>
        </div>

        <div className="mt-12 flex flex-col gap-3">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q} className="overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-500">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-foreground">{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary"
                  >
                    <ChevronDown size={16} strokeWidth={2} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
