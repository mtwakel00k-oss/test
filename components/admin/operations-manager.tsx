"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"
import { useSlug } from "@/lib/use-slug"
import { toast } from "@/hooks/use-toast"
import { Users, Truck, QrCode, Plus, Trash2, Eye, EyeOff, Edit3, UserPlus, Printer, Loader2 } from "lucide-react"

interface StaffMember {
  id: string
  name: string
  role: string
  is_active: boolean
}

interface Driver {
  id: string
  name: string
  phone: string
  is_active: boolean
}

const TAB_STAFF = "staff"
const TAB_DRIVERS = "drivers"
const TAB_QR = "qr"

export function OperationsManager() {
  const { t, lang } = useTranslation()
  const slug = useSlug()

  const [activeTab, setActiveTab] = useState(TAB_STAFF)

  return (
    <div className="min-h-screen bg-evergreen text-ivory">
      <header className="sticky top-0 z-30 border-b border-forest/50 bg-evergreen/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-ivory tracking-tight">
              {lang === "ar" ? "إدارة العمليات والموارد" : lang === "fr" ? "Gestion des opérations" : "Operations & Resources"}
            </h1>
            <p className="text-xs text-ivory/40 mt-0.5">
              {lang === "ar" ? "فريق العمل · سائقو التوصيل · طاولات QR" : lang === "fr" ? "Équipe · Chauffeurs · QR Tables" : "Staff · Drivers · QR Tables"}
            </p>
          </div>
        </div>
      </header>

      <div className="border-b border-forest/50">
        <div className="flex px-6">
          <TabButton active={activeTab === TAB_STAFF} onClick={() => setActiveTab(TAB_STAFF)}>
            <Users className="size-4" strokeWidth={1.5} />
            {lang === "ar" ? "فريق العمل" : lang === "fr" ? "Équipe" : "Staff"}
          </TabButton>
          <TabButton active={activeTab === TAB_DRIVERS} onClick={() => setActiveTab(TAB_DRIVERS)}>
            <Truck className="size-4" strokeWidth={1.5} />
            {lang === "ar" ? "سائقو التوصيل" : lang === "fr" ? "Chauffeurs" : "Drivers"}
          </TabButton>
          <TabButton active={activeTab === TAB_QR} onClick={() => setActiveTab(TAB_QR)}>
            <QrCode className="size-4" strokeWidth={1.5} />
            {lang === "ar" ? "طاولات QR" : lang === "fr" ? "QR Tables" : "QR Tables"}
          </TabButton>
        </div>
      </div>

      <main className="p-6 max-w-4xl mx-auto">
        {activeTab === TAB_STAFF && <StaffTab lang={lang} t={t} />}
        {activeTab === TAB_DRIVERS && <DriversTab lang={lang} slug={slug} />}
        {activeTab === TAB_QR && <QrTab lang={lang} slug={slug} />}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all",
        active
          ? "border-malachite text-malachite"
          : "border-transparent text-ivory/40 hover:text-ivory/70 hover:border-ivory/20",
      )}
    >
      {children}
    </button>
  )
}

