export default function SlugLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="animate-pulse">
        <div className="h-14 bg-muted/50" />
        <div className="px-4 pt-4">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-20 rounded-full bg-muted/50 shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl bg-muted/30 overflow-hidden">
                <div className="aspect-square bg-muted/50" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted/50 rounded w-3/4" />
                  <div className="h-3 bg-muted/30 rounded w-1/2" />
                  <div className="h-8 bg-muted/50 rounded-xl w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
