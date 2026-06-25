'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'هل يحتاج النظام أجهزة خاصة؟',
    a: 'لا على الإطلاق. Simploo يعمل على أي جهاز لوحي أو كمبيوتر موجود لديك — متصفح إنترنت حديث فقط. لا حاجة لشراء أجهزة باهظة الثمن. حتى الطابعة الحرارية للإيصالات اختيارية وتعمل مع معظم الموديلات الشائعة.',
  },
  {
    q: 'هل بيانات مطعمي معزولة عن المطاعم الأخرى؟',
    a: 'نعم. كل مطعم يحصل على قاعدة بيانات منفصلة في Supabase مع RLS (Row Level Security). حتى المالك لا يمكنه الاطلاع على بيانات مطعم آخر بدون صلاحية. عزل تام للبيانات يضمن الخصوصية المطلقة.',
  },
  {
    q: 'كيف تعمل المزامنة بين الكاشير والمطبخ؟',
    a: 'بمجرد إرسال الطلب من الكاشير، يظهر مباشرة على شاشة المطبخ (KDS) خلال أجزاء من الثانية عبر تقنية Supabase Realtime. الطاهي يضغط "بدأ التحضير" و "تجهيز" وتنعكس الحالة فوراً. لا ورق، لا أخطاء في التواصل.',
  },
  {
    q: 'هل يوجد تتبع مباشر للتوصيل؟',
    a: 'نعم. عند إرسال طلب توصيل، يمكن تعيين سائق. السائق يستلم رابطاً خاصاً لمتابعة الطلبات المعينة له، مع مشاركة الموقع الحي (GPS) كل 10 ثوانٍ. الزبون يمكنه تتبع الطلب في الوقت الفعلي عبر صفحة التتبع.',
  },
  {
    q: 'ماذا عن صلاحيات الموظفين؟',
    a: 'الكاشير يرى فقط شاشة البيع ولا يمكنه تعديل الأسعار أو عرض التقارير. الطباخ يرى فقط شاشة المطبخ. المدير يرى لوحة التحكم الكاملة. المالك لديه صلاحية الوصول لجميع الفروع (للمجموعات). الأدوار محمية بجلسات مشفرة ووسيط (Middleware) على الخادم.',
  },
  {
    q: 'هل يمكنني تجربة النظام مجاناً؟',
    a: 'بالتأكيد. الباقة العادية مجانية تماماً بدون حدود زمنية. جرب الكاشير، المطبخ، لوحة التحكم، وإدارة المنتجات. عندما تحتاج التحليلات المتقدمة وكشف التسريبات، يمكنك الترقية إلى باقة البرو.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="relative py-32 md:py-44" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-malachite to-forest" />
            <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-tight text-foreground">
              الأسئلة الشائعة
            </h2>
          </motion.div>
        </div>

        <div className="mt-12 flex flex-col gap-3">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-card/50 transition-all duration-500">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-foreground">{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-malachite/8 text-malachite"
                  >
                    <ChevronDown size={16} strokeWidth={2} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="px-6 pb-6 leading-relaxed text-muted-foreground">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
