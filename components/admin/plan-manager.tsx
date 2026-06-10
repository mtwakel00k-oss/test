"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, CheckCircle2, XCircle, Plus } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
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

function StatusIcon({ active }: { active: boolean }) {
  if (active) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  return <XCircle className="h-4 w-4 text-destructive" />
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
    setLoading(true)
    setError(null)
    try {
      const res = await fetchApi("/api/admin/plans")
      if (!res.ok) {
        setError("Failed to load tenants")
        setTenants([])
        return
      }
      const data = await res.json()
      setTenants(data.tenants || [])
    } catch (e) {
      logger.error("Failed to fetch tenants", e)
      setError("Network error")
      setTenants([])
    } finally {
      setLoading(false)
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
    } catch (e) {
      setAddError("Network error")
    } finally {
      setAddLoading(false)
    }
  }

  const dir = lang === "ar" ? "rtl" : "ltr"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("admin.plans") || "Subscription Plans"}</CardTitle>
            <CardDescription>{t("admin.plansSub") || "Manage tenant subscription plans"}</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
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
          <div className="overflow-x-auto" dir={dir}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start pb-3 font-medium text-muted-foreground">
                    {t("admin.tenantName") || "Restaurant"}
                  </th>
                  <th className="text-start pb-3 font-medium text-muted-foreground hidden sm:table-cell">
                    {t("admin.slug") || "Slug"}
                  </th>
                  <th className="text-start pb-3 font-medium text-muted-foreground">
                    {t("admin.currentPlan") || "Plan"}
                  </th>
                  <th className="text-start pb-3 font-medium text-muted-foreground hidden md:table-cell">
                    {t("admin.status") || "Status"}
                  </th>
                  <th className="text-start pb-3 font-medium text-muted-foreground">
                    {t("admin.changePlan") || "Change"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 text-foreground font-medium">{tenant.name}</td>
                    <td className="py-3 text-muted-foreground hidden sm:table-cell">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tenant.slug}</code>
                    </td>
                    <td className="py-3">
                      <PlanBadge plan={tenant.plan_type} />
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <button
                        onClick={() => handleToggleActive(tenant.slug, tenant.is_active)}
                        disabled={updating[tenant.slug]}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          tenant.is_active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {updating[tenant.slug] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className={`h-2 w-2 rounded-full ${tenant.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                        )}
                        {tenant.is_active
                          ? t("admin.active") || "Active"
                          : t("admin.inactive") || "Inactive"}
                      </button>
                    </td>
                    <td className="py-3">
                      {updating[tenant.slug] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                      ) : (
                        <Select
                          value={tenant.plan_type || ""}
                          onChange={(val) => handlePlanChange(tenant.slug, val)}
                          options={PLANS}
                          className="w-28 border-orange-200 focus:border-orange-400 dark:border-orange-800"
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
