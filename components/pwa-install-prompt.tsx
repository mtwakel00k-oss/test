"use client"

import { useEffect, useState, useCallback } from "react"
import { X, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") setDeferredPrompt(null)
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    setTimeout(() => setDismissed(false), 86400000)
  }, [])

  if (!deferredPrompt || dismissed) return null

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl",
        "bg-card border border-border text-card-foreground",
        "animate-in slide-in-from-bottom-4 duration-300"
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-primary" />
      </div>
      <div className="text-sm">
        <p className="font-semibold">تثبيت التطبيق</p>
        <p className="text-muted-foreground text-xs">للوصول السريع من الشاشة الرئيسية</p>
      </div>
      <button
        onClick={handleInstall}
        className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
      >
        تثبيت
      </button>
      <button
        onClick={handleDismiss}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  )
}
