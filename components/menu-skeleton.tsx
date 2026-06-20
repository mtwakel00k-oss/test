"use client"

function SkeletonCard() {
  return (
    <div className="premium-bezel animate-pulse">
      <div className="premium-bezel-inner overflow-hidden">
        <div className="aspect-[4/3] bg-muted/40" />
        <div className="space-y-3 p-5">
          <div className="h-4 w-3/4 rounded-full bg-muted/50" />
          <div className="h-3 w-full rounded-full bg-muted/30" />
          <div className="h-10 rounded-full bg-muted/40" />
        </div>
      </div>
    </div>
  )
}

export function MenuSkeleton() {
  return (
    <div className="min-h-[100dvh] app-surface relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-[32rem] w-[32rem] rounded-full bg-primary/4 blur-[120px]" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/4 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 pb-32 pt-8 md:px-6">
        <div className="mb-10">
          <div className="animate-hero-enter">
            <span className="section-eyebrow mb-4">Menu</span>
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-normal tracking-tight text-foreground">القائمة</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-md">اختر وجبتك المفضلة من قائمتنا المتنوعة</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}
