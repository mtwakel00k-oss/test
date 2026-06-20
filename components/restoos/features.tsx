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
    span: 'md:col-span-2 md:row-span-2',
    gradient: true,
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
    span: 'md:col-span-2',
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
    span: '',
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
    span: '',
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
    span: '',
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
    span: 'md:col-span-2',
  },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
}

export function Features() {
  return (
    <section id="features" className="relative py-32 md:py-44">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
            كل ما تحتاجه في منصة واحدة
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            أدوات متكاملة صُممت خصيصاً لتسريع عمل مطعمك من الطلب حتى التقرير.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-16 grid auto-rows-fr grid-flow-dense gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item} className={cn('group', f.span)}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card p-7 transition-all duration-500 hover:border-primary/20 hover:shadow-[var(--shadow-lg)]">
                {f.gradient && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent" />
                )}
                <div className="relative mb-4 grid size-12 place-items-center rounded-xl bg-primary/8 text-primary transition-transform duration-500 group-hover:scale-105">
                  {f.svg}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
