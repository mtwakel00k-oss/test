import { Skeleton } from "@/components/ui/skeleton"

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <header className="flex items-center justify-between py-4">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/5 p-4"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
