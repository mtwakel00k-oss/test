"use client"

import { useState, useEffect } from "react"
import { fetchApi } from "@/lib/tenant"
import type { TierFeatures } from "@/types/subscriptions"

export function useFeatures(): TierFeatures | null {
  const [features, setFeatures] = useState<TierFeatures | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchApi("/api/tenant/features")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setFeatures(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return features
}
