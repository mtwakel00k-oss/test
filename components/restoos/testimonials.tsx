import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Reveal } from './reveal'

const testimonials = [
  {
    name: 'أحمد بن علي',
    place: 'مطعم الأصالة',
    initial: 'أ',
    bg: 'bg-gradient-to-br from-primary to-primary-light',
    quote: 'وفّر علينا RestoOS ساعات يومياً. الطلبات تصل للمطبخ مباشرة والكاشير أصبح أسرع بكثير.',
  },
  {
    name: 'فاطمة مزياني',
    place: 'بيتزا نوفا',
    initial: 'ف',
    bg: 'bg-gradient-to-br from-rose-400 to-pink-500',
    quote: 'التقارير ساعدتني أفهم أفضل أوقات البيع وأكثر المنتجات طلباً. قرارات أذكى ومبيعات أعلى.',
  },
  {
    name: 'كريم تومي',
    place: 'برغر هاوس',
    initial: 'ك',
    bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    quote: 'دعم اللغات الثلاث ميزة رائعة لزبائننا. النظام سهل والتطبيق كان فورياً تقريباً.',
  },
]

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            ماذا يقول أصحاب المطاعم
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.12}>
              <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
                <div className="mb-3 flex gap-0.5 text-amber-400" aria-label="تقييم 5 من 5">
                  {'★★★★★'.split('').map((s, idx) => (
                    <span key={idx}>{s}</span>
                  ))}
                </div>
                <blockquote className="flex-1 leading-relaxed text-foreground">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className={t.bg + ' text-white text-base font-bold'}>
                      {t.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-foreground">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.place}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}