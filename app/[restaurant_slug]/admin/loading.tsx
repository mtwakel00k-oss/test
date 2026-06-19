import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/5 p-5 space-y-3"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/5 p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/5 p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3" style={{ animationDelay: `${i * 0.04}s` }}>
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
