"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"

interface PeakHour {
  hour: number
  orders: number
}

interface PeakHoursChartProps {
  data: PeakHour[]
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  const { t } = useTranslation()

  const chartData = Array.from({ length: 24 }, (_, h) => {
    const found = (data || []).find((d) => d.hour === h)
    return { hour: `${h.toString().padStart(2, "0")}:00`, orders: found?.orders ?? 0 }
  })

  return (
    <Card className="border-border/50 bg-card h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">{t("admin.peakHours")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.peakHoursSub")}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
<XAxis
  dataKey="hour"
  tick={{ fill: '#a1a1aa' }}
  stroke="#374151"
  fontSize={10}
  tickLine={false}
  axisLine={false}
  dy={8}
  interval={2}
/>
<YAxis
  tick={{ fill: '#a1a1aa' }}
  stroke="#374151"
  fontSize={12}
  tickLine={false}
  axisLine={false}
  allowDecimals={false}
  width={30}
/>
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-xl p-3">
                        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
                        <p className="text-sm text-foreground">{payload[0].value} {t("admin.orders")}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="orders" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
