"use client"

function SkeletonCard() {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/20 bg-card shadow-sm">
      <div className="aspect-[4/3] bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] " />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 rounded-full bg-muted/40 " />
        <div className="h-3 w-full rounded-full bg-muted/20 " />
        <div className="h-3 w-3/4 rounded-full bg-muted/20 " />
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-14 rounded-full bg-muted/30 " />
          <div className="h-8 w-14 rounded-full bg-muted/30 " />
        </div>
        <div className="h-12 w-full rounded-full bg-muted/30  mt-3" />
      </div>
    </div>
  )
}

export function MenuSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-[36rem] w-[36rem] rounded-full bg-primary/[0.035] blur-[140px]" />
        <div className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-accent/[0.04] blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 pb-36 pt-10 md:px-8 md:pt-14">
        <div className="mb-10 md:mb-14">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-10 rounded-full bg-muted/30 " />
            <div className="size-3.5 rounded-full bg-muted/30 " />
          </div>
          <div className="h-12 w-48 rounded-full bg-muted/30 " />
          <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-muted/20 " />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}
