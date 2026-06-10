import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

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
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge variant="outline" className="mb-5 px-5 py-2 text-sm font-medium rounded-xl border-primary/20 bg-primary/5 text-primary">
            الشهادات
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            ماذا يقول أصحاب المطاعم
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="group relative flex h-full flex-col rounded-3xl border border-border/50 bg-card/50 backdrop-blur p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative mb-4 flex gap-1 text-lg text-amber-400" aria-label="تقييم 5 من 5">
                {'★★★★★'.split('').map((s, idx) => (
                  <span key={idx}>{s}</span>
                ))}
              </div>
              <blockquote className="relative flex-1 leading-relaxed text-foreground/90">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="relative mt-6 flex items-center gap-3">
                <Avatar className="size-12 ring-2 ring-border">
                  <AvatarFallback className={t.bg + ' text-white text-base font-bold'}>
                    {t.initial}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.place}</p>
                </div>
              </figcaption>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
