"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface TopProduct {
  name: string
  quantity: number
}

interface TopProductsProps {
  data: TopProduct[]
}

const bgColors = ["bg-gradient-to-br from-malachite to-forest", "bg-gradient-to-br from-forest to-malachite/60", "bg-gradient-to-br from-amber-500 to-orange-600", "bg-gradient-to-br from-violet-500 to-purple-600", "bg-gradient-to-br from-rose-500 to-pink-600"]

export function TopProducts({ data }: TopProductsProps) {
  const { t } = useTranslation()
  const items = data || []
  const maxQty = items.length ? Math.max(...items.map((d) => d.quantity), 1) : 1

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl h-full rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-xl font-black text-foreground tracking-tight">{t("admin.topProducts")}</CardTitle>
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">{t("admin.topProductsSub")}</p>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <div className="space-y-6">
          {items.map((item, i) => (
            <div key={item.name} className="flex items-center gap-6 group">
              <div
                className={cn(
                  "size-10 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg transition-transform group-hover:scale-110",
                  bgColors[i % bgColors.length],
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">{item.name}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest shrink-0 ms-2">{item.quantity} {t("admin.sold")}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden border border-border/50 p-0.5">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out", bgColors[i % bgColors.length])}
                    style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("order.noOrders")}</p>
        )}
      </CardContent>
    </Card>
  )
}
