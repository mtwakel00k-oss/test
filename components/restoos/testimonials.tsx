'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'

const testimonials = [
  {
    name: 'أحمد بن علي',
    place: 'مطعم الأصالة',
    initial: 'أ',
    bg: 'bg-gradient-to-br from-primary to-emerald-700',
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
    breakpoints: { '(min-width: 768px)': { active: false } },
  })

  return (
    <section className="relative py-32 md:py-40 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <span className="section-eyebrow mb-6">الشهادات</span>
          <h2 className="font-display mt-6 text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            ماذا يقول أصحاب المطاعم
          </h2>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5 md:grid md:grid-cols-3 md:gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
                className="group min-w-[85%] md:min-w-0"
              >
                <div className="premium-bezel h-full transition-transform duration-700 group-hover:scale-[1.01]">
                  <div className="premium-bezel-inner flex h-full min-h-[280px] flex-col p-8">
                    <div className="mb-5 flex gap-0.5 text-amber-500" aria-label="تقييم 5 من 5">
                      {'★★★★★'.split('').map((s, idx) => <span key={idx} className="text-sm">{s}</span>)}
                    </div>
                    <blockquote className="flex-1 text-base leading-relaxed text-foreground/85">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <figcaption className="mt-8 flex items-center gap-4">
                      <Avatar className="size-12 ring-2 ring-border/50">
                        <AvatarFallback className={`${t.bg} text-base font-bold text-white`}>{t.initial}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.place}</p>
                      </div>
                    </figcaption>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
