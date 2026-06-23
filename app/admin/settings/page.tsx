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
  const [dbHealth, setDbHealth] = useState<{ tables: { name: string; existing_columns: string[]; missing_columns: string[]; status: string }[]; migration_sql: string | null } | null>(null)
  const [dbLoading, setDbLoading] = useState(true)
  const [showSql, setShowSql] = useState(false)

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

  useEffect(() => {
    fetch("/api/health/db-schema").then(r => r.ok ? r.json() : null).then(data => {
      setDbHealth(data)
    }).catch(() => {}).finally(() => setDbLoading(false))
  }, [])

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
          <h1 className="text-lg font-bold tracking-tight font-display">Global Settings</h1>
          <p className="text-sm text-muted-foreground">System-wide configuration</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-6 space-y-5">
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

      {dbHealth && (
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <h3 className="font-medium text-sm">Database Health</h3>
              <p className="text-xs text-muted-foreground">Last checked on mount</p>
            </div>
          </div>
          {dbLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Checking schema...</div>
          ) : (
            <>
              <div className="divide-y divide-border/30">
                {dbHealth.tables.map(table => (
                  <div key={table.name} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${table.status === "ok" ? "bg-success" : table.status === "missing" ? "bg-destructive" : "bg-warning"}`} />
                      <span className="text-sm font-medium text-foreground">{table.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{table.existing_columns.length} columns</span>
                      {table.missing_columns.length > 0 ? (
                        <span className="text-destructive font-semibold">{table.missing_columns.length} missing</span>
                      ) : (
                        <span className="text-success font-semibold">OK</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {dbHealth.migration_sql && (
                <div className="pt-2">
                  <button onClick={() => setShowSql(!showSql)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors">
                    {showSql ? "Hide Migration SQL" : "View Migration SQL"}
                  </button>
                  {showSql && (
                    <pre className="mt-3 p-4 rounded-xl bg-muted/50 border border-border/50 text-[11px] font-mono text-foreground/80 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre">{dbHealth.migration_sql}</pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

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
