import { Skeleton } from "@/components/ui/skeleton"

export default function SlugLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-2xl" />
            <Skeleton className="h-9 w-9 rounded-2xl" />
          </div>
        </div>
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/5 overflow-hidden"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="aspect-square">
                <Skeleton className="h-full w-full rounded-none border-0" />
              </div>
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
