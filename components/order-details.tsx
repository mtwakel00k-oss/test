"use client"

import type { OrderItem } from "@/lib/types"
import { SAUCES } from "@/lib/constants"

function ItemIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  )
}

export function OrderDetails({ items }: { items: OrderItem[] }) {
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0)

  return (
    <section>
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <h2 className="text-sm font-semibold text-foreground">تفاصيل الطلب</h2>
        </div>
        <div className="divide-y divide-border/40">
          {items.map((item, idx) => (
            <div key={item.id}
              className="px-4 py-3.5 flex items-start justify-between gap-3 transition-colors hover:bg-secondary/30"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 shrink-0 size-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {item.quantity}x
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ItemIcon />
                    <h4 className="font-medium text-foreground text-sm truncate">{item.product_name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ms-6">
                    {item.size}{item.sauce ? ` / ${SAUCES.find(s => s.id === Number(item.sauce))?.label || item.sauce}` : ""}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">{item.subtotal.toLocaleString("en-US")} <span className="text-xs font-normal text-muted-foreground">د.ج</span></span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3.5 bg-gradient-to-r from-primary/[0.04] to-transparent border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">الإجمالي</span>
            <span className="text-base font-bold text-primary">{subtotal.toLocaleString("en-US")} <span className="text-xs font-semibold">د.ج</span></span>
          </div>
        </div>
      </div>
    </section>
  )
}
