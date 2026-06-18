'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Plan = {
  name: string
  tag: string
  price: string
  features: { label: string; on: boolean }[]
  cta: string
  highlight?: boolean
  dark?: boolean
}

const plans: Plan[] = [
  {
    name: 'Starter',
    tag: 'للمطاعم الصغيرة',
    price: 'يتحدد قريباً',
    cta: 'ابدأ مجاناً',
    features: [
      { label: 'قائمة رقمية', on: true },
      { label: 'نقطة بيع واحدة', on: true },
      { label: 'لوحة تحكم أساسية', on: true },
      { label: 'دعم عربي / فرنسي', on: true },
      { label: 'شاشة المطبخ KDS', on: false },
      { label: 'تقارير متقدمة', on: false },
    ],
  },
  {
    name: 'Pro',
    tag: 'الأكثر طلباً',
    price: 'يتحدد قريباً',
    cta: 'اشترك الآن',
    highlight: true,
    features: [
      { label: 'كل مزايا Starter', on: true },
      { label: 'شاشة المطبخ KDS', on: true },
      { label: 'تقارير متقدمة', on: true },
      { label: 'دعم 3 لغات', on: true },
      { label: 'إشعارات فورية', on: true },
      { label: 'نقاط بيع متعددة', on: true },
    ],
  },
  {
    name: 'Enterprise',
    tag: 'للسلاسل والمجموعات',
    price: 'تواصل معنا',
    cta: 'تواصل معنا',
    dark: true,
    features: [
      { label: 'كل مزايا Pro', on: true },
      { label: 'قاعدة بيانات مستقلة لكل مطعم', on: true },
      { label: 'لوحة مالك موحدة', on: true },
      { label: 'تقارير موحدة', on: true },
      { label: 'دعم مخصص 24/7', on: true },
      { label: 'تدريب الفريق', on: true },
    ],
  },
]

function Check({ on }: { on: boolean }) {
  return on ? (
    <svg className="size-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <svg className="size-5 shrink-0 text-muted-foreground/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="pricing" className="relative py-32 md:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-muted/30" />
      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="section-eyebrow mb-6">التسعير</span>
          <h2 className="font-display mt-6 text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            اختر الخطة المناسبة لمطعمك
          </h2>

          <div className="mt-10 inline-flex items-center gap-4 rounded-full border border-border/50 bg-card/80 p-1.5">
            <button type="button" onClick={() => setIsYearly(false)} className={cn('rounded-full px-4 py-2 text-sm font-medium transition-all duration-500', !isYearly ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground')}>شهري</button>
            <button type="button" onClick={() => setIsYearly(true)} className={cn('rounded-full px-4 py-2 text-sm font-medium transition-all duration-500', isYearly ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground')}>
              سنوي <span className="ms-1 text-[10px] opacity-80">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-3 md:gap-5">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.75, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
              className={cn('relative flex flex-col', p.highlight && 'md:-mt-4 md:mb-4')}
            >
              <div className={cn(
                'premium-bezel flex h-full flex-col',
                p.highlight && 'ring-2 ring-primary/20',
              )}>
                <div className={cn(
                  'premium-bezel-inner flex flex-1 flex-col p-8',
                  p.dark && 'bg-[oklch(0.12_0.015_55)] text-white',
                )}>
                  {p.highlight && (
                    <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-glow)]">
                      الأكثر طلباً
                    </span>
                  )}

                  <div className="mb-1 flex items-center justify-between">
                    <p className={cn('text-sm', p.dark ? 'text-white/50' : 'text-muted-foreground')}>{p.tag}</p>
                    <span className={cn('font-display text-2xl', p.dark ? 'text-white' : 'text-foreground')}>{p.name}</span>
                  </div>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className={cn('font-display text-4xl', p.highlight ? 'text-primary' : p.dark ? 'text-white' : 'text-foreground')}>{p.price}</span>
                    {p.price !== 'تواصل معنا' && (
                      <span className={cn('text-sm', p.dark ? 'text-white/40' : 'text-muted-foreground')}>/ {isYearly ? 'سنوياً' : 'شهرياً'}</span>
                    )}
                  </div>

                  <ul className="mt-8 flex flex-1 flex-col gap-3.5">
                    {p.features.map((f) => (
                      <li key={f.label} className="flex items-center gap-3">
                        <Check on={f.on} />
                        <span className={cn('text-sm', !f.on ? 'text-muted-foreground/35' : p.dark ? 'text-white/75' : 'text-foreground/80')}>{f.label}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#cta"
                    className={cn(
                      'group mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-center text-sm font-semibold transition-all duration-700 active:scale-[0.98]',
                      p.highlight
                        ? 'bg-primary text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)]'
                        : p.dark
                          ? 'border border-white/15 bg-white/8 text-white hover:bg-white/12'
                          : 'border border-border/60 bg-background text-foreground hover:border-primary/25 hover:bg-primary/5',
                    )}
                    style={{ transitionTimingFunction: 'var(--ease-premium)' }}
                  >
                    {p.cta}
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
