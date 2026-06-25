'use client'

import { motion } from 'framer-motion'

const sidebarItems = [
  { label: 'لوحة التحكم', active: true },
  { label: 'الطلبات', active: false },
  { label: 'المطبخ', active: false },
  { label: 'القائمة', active: false },
  { label: 'الزبائن', active: false },
  { label: 'التقارير', active: false },
]

const stats = [
  { label: 'إجمالي المبيعات', value: '45,500 دج', badge: '+12%', color: 'text-malachite bg-malachite/10' },
  { label: 'الطلبات اليوم', value: '127', badge: 'جديد', color: 'text-blue-600 bg-blue-50' },
  { label: 'الزبائن', value: '89', badge: '+8', color: 'text-primary bg-primary-bg' },
  { label: 'التقييم', value: '4.9 ★', badge: 'ممتاز', color: 'text-amber-600 bg-amber-50' },
]

export function DashboardMockup() {
  return (
    <div className="animate-float will-change-transform">
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl shadow-primary/20 ring-1 ring-black/5">
        {/* browser bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
          <span className="size-3 rounded-full bg-red-400" />
          <span className="size-3 rounded-full bg-amber-400" />
          <span className="size-3 rounded-full bg-malachite" />
          <div className="mx-auto hidden rounded-md bg-white px-10 py-1 text-[10px] text-muted-foreground sm:block">
            app.restoos.dz
          </div>
        </div>

        <div className="flex">
          {/* sidebar */}
          <aside className="hidden w-40 shrink-0 bg-[#1a1a2e] p-4 sm:block">
            <div className="mb-6 flex items-center gap-2 text-white">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold">R</span>
              <span className="text-sm font-bold">RestoOS</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {sidebarItems.map((it) => (
                <div
                  key={it.label}
                  className={`rounded-lg px-3 py-2 text-[11px] font-medium ${
                    it.active ? 'bg-primary text-white' : 'text-white/55'
                  }`}
                >
                  {it.label}
                </div>
              ))}
            </div>
          </aside>

          {/* main */}
          <div className="flex-1 bg-[#fafaff] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">نظرة عامة</span>
              <span className="rounded-md bg-primary-bg px-2 py-1 text-[10px] font-medium text-primary">
                اليوم
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                  className="rounded-xl border border-border/70 bg-white p-3 shadow-sm"
                >
                  <p className="mb-1 text-[9px] text-muted-foreground">{s.label}</p>
                  <p className="text-base font-extrabold text-foreground">{s.value}</p>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold ${s.color}`}>
                    {s.badge}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* chart */}
            <div className="mt-3 rounded-xl border border-border/70 bg-white p-3 shadow-sm">
              <p className="mb-2 text-[10px] font-bold text-foreground">المبيعات الأسبوعية</p>
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
                  transition={{ duration: 1.6, ease: [0.32, 0.72, 0, 1], delay: 0.9 }}
                />
                <motion.path
                  d="M0 70 C 40 60, 60 30, 100 38 S 170 10, 210 28 S 280 55, 320 22 L 320 90 L 0 90 Z"
                  fill="url(#chartFill)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.6, ease: [0.32, 0.72, 0, 1] }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
