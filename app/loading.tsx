import { Skeleton } from "@/components/ui/skeleton"

export default function RootLoading() {
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
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
