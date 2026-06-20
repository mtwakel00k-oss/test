'use client'

import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  return (
    <section className="relative min-h-[90dvh] overflow-hidden pt-36 md:pt-48">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 right-1/4 h-[520px] w-[520px] rounded-full bg-primary/8 blur-[140px]" />
        <div className="absolute top-1/3 left-0 h-[400px] w-[400px] rounded-full bg-accent/6 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-primary/4 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease, delay: 0.1 }}
            className="relative lg:col-span-6"
          >
            <h1 className="font-display text-[clamp(2.8rem,6vw,5rem)] font-normal leading-[1.05] tracking-tight text-foreground">
              نظام نقاط البيع
              <span className="relative mx-2 inline-block h-[1.1em] w-[1.4em] overflow-hidden rounded-full align-middle">
                <span
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: 'url(https://picsum.photos/seed/resto-hero/200/200)' }}
                />
              </span>
              الذكي للمطاعم
            </h1>

            <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">
              منصة سحابية متعددة المستأجرين تدير طلبات مطعمك، مطبخك، وتقاريرك من مكان واحد. حل رقمي متكامل للمطاعم والسلسلات.
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-4">
              <a
                href="#cta"
                className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-[var(--shadow-lg)] transition-all duration-500 hover:shadow-[var(--shadow-xl)] active:scale-[0.98]"
              >
                تواصل معنا
                <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-0.5">
                  <svg className="size-3.5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </a>
              <a
                href="#features"
                className="group inline-flex items-center gap-3 rounded-full border border-border/60 bg-background px-7 py-3.5 text-base font-semibold text-foreground transition-all duration-500 hover:border-primary/25 active:scale-[0.98]"
              >
                <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </span>
                شاهد العرض
              </a>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-12 flex items-center gap-4"
            >
              <div className="flex -space-x-2.5 space-x-reverse">
                {[
                  { bg: 'from-amber-500 to-orange-600', label: 'م' },
                  { bg: 'from-sky-500 to-blue-600', label: 'ك' },
                  { bg: 'from-emerald-500 to-teal-600', label: 'ف' },
                ].map((a) => (
                  <span
                    key={a.label}
                    className="grid size-10 place-items-center rounded-full border-2 border-background bg-gradient-to-br text-sm font-bold text-white shadow-md"
                    style={{ backgroundImage: `linear-gradient(135deg, ${a.bg.split(' ')[0].replace('from-', '')}, ${a.bg.split(' ')[1].replace('to-', '')})` }}
                  >
                    {a.label}
                  </span>
                ))}
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">+200 مطعم</span>
                <span className="text-muted-foreground"> يثقون بنا</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease, delay: 0.25 }}
            className="relative lg:col-span-6"
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-b from-primary/10 via-accent/5 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl shadow-primary/10 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/5">
                <div className="flex items-center gap-2 border-b border-border/40 bg-muted/40 px-4 py-3">
                  <span className="size-3 rounded-full bg-red-400" />
                  <span className="size-3 rounded-full bg-amber-400" />
                  <span className="size-3 rounded-full bg-emerald-400" />
                  <div className="mx-auto rounded-md bg-background px-8 py-1 text-[10px] text-muted-foreground">
                    app.restoos.dz
                  </div>
                </div>

                <div className="flex">
                  <aside className="hidden w-40 shrink-0 bg-zinc-950 p-4 sm:block">
                    <div className="mb-6 flex items-center gap-2 text-white">
                      <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold">R</span>
                      <span className="text-sm font-bold">RestoOS</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {['لوحة التحكم', 'الطلبات', 'المطبخ', 'القائمة', 'الزبائن', 'التقارير'].map((it, idx) => (
                        <div
                          key={it}
                          className={`rounded-lg px-3 py-2 text-[11px] font-medium ${idx === 0 ? 'bg-primary text-white' : 'text-white/55'}`}
                        >
                          {it}
                        </div>
                      ))}
                    </div>
                  </aside>

                  <div className="flex-1 bg-[#fafaff] p-4 dark:bg-zinc-950/50">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">نظرة عامة</span>
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">اليوم</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
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
                          className="rounded-xl border border-border/70 bg-white p-3 shadow-sm dark:bg-zinc-900"
                        >
                          <p className="mb-1 text-[9px] text-muted-foreground">{s.label}</p>
                          <p className="text-base font-extrabold text-foreground">{s.value}</p>
                          <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold ${s.color}`}>{s.badge}</span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl border border-border/70 bg-white p-3 shadow-sm dark:bg-zinc-900">
                      <p className="mb-2 text-[10px] font-bold text-foreground">المبيعات الأسبوعية</p>
                      <svg viewBox="0 0 320 90" className="w-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C76B37" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#C76B37" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M0 70 C 40 60, 60 30, 100 38 S 170 10, 210 28 S 280 55, 320 22"
                          fill="none"
                          stroke="#C76B37"
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
      </div>
    </section>
  )
}
