"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function OfflineDetector() {
  const [offline, setOffline] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const goOffline = () => { setOffline(true); setShow(true) }
    const goOnline = () => { setOffline(false); setTimeout(() => setShow(false), 2000) }
    queueMicrotask(() => { setOffline(!navigator.onLine); if (!navigator.onLine) setShow(true) })
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-2xl transition-all duration-500 flex items-center gap-2.5",
        offline
          ? "bg-destructive text-destructive-foreground"
          : "bg-emerald-600 text-white"
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", offline ? "bg-white/80 animate-pulse" : "bg-white/80")} />
      {offline ? "أنت غير متصل — بعض الميزات قد لا تعمل" : "تمت استعادة الاتصال"}
    </div>
  )
}
