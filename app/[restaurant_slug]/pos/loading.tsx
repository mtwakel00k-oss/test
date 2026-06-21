import { Skeleton } from "@/components/ui/skeleton"

export default function PosLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border/20">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl bg-muted/20 border border-border/5 overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-80 border-s border-border/20 p-4 space-y-3 hidden lg:block">
          <Skeleton className="h-6 w-28" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-muted/20" />
          ))}
        </div>
      </div>
    </div>
  )
}
