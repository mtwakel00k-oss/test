import { Skeleton } from "@/components/ui/skeleton"

export default function DriverLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl border border-border/5 p-4 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