function StaffTab({ lang, t }: { lang: string; t: (k: string) => string }) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addName, setAddName] = useState("")
  const [editName, setEditName] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchStaff = async () => {
    try {
      const res = await fetchApi("/api/staff")
      const data = res.ok ? await res.json() : []
      setStaff(Array.isArray(data) ? data : [])
    } catch { /* */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchStaff() }, [])

  const addStaff = async () => {
    const name = addName.trim()
    if (!name) return
    setSaving(true)
    try {
      const res = await fetchApi("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, role: "cashier" }) })
      if (!res.ok) return
      await fetchStaff()
      setAddName(""); setShowAdd(false)
    } catch { /* */ } finally { setSaving(false) }
  }

  const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
    if (updates.name !== undefined && !updates.name.trim()) return
    try {
      const res = await fetchApi("/api/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) })
      if (!res.ok) return
      await fetchStaff()
      setEditingId(null)
    } catch { /* */ }
  }

  const deleteStaff = async (id: string, name: string) => {
    if (!confirm(lang === "ar" ? `حذف "${name}"؟` : lang === "fr" ? `Supprimer "${name}" ?` : `Delete "${name}"?`)) return
    try {
      const res = await fetchApi(`/api/staff?id=${id}`, { method: "DELETE" })
      if (!res.ok) return
      await fetchStaff()
    } catch { /* */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ivory/80">
          {lang === "ar" ? "الكاشير" : lang === "fr" ? "Caissiers" : "Cashiers"}
          <span className="text-ivory/30 text-sm ml-2">({staff.length})</span>
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-malachite text-evergreen text-sm font-bold hover:brightness-110 active:scale-[0.97] transition-all shadow-lg shadow-malachite/20"
        >
          <UserPlus className="size-4" strokeWidth={2} />
          {lang === "ar" ? "إضافة موظف" : lang === "fr" ? "Ajouter" : "Add Staff"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl border border-forest/40 bg-white/[0.02]" />)}</div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-forest/40 bg-white/[0.02]">
          <div className="size-14 rounded-full bg-malachite/10 flex items-center justify-center mb-4">
            <Users className="size-7 text-malachite" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-bold text-ivory/60 mb-1">
            {lang === "ar" ? "لا يوجد موظفون بعد" : lang === "fr" ? "Aucun employé" : "No staff yet"}
          </p>
          <p className="text-xs text-ivory/30">
            {lang === "ar" ? "أضف أول موظف كاشير" : lang === "fr" ? "Ajoutez votre premier caissier" : "Add your first cashier"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => (
            <div key={member.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                member.is_active ? "border-forest/40 bg-white/[0.02] hover:bg-white/[0.04]" : "border-forest/20 bg-white/[0.01] opacity-50",
              )}
            >
              <div className="size-10 rounded-lg bg-forest flex items-center justify-center text-ivory text-sm font-bold shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>

              {editingId === member.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 h-10 px-4 rounded-lg bg-evergreen border border-forest/50 text-ivory text-sm placeholder-ivory/30 focus:outline-none focus:border-malachite/50"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") updateStaff(member.id, { name: editName })
                      if (e.key === "Escape") setEditingId(null)
                    }}
                  />
                  <button onClick={() => updateStaff(member.id, { name: editName })} className="size-9 rounded-lg bg-malachite text-evergreen flex items-center justify-center hover:brightness-110">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                  <button onClick={() => setEditingId(null)} className="size-9 rounded-lg border border-forest/50 text-ivory/50 flex items-center justify-center hover:border-ivory/20">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ivory truncate">{member.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-malachite/10 text-malachite">كاشير</span>
                    <span className={cn("text-[10px]", member.is_active ? "text-malachite/70" : "text-ivory/30")}>
                      {member.is_active ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "غير نشط" : "Inactive")}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateStaff(member.id, { is_active: !member.is_active })}
                  className="size-8 rounded-lg flex items-center justify-center text-ivory/30 hover:text-malachite hover:bg-malachite/10 transition-all"
                  title={member.is_active ? "تعطيل" : "تفعيل"}
                >
                  {member.is_active ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
                </button>
                <button
                  onClick={() => { setEditingId(member.id); setEditName(member.name) }}
                  className="size-8 rounded-lg flex items-center justify-center text-ivory/30 hover:text-malachite hover:bg-malachite/10 transition-all"
                  title="تعديل"
                >
                  <Edit3 className="size-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => deleteStaff(member.id, member.name)}
                  className="size-8 rounded-lg flex items-center justify-center text-ivory/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="حذف"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-evergreen/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-forest/50 bg-evergreen p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ivory mb-1">
              {lang === "ar" ? "كاشير جديد" : lang === "fr" ? "Nouveau caissier" : "New Cashier"}
            </h3>
            <p className="text-xs text-ivory/40 mb-5">
              {lang === "ar" ? "أدخل اسم الكاشير" : lang === "fr" ? "Nom du caissier" : "Enter cashier name"}
            </p>
            <div className="space-y-4">
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="..."
                className="w-full h-12 px-4 rounded-xl bg-evergreen border border-forest/50 text-ivory text-sm placeholder-ivory/20 focus:outline-none focus:border-malachite/50"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") addStaff() }}
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={addStaff}
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-malachite text-evergreen text-sm font-bold hover:brightness-110 active:scale-[0.97] disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 className="size-5 animate-spin mx-auto" /> : lang === "ar" ? "إضافة" : "Add"}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="h-11 px-6 rounded-xl border border-forest/50 text-ivory/60 text-sm font-bold hover:border-ivory/20 transition-all"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DriversTab({ lang, slug }: { lang: string; slug: string | null }) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")

  const fetchDrivers = async () => {
    try {
      const res = await fetchApi("/api/tenant/drivers")
      const data = res.ok ? await res.json() : []
      setDrivers(Array.isArray(data) ? data : [])
    } catch { /* */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchDrivers() }, [])

  const addDriver = async () => {
    const name = newName.trim()
    const phone = newPhone.trim()
    if (!name || !phone) return
    setSaving(true)
    try {
      const res = await fetchApi("/api/tenant/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      })
      if (!res.ok) return
      await fetchDrivers()
      setNewName(""); setNewPhone("")
    } catch { /* */ } finally { setSaving(false) }
  }

  const toggleDriver = async (driver: Driver) => {
    try {
      await fetchApi("/api/tenant/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driver.id, is_active: !driver.is_active }),
      })
      await fetchDrivers()
    } catch { /* */ }
  }

  const deleteDriver = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف السائق؟" : "Delete driver?")) return
    try {
      await fetchApi(`/api/tenant/drivers?id=${id}`, { method: "DELETE" })
      await fetchDrivers()
    } catch { /* */ }
  }

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-xl border border-forest/40 bg-white/[0.02] space-y-3">
        <h3 className="text-sm font-bold text-ivory/70">
          {lang === "ar" ? "إضافة سائق جديد" : lang === "fr" ? "Ajouter un chauffeur" : "Add New Driver"}
        </h3>
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={lang === "ar" ? "اسم السائق" : "Driver name"}
            className="flex-1 h-11 px-4 rounded-xl bg-evergreen border border-forest/50 text-ivory text-sm placeholder-ivory/20 focus:outline-none focus:border-malachite/50"
          />
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)}
            placeholder="213xxxxxxxxx"
            className="flex-1 h-11 px-4 rounded-xl bg-evergreen border border-forest/50 text-ivory text-sm placeholder-ivory/20 focus:outline-none focus:border-malachite/50"
            dir="ltr" type="tel"
          />
          <button onClick={addDriver} disabled={saving || !newName.trim() || !newPhone.trim()}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-malachite text-evergreen text-sm font-bold hover:brightness-110 active:scale-[0.97] disabled:opacity-40 transition-all shadow-lg shadow-malachite/20"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" strokeWidth={2} />}
            {lang === "ar" ? "إضافة" : lang === "fr" ? "Ajouter" : "Add"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded-xl border border-forest/40 bg-white/[0.02]" />)}</div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-12 text-ivory/40 text-sm rounded-xl border border-forest/40 bg-white/[0.02]">
          {lang === "ar" ? "لا يوجد سائقون بعد" : "No drivers yet"}
        </div>
      ) : (
        <div className="space-y-2">
          {drivers.map(driver => (
            <div key={driver.id}
              className="flex items-center justify-between p-4 rounded-xl border border-forest/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-2.5 h-2.5 rounded-full", driver.is_active ? "bg-malachite" : "bg-ivory/20")} />
                <div>
                  <p className="text-sm font-semibold text-ivory">{driver.name}</p>
                  <p className="text-xs text-ivory/40" dir="ltr">+{driver.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleDriver(driver)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-forest/50 text-ivory/50 hover:text-ivory/80 hover:border-ivory/30 transition-all">
                  {driver.is_active ? (lang === "ar" ? "تعطيل" : "Disable") : (lang === "ar" ? "تفعيل" : "Enable")}
                </button>
                <button onClick={() => deleteDriver(driver.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400/70 hover:text-rose-400 hover:border-rose-400/50 transition-all">
                  {lang === "ar" ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QrTab({ lang, slug }: { lang: string; slug: string | null }) {
  const [qrTable, setQrTable] = useState("")
  const [qrSvg, setQrSvg] = useState("")
  const [qrLoading, setQrLoading] = useState(false)

  const generateQr = async () => {
    if (!slug || !qrTable) return
    setQrLoading(true)
    try {
      const res = await fetch(`/api/qr/table?slug=${slug}&number=${qrTable}`)
      if (!res.ok) return
      setQrSvg(await res.text())
    } finally { setQrLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-xl border border-forest/40 bg-white/[0.02] space-y-3">
        <h3 className="text-sm font-bold text-ivory/70">
          {lang === "ar" ? "إنشاء رمز QR للطاولة" : lang === "fr" ? "Générer QR table" : "Generate Table QR Code"}
        </h3>
        <p className="text-xs text-ivory/30">
          {lang === "ar"
            ? "رمز QR يفتح القائمة مباشرة مع رقم الطاولة"
            : "QR code opens the menu with the table number pre-filled"}
        </p>
        <div className="flex gap-2 items-start">
          <input type="number" min="1" value={qrTable} onChange={e => setQrTable(e.target.value)}
            className="flex-1 h-11 px-4 rounded-xl bg-evergreen border border-forest/50 text-ivory text-sm placeholder-ivory/20 focus:outline-none focus:border-malachite/50"
            placeholder={lang === "ar" ? "مثال: 5" : "e.g. 5"} />
          <button onClick={generateQr} disabled={!qrTable || qrLoading}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-malachite text-evergreen text-sm font-bold hover:brightness-110 active:scale-[0.97] disabled:opacity-40 transition-all shadow-lg shadow-malachite/20">
            {qrLoading ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" strokeWidth={2} />}
            {lang === "ar" ? "عرض QR" : lang === "fr" ? "Afficher QR" : "Show QR"}
          </button>
        </div>
      </div>

      {qrSvg && (
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl border border-forest/40 bg-white/[0.02]">
          <div className="bg-white rounded-xl p-4 shadow-lg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="text-sm font-bold text-ivory">
            {lang === "ar" ? "طاولة رقم" : "Table No."} {qrTable}
          </p>
          <button onClick={() => {
            const w = window.open("", "_blank")
            if (!w) return
            w.document.write(`<html><head><title>Table ${qrTable}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}</style></head><body>${qrSvg}</body></html>`)
            w.document.close()
            setTimeout(() => w.print(), 500)
          }}
            className="flex items-center gap-2 h-10 px-5 rounded-xl border border-forest/50 text-ivory/60 text-sm font-bold hover:border-ivory/30 hover:text-ivory/80 transition-all">
            <Printer className="size-4" strokeWidth={1.5} />
            {lang === "ar" ? "طباعة" : "Print"}
          </button>
        </div>
      )}
    </div>
  )
}
