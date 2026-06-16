"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error("Fatal error:", error)

  return (
    <html>
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">💥</div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">A critical error occurred. Please reload.</p>
          <button onClick={() => reset()}
            className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90">
            Reload Page
          </button>
        </div>
      </body>
    </html>
  )
}
