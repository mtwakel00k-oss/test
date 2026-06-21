import { Skeleton } from "@/components/ui/skeleton"

export default function OrderTrackingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="space-y-3 text-center">
          <Skeleton className="h-5 w-1/3 mx-auto rounded-lg" />
          <Skeleton className="h-7 w-1/2 mx-auto rounded-xl" />
          <Skeleton className="h-4 w-1/4 mx-auto" />
        </div>
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </main>
    </div>
  )
}
