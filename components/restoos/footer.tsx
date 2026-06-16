import { Logo } from './logo'

const columns = [
  { title: 'المنتج', links: ['الميزات', 'التسعير', 'شاشة المطبخ', 'نقطة البيع'] },
  { title: 'الشركة', links: ['من نحن', 'المدونة', 'الوظائف', 'الشركاء'] },
  { title: 'الدعم', links: ['مركز المساعدة', 'التوثيق', 'حالة النظام', 'تواصل معنا'] },
  { title: 'القانوني', links: ['الخصوصية', 'الشروط', 'ملفات الكوكيز'] },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs leading-relaxed text-muted-foreground">
              نظام نقاط البيع الذكي والمتكامل لإدارة مطعمك من مكان واحد.
            </p>
            <div className="mt-5 flex gap-3">
              {['f', 'in', 'x'].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={`رابط ${s}`}
                  className="grid size-9 place-items-center rounded-full border border-border text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h4 className="mb-4 font-bold text-foreground">{c.title}</h4>
              <ul className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © 2026 RestoOS — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  )
}
