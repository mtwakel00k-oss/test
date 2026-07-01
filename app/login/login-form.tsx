"use client"

import { useState } from "react"
import { Home, User, Lock, Eye, EyeOff, Loader2, Receipt, ChefHat, Shield, Crown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type PageRole = "cashier" | "chef" | "admin" | "owner"

const ROLE_PAGE: Record<string, string> = { cashier: "pos", chef: "kitchen", admin: "admin", owner: "admin" }

const ROLE_CONFIG: Record<PageRole, { label: string; icon: React.ReactNode }> = {
  cashier: { label: "Cashier", icon: <Receipt className="size-3.5" strokeWidth={2} /> },
  chef:    { label: "Chef",    icon: <ChefHat className="size-3.5" strokeWidth={2} /> },
  admin:   { label: "Admin",   icon: <Shield className="size-3.5" strokeWidth={2} /> },
  owner:   { label: "Owner",   icon: <Crown className="size-3.5" strokeWidth={2} /> },
}

export default function LoginForm({ redirect: redirectProp, slug: slugProp, tenants }: { redirect?: string; slug?: string; tenants?: { slug: string; name: string }[] }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState<PageRole>(slugProp ? "cashier" : "admin")
  const [selectedSlug, setSelectedSlug] = useState(slugProp || "")

  const visibleRoles: PageRole[] = slugProp ? ["cashier", "chef", "admin"] : ["admin", "owner"]
  const needsSlug = !slugProp && page !== "owner" && !selectedSlug

  const handleLogin = async () => {
    if (!username || !password) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: page, slug: selectedSlug || slugProp }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(res.status === 429 ? "طلبات كثيرة جداً. حاول بعد شوي" : (data.error || "فشل تسجيل الدخول"))
        setLoading(false)
        return
      }
      localStorage.setItem("sessionExpiresAt", String(Date.now() + 7 * 24 * 60 * 60 * 1000))
      if (page === "owner") { window.location.href = "/admin"; return }
      if (redirectProp && (redirectProp.startsWith("/") || redirectProp.startsWith(window.location.origin))) { window.location.href = redirectProp; return }
      const targetSlug = data.slug || selectedSlug || slugProp
      if (targetSlug) window.location.href = `/${targetSlug}/${ROLE_PAGE[page]}`
    } catch {
      setError("تعذر الاتصال بالخادم")
    } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#022509" }}>
      {/* Dot grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: "radial-gradient(rgba(37,233,112,0.08) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Centered card */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "#0a150f",
            border: "1px solid rgba(0,100,0,0.25)",
            boxShadow: "0 0 40px rgba(37,233,112,0.06), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className="grid size-14 place-items-center rounded-2xl mb-4"
              style={{ backgroundColor: "rgba(37,233,112,0.1)" }}
            >
              <Home className="size-7" style={{ color: "#25E970" }} strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">RestoOS</h1>
            <p className="mt-1 text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Log in to the system</p>
          </div>

          {/* Not logged in — role picker + form */}
          <>
            {/* Role tabs */}
            <div className="flex gap-1 rounded-xl p-1 mb-5" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,100,0,0.2)" }}>
              {visibleRoles.map(key => (
                <button
                  key={key}
                  data-testid={`role-tab-${key}`}
                  onClick={() => { setPage(key); setError(""); if (key === "owner") setSelectedSlug("") }}
                  className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: page === key ? "rgba(37,233,112,0.08)" : "transparent",
                    color: page === key ? "#25E970" : "rgba(255,255,255,0.25)",
                  }}
                >
                  {ROLE_CONFIG[key].icon}
                  {ROLE_CONFIG[key].label}
                </button>
              ))}
            </div>

            {/* Tenant picker */}
            {page !== "owner" && !slugProp && tenants && tenants.length > 0 && (
              <div className="mb-4">
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-sm appearance-none cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "transparent",
                    color: selectedSlug ? "white" : "rgba(255,255,255,0.3)",
                    border: "1px solid rgba(0,100,0,0.35)",
                  }}
                >
                  <option value="" disabled style={{ backgroundColor: "#0a150f", color: "rgba(255,255,255,0.3)" }}>Select a restaurant</option>
                  {tenants.map(tn => (
                    <option key={tn.slug} value={tn.slug} style={{ backgroundColor: "#0a150f", color: "white" }}>{tn.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4">
              {/* Username */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.25)" }} strokeWidth={1.5} />
                  <input
                    data-testid="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Username or Email"
                    className="w-full rounded-lg px-10 py-3 text-sm text-white outline-none transition-colors placeholder:font-medium"
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid rgba(0,100,0,0.35)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#25E970"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(0,100,0,0.35)"}
                  autoFocus
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.25)" }} strokeWidth={1.5} />
                  <input
                    data-testid="password-input"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Password"
                    className="w-full rounded-lg px-10 py-3 text-sm text-white outline-none transition-colors placeholder:font-medium"
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid rgba(0,100,0,0.35)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#25E970"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(0,100,0,0.35)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-center text-xs font-medium"
                    style={{ color: "#ef4444" }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Log in button */}
              <button
                data-testid="login-submit"
                onClick={handleLogin}
                disabled={loading || !username || !password || (needsSlug && !slugProp)}
                className="w-full rounded-lg py-3 text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#25E970",
                  color: "#022509",
                  boxShadow: "0 0 15px rgba(37,233,112,0.3)",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 0 25px rgba(37,233,112,0.45)" }}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 0 15px rgba(37,233,112,0.3)" }
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                    Logging in…
                  </span>
                ) : "Log in"}
              </button>
            </div>
          </>
        </div>
      </motion.div>

      {/* Footer */}
      <p className="fixed bottom-6 text-[10px] font-medium tracking-wider" style={{ color: "rgba(255,255,255,0.1)" }}>
        RestoOS — Smart POS System
      </p>
    </div>
  )
}
