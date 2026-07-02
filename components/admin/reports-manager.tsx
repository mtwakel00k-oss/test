"use client"

import { useState } from "react"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { FileText, Calendar, Download } from "lucide-react"

export function ReportsManager() {
  const { t } = useTranslation()
  const slug = useSlug()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0")
  const currentYear = String(now.getFullYear())

  const [dailyDate, setDailyDate] = useState(today)
  const [monthYear, setMonthYear] = useState(`${currentYear}-${currentMonth}`)

  const dailyUrl = `/api/admin/reports/daily?date=${dailyDate}`
  const monthlyUrl = `/api/admin/reports/monthly?year=${monthYear.split("-")[0]}&month=${monthYear.split("-")[1]}`

  const downloadReport = (url: string, filename: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10">
          <FileText className="w-4 h-4 text-accent" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-foreground tracking-tight">{t("reports.title")}</h2>
          <p className="text-xs text-muted-foreground/60">
            {t("reports.daily")} / {t("reports.monthly")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Report */}
        <div className="bg-card/40 border border-border/20 backdrop-blur-xl rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary/60" strokeWidth={1.5} />
            <h3 className="font-display text-sm font-bold text-foreground">{t("reports.daily")}</h3>
          </div>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">{t("reports.dailyDesc")}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={dailyDate}
              onChange={e => setDailyDate(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-muted/20 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => downloadReport(dailyUrl, `daily-report-${dailyDate}.pdf`)}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              {t("reports.download")}
            </button>
          </div>
        </div>

        {/* Monthly Report */}
        <div className="bg-card/40 border border-border/20 backdrop-blur-xl rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary/60" strokeWidth={1.5} />
            <h3 className="font-display text-sm font-bold text-foreground">{t("reports.monthly")}</h3>
          </div>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">{t("reports.monthlyDesc")}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="month"
              value={monthYear}
              onChange={e => setMonthYear(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-muted/20 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => downloadReport(monthlyUrl, `monthly-report-${monthYear}.pdf`)}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              {t("reports.download")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
