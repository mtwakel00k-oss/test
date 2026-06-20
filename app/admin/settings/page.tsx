"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Settings, Save, RefreshCw } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || data.role !== "owner") router.push("/login")
      else {
        setReady(true)
        fetch("/api/admin/settings").then(r => r.ok ? r.json() : null).then(cfg => {
          if (cfg) {
            setMaintenanceMode(cfg.maintenance_mode ?? false)
            setWebhookUrl(cfg.master_webhook_url ?? "")
          }
        }).catch(() => {})
      }
    }).catch(() => router.push("/login"))
  }, [router])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance_mode: maintenanceMode, master_webhook_url: webhookUrl }),
      })
      if (res.ok) setMessage("Settings saved")
      else setMessage("Failed to save settings")
    } catch {
      setMessage("Network error")
    } finally {
      setSaving(false)
    }
  }, [maintenanceMode, webhookUrl])

  if (!ready) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Global Settings</h1>
          <p className="text-sm text-muted-foreground">System-wide configuration</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-5">
        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground">Block all tenant logins and customer orders</p>
          </div>
          <button
            onClick={() => setMaintenanceMode(v => !v)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${maintenanceMode ? "bg-rose-500" : "bg-muted"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${maintenanceMode ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
          </button>
        </label>

        <div>
          <label className="block font-medium text-sm mb-1.5">Master Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.example.com/events"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50"
          />
          <p className="text-xs text-muted-foreground mt-1">Receives system-wide events (tenant created, plan changed, etc.)</p>
        </div>
      </div>

      {message && (
        <div className="text-sm px-4 py-2 rounded-xl bg-muted border border-border/40">{message}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
      >
        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}
