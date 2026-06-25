"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
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
    <Card className="border-forest bg-evergreen rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-6 pb-0">
        <CardTitle className="text-lg font-bold text-ivory/90 tracking-tight">{t("admin.peakHours")}</CardTitle>
        <p className="text-xs text-ivory/40 mt-0.5">{t("admin.peakHoursSub")}</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full" style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(35,137,38,0.3)" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#FBFFF2", fontSize: 9, fontWeight: 400 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                dy={8}
                interval={3}
              />
              <YAxis
                tick={{ fill: "#FBFFF2", fontSize: 9, fontWeight: 400 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={24}
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
                cursor={{ fill: "rgba(37,233,112,0.06)" }}
              />
              <Bar
                dataKey="orders"
                fill="#25E970"
                radius={[6, 6, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-3 mt-4">
          <div className="flex-1 p-4 rounded-xl bg-white/[0.04] border border-forest/40 text-center">
            <p className="text-[10px] font-semibold text-ivory/40 uppercase tracking-wider mb-1">{t("admin.peakHours")}</p>
            <p className="text-lg font-bold text-malachite tracking-tight">{peakHour.hour}</p>
            <p className="text-[10px] text-ivory/40">{peakHour.orders} {t("admin.orders")}</p>
          </div>
          <div className="flex-1 p-4 rounded-xl bg-white/[0.04] border border-forest/40 text-center">
            <p className="text-[10px] font-semibold text-ivory/40 uppercase tracking-wider mb-1">{lang === "ar" ? "الإجمالي" : "Total"}</p>
            <p className="text-lg font-bold text-malachite tracking-tight">{fmtNum(totalOrders)}</p>
            <p className="text-[10px] text-ivory/40">{t("admin.orders")}</p>
          </div>
          <div className="flex-1 p-4 rounded-xl bg-white/[0.04] border border-forest/40 text-center">
            <p className="text-[10px] font-semibold text-ivory/40 uppercase tracking-wider mb-1">{lang === "ar" ? "ساعات نشطة" : "Active Hrs"}</p>
            <p className="text-lg font-bold text-malachite tracking-tight">{activeHours}</p>
            <p className="text-[10px] text-ivory/40">{lang === "ar" ? "ساعة" : "hrs"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
