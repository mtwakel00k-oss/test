"use client"

export function FakeMapBackground({ orderId, status }: { orderId: string; status: string }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-primary/[0.12] via-primary/[0.04] to-primary/[0.08] h-[42vh]">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-0 right-0 h-px border-t-2 border-dashed border-border" />
        <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-border/60" />
        <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-border/60" />
        <div className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full bg-primary/30" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-primary/20" />
        <div className="absolute bottom-1/3 left-1/3 w-4 h-4 rounded-full bg-primary/20" />
        <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-primary/25" />
      </div>

      <div
        className="absolute text-4xl z-10"
        style={{
          top: "30%", right: "28%",
          animation: "deliveryBounce 2s ease-in-out infinite",
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
        }}
      >
        🛵
      </div>
    </div>
  )
}
