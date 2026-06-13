"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ShoppingBag, Camera, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useLang } from "@/lib/lang-context"
import type { Lang } from "@/lib/translations"
import { fetchApi } from "@/lib/tenant"

interface Driver {
  id: string
  name: string
  phone: string
  token: string
  is_active: boolean
  created_at: string
}



const T = (lang: Lang, ar: string, en: string, fr: string) =>
  lang === "ar" ? ar : lang === "fr" ? fr : en;

export function RestaurantSettings() {
  const lang = useLang();
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [savingDriver, setSavingDriver] = useState(false)
  const [newDriverName, setNewDriverName] = useState("")
  const [newDriverPhone, setNewDriverPhone] = useState("")
  const [driverError, setDriverError] = useState("")

  const [cashiers, setCashiers] = useState<{ id: string; username: string; role: string }[]>([])
  const [loadingCashiers, setLoadingCashiers] = useState(true)
  const [newCashierUsername, setNewCashierUsername] = useState("")
  const [newCashierPassword, setNewCashierPassword] = useState("")
  const [savingCashier, setSavingCashier] = useState(false)
  const [cashierError, setCashierError] = useState("")

  useEffect(() => {
    fetchApi("/api/tenant/logo")
      .then((r) => r.json())
      .then((data: { name?: string; logo_url?: string | null }) => {
        if (data.name) { setName(data.name); setOriginalName(data.name) }
        if (data.logo_url) setLogoUrl(data.logo_url);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    fetchApi("/api/tenant/drivers")
      .then(r => r.ok ? r.json() : [])
      .then(data => setDrivers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingDrivers(false))

    fetchApi("/api/tenant/cashiers")
      .then(r => r.ok ? r.json() : [])
      .then(data => setCashiers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingCashiers(false))
  }, []);

  const pickFile = () => { if (!isUploading) fileRef.current?.click() };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchApi("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "فشل رفع الشعار" }))).error || "فشل رفع الشعار");
      const { url } = await res.json();
      setLogoUrl(url);
      fetchApi("/api/tenant/logo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo_url: url }) }).catch(() => {});
      toast({ title: T(lang, "تم تغيير الشعار", "Logo updated", "Logo mis à jour") });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "فشل رفع الشعار", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startEdit = () => {
    setNewName(name);
    setEditingName(true);
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  const cancelEdit = () => { setEditingName(false); setNewName(name) };

  const saveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === originalName) { setEditingName(false); return }
    setIsSaving(true);
    try {
      const res = await fetchApi("/api/tenant/logo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "فشل حفظ الاسم" }))).error || "فشل حفظ الاسم");
      setName(trimmed);
      setOriginalName(trimmed);
      setEditingName(false);
      toast({ title: T(lang, "تم تحديث الاسم", "Name updated", "Nom mis à jour") });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "فشل حفظ الاسم", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveName();
    if (e.key === "Escape") cancelEdit();
  };

  const addDriver = async () => {
    const name = newDriverName.trim()
    const phone = newDriverPhone.trim()
    if (!name) { setDriverError("الاسم مطلوب"); return }
    if (!phone) { setDriverError("رقم الواتساب مطلوب"); return }
    setDriverError("")
    setSavingDriver(true)
    try {
      const res = await fetchApi("/api/tenant/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      })
      const data = await res.json()
      if (!res.ok) { setDriverError(data.error || "فشل إضافة السائق"); return }
      setDrivers(prev => [...prev, data])
      setNewDriverName("")
      setNewDriverPhone("")
      toast({ title: T(lang, "تم إضافة السائق", "Driver added", "Chauffeur ajouté") })
    } catch {
      setDriverError("حدث خطأ")
    } finally {
      setSavingDriver(false)
    }
  }

  const toggleDriver = async (driver: Driver) => {
    const res = await fetchApi("/api/tenant/drivers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: driver.id, is_active: !driver.is_active }),
    })
    if (res.ok) {
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, is_active: !d.is_active } : d))
    }
  }

  const deleteDriver = async (driverId: string) => {
    if (!confirm(T(lang, "حذف هذا السائق؟", "Delete this driver?", "Supprimer ce chauffeur?"))) return
    const res = await fetchApi(`/api/tenant/drivers?id=${driverId}`, { method: "DELETE" })
    if (res.ok) {
      setDrivers(prev => prev.filter(d => d.id !== driverId))
      toast({ title: T(lang, "تم الحذف", "Deleted", "Supprimé") })
    }
  }

  const addCashier = async () => {
    const username = newCashierUsername.trim()
    const password = newCashierPassword.trim()
    if (!username) { setCashierError("اسم المستخدم مطلوب"); return }
    if (!password) { setCashierError("كلمة المرور مطلوبة"); return }
    if (password.length < 6) { setCashierError("كلمة المرور 6 أحرف على الأقل"); return }
    setCashierError("")
    setSavingCashier(true)
    try {
      const res = await fetchApi("/api/tenant/cashiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setCashierError(data.error || "فشل إضافة الكاشير"); return }
      setCashiers(prev => [...prev, data])
      setNewCashierUsername("")
      setNewCashierPassword("")
      toast({ title: T(lang, "تم إضافة الكاشير", "Cashier added", "Caissier ajouté") })
    } catch {
      setCashierError("حدث خطأ")
    } finally {
      setSavingCashier(false)
    }
  }

  const deleteCashier = async (userId: string) => {
    if (!confirm(T(lang, "حذف هذا الكاشير؟", "Delete this cashier?", "Supprimer ce caissier?"))) return
    const res = await fetchApi(`/api/tenant/cashiers?user_id=${userId}`, { method: "DELETE" })
    if (res.ok) {
      setCashiers(prev => prev.filter(c => c.id !== userId))
      toast({ title: T(lang, "تم الحذف", "Deleted", "Supprimé") })
    }
  }

  return (<>
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden" dir={dir}>
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-xl font-black text-foreground tracking-tight">
          {T(lang, "إعدادات المطعم", "Restaurant Settings", "Paramètres du restaurant")}
        </CardTitle>
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
          {T(lang, "تحديث اسم المطعم وشعاره", "Update name & logo", "Modifier le nom et le logo")}
        </p>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        {isLoading ? (
          <div className="flex items-center gap-6">
            <Skeleton className="size-20 rounded-[2rem]" />
            <div className="space-y-3"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 group">
              <div
                className="relative size-24 rounded-[2rem] bg-muted/50 flex items-center justify-center overflow-hidden cursor-pointer group border border-border/50 hover:border-primary/50 hover:shadow-2xl transition-all duration-500 shrink-0 shadow-inner"
                onClick={pickFile} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pickFile() }}
              >
                {isUploading ? (
                  <div className="size-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                ) : logoUrl ? (
                  <>
                    <Image src={logoUrl} alt="" fill className="object-cover block transition-transform duration-700 group-hover:scale-110" onError={() => console.error("Logo load failed")} unoptimized />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <Camera className="size-8 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-10 text-muted-foreground/40" />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <Camera className="size-8 text-white" />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-foreground tracking-tight">{T(lang, "شعار المطعم", "Restaurant Logo", "Logo du restaurant")}</p>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{T(lang, "انقر لتغيير الشعار", "Click to change", "Cliquez pour changer")}</p>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">{T(lang, "اسم المطعم", "Restaurant Name", "Nom du restaurant")}</label>
              {editingName ? (
                <div className="flex items-center gap-3">
                  <Input ref={nameRef} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={onKey} className="h-14 px-6 rounded-2xl border-border/50 bg-muted/30 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" maxLength={60} />
                  <Button onClick={saveName} disabled={isSaving} className="size-14 rounded-2xl shrink-0 shadow-xl shadow-primary/20">
                    {isSaving ? <span className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="size-5" />}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} className="size-14 rounded-2xl shrink-0 border-border/50 hover:bg-rose-500/10 hover:text-rose-600 transition-all">
                    <X className="size-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-muted/30 border border-border/50 group hover:border-primary/20 transition-all">
                  <span className="text-lg font-black text-foreground tracking-tight">{name}</span>
                  <button onClick={startEdit} className="size-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-all shadow-sm">
                    <Pencil className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>

    <Card className="border-border/50" dir={dir}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          🛵 {T(lang, "سائقو التوصيل", "Delivery Drivers", "Chauffeurs")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={newDriverName}
            onChange={e => setNewDriverName(e.target.value)}
            placeholder={T(lang, "اسم السائق", "Driver name", "Nom du chauffeur")}
            className="flex-1" />
          <Input value={newDriverPhone}
            onChange={e => setNewDriverPhone(e.target.value)}
            placeholder="213xxxxxxxxx" className="flex-1" dir="ltr" type="tel" />
          <Button onClick={addDriver} disabled={savingDriver} size="sm">
            {savingDriver ? "..." : T(lang, "إضافة", "Add", "Ajouter")}
          </Button>
        </div>
        {driverError && <p className="text-xs text-destructive">{driverError}</p>}

        {loadingDrivers ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {T(lang, "لا يوجد سائقون بعد", "No drivers yet", "Aucun chauffeur")}
          </p>
        ) : (
          <div className="space-y-2">
            {drivers.map(driver => (
              <div key={driver.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${driver.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{driver.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">+{driver.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleDriver(driver)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
                    {driver.is_active
                      ? T(lang, "تعطيل", "Disable", "Désactiver")
                      : T(lang, "تفعيل", "Enable", "Activer")}
                  </button>
                  <button onClick={() => deleteDriver(driver.id)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors">
                    {T(lang, "حذف", "Delete", "Supprimer")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          💡 {T(lang,
            "كل سائق عنده رابط سري خاص به يُرسل تلقائياً عبر واتساب",
            "Each driver has a secret link sent automatically via WhatsApp",
            "Chaque chauffeur a un lien secret envoyé automatiquement via WhatsApp"
          )}
        </p>
      </CardContent>
    </Card>

    <Card className="border-border/50" dir={dir}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          👤 {T(lang, "إدارة الكاشير", "Staff Management", "Gestion du personnel")}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {T(lang, "إضافة أو حذف حسابات الكاشير للمطعم", "Add or remove cashier accounts", "Ajouter ou supprimer des caissiers")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={newCashierUsername}
            onChange={e => setNewCashierUsername(e.target.value)}
            placeholder={T(lang, "اسم المستخدم", "Username", "Nom d'utilisateur")}
            className="flex-1" />
          <Input value={newCashierPassword}
            onChange={e => setNewCashierPassword(e.target.value)}
            placeholder={T(lang, "كلمة المرور", "Password", "Mot de passe")}
            className="flex-1" type="password" />
          <Button onClick={addCashier} disabled={savingCashier} size="sm">
            {savingCashier ? "..." : T(lang, "إضافة", "Add", "Ajouter")}
          </Button>
        </div>
        {cashierError && <p className="text-xs text-destructive">{cashierError}</p>}

        {loadingCashiers ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : cashiers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {T(lang, "لا يوجد كاشير بعد", "No cashiers yet", "Aucun caissier")}
          </p>
        ) : (
          <div className="space-y-2">
            {cashiers.map(cashier => (
              <div key={cashier.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30">
                <div>
                  <p className="text-sm font-semibold text-foreground">{cashier.username}</p>
                  <p className="text-xs text-muted-foreground">{cashier.role}</p>
                </div>
                <button onClick={() => deleteCashier(cashier.id)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors">
                  {T(lang, "حذف", "Delete", "Supprimer")}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
