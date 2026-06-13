'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

const steps = [
  { num: '1', title: 'أنشئ حساب المالك', desc: 'سجّل حساب المالك (Owner) الذي يدير كل المطاعم.', icon: '🔑' },
  { num: '2', title: 'أضف مطعمك', desc: 'أنشئ مطعماً بقاعدة بيانات مستقلة وأضف الموظفين.', icon: '🏠' },
  { num: '3', title: 'ابدأ البيع', desc: 'جهّز القائمة، شغّل الكاشير والمطبخ، وتابع أرباحك.', icon: '🚀' },
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

        <div className="relative grid gap-10 md:grid-cols-3">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            className="absolute right-[16%] top-14 hidden h-0.5 w-[68%] origin-right bg-gradient-to-l from-transparent via-primary/40 to-transparent md:block"
          />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="group relative rounded-3xl border border-border/50 bg-card/50 p-8 text-center backdrop-blur transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20"
            >
              <div className="relative z-10 mx-auto mb-8">
                <div className="mx-auto grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-3xl font-black text-white shadow-2xl shadow-primary/30 ring-4 ring-background transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  {s.icon}
                </div>
                <div className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-background border-2 border-primary text-xs font-bold text-primary">
                  {s.num}
                </div>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold text-foreground">{s.title}</h3>
              <p className="text-lg leading-relaxed text-muted-foreground/90">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
