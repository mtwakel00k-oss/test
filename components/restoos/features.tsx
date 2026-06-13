'use client'

import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
          {features.map((f, i) => (
            <motion.div 
              key={f.title} 
              variants={item}
              className={cn(
                "group relative",
                i === 0 || i === 1 ? "lg:col-span-2" : "col-span-1"
              )}
            >
              <Card className={cn(
                "h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30",
                (i === 0 || i === 1) && "border-primary/10 bg-gradient-to-br from-primary/5 to-transparent"
              )}>
                {/* Animated Border for highlighted cards */}
                {(i === 0 || i === 1) && (
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
                )}
                
                <CardHeader className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-3xl ring-1 ring-primary/20 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                      {f.icon}
                    </div>
                    {(i === 0 || i === 1) && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">ميزة رئيسية</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed text-lg text-muted-foreground/90">
                    {f.desc}
                  </CardDescription>
                  
                  {/* Hover detail */}
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary opacity-0 -translate-x-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                    اكتشف المزيد
                    <svg className="size-4 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
