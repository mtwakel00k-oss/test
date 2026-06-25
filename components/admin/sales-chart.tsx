"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
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
    <Card className="border-forest bg-evergreen rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-ivory/90 tracking-tight">{t("admin.revenueTrend")}</CardTitle>
            <p className="text-xs text-ivory/40">{t("admin.revenueTrendSub")}</p>
          </div>
          <div className="flex gap-1.5 bg-white/[0.04] p-1.5 rounded-xl border border-forest/50">
            {periods.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onPeriodChange(key)}
                className={`px-4 py-2 text-[11px] font-semibold rounded-lg transition-all duration-300 ${
                  period === key
                    ? "bg-malachite text-evergreen shadow-sm"
                    : "text-ivory/50 hover:text-ivory/80 hover:bg-white/[0.04]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#25E970" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#25E970" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(35,137,38,0.3)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#FBFFF2", fontSize: 11, fontWeight: 400 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                dy={10}
                tickFormatter={(v: string) => {
                  const d = v.slice(5)
                  return d.startsWith("0") ? d.slice(1) : d
                }}
              />
              <YAxis
                tick={{ fill: "#FBFFF2", fontSize: 11, fontWeight: 400 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${fmtNum(v)}`}
                width={70}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(2,37,9,0.95)",
                  border: "1px solid rgba(35,137,38,0.5)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
                labelStyle={{ color: "#FBFFF2", fontWeight: 700, fontSize: 13 }}
                itemStyle={{ color: "#25E970", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#25E970"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                dot={false}
                activeDot={{ r: 5, fill: "#25E970", stroke: "#022509", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-4 mt-6">
          <div className="flex-1 p-5 rounded-xl bg-white/[0.04] border border-forest/40">
            <p className="text-[11px] font-semibold text-ivory/40 uppercase tracking-wider mb-1">{t("admin.totalRevenue")}</p>
            <p className="text-2xl font-bold text-malachite tracking-tight">
              {fmtNum(totalRevenue)} <span className="text-xs text-malachite/60">{currency}</span>
            </p>
          </div>
          <div className="flex-1 p-5 rounded-xl bg-white/[0.04] border border-forest/40">
            <p className="text-[11px] font-semibold text-ivory/40 uppercase tracking-wider mb-1">{t("admin.totalOrders")}</p>
            <p className="text-2xl font-bold text-malachite tracking-tight">
              {fmtNum(totalOrders)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
