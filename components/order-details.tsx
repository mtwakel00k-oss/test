"use client"

import type { OrderItem } from "@/lib/types"
import { SAUCES } from "@/lib/constants"
import { useTranslation } from "@/lib/use-translation"

function ItemIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  )
}

export function OrderDetails({ items }: { items: OrderItem[] }) {
  const { t, lang } = useTranslation()
  const cur = lang === "ar" ? "د.ج" : "DA"
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0)

  return (
    <section>
      <div className="bg-card/50 backdrop-blur-3xl rounded-[2.5rem] border border-border/50 overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-border/50 bg-primary/[0.02]">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{t("track.details")}</h2>
        </div>
        <div className="divide-y divide-border/50">
          {items.map((item, idx) => (
            <div key={item.id}
              className="px-8 py-6 flex items-start justify-between gap-6 transition-all hover:bg-primary/[0.01]"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-start gap-4 min-w-0">
                <span className="mt-1 shrink-0 size-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center tabular-nums">
                  {item.quantity}x
                </span>
                <div className="min-w-0 space-y-1">
                  <h4 className="font-black text-foreground text-sm tracking-tight leading-tight truncate">{item.product_name}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    <span>{item.size}</span>
                    {item.sauce && (
                      <>
                        <div className="size-1 rounded-full bg-border" />
                        <span>{SAUCES.find(s => s.id === Number(item.sauce))?.label || item.sauce}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-sm font-black text-foreground whitespace-nowrap tabular-nums">{item.subtotal.toLocaleString("en-US")} <span className="text-[10px] opacity-40 uppercase tracking-widest">{cur}</span></span>
            </div>
          ))}
        </div>
        <div className="px-8 py-8 bg-primary/[0.02] border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">{t("track.total")}</span>
            <span className="text-2xl font-black text-primary tabular-nums tracking-tighter">{subtotal.toLocaleString("en-US")} <span className="text-xs opacity-40 uppercase tracking-widest">{cur}</span></span>
          </div>
        </div>
      </div>
    </section>
  )
}
