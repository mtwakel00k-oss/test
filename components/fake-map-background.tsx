"use client"

export function FakeMapBackground({ orderId: _orderId, status: _status }: { orderId: string; status: string }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ height: "42vh", background: "linear-gradient(180deg, #e8f5e9 0%, #f0fdf4 50%, #e8f5e9 100%)" }}
    >
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-1/2 left-0 right-0 h-px border-t-2 border-dashed border-slate-400" />
        <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-slate-300" />
        <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-slate-300" />
        {/* Spots */}
        <div className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full bg-green-300/30" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-green-400/20" />
        <div className="absolute bottom-1/3 left-1/3 w-4 h-4 rounded-full bg-green-300/20" />
        <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-emerald-300/25" />
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
