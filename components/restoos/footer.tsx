import { Logo } from './logo'
import { Separator } from '@/components/ui/separator'
import { Github, Twitter, Linkedin, Facebook, Mail, Phone } from 'lucide-react'

const columns = [
  { 
    title: 'المنتج', 
    links: [
      { label: 'الميزات', href: '#features' },
      { label: 'كيف يعمل', href: '#how' },
      { label: 'التسعير', href: '#pricing' },
      { label: 'الأسئلة الشائعة', href: '#faq' }
    ] 
  },
  { 
    title: 'الشركة', 
    links: [
      { label: 'من نحن', href: '#' },
      { label: 'المدونة', href: '#' },
      { label: 'الوظائف', href: '#' },
      { label: 'الشركاء', href: '#' }
    ] 
  },
  { 
    title: 'الدعم', 
    links: [
      { label: 'مركز المساعدة', href: '#' },
      { label: 'التوثيق', href: '#' },
      { label: 'حالة النظام', href: '#' },
      { label: 'تواصل معنا', href: '#cta' }
    ] 
  },
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
            <div className="mt-6 flex gap-3">
              {[
                { icon: Facebook, label: 'فيسبوك' },
                { icon: Twitter, label: 'تويتر' },
                { icon: Linkedin, label: 'لينكد إن' },
                { icon: Github, label: 'جيت هاب' }
              ].map((s, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={s.label}
                  className="grid size-10 place-items-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:-translate-y-1"
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h4 className="mb-5 font-bold text-foreground">{c.title}</h4>
              <ul className="flex flex-col gap-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-5 font-bold text-foreground">اتصل بنا</h4>
            <ul className="flex flex-col gap-4">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Phone size={14} />
                </div>
                <span dir="ltr">+213 555 00 00 00</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Mail size={14} />
                </div>
                <span>contact@restoos.dz</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />
        <div className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RestoOS — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  )
}