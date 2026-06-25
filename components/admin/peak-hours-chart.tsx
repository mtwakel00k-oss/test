"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"
import { useMemo } from "react"

interface PeakHour {
  hour: number
  orders: number
}

interface PeakHoursChartProps {
  data: PeakHour[]
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  const { t, lang } = useTranslation()

  const chartData = useMemo(() =>
    Array.from({ length: 24 }, (_, h) => {
      const found = (data || []).find((d) => d.hour === h)
      return { hour: `${h.toString().padStart(2, "00")}:00`, orders: found?.orders ?? 0 }
    }), [data])

  const peakHour = useMemo(() => {
    let max = 0; let maxH = ""
    for (const d of chartData) { if (d.orders > max) { max = d.orders; maxH = d.hour } }
    return { hour: maxH, orders: max }
  }, [chartData])

  const totalOrders = chartData.reduce((s, d) => s + d.orders, 0)
  const activeHours = chartData.filter(d => d.orders > 0).length
  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl h-full rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-xl font-black text-foreground tracking-tight">{t("admin.peakHours")}</CardTitle>
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">{t("admin.peakHoursSub")}</p>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="hour"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 700 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={3}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 700 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickMargin={8}
                width={30}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-xl p-3">
                        <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm font-black text-foreground">
                          {fmtNum(Number(payload[0].value))} {t("admin.orders")}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                fill="url(#areaFill)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(var(--chart-1))", stroke: "hsl(var(--background))", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-3 mt-4 mx-1">
          <div className="flex-1 p-4 rounded-xl bg-chart-1/5 border border-chart-1/10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-chart-1/60 mb-0.5">{t("admin.peakHours")}</p>
            <p className="text-lg font-black text-foreground">{peakHour.hour}</p>
            <p className="text-[10px] text-muted-foreground/60">{peakHour.orders} {t("admin.orders")}</p>
          </div>
          <div className="flex-1 p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-0.5">{lang === "ar" ? "الإجمالي" : lang === "fr" ? "Total" : "Total"}</p>
            <p className="text-lg font-black text-foreground">{fmtNum(totalOrders)}</p>
            <p className="text-[10px] text-muted-foreground/60">{t("admin.orders")}</p>
          </div>
          <div className="flex-1 p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">{lang === "ar" ? "ساعات نشطة" : lang === "fr" ? "Heures actives" : "Active Hours"}</p>
            <p className="text-lg font-black text-foreground">{activeHours}</p>
            <p className="text-[10px] text-muted-foreground/60">{lang === "ar" ? "ساعة" : lang === "fr" ? "h" : "hrs"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
