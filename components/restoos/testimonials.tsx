'use client'

import { motion } from 'framer-motion'

const testimonials = [
  {
    name: 'أحمد بن علي',
    place: 'مطعم الأصالة',
    initial: 'أ',
    quote: 'وفّر علينا RestoOS ساعات يومياً. الطلبات تصل للمطبخ مباشرة والكاشير أصبح أسرع بكثير.',
  },
  {
    name: 'فاطمة مزياني',
    place: 'بيتزا نوفا',
    initial: 'ف',
    quote: 'التقارير ساعدتني أفهم أفضل أوقات البيع وأكثر المنتجات طلباً. قرارات أذكى ومبيعات أعلى.',
  },
  {
    name: 'كريم تومي',
    place: 'برغر هاوس',
    initial: 'ك',
    quote: 'دعم اللغات الثلاث ميزة رائعة لزبائننا. النظام سهل والتطبيق كان فورياً تقريباً.',
  },
]

export function Testimonials() {
  return (
    <section className="relative py-32 md:py-44">
      <div className="absolute inset-0 bg-muted/15" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            ماذا يقول أصحاب المطاعم
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group"
            >
              <div className="relative h-full rounded-2xl border border-border/40 bg-card p-8 transition-all duration-500 hover:border-primary/20 hover:shadow-[var(--shadow-md)]">
                <div className="mb-5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="size-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed text-foreground/85">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-forest text-base font-bold text-white">
                    {t.initial}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.place}</p>
                  </div>
                </figcaption>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
