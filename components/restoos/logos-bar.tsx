import { Badge } from '@/components/ui/badge'

const brands = ['مطعم الأصالة', 'بيتزا نوفا', 'برغر هاوس', 'كافيه دلال', 'مشاوي السلطان', 'سوشي بار']

export function LogosBar() {
  return (
    <section className="border-y border-border/50 bg-muted/30 py-14">
      <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
        يثق بنا مطاعم من كل مكان
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-20 pe-20">
          {[...brands, ...brands].map((b, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-2xl font-black tracking-tight text-muted-foreground/20 transition-colors duration-300 hover:text-primary/30"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
