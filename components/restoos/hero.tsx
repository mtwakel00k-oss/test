'use client'

import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-visible pt-36 md:pt-48">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-primary/6 blur-[160px]" />
        <div className="absolute bottom-0 -left-32 h-[450px] w-[450px] rounded-full bg-accent/8 blur-[140px]" />
        <div className="absolute top-1/3 left-1/4 h-[300px] w-[300px] rounded-full bg-primary/3 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease, delay: 0.1 }}
        >
          <div className="mb-6 flex justify-end">
            <div className="h-1 w-20 rounded-full bg-accent/60" />
          </div>

          <div className="ml-auto max-w-4xl">
            <h1 className="font-display text-[clamp(3.2rem,7.5vw,5.8rem)] font-normal leading-[0.92] tracking-tight text-foreground">
              نظام نقاط البيع
              <span className="relative mx-3 inline-block h-[1em] w-[1.3em] overflow-hidden rounded-full align-middle ring-2 ring-accent/20">
                <span
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: 'url(https://picsum.photos/seed/resto-hero/200/200)' }}
                />
              </span>
              الذكي للمطاعم
            </h1>

            <p className="mt-8 ml-auto max-w-xl text-lg leading-[1.9] text-muted-foreground md:text-xl md:leading-[1.9]">
              منصة سحابية متعددة المستأجرين تدير طلبات مطعمك، مطبخك، وتقاريرك من مكان واحد. حل رقمي متكامل للمطاعم والسلسلات.
            </p>

            <div className="mt-14 flex flex-wrap items-center justify-end gap-5">
              <a
                href="#cta"
                className="group inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-500 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.97]"
              >
                تواصل معنا
                <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-0.5">
                  <svg className="size-3.5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </a>
              <a
                href="#features"
                className="group inline-flex items-center gap-3 rounded-full border border-border/40 bg-background px-8 py-4 text-base font-semibold text-foreground transition-all duration-500 hover:border-accent/30 hover:bg-accent/5 active:scale-[0.97]"
              >
                <span className="grid size-7 place-items-center rounded-full bg-accent/10 text-accent">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </span>
                شاهد العرض
              </a>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-12 flex items-center justify-end gap-4"
            >
              <div className="flex -space-x-3 space-x-reverse">
                <span className="grid size-11 place-items-center rounded-full border-2 border-background bg-primary text-sm font-bold text-white shadow-md">م</span>
                <span className="grid size-11 place-items-center rounded-full border-2 border-background bg-accent text-sm font-bold text-white shadow-md">ك</span>
                <span className="grid size-11 place-items-center rounded-full border-2 border-background bg-emerald-600 text-sm font-bold text-white shadow-md">ف</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">+200 مطعم</span>
                <span className="text-muted-foreground"> يثقون بنا</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease, delay: 0.35 }}
          className="relative mt-20 md:mt-28 -mb-[20%]"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[140px]" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="absolute -inset-8 rounded-[3.5rem] bg-gradient-to-b from-primary/10 via-accent/5 to-transparent blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_-16px_rgba(0,0,0,0.15)] shadow-primary/10 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/5">
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/40 px-5 py-3.5">
                <span className="size-3 rounded-full bg-red-400" />
                <span className="size-3 rounded-full bg-amber-400" />
                <span className="size-3 rounded-full bg-emerald-400" />
                <div className="mx-auto rounded-md bg-background px-10 py-1 text-xs text-muted-foreground">
                  app.restoos.dz
                </div>
              </div>

              <div className="flex">
                <aside className="hidden w-44 shrink-0 bg-zinc-950 p-5 sm:block">
                  <div className="mb-6 flex items-center gap-2 text-white">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold">R</span>
                    <span className="text-sm font-bold">RestoOS</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {['لوحة التحكم', 'الطلبات', 'المطبخ', 'القائمة', 'الزبائن', 'التقارير'].map((it, idx) => (
                      <div
                        key={it}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${idx === 0 ? 'bg-primary text-white' : 'text-white/55'}`}
                      >
                        {it}
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="flex-1 bg-muted/30 p-5 dark:bg-zinc-950/50">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">اليوم</span>
                    <span className="text-base font-bold text-foreground">نظرة عامة</span>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'إجمالي المبيعات', value: '45,500 دج', badge: '+12%', color: 'text-emerald-700 bg-emerald-50' },
                      { label: 'الطلبات اليوم', value: '127', badge: 'جديد', color: 'text-blue-700 bg-blue-50' },
                      { label: 'الزبائن', value: '89', badge: '+8', color: 'text-primary bg-primary/10' },
                      { label: 'التقييم', value: '4.9 ★', badge: 'ممتاز', color: 'text-amber-700 bg-amber-50' },
                    ].map((s, i) => (
                      <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + i * 0.1, duration: 0.5, ease }}
                        className="rounded-xl border border-border/70 bg-white p-3.5 shadow-sm dark:bg-zinc-900"
                      >
                        <p className="mb-1 text-[10px] text-muted-foreground">{s.label}</p>
                        <p className="text-lg font-extrabold text-foreground">{s.value}</p>
                        <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${s.color}`}>{s.badge}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-border/70 bg-white p-4 shadow-sm dark:bg-zinc-900">
                    <p className="mb-2.5 text-xs font-bold text-foreground">المبيعات الأسبوعية</p>
                    <svg viewBox="0 0 320 90" className="w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B9D6B" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#8B9D6B" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <motion.path
                        d="M0 70 C 40 60, 60 30, 100 38 S 170 10, 210 28 S 280 55, 320 22"
                        fill="none"
                        stroke="#8B9D6B"
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.6, ease, delay: 1.2 }}
                      />
                      <motion.path
                        d="M0 70 C 40 60, 60 30, 100 38 S 170 10, 210 28 S 280 55, 320 22 L 320 90 L 0 90 Z"
                        fill="url(#chartFill)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1.8, ease }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
