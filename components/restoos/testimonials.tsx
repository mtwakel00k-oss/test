'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'

const testimonials = [
  {
    name: 'أحمد بن علي',
    place: 'مطعم الأصالة',
    initial: 'أ',
    bg: 'bg-gradient-to-br from-primary to-green-700',
    quote: 'وفّر علينا RestoOS ساعات يومياً. الطلبات تصل للمطبخ مباشرة والكاشير أصبح أسرع بكثير.',
  },
  {
    name: 'فاطمة مزياني',
    place: 'بيتزا نوفا',
    initial: 'ف',
    bg: 'bg-gradient-to-br from-rose-400 to-pink-600',
    quote: 'التقارير ساعدتني أفهم أفضل أوقات البيع وأكثر المنتجات طلباً. قرارات أذكى ومبيعات أعلى.',
  },
  {
    name: 'كريم تومي',
    place: 'برغر هاوس',
    initial: 'ك',
    bg: 'bg-gradient-to-br from-amber-400 to-orange-600',
    quote: 'دعم اللغات الثلاث ميزة رائعة لزبائننا. النظام سهل والتطبيق كان فورياً تقريباً.',
  },
]

export function Testimonials() {
  const [emblaRef] = useEmblaCarousel({ 
    align: 'start',
    breakpoints: { '(min-width: 768px)': { active: false } }
  })

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge variant="outline" className="mb-5 px-5 py-2 text-sm font-medium rounded-xl border-primary/20 bg-primary/5 text-primary">
            الشهادات
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            ماذا يقول أصحاب المطاعم
          </h2>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6 md:grid md:grid-cols-3 md:gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative flex min-w-[85%] md:min-w-0 flex-col rounded-3xl border border-border/50 bg-card/50 backdrop-blur p-8 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-primary/20"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/[0.05] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative mb-6 flex gap-1 text-lg text-amber-400" aria-label="تقييم 5 من 5">
                  {'★★★★★'.split('').map((s, idx) => (
                    <span key={idx}>{s}</span>
                  ))}
                </div>
                <blockquote className="relative flex-1 text-lg italic leading-relaxed text-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="relative mt-8 flex items-center gap-4">
                  <Avatar className="size-14 ring-4 ring-background shadow-lg transition-transform duration-500 group-hover:scale-110">
                    <AvatarFallback className={t.bg + ' text-white text-lg font-black'}>
                      {t.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-extrabold text-foreground">{t.name}</p>
                    <p className="text-sm font-medium text-muted-foreground">{t.place}</p>
                  </div>
                </figcaption>
              </motion.div>
            ))}
            
            {/* CTA Testimonial Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="group relative flex min-w-[85%] md:min-w-0 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center transition-all duration-500 hover:bg-primary/10 hover:border-primary/40"
            >
              <div className="mb-4 grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <h4 className="text-xl font-bold text-foreground">ستكون مطعمك هنا؟</h4>
              <p className="mt-2 text-sm text-muted-foreground">انضم إلى عائلة RestoOS اليوم</p>
              <a href="#cta" className="mt-6 text-sm font-bold text-primary hover:underline">ابدأ الآن</a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
