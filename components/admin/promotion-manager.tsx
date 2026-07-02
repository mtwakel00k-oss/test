"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchApi } from "@/lib/fetch-api"
import { useTranslation } from "@/lib/use-translation"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Percent, Tag, X, Check, AlertCircle } from "lucide-react"

interface Promotion {
  id: number
  name: string
  description: string
  code: string | null
  type: "percentage" | "fixed" | "bogo"
  value: number
  min_order_amount: number
  starts_at: string
  ends_at: string | null
  usage_limit: number | null
  usage_count: number
  is_active: boolean
  applicable_to: string
}

export function PromotionManager() {
  const { t, lang } = useTranslation()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    code: "",
    type: "percentage" as "percentage" | "fixed" | "bogo",
    value: 0,
    min_order_amount: 0,
    starts_at: "",
    ends_at: "",
    usage_limit: 0,
    is_active: true,
    applicable_to: "all",
  })

  const loadPromotions = useCallback(async () => {
    const res = await fetchApi("/api/admin/promotions")
    if (res.ok) {
      const data = await res.json()
      setPromotions(data.promotions || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadPromotions() }, [loadPromotions])

  const resetForm = () => {
    setForm({ name: "", description: "", code: "", type: "percentage", value: 0, min_order_amount: 0, starts_at: "", ends_at: "", usage_limit: 0, is_active: true, applicable_to: "all" })
    setEditing(null)
    setShowForm(false)
    setError("")
  }

  const openEdit = (p: Promotion) => {
    setForm({
      name: p.name, description: p.description, code: p.code || "",
      type: p.type, value: p.value, min_order_amount: p.min_order_amount,
      starts_at: p.starts_at ? p.starts_at.slice(0, 16) : "",
      ends_at: p.ends_at ? p.ends_at.slice(0, 16) : "",
      usage_limit: p.usage_limit || 0, is_active: p.is_active, applicable_to: p.applicable_to,
    })
    setEditing(p)
    setShowForm(true)
    setError("")
  }

  const handleSave = async () => {
    if (!form.name || form.value <= 0) { setError(lang === "ar" ? "يرجى ملء الحقول المطلوبة" : "Fill required fields"); return }
    const body = {
      ...form,
      code: form.code || null,
      ends_at: form.ends_at || null,
      usage_limit: form.usage_limit || null,
    }
    const url = editing ? `/api/admin/promotions/${editing.id}` : "/api/admin/promotions"
    const method = editing ? "PATCH" : "POST"
    const res = await fetchApi(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) {
      resetForm()
      loadPromotions()
    } else {
      const d = await res.json()
      setError(d.error || "Error saving promotion")
    }
  }

  const toggleActive = async (p: Promotion) => {
    await fetchApi(`/api/admin/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    loadPromotions()
  }

  const handleDelete = async (id: number) => {
    if (!confirm(lang === "ar" ? "تأكيد الحذف؟" : "Confirm delete?")) return
    await fetchApi(`/api/admin/promotions/${id}`, { method: "DELETE" })
    loadPromotions()
  }

  const typeLabel = (t: string) => {
    if (t === "percentage") return lang === "ar" ? "نسبة مئوية" : "Percentage"
    if (t === "fixed") return lang === "ar" ? "قيمة ثابتة" : "Fixed amount"
    return "BOGO"
  }

  if (loading) return <div className="h-96 rounded-2xl bg-muted/10 animate-pulse" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">{t("admin.promotions")}</h2>
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "إدارة الخصومات والعروض" : "Manage discounts and offers"}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90">
          <Plus className="size-4" /> {lang === "ar" ? "إضافة" : "Add"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "الاسم" : "Name"}</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "كود الخصم" : "Code"}</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder={lang === "ar" ? "اختياري" : "Optional"} maxLength={20}
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm uppercase" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "النوع" : "Type"}</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm">
                  <option value="percentage">{lang === "ar" ? "نسبة مئوية" : "Percentage"}</option>
                  <option value="fixed">{lang === "ar" ? "قيمة ثابتة" : "Fixed amount"}</option>
                  <option value="bogo">{lang === "ar" ? "اشتر 1 واحصل على 1" : "BOGO"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "القيمة" : "Value"}</label>
                <input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                  min={0} step="0.01"
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "الحد الأدنى للطلب" : "Min order"}</label>
                <input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                  min={0} step="0.01"
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "حد الاستخدام" : "Usage limit"}</label>
                <input type="number" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: Number(e.target.value) })}
                  min={0} placeholder={lang === "ar" ? "0 = غير محدود" : "0 = unlimited"}
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "تاريخ البداية" : "Start date"}</label>
                <input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{lang === "ar" ? "تاريخ النهاية" : "End date"}</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })}
                  className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="size-4" />{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={resetForm}
                className="h-9 px-4 rounded-xl border border-border/50 text-xs font-bold text-muted-foreground hover:bg-muted/30">
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={handleSave}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90">
                {editing ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Create")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-border/50 bg-muted/10">
            <Percent className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-bold text-muted-foreground">{lang === "ar" ? "لا توجد عروض أو خصومات" : "No promotions yet"}</p>
            <p className="text-xs text-muted-foreground/50 mt-1">{lang === "ar" ? "أضف أول عرض أو كود خصم" : "Add your first promotion or coupon code"}</p>
          </div>
        ) : (
          promotions.map((p) => (
            <div key={p.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/20 transition-all">
              <div className={`size-10 rounded-xl flex items-center justify-center ${p.type === "percentage" ? "bg-blue-500/10 text-blue-500" : p.type === "fixed" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                <Percent className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{p.name}</span>
                  {p.code && <span className="text-[10px] font-mono font-black bg-muted/50 px-2 py-0.5 rounded-lg text-muted-foreground">{p.code}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{typeLabel(p.type)}</span>
                  <span className="text-xs font-bold text-foreground tabular-nums">{p.type === "percentage" ? `${p.value}%` : `${p.value.toFixed(2)} د.ج`}</span>
                  <span className="text-[10px] text-muted-foreground">{p.usage_count}/{p.usage_limit || "∞"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(p)}
                  className={`size-8 rounded-xl flex items-center justify-center transition-all ${p.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted/30 text-muted-foreground"}`}>
                  {p.is_active ? <Check className="size-4" /> : <X className="size-4" />}
                </button>
                <button onClick={() => openEdit(p)} className="size-8 rounded-xl bg-muted/30 text-muted-foreground hover:text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <Tag className="size-3.5" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="size-8 rounded-xl bg-muted/30 text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
