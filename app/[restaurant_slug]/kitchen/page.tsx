"use client"

import dynamic from "next/dynamic"

const KdsDashboard = dynamic(() => import("@/components/kitchen/kds-dashboard").then(m => ({ default: m.KdsDashboard })), {
  loading: () => <div className="flex items-center justify-center h-screen"><div className="size-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" /></div>,
})

export default function KitchenPage() {
  return <KdsDashboard />
}
