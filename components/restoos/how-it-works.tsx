'use client'

import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'أنشئ حساب المالك',
    desc: 'سجّل حساب المالك (Owner) الذي يدير كل المطاعم.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'أضف مطعمك',
    desc: 'أنشئ مطعماً بقاعدة بيانات مستقلة وأضف الموظفين.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'ابدأ البيع',
    desc: 'جهّز القائمة، شغّل الكاشير والمطبخ، وتابع أرباحك.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative py-32 md:py-44">
      <div className="absolute inset-0 bg-muted/20" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            ابدأ في 3 خطوات
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            من التسجيل إلى أول طلب — كل شيء بسيط وسريع.
          </p>
        </div>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3 md:gap-0">
          <div className="absolute top-12 left-[16%] hidden h-px w-[68%] bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group relative md:px-6"
            >
              <div className="relative rounded-2xl border border-border/40 bg-card p-8 transition-all duration-500 hover:border-primary/20 hover:shadow-[var(--shadow-md)]">
                <div className="flex items-center gap-4 md:flex-col md:text-center">
                  <div className="relative shrink-0">
                    <div className="grid size-14 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-md)] transition-transform duration-500 group-hover:scale-105">
                      <span className="size-6">{s.icon}</span>
                    </div>
                    <span className="absolute -top-2 -right-2 font-mono text-[10px] font-bold tracking-widest text-primary/60">{s.num}</span>
                  </div>
                  <div className="md:mt-4">
                    <h3 className="text-xl font-semibold text-foreground">{s.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
