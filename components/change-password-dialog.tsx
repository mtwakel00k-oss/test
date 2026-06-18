"use client"

import { useState } from "react"
import { Key, X, Eye, EyeOff, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"
import { fetchApi } from "@/lib/tenant"

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
  onPasswordChanged?: () => void
}

export function ChangePasswordDialog({ open, onClose, onPasswordChanged }: ChangePasswordDialogProps) {
  const { lang } = useTranslation()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError(lang === "ar" ? "كلمة المرور غير متطابقة" : lang === "fr" ? "Les mots de passe ne correspondent pas" : "Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setError(lang === "ar" ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : lang === "fr" ? "Le mot de passe doit contenir au moins 8 caractères" : "Password must be at least 8 characters")
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError(lang === "ar" ? "كلمة المرور تحتاج حرف كبير واحد" : lang === "fr" ? "Le mot de passe doit contenir une majuscule" : "Password needs one uppercase letter")
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setError(lang === "ar" ? "كلمة المرور تحتاج رقم واحد" : lang === "fr" ? "Le mot de passe doit contenir un chiffre" : "Password needs one digit")
      return
    }

    setLoading(true)
    try {
      const res = await fetchApi("/api/tenant/cashiers/password", {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || (lang === "ar" ? "فشل تغيير كلمة المرور" : lang === "fr" ? "Échec du changement de mot de passe" : "Failed to change password"))
        return
      }
      setSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
      onPasswordChanged?.()
    } catch {
      setError(lang === "ar" ? "حدث خطأ في الاتصال" : lang === "fr" ? "Erreur de connexion" : "Connection error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              {lang === "ar" ? "تغيير كلمة المرور" : lang === "fr" ? "Changer le mot de passe" : "Change Password"}
            </h2>
          </div>
          <button onClick={onClose} className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center size-14 rounded-full bg-emerald-500/10 mx-auto mb-4">
              <Check className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {lang === "ar" ? "تم تغيير كلمة المرور بنجاح" : lang === "fr" ? "Mot de passe changé avec succès" : "Password changed successfully"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {lang === "ar" ? "يمكنك استخدام كلمة المرور الجديدة في المرة القادمة" : lang === "fr" ? "Vous pouvez utiliser le nouveau mot de passe la prochaine fois" : "You can use the new password next time"}
            </p>
            <button onClick={onClose}
              className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all">
              {lang === "ar" ? "تم" : lang === "fr" ? "Terminé" : "Done"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs font-medium text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                {lang === "ar" ? "كلمة المرور الجديدة" : lang === "fr" ? "Nouveau mot de passe" : "New Password"}
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className={cn(
                    "w-full h-10 px-3 pr-10 rounded-xl border border-border/60 bg-background text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  )}
                  placeholder="••••••••" autoFocus />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                {lang === "ar" ? "تأكيد كلمة المرور" : lang === "fr" ? "Confirmer le mot de passe" : "Confirm Password"}
              </label>
              <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                )}
                placeholder="••••••••" />
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className={cn("w-1.5 h-1.5 rounded-full", newPassword.length >= 8 ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              <span>{lang === "ar" ? "8 أحرف على الأقل" : lang === "fr" ? "8 caractères minimum" : "At least 8 characters"}</span>
              <div className={cn("w-1.5 h-1.5 rounded-full", /[A-Z]/.test(newPassword) ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              <span>{lang === "ar" ? "حرف كبير" : lang === "fr" ? "Majuscule" : "Uppercase"}</span>
              <div className={cn("w-1.5 h-1.5 rounded-full", /[0-9]/.test(newPassword) ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              <span>{lang === "ar" ? "رقم" : lang === "fr" ? "Chiffre" : "Digit"}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">
                {lang === "ar" ? "إلغاء" : lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                className={cn(
                  "flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold",
                  "hover:scale-[1.02] active:scale-95 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                )}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {lang === "ar" ? "جاري..." : lang === "fr" ? "En cours..." : "Saving..."}
                  </span>
                ) : (
                  lang === "ar" ? "حفظ" : lang === "fr" ? "Enregistrer" : "Save"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
