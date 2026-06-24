'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

function TiltCard({
  children, className, border,
}: {
  children: React.ReactNode; className?: string; border?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [glow, setGlow] = useState({ x: 50, y: 50 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setGlow({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setGlow({ x: 50, y: 50 })}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 90, damping: 16 }}
      className={`group relative overflow-hidden rounded-3xl border bg-card/50 backdrop-blur-xl p-8 shadow-xl shadow-black/20 transition-all duration-500 hover:-translate-y-1 ${border || 'border-white/10'} ${className || ''}`}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(600px circle at ${glow.x}% ${glow.y}%, rgba(251,146,60,0.08), transparent 40%)` }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  )
}

export function Capabilities() {
  return (
    <section id="capabilities" className="relative overflow-hidden py-32 md:py-44" dir="rtl">
      <div className="pointer-events-none absolute -left-48 -top-48 size-[800px] rounded-full bg-amber-500/10 blur-[140px] animate-[float_14s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 size-[700px] rounded-full bg-orange-500/10 blur-[140px] animate-[float-slow_18s_ease-in-out_infinite]" />
      <style>{`@keyframes float{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(40px,-60px) scale(1.05)}50%{transform:translate(-20px,40px) scale(0.95)}75%{transform:translate(-50px,-30px) scale(1.02)}}@keyframes float-slow{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,50px) scale(1.03)}66%{transform:translate(-40px,-20px) scale(0.97)}}`}</style>

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.15] tracking-tight text-foreground">
              إمكانيات مصممة لأهل المطاعم
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              أدوات ذكية تمنحك تحكماً كاملاً وتكشف لك الخفايا المالية والمطبخية.
            </p>
          </motion.div>
        </div>

        <div className="relative mt-24 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* 1. Financial Audit & Revenue Leakage */}
          <TiltCard border="border-amber-500/20" className="md:col-span-2 md:row-span-1">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-amber-500/30 blur-xl" />
                  <div className="relative grid size-12 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg md:size-14">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-[0.15em] text-amber-400 uppercase">
                  الرقابة المالية
                </span>
              </div>
              <div>
                <h3 className="font-display text-2xl font-normal leading-snug text-foreground md:text-3xl">
                  الرقابة والتحصين المالي الصارم
                </h3>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                  سجل تدقيق (Audit Log) يتتبع كل تعديل في النظام مع هوية المستخدم والتوقيت.
                  كشف التسريبات المالية فور حدوثها، منع التعديلات غير المصرح بها، وإحصائيات دقيقة
                  للإيرادات والطلبات والمبيعات اليومية.
                </p>
              </div>
            </div>
          </TiltCard>

          {/* 2. KDS */}
          <TiltCard border="border-emerald-500/20">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-emerald-500/30 blur-lg" />
                <div className="relative grid size-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg md:size-12">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                </div>
              </div>
              <h3 className="font-display text-lg font-normal text-foreground md:text-xl">
                شاشة المطبخ الذكية (KDS)
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                الطلبات تصل للمطبخ فورياً عبر Supabase Realtime. توقيت حي مع ألوان ديناميكية:
                أقل من 12 دقيقة أخضر، 12-20 دقيقة برتقالي، أكثر من 20 دقيقة أحمر وامض.
                إمكانية تأشير الأصناف (Strike-through) وإرسال إشعارات صوتية للطلبات الجديدة.
              </p>
            </div>
          </TiltCard>

          {/* 3. Premium Analytics */}
          <TiltCard border="border-blue-500/20">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-blue-500/30 blur-lg" />
                <div className="relative grid size-10 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg md:size-12">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>
                </div>
              </div>
              <h3 className="font-display text-lg font-normal text-foreground md:text-xl">
                لوحة تحليلات النخبة
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                كشف المنتجات الراكدة (Dead Stock) التي لم تبع خلال الفترة المحددة.
                ترتيب السائقين حسب الإنجاز مع متوسط وقت التوصيل. ترتيب الكاشيرات.
                إنذار المطبخ (Kitchen Red Zone) للطلبات المتأخرة. مؤشر التسريبات المالية.
                رسم بياني لتصنيف الإلغاءات حسب نوع الطلب.
              </p>
            </div>
          </TiltCard>

          {/* 4. RBAC */}
          <TiltCard border="border-violet-500/20" className="md:col-span-2">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-xl" />
                <div className="relative grid size-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg md:size-14">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
              </div>
              <div>
                <h3 className="font-display text-xl font-normal text-foreground md:text-2xl">
                  عزل أمني تام ونظام صلاحيات
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                  الكاشير يرى فقط شاشة البيع. الطباخ يرى فقط شاشة المطبخ.
                  التقارير المالية والتحليلات المتقدمة محجوبة خلف وسيط (Middleware) للمالك فقط.
                  كل مطعم له قاعدة بيانات منفصلة مع RLS (Row Level Security) لعزل تام.
                  تسجيل دخول آمن بجلسات مشفرة لكل دور.
                </p>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  )
}
