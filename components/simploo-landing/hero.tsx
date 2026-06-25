'use client'

import { motion } from 'framer-motion'

function RealDashboardMockup() {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-gradient-to-b from-malachite/10 via-forest/5 to-transparent blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
        {/* Browser bar */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-card/60 px-5 py-3">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-malachite" />
          <span className="size-2.5 rounded-full bg-malachite" />
          <div className="mx-auto rounded-md bg-background/80 px-10 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
            app.simploo.dz/burger-house/admin
          </div>
        </div>

        {/* Dashboard view — mirrors the real admin overview */}
        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden w-36 shrink-0 border-l border-white/10 bg-card/40 p-3 sm:block">
            <div className="mb-4 flex items-center gap-2 text-foreground">
              <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-malachite to-forest text-[8px] font-bold text-white">S</span>
              <span className="text-[10px] font-bold">Simploo</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {['نظرة عامة', 'المنتجات', 'الطلبات', 'المطبخ', 'التقارير'].map((it, idx) => (
                <div key={it} className={`rounded-lg px-2 py-1.5 text-[9px] font-medium ${idx === 0 ? 'bg-malachite/15 text-malachite' : 'text-muted-foreground'}`}>
                  {it}
                </div>
              ))}
            </div>
          </aside>

          {/* Main content — exact admin dashboard layout */}
          <div className="flex-1 bg-card/30 p-4">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">نظرة عامة</span>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-malachite/15 px-2 py-0.5 text-[8px] font-medium text-malachite">آخر 7 أيام</span>
                <span className="size-2 rounded-full bg-malachite" />
              </div>
            </div>

            {/* 4 stat cards — matches real admin */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'إجمالي الإيرادات', value: '1,250 د.ج', badge: '▲ 12%', color: 'text-malachite bg-malachite/10' },
                { label: 'إجمالي الطلبات', value: '43', badge: 'جديد 3', color: 'text-malachite bg-malachite/10' },
                { label: 'متوسط الطلب', value: '29.1 د.ج', badge: '+0.8%', color: 'text-blue-400 bg-blue-500/10' },
                { label: 'التقييم', value: '4.2', badge: 'ممتاز', color: 'text-malachite bg-malachite/10' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/10 bg-card/50 p-2.5 backdrop-blur-sm"
                >
                  <p className="mb-0.5 text-[8px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-extrabold text-foreground tabular-nums">{s.value}</p>
                  <span className={`mt-1 inline-block rounded px-1 py-0.5 text-[7px] font-bold ${s.color}`}>{s.badge}</span>
                </div>
              ))}
            </div>

            {/* KDS preview row */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* Sales chart */}
              <div className="rounded-xl border border-white/10 bg-card/50 p-3 backdrop-blur-sm">
                <p className="mb-2 text-[8px] font-bold text-foreground">المبيعات الأسبوعية</p>
                <svg viewBox="0 0 240 60" className="w-full">
                  <defs>
                    <linearGradient id="sc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(37,233,112)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="rgb(37,233,112)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M0 48 C30 40, 50 15, 80 22 S 130 8, 160 18 S 200 35, 240 14"
                    fill="none" stroke="rgb(37,233,112)" strokeWidth="2" strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                  />
                  <motion.path
                    d="M0 48 C30 40, 50 15, 80 22 S 130 8, 160 18 S 200 35, 240 14 L 240 60 L 0 60 Z"
                    fill="url(#sc)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.7 }}
                  />
                </svg>
              </div>

              {/* KDS preview */}
              <div className="rounded-xl border border-white/10 bg-card/50 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[8px] font-bold text-foreground">شاشة المطبخ (KDS)</p>
                  <span className="text-[6px] text-muted-foreground">مباشر</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg bg-malachite/10 px-1.5 py-1 border border-malachite/20">
                    <span className="text-[7px] font-bold text-malachite">#1042</span>
                    <span className="text-[6px] text-malachite">8 د</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-malachite/10 px-1.5 py-1 border border-malachite/20">
                    <span className="text-[7px] font-bold text-malachite">#1043</span>
                    <span className="text-[6px] text-malachite">16 د</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-rose-500/10 px-1.5 py-1 border border-rose-500/20">
                    <span className="text-[7px] font-bold text-rose-300">#1039</span>
                    <span className="text-[6px] text-rose-400">24 د</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium analytics teaser */}
            <div className="mt-3 rounded-xl border border-malachite/20 bg-malachite/10 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold text-malachite">لوحة تحليلات النخبة</span>
                  <span className="rounded bg-malachite/15 px-1.5 py-0.5 text-[6px] font-semibold text-malachite">Pro</span>
                </div>
                <span className="text-[6px] text-muted-foreground">كشف التسريبات + Dead Stock + ترتيب السائقين</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-background" dir="rtl">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-[600px] w-[600px] animate-float-slow rounded-full bg-malachite blur-[160px]" />
        <div className="absolute -bottom-40 -left-32 h-[500px] w-[500px] animate-float-slower rounded-full bg-forest blur-[140px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative lg:col-span-5">
            <div className="mb-6 h-0.5 w-16 rounded-full bg-malachite/70" />

            <h1 className="font-display text-[clamp(2.2rem,4.8vw,4rem)] font-normal leading-[0.95] tracking-tight text-foreground">
              أدر مطعمك بذكاء النخبة.
              <br />
              <span className="text-malachite">
                سيطر على أرباحك،
              </span>
              <br />
              وسرّع مطبخك.
            </h1>

            <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              نظام سحابي متكامل يربط الكاشير بالمطبخ في أجزاء من الثانية،
              ويكشف لك النزيف المالي والمنتجات الراكدة فوراً وبدون تعقيد.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <motion.a
                href="/login"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-3 rounded-full bg-malachite px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-malachite/30 transition-all duration-500 hover:shadow-malachite/50"
              >
                ابدأ تجربتك المجانية
                <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-all duration-500 group-hover:translate-x-0.5">
                  <svg className="size-3.5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </span>
              </motion.a>
              <motion.a
                href="#capabilities"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-3 rounded-full border border-white/10 bg-card/60 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-500 hover:border-malachite/30 hover:bg-malachite/10"
              >
                <span className="grid size-7 place-items-center rounded-full bg-malachite/15 text-malachite backdrop-blur-sm">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </span>
                شاهد الإمكانيات
              </motion.a>
            </div>
          </div>

          <div className="relative lg:col-span-7">
            <RealDashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
