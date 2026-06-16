'use client'

import { motion } from 'framer-motion'
import { Reveal } from './reveal'

const steps = [
  { num: '1', title: 'أنشئ حساب المالك', desc: 'سجّل حساب المالك (Owner) الذي يدير كل المطاعم.' },
  { num: '2', title: 'أضف مطعمك', desc: 'أنشئ مطعماً بقاعدة بيانات مستقلة وأضف الموظفين.' },
  { num: '3', title: 'ابدأ البيع', desc: 'جهّز القائمة، شغّل الكاشير والمطبخ، وتابع أرباحك.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="py-24">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            ابدأ في 3 خطوات
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            من التسجيل إلى أول طلب — كل شيء بسيط وسريع.
          </p>
        </Reveal>

        <div className="relative grid gap-12 md:grid-cols-3">
          {/* connector line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            className="absolute right-[16%] top-8 hidden h-0.5 w-[68%] origin-right bg-gradient-to-l from-primary/10 via-primary/40 to-primary/10 md:block"
          />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="relative text-center"
            >
              <div className="relative z-10 mx-auto grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-2xl font-extrabold text-white shadow-lg shadow-primary/30 ring-8 ring-background">
                {s.num}
              </div>
              <h3 className="mt-5 text-xl font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
