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
    <Card className="border-border/50 bg-card h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{t("admin.revenueTrend")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.revenueTrendSub")}</p>
          </div>
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {periods.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onPeriodChange(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
<XAxis dataKey="date" tick={{ fill: '#a1a1aa' }} stroke="#374151" fontSize={12} tickLine={false} axisLine={false} dy={10} />
<YAxis
  tick={{ fill: '#a1a1aa' }}
  stroke="#374151"
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
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ fill: "#22c55e", r: 4, stroke: "#16a34a", strokeWidth: 2 }}
                activeDot={{ r: 8, fill: "#22c55e", stroke: "#15803d", strokeWidth: 2 }}
                filter="url(#glow)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("admin.totalRevenue")} ({period === "7d" ? t("admin.week") : period === "30d" ? t("admin.month") : period === "6m" ? t("admin.sixMonths") : t("admin.year")})</p>
            <p className="text-2xl font-bold text-foreground">
              {fmtNum(data.reduce((s, d) => s + d.revenue, 0))} {currency}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
