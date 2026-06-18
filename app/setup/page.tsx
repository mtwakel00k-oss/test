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
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Root Admin Setup</h1>
          <p className="text-muted-foreground text-sm mt-1">Create the initial owner account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {submitting ? "Setting up..." : "Create Root Admin"}
          </button>
        </form>
      </div>
    </div>
  )
}
