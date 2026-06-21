"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"

export default function KitchenError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Kitchen error:", error) }, [error])
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
        <div className="grid size-16 place-items-center rounded-2xl bg-destructive/10 mx-auto">
          <RefreshCw className="size-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Kitchen Display Error</h1>
        <p className="text-sm text-muted-foreground">Something went wrong with the kitchen display</p>
        <button onClick={reset} className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">Retry</button>
      </div>
    </div>
  )
}
