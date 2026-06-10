'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

const steps = [
  { num: '1', title: 'أنشئ حساب المالك', desc: 'سجّل حساب المالك (Owner) الذي يدير كل المطاعم.' },
  { num: '2', title: 'أضف مطعمك', desc: 'أنشئ مطعماً بقاعدة بيانات مستقلة وأضف الموظفين.' },
  { num: '3', title: 'ابدأ البيع', desc: 'جهّز القائمة، شغّل الكاشير والمطبخ، وتابع أرباحك.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge variant="outline" className="mb-5 px-5 py-2 text-sm font-medium rounded-xl border-primary/20 bg-primary/5 text-primary">
            طريقة العمل
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            ابدأ في 3 خطوات
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            من التسجيل إلى أول طلب — كل شيء بسيط وسريع.
          </p>
        </div>

        <div className="relative grid gap-12 md:grid-cols-3">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            className="absolute right-[16%] top-10 hidden h-0.5 w-[68%] origin-right bg-gradient-to-l from-transparent via-primary/30 to-transparent md:block"
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
              <div className="relative z-10 mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-2xl font-extrabold text-white shadow-xl shadow-primary/30 ring-4 ring-background">
                {s.num}
              </div>
              <h3 className="mt-6 text-xl font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
