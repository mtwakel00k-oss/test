"use client"

import { useEffect, useState, useCallback, startTransition } from "react"
import { Loader2, Plus } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"
import { logger } from "@/lib/logger"
import { toast } from "@/hooks/use-toast"

interface Tenant {
  id: string
  slug: string
  name: string
  plan_type: string | null
  is_active: boolean
  created_at: string
}

const PLANS = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Elite" },
]

function PlanBadge({ plan }: { plan: string | null }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
  switch (plan) {
    case "starter":
      return <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>Starter</span>
    case "pro":
      return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`}>Pro</span>
    case "elite":
      return <span className={`${base} bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300`}>Elite</span>
    default:
      return <span className={`${base} bg-muted text-muted-foreground`}>—</span>
  }
}


export function PlanManager() {
  const { t, lang } = useTranslation()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState("")
  const [addSlug, setAddSlug] = useState("")
  const [addPlan, setAddPlan] = useState("starter")
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)

  const fetchTenants = useCallback(async () => {
    startTransition(() => { setLoading(true); setError(null) })
    try {
      const res = await fetchApi("/api/admin/plans")
      if (!res.ok) {
        startTransition(() => { setError("Failed to load tenants"); setTenants([]) })
        return
      }
      const data = await res.json()
      startTransition(() => setTenants(data.tenants || []))
    } catch (e) {
      logger.error("Failed to fetch tenants", e)
      startTransition(() => { setError("Network error"); setTenants([]) })
    } finally {
      startTransition(() => setLoading(false))
    }
  }, [])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  const handleToggleActive = useCallback(async (slug: string, current: boolean) => {
    setUpdating((prev) => ({ ...prev, [slug]: true }))
    try {
      const res = await fetchApi("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, is_active: !current }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        logger.error("Failed to toggle active", data.error)
      } else {
        setTenants((prev) =>
          prev.map((t) => (t.slug === slug ? { ...t, is_active: !current } : t))
        )
      }
    } catch (e) {
      logger.error("Failed to toggle active", e)
    } finally {
      setUpdating((prev) => ({ ...prev, [slug]: false }))
    }
  }, [])

  const handlePlanChange = useCallback(async (slug: string, planType: string) => {
    setUpdating((prev) => ({ ...prev, [slug]: true }))
    try {
      const res = await fetchApi("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, plan_type: planType }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error || "Failed to update plan"
        logger.error("Failed to update plan", msg)
        toast({ title: msg, variant: "destructive" })
      } else {
        setTenants((prev) =>
          prev.map((t) => (t.slug === slug ? { ...t, plan_type: planType } : t))
        )
        toast({ title: `✅ Plan changed to ${planType}` })
        logger.info("Plan updated", { slug, planType })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update plan"
      logger.error("Failed to update plan", e)
      toast({ title: msg, variant: "destructive" })
    } finally {
      setUpdating((prev) => ({ ...prev, [slug]: false }))
    }
  }, [])

  const handleAdd = async () => {
    if (!addName.trim() || !addSlug.trim()) return
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(null)
    try {
      const res = await fetchApi("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), slug: addSlug.trim(), plan_type: addPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error || "Failed to create restaurant")
        return
      }
      setAddSuccess(`✅ ${data.tenant.name} – admin: ${data.adminEmail} / ${data.adminPassword}`)
      setAddName("")
      setAddSlug("")
      setAddPlan("starter")
      fetchTenants()
    } catch {
      setAddError("Network error")
    } finally {
      setAddLoading(false)
    }
  }

  const dir = lang === "ar" ? "rtl" : "ltr"

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-foreground tracking-tight">{t("admin.plans") || "Subscription Plans"}</CardTitle>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{t("admin.plansSub") || "Manage tenant subscription plans"}</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus className="size-4 ms-2" />
                {t("admin.addTenant") || "Add Restaurant"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader>
                <DialogTitle>{t("admin.addTenant") || "New Restaurant"}</DialogTitle>
                <DialogDescription>
                  {t("admin.addTenantSub") || "Create a new restaurant with users and subscription plan"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t("admin.tenantName") || "Restaurant Name"}
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="مثلاً: مطعم السلام"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t("admin.slug") || "Slug"}
                  </label>
                  <input
                    type="text"
                    value={addSlug}
                    onChange={(e) => setAddSlug(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="مثلاً: al-salam"
                  />
                  <p className="text-xs text-muted-foreground mt-1">يستخدم في الرابط: /{addSlug || "..."}/menu</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t("admin.currentPlan") || "Plan"}
                  </label>
                  <Select
                    value={addPlan}
                    onChange={setAddPlan}
                    options={PLANS}
                    className="w-full border-orange-200 focus:border-orange-400 dark:border-orange-800"
                  />
                </div>
                {addError && <p className="text-sm text-destructive">{addError}</p>}
                {addSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap">{addSuccess}</p>}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addLoading}>
                  {t("common.cancel") || "Cancel"}
                </Button>
                <Button onClick={handleAdd} disabled={addLoading || !addName.trim() || !addSlug.trim()}>
                  {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {addLoading ? (t("common.processing") || "Creating...") : (t("admin.createTenant") || "Create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("admin.noTenants") || "No tenants found"}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-border/50 shadow-inner bg-muted/10" dir={dir}>
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-start">
                    {t("admin.tenantName") || "Restaurant"}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-start hidden sm:table-cell">
                    {t("admin.slug") || "Slug"}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-start">
                    {t("admin.currentPlan") || "Plan"}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-start hidden md:table-cell">
                    {t("admin.status") || "Status"}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-start">
                    {t("admin.changePlan") || "Change"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-transparent">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="group hover:bg-primary/[0.02] transition-all duration-300">
                    <td className="px-8 py-6 text-sm font-black text-foreground tracking-tight">{tenant.name}</td>
                    <td className="px-8 py-6 text-muted-foreground hidden sm:table-cell">
                      <code className="rounded-xl bg-muted/50 border border-border/50 px-3 py-1 text-[10px] font-bold">{tenant.slug}</code>
                    </td>
                    <td className="px-8 py-6">
                      <PlanBadge plan={tenant.plan_type} />
                    </td>
                    <td className="px-8 py-6 hidden md:table-cell">
                      <button
                        onClick={() => handleToggleActive(tenant.slug, tenant.is_active)}
                        disabled={updating[tenant.slug]}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                          tenant.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20"
                        }`}
                      >
                        {updating[tenant.slug] ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <span className={`size-1.5 rounded-full ${tenant.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                        )}
                        {tenant.is_active
                          ? t("admin.active") || "Active"
                          : t("admin.inactive") || "Inactive"}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      {updating[tenant.slug] ? (
                        <Loader2 className="size-5 animate-spin text-primary" />
                      ) : (
                        <Select
                          value={tenant.plan_type || ""}
                          onChange={(val) => handlePlanChange(tenant.slug, val)}
                          options={PLANS}
                          className="w-32 h-10 rounded-xl border-border/50 bg-background/50 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
