import { Skeleton } from "@/components/ui/skeleton"

export default function KitchenLoading() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/5 p-5 space-y-3"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 flex-1 rounded-xl" />
              <Skeleton className="h-8 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
