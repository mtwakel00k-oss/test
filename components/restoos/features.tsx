'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const features = [
  {
    title: 'متعدد المستأجرين',
    desc: 'كل مطعم له قاعدة بيانات مستقلة. إدارة سلسلة مطاعم من لوحة واحدة.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: 'نقطة البيع (POS)',
    desc: 'كاشير سريع مع طباعة إيصالات حرارية وأصوات تنبيه فورية.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'شاشة المطبخ (KDS)',
    desc: 'الطلبات تصل للمطبخ مباشرة. تحديث الحالة بدون ورق.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'لوحة تحكم المدير',
    desc: 'إحصائيات المبيعات، ساعات الذروة، أفضل المنتجات، والتقييمات.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: '3 لغات',
    desc: 'عربي، English، Français مع ذاكرة منفصلة لكل واجهة.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    title: 'صلاحيات وأمان',
    desc: 'أدوار منفصلة (كاشير/شيف/مدير/مالك) ونظام جلسات آمن.',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
}

export function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-32 md:py-44">
      <div className="pointer-events-none absolute -left-1/4 top-1/4 size-[600px] rounded-full bg-accent/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-1/4 bottom-1/4 size-[500px] rounded-full bg-primary/5 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-accent" />
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.15] tracking-tight text-foreground">
            كل ما تحتاجه في منصة واحدة
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            أدوات متكاملة صُممت خصيصاً لتسريع عمل مطعمك من الطلب حتى التقرير.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="relative mt-24 md:mt-32"
        >
          {features.map((f, i) => (
            <motion.div key={f.title} variants={item}>
              <div
                className={cn(
                  'flex flex-col items-center gap-6 border-b border-border/20 pb-12 pt-12 text-center first:pt-0 last:border-0 last:pb-0',
                  'md:flex-row md:gap-16 md:pb-20 md:pt-20 md:text-right',
                  i % 2 === 1 && 'md:flex-row-reverse md:text-left',
                )}
              >
                <div className="relative shrink-0">
                  {i % 2 === 0 ? (
                    <>
                      <div className="absolute -inset-8 rounded-full bg-accent/10 blur-3xl transition-all duration-700 group-hover:bg-accent/15" />
                      <div className="relative grid size-16 place-items-center rounded-2xl bg-accent text-white md:size-20">
                        {f.svg}
                      </div>
                    </>
                  ) : (
                    <div className="grid size-14 place-items-center rounded-xl bg-primary/10 text-primary transition-all duration-500 md:size-16">
                      {f.svg}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-display text-2xl font-normal leading-snug text-foreground md:text-3xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                    {f.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
