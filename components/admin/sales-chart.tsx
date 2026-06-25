"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"

type Period = "7d" | "30d" | "6m" | "12m"

interface SalesChartProps {
  data: { date: string; revenue: number; orders: number }[]
  period: Period
  onPeriodChange: (p: Period) => void
}

export function SalesChart({ data, period, onPeriodChange }: SalesChartProps) {
  const { t, lang } = useTranslation()

  const periods: { key: Period; label: string }[] = [
    { key: "7d", label: t("admin.week") },
    { key: "30d", label: t("admin.month") },
    { key: "6m", label: t("admin.sixMonths") },
    { key: "12m", label: t("admin.year") },
  ]

  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const currency = lang === "ar" ? "د.ج" : "DA"

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = data.reduce((s, d) => s + d.orders, 0)

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl h-full rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-foreground tracking-tight">{t("admin.revenueTrend")}</CardTitle>
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{t("admin.revenueTrendSub")}</p>
          </div>
          <div className="flex gap-1.5 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
            {periods.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onPeriodChange(key)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${
                  period === key
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.05]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full" style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                stroke="hsl(var(--border))"
                tickLine={false}
                axisLine={false}
                dy={10}
                tickFormatter={(v: string) => {
                  const d = v.slice(5)
                  return d.startsWith("0") ? d.slice(1) : d
                }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                stroke="hsl(var(--border))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${fmtNum(v)}`}
                dx={-10}
                width={70}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                stroke="hsl(var(--border))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}`}
                dx={10}
                width={50}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    const rev = payload.find(p => p.dataKey === "revenue")
                    const ord = payload.find(p => p.dataKey === "orders")
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-xl p-4 space-y-2">
                        <p className="text-sm font-bold text-foreground">{label}</p>
                        {rev && (
                          <p className="text-xs font-semibold" style={{ color: "hsl(var(--success))" }}>
                            {t("admin.revenue")}: {fmtNum(Number(rev.value))} {currency}
                          </p>
                        )}
                        {ord && (
                          <p className="text-xs font-semibold" style={{ color: "hsl(var(--accent))" }}>
                            {t("admin.orders")}: {fmtNum(Number(ord.value))}
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-xs font-semibold text-foreground">{value === "revenue" ? t("admin.revenue") : t("admin.orders")}</span>
                )}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--success))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--success))", r: 4 }}
                activeDot={{ r: 7, fill: "hsl(var(--success))", stroke: "hsl(var(--background))", strokeWidth: 3 }}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--accent))"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                dot={{ fill: "hsl(var(--accent))", r: 3 }}
                activeDot={{ r: 6, fill: "hsl(var(--accent))", stroke: "hsl(var(--background))", strokeWidth: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 mx-2 mb-2">
          <div className="p-5 rounded-[1.5rem] bg-success/5 border border-success/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-success/60 mb-1">{t("admin.totalRevenue")}</p>
            <p className="text-2xl font-black text-foreground tracking-tighter">
              {fmtNum(totalRevenue)} <span className="text-xs opacity-40">{currency}</span>
            </p>
          </div>
          <div className="p-5 rounded-[1.5rem] bg-accent/5 border border-accent/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent/60 mb-1">{t("admin.totalOrders")}</p>
            <p className="text-2xl font-black text-foreground tracking-tighter">
              {fmtNum(totalOrders)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
