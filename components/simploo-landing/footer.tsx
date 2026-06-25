import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { Phone, Mail } from 'lucide-react'

const columns = [
  {
    title: 'المنتج',
    links: [
      { label: 'الإمكانيات', href: '#capabilities' },
      { label: 'التسعير', href: '#pricing' },
      { label: 'الأسئلة الشائعة', href: '#faq' },
    ],
  },
  {
    title: 'الشركة',
    links: [
      { label: 'من نحن', href: '#' },
      { label: 'المدونة', href: '#' },
      { label: 'وظائف', href: '#' },
      { label: 'الشركاء', href: '#' },
    ],
  },
  {
    title: 'الدعم',
    links: [
      { label: 'مركز المساعدة', href: '#' },
      { label: 'التوثيق', href: '#' },
      { label: 'حالة النظام', href: '#' },
      { label: 'تواصل معنا', href: '#cta' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-card/50" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-malachite to-forest text-white shadow-lg shadow-malachite/30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
                  <path d="M5 2v20" />
                  <path d="M9 2v20" />
                  <path d="M18 2a3 3 0 0 0-3 3v6h3" />
                  <path d="M18 11v11" />
                </svg>
              </span>
              <span className="font-display text-xl tracking-tight text-foreground">
                Simploo
              </span>
            </Link>
            <p className="mt-5 max-w-xs leading-relaxed text-muted-foreground">
              النظام السحابي المتكامل لإدارة مطاعمك. كاشير، مطبخ، تحليلات مالية، تتبع توصيل، ومراقبة أداء.
            </p>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h4 className="mb-5 text-sm font-semibold text-foreground">{c.title}</h4>
              <ul className="flex flex-col gap-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground transition-colors duration-300 hover:text-malachite">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-5 text-sm font-semibold text-foreground">اتصل بنا</h4>
            <ul className="flex flex-col gap-4">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="grid size-9 place-items-center rounded-full bg-malachite/8 text-malachite">
                  <Phone size={14} strokeWidth={1.5} />
                </div>
                <span dir="ltr">+213 555 00 00 00</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="grid size-9 place-items-center rounded-full bg-malachite/8 text-malachite">
                  <Mail size={14} strokeWidth={1.5} />
                </div>
                <span>contact@simploo.dz</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-10 opacity-30" />
        <div className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Simploo &mdash; جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  )
}
