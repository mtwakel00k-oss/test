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

const bgColors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"]

export function TopProducts({ data }: TopProductsProps) {
  const { t } = useTranslation()
  const items = data || []
  const maxQty = items.length ? Math.max(...items.map((d) => d.quantity), 1) : 1

  return (
    <Card className="border-border/50 bg-card h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">{t("admin.topProducts")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.topProductsSub")}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={item.name} className="flex items-center gap-4">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0",
                  bgColors[i % bgColors.length],
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                  <span className="text-sm text-muted-foreground shrink-0 ms-2">{item.quantity} {t("admin.sold")}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", bgColors[i % bgColors.length])}
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
