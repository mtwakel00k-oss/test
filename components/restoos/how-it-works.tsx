'use client'

import { motion } from 'framer-motion'

const steps = [
  { num: '01', title: 'أنشئ حساب المالك', desc: 'سجّل حساب المالك (Owner) الذي يدير كل المطاعم.', icon: '🔑' },
  { num: '02', title: 'أضف مطعمك', desc: 'أنشئ مطعماً بقاعدة بيانات مستقلة وأضف الموظفين.', icon: '🏠' },
  { num: '03', title: 'ابدأ البيع', desc: 'جهّز القائمة، شغّل الكاشير والمطبخ، وتابع أرباحك.', icon: '🚀' },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative py-32 md:py-40">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <span className="section-eyebrow mb-6">طريقة العمل</span>
          <h2 className="font-display mt-6 text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            ابدأ في 3 خطوات
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            من التسجيل إلى أول طلب — كل شيء بسيط وسريع.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3 md:gap-6">
          <div className="absolute right-[16%] top-16 hidden h-px w-[68%] origin-right bg-gradient-to-l from-transparent via-primary/30 to-transparent md:block" />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: i * 0.12, ease: [0.32, 0.72, 0, 1] }}
              className="group relative"
            >
              <div className="premium-bezel h-full">
                <div className="premium-bezel-inner p-8 text-center">
                  <div className="relative mx-auto mb-8 w-fit">
                    <div className="grid size-20 place-items-center rounded-[1.25rem] bg-primary text-3xl text-primary-foreground shadow-[var(--shadow-lg),var(--shadow-glow)] transition-transform duration-700 group-hover:scale-105">
                      {s.icon}
                    </div>
                    <span className="absolute -bottom-2 -start-2 font-mono text-[10px] font-bold tracking-widest text-primary/60">{s.num}</span>
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-foreground">{s.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
