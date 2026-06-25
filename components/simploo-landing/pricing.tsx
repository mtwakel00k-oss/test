'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Plan = {
  name: string
  tag: string
  monthly: number
  features: { label: string; on: boolean }[]
  cta: string
  highlight?: boolean
}

const plans: Plan[] = [
  {
    name: 'الباقة العادية',
    tag: 'للمطاعم الصغيرة',
    monthly: 4900,
    cta: 'ابدأ مجاناً',
    features: [
      { label: 'شاشة كاشير واحدة', on: true },
      { label: 'شاشة مطبخ واحدة (KDS)', on: true },
      { label: 'مزامنة فورية عبر Supabase Realtime', on: true },
      { label: 'لوحة تحكم أساسية (إيرادات + طلبات)', on: true },
      { label: '3 حالات طلب (قيد الانتظار / قيد التحضير / جاهز)', on: true },
      { label: 'إدارة المنتجات والفئات', on: true },
      { label: 'تقييمات الزبائن', on: true },
      { label: 'دعم عربي / فرنسي', on: true },
      { label: 'لوحة تحليلات النخبة', on: false },
      { label: 'كشف التسريبات المالية', on: false },
      { label: 'المنتجات الراكدة (Dead Stock)', on: false },
      { label: 'ترتيب السائقين والكاشيرات', on: false },
      { label: 'سجل التدقيق (Audit Log)', on: false },
      { label: 'توصيل وتتبع الطلبات', on: false },
    ],
  },
  {
    name: 'باقة البرو',
    tag: 'الأكثر طلباً',
    monthly: 9900,
    cta: 'اشترك الآن',
    highlight: true,
    features: [
      { label: 'حتى 3 شاشات كاشير', on: true },
      { label: 'شاشات مطبخ غير محدودة', on: true },
      { label: 'مزامنة فورية عبر Supabase Realtime', on: true },
      { label: 'لوحة تحكم كاملة', on: true },
      { label: 'لوحة تحليلات النخبة', on: true },
      { label: 'كشف التسريبات المالية', on: true },
      { label: 'المنتجات الراكدة (Dead Stock)', on: true },
      { label: 'ترتيب السائقين والكاشيرات', on: true },
      { label: 'سجل التدقيق (Audit Log)', on: true },
      { label: 'إنذار المطبخ (Kitchen Red Zone)', on: true },
      { label: 'متوسط وقت التحضير + رسم بياني', on: true },
      { label: 'توصيل وتتبع مباشر', on: true },
      { label: 'إلغاءات حسب نوع الطلب', on: true },
      { label: 'دعم هاتفي 24/7', on: true },
      { label: 'دعم 3 لغات', on: true },
    ],
  },
  {
    name: 'باقة النخبة',
    tag: 'للسلاسل والمجموعات',
    monthly: 19900,
    cta: 'تواصل معنا',
    features: [
      { label: 'شاشات غير محدودة', on: true },
      { label: 'دخول كامل للنظام', on: true },
      { label: 'كل ميزات باقة البرو', on: true },
      { label: 'لوحة مالك موحدة لجميع الفروع', on: true },
      { label: 'قاعدة بيانات مستقلة لكل فرع', on: true },
      { label: 'تقارير موحدة', on: true },
      { label: 'مدير حساب مخصص', on: true },
      { label: 'إرشاد تثبيت وتدريب الفريق', on: true },
      { label: 'دعم مخصص 24/7', on: true },
      { label: 'استضافة خاصة (اختياري)', on: true },
    ],
  },
]

function fmt(n: number) { return n.toLocaleString('ar-DZ') + ' د.ج' }

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="pricing" className="relative py-32 md:py-44" dir="rtl">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-malachite/50 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 bottom-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-forest/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-malachite to-forest" />
            <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
              اختر الخطة المناسبة لمطعمك
            </h2>
            <p className="mt-4 text-muted-foreground">وفر شهرين مجاناً عند الاشتراك السنوي</p>

            <div className="mt-8 inline-flex items-center gap-4 rounded-full border border-white/10 bg-card p-1.5">
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className={cn('rounded-full px-5 py-2 text-sm font-medium transition-all duration-500', !isYearly ? 'bg-malachite text-white shadow-sm' : 'text-muted-foreground')}
              >
                شهري
              </button>
              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className={cn('rounded-full px-5 py-2 text-sm font-medium transition-all duration-500', isYearly ? 'bg-malachite text-white shadow-sm' : 'text-muted-foreground')}
              >
                سنوي <span className="ms-1 text-[10px] opacity-80">- شهران مجاناً</span>
              </button>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 grid items-stretch gap-6 md:grid-cols-3 md:gap-5">
          {plans.map((p, i) => {
            const effectiveMonthly = isYearly ? Math.round(p.monthly * 10 / 12) : p.monthly

            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.75, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={cn('relative flex flex-col', p.highlight && 'md:-mt-4 md:mb-4')}
              >
                <div className={cn(
                  'relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card',
                  p.highlight ? 'border-malachite/40 shadow-[0_0_30px_-10px_rgba(37,233,112,0.3)]' : 'border-white/10',
                )}>
                  {p.highlight && (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-malachite/[0.06] to-transparent" />
                      <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-malachite/20 via-forest/20 to-malachite/20 blur-sm" />
                    </>
                  )}
                  <div className="relative flex flex-1 flex-col p-8">
                    {p.highlight && (
                      <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-malachite px-4 py-1 text-[10px] font-bold tracking-wider text-white shadow-lg shadow-malachite/30">
                        الأكثر طلباً
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl text-foreground">{p.name}</span>
                      <span className="text-sm text-muted-foreground">{p.tag}</span>
                    </div>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className={cn('font-display text-4xl', p.highlight ? 'text-malachite' : 'text-foreground')}>
                        {fmt(effectiveMonthly)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ {isYearly ? 'شهرياً (سنوي)' : 'شهرياً'}</span>
                    </div>

                    {isYearly && p.monthly > 0 && (
                      <p className="mt-1 text-xs text-malachite">
                        {fmt(p.monthly * 12)} سنوياً — وفرت {fmt(p.monthly * 2)}
                      </p>
                    )}

                    <ul className="mt-8 flex flex-1 flex-col gap-3">
                      {p.features.map((f) => (
                        <li key={f.label} className="flex items-center gap-3">
                          {f.on ? (
                            <svg className="size-4 shrink-0 text-malachite" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          ) : (
                            <svg className="size-4 shrink-0 text-muted-foreground/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                          )}
                          <span className={cn('text-sm', !f.on ? 'text-muted-foreground/35' : 'text-foreground/80')}>{f.label}</span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href="/login"
                      className={cn(
                        'mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-center text-sm font-semibold transition-all duration-500 active:scale-[0.98]',
                        p.highlight
                          ? 'bg-malachite text-white shadow-lg shadow-malachite/30 hover:shadow-malachite/50'
                          : 'border border-white/10 bg-background text-foreground hover:border-malachite/25 hover:bg-malachite/10',
                      )}
                    >
                      {p.cta}
                    </a>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
