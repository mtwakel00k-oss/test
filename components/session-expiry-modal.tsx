"use client"

import { useEffect, useState, useRef } from "react"
import { logger } from "@/lib/logger"

export function SessionExpiryModal() {
  const [show, setShow] = useState(false)
  const [extending, setExtending] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function check() {
      const raw = localStorage.getItem("sessionExpiresAt")
      if (!raw) return
      const expiresAt = Number(raw)
      if (isNaN(expiresAt)) return
      const oneMinMs = 60_000
      const remaining = expiresAt - Date.now()
      if (remaining > 0 && remaining <= oneMinMs) {
        setShow(true)
      }
    }

    check()
    intervalRef.current = setInterval(check, 10_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const extend = async () => {
    setExtending(true)
    try {
      const res = await fetch("/api/auth/extend-session", { method: "POST" })
      if (res.ok) {
        localStorage.setItem("sessionExpiresAt", String(Date.now() + 7 * 24 * 60 * 60 * 1000))
        setShow(false)
      }
    } catch (e) {
      logger.error("Failed to extend session", e)
    } finally {
      setExtending(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="text-4xl mb-4">⏰</div>
        <h2 className="text-lg font-bold text-foreground mb-2">Your session is about to expire</h2>
        <p className="text-sm text-muted-foreground mb-6">Click below to extend your session for another 7 days.</p>
        <button
          onClick={extend}
          disabled={extending}
          className="w-full rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {extending ? "Extending..." : "Extend Session"}
        </button>
      </div>
    </div>
  )
}
