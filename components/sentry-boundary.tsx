"use client"

import { Component, type ReactNode } from "react"

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export class SentryBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    try {
      const w = typeof window !== "undefined" ? window as unknown as Record<string, unknown> : null
      if (w?.__SENTRY__) {
        const s = w.__SENTRY__ as { captureException?: (e: Error) => void }
        s.captureException?.(error)
      }
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-[40vh] items-center justify-center p-8 text-center" role="alert">
          <div>
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">Please refresh the page to try again.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
