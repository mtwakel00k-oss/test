'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

type Plan = {
  name: string
  tag: string
  price: string
  features: { label: string; on: boolean }[]
  cta: string
  highlight?: boolean
  dark?: boolean
}

const plans: Plan[] = [
  {
    name: 'Starter',
    tag: 'للمطاعم الصغيرة',
    price: 'يتحدد قريباً',
    cta: 'ابدأ مجاناً',
    features: [
      { label: 'قائمة رقمية', on: true },
      { label: 'نقطة بيع واحدة', on: true },
      { label: 'لوحة تحكم أساسية', on: true },
      { label: 'دعم عربي / فرنسي', on: true },
      { label: 'شاشة المطبخ KDS', on: false },
      { label: 'تقارير متقدمة', on: false },
    ],
  },
  {
    name: 'Pro',
    tag: 'الأكثر طلباً',
    price: 'يتحدد قريباً',
    cta: 'اشترك الآن',
    highlight: true,
    features: [
      { label: 'كل مزايا Starter', on: true },
      { label: 'شاشة المطبخ KDS', on: true },
      { label: 'تقارير متقدمة', on: true },
      { label: 'دعم 3 لغات', on: true },
      { label: 'إشعارات فورية', on: true },
      { label: 'نقاط بيع متعددة', on: true },
    ],
  },
  {
    name: 'Enterprise',
    tag: 'للسلاسل والمجموعات',
    price: 'تواصل معنا',
    cta: 'تواصل معنا',
    dark: true,
    features: [
      { label: 'كل مزايا Pro', on: true },
      { label: 'قاعدة بيانات مستقلة لكل مطعم', on: true },
      { label: 'لوحة مالك موحدة', on: true },
      { label: 'تقارير موحدة', on: true },
      { label: 'دعم مخصص 24/7', on: true },
      { label: 'تدريب الفريق', on: true },
    ],
  },
]

function Check({ on }: { on: boolean }) {
  return on ? (
    <svg className="size-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <svg className="size-5 shrink-0 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="pricing" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-muted/30" />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="mb-5 px-5 py-2 text-sm font-medium rounded-xl border-primary/20 bg-primary/5 text-primary">
            التسعير
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            اختر الخطة المناسبة لمطعمك
          </h2>
          
          {/* Billing Toggle */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className={cn("text-sm font-medium", !isYearly ? "text-foreground" : "text-muted-foreground")}>شهري</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative h-7 w-12 rounded-full bg-muted border border-border p-1 transition-colors hover:border-primary/50"
            >
              <motion.div
                animate={{ x: isYearly ? 20 : 0 }}
                className="h-4.5 w-4.5 rounded-full bg-primary shadow-sm"
              />
            </button>
            <span className={cn("text-sm font-medium", isYearly ? "text-foreground" : "text-muted-foreground")}>
              سنوي <Badge variant="secondary" className="bg-primary/10 text-primary border-none ml-1 text-[10px] py-0 px-1.5">خصم 20%</Badge>
            </span>
          </div>
        </div>

        <div className="grid items-stretch gap-8 md:grid-cols-3">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className={`relative flex flex-col rounded-3xl border p-8 transition-all duration-300 ${
                p.highlight
                  ? 'border-primary/30 bg-card shadow-2xl shadow-primary/10 md:scale-105'
                  : p.dark
                    ? 'border-border/50 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white shadow-xl'
                    : 'border-border/50 bg-card shadow-sm hover:shadow-lg'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-6 py-1.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-xl shadow-primary/30">
                  الأكثر طلباً
                </span>
              )}

              <div className="mb-2 flex items-center justify-between">
                <p className={`text-sm font-medium ${p.dark ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {p.tag}
                </p>
                <span className={`text-2xl font-black ${p.dark ? 'text-white' : 'text-foreground'}`}>
                  {p.name}
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className={`text-4xl font-black ${p.highlight ? 'text-primary' : p.dark ? 'text-white' : 'text-foreground'}`}>
                  {p.price}
                </span>
                {p.price !== 'تواصل معنا' && (
                  <span className={`text-sm font-medium ${p.dark ? 'text-white/40' : 'text-muted-foreground'}`}>
                    / {isYearly ? 'سنوياً' : 'شهرياً'}
                  </span>
                )}
              </div>

              <ul className="mt-8 flex flex-1 flex-col gap-3.5">
                {p.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-3">
                    <Check on={f.on} />
                    <span className={`text-sm ${!f.on ? 'text-muted-foreground/40' : p.dark ? 'text-white/80' : 'text-foreground/80'}`}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                className={`mt-8 rounded-2xl px-6 py-3.5 text-center text-sm font-bold transition-all hover:-translate-y-0.5 ${
                  p.highlight
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
                    : p.dark
                      ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                      : 'border border-border bg-card text-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {p.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
