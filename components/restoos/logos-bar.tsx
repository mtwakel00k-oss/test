const brands = ['مطعم الأصالة', 'بيتزا نوفا', 'برغر هاوس', 'كافيه دلال', 'مشاوي السلطان', 'سوشي بار']

export function LogosBar() {
  return (
    <section className="border-y border-border/40 py-16 md:py-20">
      <p className="mb-10 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        يثق بنا مطاعم من كل مكان
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-16 pe-16 md:gap-24">
          {[...brands, ...brands].map((b, i) => (
            <span
              key={i}
              className="whitespace-nowrap font-display text-2xl tracking-tight text-muted-foreground/25 transition-colors duration-500 hover:text-primary/35 md:text-3xl"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
