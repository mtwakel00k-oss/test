'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const features = [
  { icon: '🏢', title: 'متعدد المستأجرين', desc: 'كل مطعم له قاعدة بيانات مستقلة. إدارة سلسلة مطاعم من لوحة واحدة.', span: 'md:col-span-2 md:row-span-2' },
  { icon: '💻', title: 'نقطة البيع (POS)', desc: 'كاشير سريع مع طباعة إيصالات حرارية وأصوات تنبيه فورية.', span: 'md:col-span-2' },
  { icon: '👨‍🍳', title: 'شاشة المطبخ (KDS)', desc: 'الطلبات تصل للمطبخ مباشرة. تحديث الحالة بدون ورق.', span: '' },
  { icon: '📊', title: 'لوحة تحكم المدير', desc: 'إحصائيات المبيعات، ساعات الذروة، أفضل المنتجات، والتقييمات.', span: '' },
  { icon: '🌍', title: '3 لغات', desc: 'عربي، English، Français مع ذاكرة منفصلة لكل واجهة.', span: '' },
  { icon: '🔐', title: 'صلاحيات وأمان', desc: 'أدوار منفصلة (كاشير/شيف/مدير/مالك) ونظام جلسات آمن.', span: 'md:col-span-2' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.32, 0.72, 0, 1] as const } },
}

export function Features() {
  return (
    <section id="features" className="relative py-32 md:py-40">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <span className="section-eyebrow mb-6">الميزات</span>
          <h2 className="font-display mt-6 text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
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
          className="grid auto-rows-fr grid-flow-dense gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f, i) => (
            <motion.div key={f.title} variants={item} className={cn('group', f.span)}>
              <div className="premium-bezel h-full transition-transform duration-700 group-hover:scale-[1.01]" style={{ transitionTimingFunction: 'var(--ease-premium)' }}>
                <Card className={cn(
                  'premium-bezel-inner h-full border-0 shadow-none transition-shadow duration-700 group-hover:shadow-[var(--shadow-lg)]',
                  i < 2 && 'bg-gradient-to-br from-primary/[0.04] to-transparent',
                )}>
                  <CardHeader>
                    <div className="mb-2 grid size-14 place-items-center rounded-2xl bg-primary/8 text-2xl transition-transform duration-700 group-hover:scale-105">
                      {f.icon}
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{f.desc}</CardDescription>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
