"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const router = useRouter()
  const [username, setUsername] = useState("root")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/auth/setup-root", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } })
      .then(r => r.json().then(d => ({ status: r.status, ...d })))
      .then(res => {
        if (res.status === 403 && res.error?.includes("already set up")) {
          router.replace("/login")
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/setup-root", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403 && data.error?.includes("already set up")) {
          router.replace("/login")
          return
        }
        setError(data.error || `Request failed (${res.status})`)
      } else {
        setSuccess(`Root admin created: ${data.email}. Redirecting to login...`)
        setTimeout(() => router.push("/login"), 2000)
      }
    } catch {
      setError("Network error — is the server running?")
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -start-32 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-32 -end-32 w-80 h-80 rounded-full bg-accent/[0.05] blur-3xl" />
      </div>
      <div className="w-full max-w-sm relative">
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight font-display">Root Admin Setup</h1>
            <p className="text-sm text-muted-foreground/70 mt-1.5">Create the initial owner account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-foreground text-sm placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-foreground text-sm placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/15 text-destructive text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-600 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:brightness-110 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : "Create Root Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
