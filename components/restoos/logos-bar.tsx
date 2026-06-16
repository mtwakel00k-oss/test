const brands = ['مطعم الأصالة', 'بيتزا نوفا', 'برغر هاوس', 'كافيه دلال', 'مشاوي السلطان', 'سوشي بار']

export function LogosBar() {
  return (
    <section className="border-y border-border bg-white py-12">
      <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
        يثق بنا مطاعم من كل مكان
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-16 pe-16">
          {[...brands, ...brands].map((b, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-xl font-extrabold text-muted-foreground/40 transition-colors hover:text-primary/60"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
