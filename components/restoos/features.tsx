'use client'

import { motion } from 'framer-motion'
import { Reveal } from './reveal'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const features = [
  { icon: '🏢', title: 'متعدد المستأجرين', desc: 'كل مطعم له قاعدة بيانات مستقلة. إدارة سلسلة مطاعم من لوحة واحدة.' },
  { icon: '💻', title: 'نقطة البيع (POS)', desc: 'كاشير سريع مع طباعة إيصالات حرارية وأصوات تنبيه فورية.' },
  { icon: '👨‍🍳', title: 'شاشة المطبخ (KDS)', desc: 'الطلبات تصل للمطبخ مباشرة. تحديث الحالة بدون ورق.' },
  { icon: '📊', title: 'لوحة تحكم المدير', desc: 'إحصائيات المبيعات، ساعات الذروة، أفضل المنتجات، والتقييمات.' },
  { icon: '🌍', title: '3 لغات', desc: 'عربي، English، Français مع ذاكرة منفصلة لكل واجهة.' },
  { icon: '🔐', title: 'صلاحيات وأمان', desc: 'أدوار منفصلة (كاشير/شيف/مدير/مالك) ونظام جلسات آمن.' },
]

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium">
            الميزات
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            كل ما تحتاجه في منصة واحدة
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            أدوات متكاملة صُممت خصيصاً لتسريع عمل مطعمك من الطلب حتى التقرير.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.1 }}
              whileHover={{ y: -6 }}
            >
              <Card className="group relative overflow-hidden border-border shadow-sm transition-shadow hover:shadow-xl hover:shadow-primary/10">
                <span className="absolute inset-y-0 right-0 w-1 origin-bottom scale-y-0 bg-primary transition-transform duration-300 group-hover:scale-y-100" />
                <CardHeader>
                  <div className="mb-2 grid size-12 place-items-center rounded-xl bg-primary-bg text-2xl">
                    {f.icon}
                  </div>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">{f.desc}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}