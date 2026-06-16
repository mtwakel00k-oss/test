'use client'

import { motion } from 'framer-motion'
import { Reveal } from './reveal'

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
    <svg className="size-5 shrink-0 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-muted/40 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            اختر الخطة المناسبة لمطعمك
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            ابدأ مجاناً وارتقِ بخطتك عندما ينمو مطعمك.
          </p>
        </Reveal>

        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                p.highlight
                  ? 'animate-pulse-glow z-10 border-primary bg-card md:scale-105'
                  : p.dark
                    ? 'border-transparent bg-[#15151f] text-white'
                    : 'border-border bg-card'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 right-7 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/30">
                  الأكثر طلباً
                </span>
              )}
              <p className={`text-sm font-medium ${p.dark ? 'text-white/60' : 'text-muted-foreground'}`}>
                {p.tag}
              </p>
              <h3 className={`mt-1 text-2xl font-extrabold ${p.dark ? 'text-white' : 'text-foreground'}`}>
                {p.name}
              </h3>
              <p className={`mt-4 text-2xl font-bold ${p.highlight ? 'text-primary' : p.dark ? 'text-white' : 'text-foreground'}`}>
                {p.price}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5">
                    <Check on={f.on} />
                    <span className={`text-sm ${!f.on ? 'text-muted-foreground/50' : p.dark ? 'text-white/85' : 'text-foreground'}`}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                className={`mt-7 rounded-full px-6 py-3 text-center text-sm font-bold transition-all hover:-translate-y-0.5 ${
                  p.highlight
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : p.dark
                      ? 'bg-white text-[#15151f]'
                      : 'border border-border bg-white text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {p.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
