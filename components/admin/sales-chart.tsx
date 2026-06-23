"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"

type Period = "7d" | "30d" | "6m" | "12m"

interface SalesChartProps {
  data: { date: string; revenue: number }[]
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
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
<XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
<YAxis
  tick={{ fill: 'hsl(var(--muted-foreground))' }}
  stroke="hsl(var(--border))"
  fontSize={12}
  tickLine={false}
  axisLine={false}
  tickFormatter={(v: number) => `${fmtNum(v)} ${currency}`}
  dx={-10}
  width={60}
/>
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-xl p-3">
                        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
                        <p className="text-sm text-foreground">{fmtNum(Number(payload[0].value))} {currency}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--success))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--success))", r: 4, stroke: "hsl(var(--success-foreground))", strokeWidth: 2 }}
                activeDot={{ r: 8, fill: "hsl(var(--success))", stroke: "hsl(var(--success-foreground))", strokeWidth: 2 }}
                filter="url(#glow)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 p-6 rounded-[1.5rem] bg-primary/5 border border-primary/10 mx-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">{t("admin.totalRevenue")} ({period === "7d" ? t("admin.week") : period === "30d" ? t("admin.month") : period === "6m" ? t("admin.sixMonths") : t("admin.year")})</p>
              <p className="text-3xl font-black text-foreground tracking-tighter">
                {fmtNum(data.reduce((s, d) => s + d.revenue, 0))} <span className="text-sm opacity-40">{currency}</span>
              </p>
            </div>
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
