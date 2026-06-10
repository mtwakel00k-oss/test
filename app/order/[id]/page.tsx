"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { logger } from "@/lib/logger"

/**
 * Landing page for bare /order/:id URLs (no restaurant_slug).
 *
 * Flow:
 * 1. Calls GET /api/orders/:id?public=true
 * 2. Server scans all tenants until it finds the order
 * 3. Response includes { order, slug } → we redirect to /[slug]/order/[id]
 * 4. If the order is not found → show error with link to menu
 */
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

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          logger.warn(`[OrderRedirect] API returned ${res.status}`, body)
          if (!cancelled) setStatus("not_found")
          return
        }

        const data = await res.json()

        // Case 1: response includes a slug → redirect to tenant-scoped URL
        if (data.slug) {
          logger.info(`[OrderRedirect] Redirecting to /${data.slug}/order/${id}`)
          if (!cancelled) {
            setStatus("redirecting")
            router.replace(`/${data.slug}/order/${id}`)
          }
          return
        }

        // Case 2: no slug but order exists (rare — means standard lookup worked)
        if (data.order) {
          logger.info(`[OrderRedirect] Order found, no slug returned — staying on /order/${id}`)
          if (!cancelled) {
            // Render below will show the order content once we set state
            setStatus("not_found")
          }
          return
        }

        logger.warn(`[OrderRedirect] Unexpected response shape`, data)
        if (!cancelled) setStatus("not_found")
      } catch (e) {
        logger.error(`[OrderRedirect] Network error`, { error: e instanceof Error ? e.message : String(e) })
        if (!cancelled) setStatus("not_found")
      }
    })()

    return () => { cancelled = true }
  }, [id, router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {status === "loading" && (
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">جاري البحث عن طلبك...</p>
        </div>
      )}

      {status === "redirecting" && (
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">جاري تحويلك إلى صفحة التتبع...</p>
        </div>
      )}

      {status === "not_found" && (
        <div className="glass rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🍔</div>
          <h1 className="text-xl font-black text-white mb-2">لم يتم العثور على الطلب</h1>
          <p className="text-sm text-white/40 mb-6">
            قد يكون الرابط غير صحيح أو أن الطلب قد أُزيل. تحقق من الرابط أو تواصل مع المطعم.
          </p>
          <Link
            href="/menu"
            className="inline-block rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-black px-6 py-2.5 text-sm font-bold"
          >
            العودة إلى القائمة
          </Link>
        </div>
      )}
    </div>
  )
}
