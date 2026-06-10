'use client'

import { motion } from 'framer-motion'
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

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
}

export function Features() {
  return (
    <section id="features" className="relative py-28">
      <div className="absolute inset-0 bg-[radial-gradient(oklch(0.52_0.18_145/0.04)_1px,transparent_1px)] bg-[length:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge variant="outline" className="mb-5 px-5 py-2 text-sm font-medium rounded-xl border-primary/20 bg-primary/5 text-primary">
            الميزات
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            كل ما تحتاجه في منصة واحدة
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            أدوات متكاملة صُممت خصيصاً لتسريع عمل مطعمك من الطلب حتى التقرير.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item}>
              <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardHeader>
                  <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-2xl ring-1 ring-primary/10">
                    {f.icon}
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed text-base">{f.desc}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
