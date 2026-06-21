"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"
import { useTheme } from "@/lib/theme"

interface PeakHour {
  hour: number
  orders: number
}

interface PeakHoursChartProps {
  data: PeakHour[]
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  const { t } = useTranslation()
  const isDark = useTheme().resolved === "dark"

  const chartData = Array.from({ length: 24 }, (_, h) => {
    const found = (data || []).find((d) => d.hour === h)
    return { hour: `${h.toString().padStart(2, "0")}:00`, orders: found?.orders ?? 0 }
  })

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl h-full rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-xl font-black text-foreground tracking-tight">{t("admin.peakHours")}</CardTitle>
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">{t("admin.peakHoursSub")}</p>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="hour"
                tick={{ fill: isDark ? '#9ca3af' : '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                dy={12}
                interval={2}
              />
              <YAxis
                tick={{ fill: isDark ? '#9ca3af' : '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={30}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--primary) / 0.05)', radius: 12 }}
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-[1.5rem] shadow-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{label}</p>
                        <p className="text-sm font-black text-foreground">{payload[0].value} {t("admin.orders")}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[8, 8, 8, 8]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
