"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { Search, ArrowLeft } from "lucide-react"
import { logger } from "@/lib/logger"

export default function OrderRedirectPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<"loading" | "redirecting" | "not_found">("loading")

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        logger.info(`[OrderRedirect] Looking up order ${id} via public API`)
        const res = await fetch(`/api/orders/${id}?public=true`, {
          headers: { "Content-Type": "application/json" },
        })
        if (cancelled) return
        if (!res.ok) { if (!cancelled) setStatus("not_found"); return }
        const data = await res.json()
        if (data.slug) {
          if (!cancelled) { setStatus("redirecting"); router.replace(`/${data.slug}/order/${id}`) }
          return
        }
        if (data.order) { if (!cancelled) setStatus("not_found"); return }
        if (!cancelled) setStatus("not_found")
      } catch {
        if (!cancelled) setStatus("not_found")
      }
    })()
    return () => { cancelled = true }
  }, [id, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {status === "loading" && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-card border border-border shadow-sm">
            <Search className="w-6 h-6 text-muted-foreground " />
          </div>
          <p className="text-sm text-muted-foreground">Searching for your order...</p>
        </div>
      )}

      {status === "redirecting" && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-card border border-border shadow-sm">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Redirecting to tracking page...</p>
        </div>
      )}

      {status === "not_found" && (
        <div className="rounded-2xl bg-card border border-border/40 p-8 max-w-sm w-full text-center shadow-sm">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-destructive/10 border border-destructive/20 mb-4">
            <Search className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Order Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The link may be incorrect or the order has been removed. Please check the link or contact the restaurant.
          </p>
          <Link href="/menu"
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </Link>
        </div>
      )}
    </div>
  )
}