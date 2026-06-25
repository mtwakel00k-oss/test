"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"

interface StaffMember {
  id: string
  name: string
  role: string
  is_active: boolean
}

const STAFF_COLORS = [
  "from-malachite to-forest",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-teal-500 to-emerald-600",
]

export function StaffManager() {
  const { t, lang } = useTranslation()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addName, setAddName] = useState("")
  const [addRole, setAddRole] = useState("cashier")
  const [editName, setEditName] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchStaff = async () => {
    try {
      const res = await fetchApi("/api/staff")
      const data = res.ok ? await res.json() : []
      setStaff(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchStaff() }, [])

  const addStaff = async () => {
    const name = addName.trim()
    if (!name) { toast({ title: "الاسم مطلوب", variant: "destructive" }); return }
    setSaving(true)
    try {
      const res = await fetchApi("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role: addRole }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "فشل الإضافة" }))
        toast({ title: err.error || "فشل الإضافة", variant: "destructive" }); return
      }
      await fetchStaff()
      setAddName(""); setAddRole("cashier"); setShowAdd(false)
      toast({ title: lang === "ar" ? "تمت الإضافة" : lang === "fr" ? "Ajouté" : "Added" })
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }) } finally { setSaving(false) }
  }

  const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
    if (updates.name !== undefined && !updates.name.trim()) {
      toast({ title: "الاسم مطلوب", variant: "destructive" }); return
    }
    try {
      const res = await fetchApi("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) { toast({ title: "فشل التحديث", variant: "destructive" }); return }
      await fetchStaff()
      setEditingId(null)
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }) }
  }

  const deleteStaff = async (id: string, name: string) => {
    if (!confirm(lang === "ar" ? `حذف "${name}"؟` : lang === "fr" ? `Supprimer "${name}" ?` : `Delete "${name}"?`)) return
    try {
      const res = await fetchApi(`/api/staff?id=${id}`, { method: "DELETE" })
      if (!res.ok) { toast({ title: "فشل الحذف", variant: "destructive" }); return }
      await fetchStaff()
      toast({ title: lang === "ar" ? "تم الحذف" : lang === "fr" ? "Supprimé" : "Deleted" })
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }) }
  }

  const getColor = (name: string) => STAFF_COLORS[name.length % STAFF_COLORS.length]

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl h-full rounded-[2.5rem] shadow-sm transition-all duration-500 overflow-hidden">
      <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-black text-foreground tracking-tight">
            {lang === "ar" ? "فريق العمل" : lang === "fr" ? "Équipe" : "Staff"}
          </CardTitle>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
            {lang === "ar" ? "إضافة وتعديل وحذف الموظفين" : lang === "fr" ? "Gérer les employés" : "Manage employees"}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-full h-10 px-5 shadow-lg shadow-malachite/20 text-sm font-bold">
          {lang === "ar" ? "إضافة موظف" : lang === "fr" ? "Ajouter" : "Add Staff"}
        </Button>
      </CardHeader>

      <CardContent className="p-8 pt-0 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-malachite/10 flex items-center justify-center mb-4">
              <svg className="size-8 text-malachite" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm font-bold text-foreground mb-1">
              {lang === "ar" ? "لا يوجد موظفون بعد" : lang === "fr" ? "Aucun employé" : "No staff yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "أضف أول موظف كاشير" : lang === "fr" ? "Ajoutez votre premier caissier" : "Add your first cashier"}
            </p>
          </div>
        ) : (
          staff.map((member, idx) => (
            <div key={member.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-all group",
                member.is_active ? "border-border/50 bg-card/30 hover:bg-card/50" : "border-destructive/10 bg-destructive/5 opacity-60",
              )}
            >
              <div className={cn(
                "size-11 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm",
                member.is_active ? `bg-gradient-to-br ${getColor(member.name)}` : "bg-muted/50 text-muted-foreground",
              )}>
                {member.name.charAt(0).toUpperCase()}
              </div>

              {editingId === member.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-10 flex-1 rounded-xl text-sm font-bold"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") updateStaff(member.id, { name: editName })
                      if (e.key === "Escape") setEditingId(null)
                    }}
                  />
                  <Button size="sm" onClick={() => updateStaff(member.id, { name: editName })} className="rounded-xl size-10 p-0">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-xl size-10 p-0">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </Button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{member.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      member.role === "cashier"
                        ? "bg-malachite/10 text-malachite"
                        : member.role === "chef"
                        ? "bg-violet-500/10 text-violet-500"
                        : "bg-blue-500/10 text-blue-500",
                    )}>
                      {member.role}
                    </span>
                    <span className={cn(
                      "text-[10px] font-semibold",
                      member.is_active ? "text-malachite" : "text-muted-foreground",
                    )}>
                      {member.is_active
                        ? (lang === "ar" ? "نشط" : lang === "fr" ? "Actif" : "Active")
                        : (lang === "ar" ? "غير نشط" : lang === "fr" ? "Inactif" : "Inactive")}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateStaff(member.id, { is_active: !member.is_active })}
                  className={cn(
                    "size-8 rounded-xl flex items-center justify-center transition-all",
                    member.is_active ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" : "text-malachite hover:bg-malachite/10",
                  )}
                  title={member.is_active ? "تعطيل" : "تفعيل"}
                >
                  {member.is_active ? (
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  )}
                </button>
                <button
                  onClick={() => { setEditingId(member.id); setEditName(member.name) }}
                  className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="تعديل الاسم"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button
                  onClick={() => deleteStaff(member.id, member.name)}
                  className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="حذف"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Add dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 shadow-2xl backdrop-blur-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-foreground mb-1">
              {lang === "ar" ? "موظف جديد" : lang === "fr" ? "Nouvel employé" : "New Staff"}
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              {lang === "ar" ? "أدخل اسم الموظف والدور" : lang === "fr" ? "Nom et rôle" : "Enter name and role"}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                  {lang === "ar" ? "الاسم" : lang === "fr" ? "Nom" : "Name"}
                </label>
                <Input value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder="FLG"
                  className="h-12 rounded-xl text-sm font-bold"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") addStaff() }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                  {lang === "ar" ? "الدور" : lang === "fr" ? "Rôle" : "Role"}
                </label>
                <div className="flex gap-2">
                  {["cashier", "chef", "admin"].map(r => (
                    <button key={r} onClick={() => setAddRole(r)}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-xs font-bold transition-all border",
                        addRole === r
                          ? "bg-malachite text-evergreen border-malachite shadow-sm"
                          : "bg-muted/30 text-muted-foreground border-border/50 hover:border-malachite/50",
                      )}
                    >
                      {r === "cashier"
                        ? (lang === "ar" ? "كاشير" : "Cashier")
                        : r === "chef"
                        ? (lang === "ar" ? "طباخ" : "Chef")
                        : (lang === "ar" ? "مدير" : "Admin")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={addStaff} disabled={saving} className="flex-1 h-11 rounded-xl font-bold">
                  {saving ? (
                    <span className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : lang === "ar" ? "إضافة" : lang === "fr" ? "Ajouter" : "Add"}
                </Button>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="h-11 rounded-xl font-bold">
                  {lang === "ar" ? "إلغاء" : lang === "fr" ? "Annuler" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
