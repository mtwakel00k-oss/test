"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"
import { logger } from "@/lib/logger"

interface ClearDataProps {
  onCleared?: () => void
}

export function ClearData({ onCleared }: ClearDataProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleClear = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetchApi("/api/admin/clear-data", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to clear data")
      }
      setStatus("success")
      logger.info("All test data cleared")
      setTimeout(() => {
        setOpen(false)
        setStatus(null)
        onCleared?.()
      }, 1200)
    } catch (e) {
      setStatus("error")
      logger.error("Clear data failed: " + (e instanceof Error ? e.message : String(e)))
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
          {t("admin.clearData")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">{t("admin.clearDataTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("admin.clearDataWarning")}
        </p>
        {status === "success" && (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t("admin.clearDataSuccess")}
          </p>
        )}
        {status === "error" && (
          <p className="text-sm font-medium text-destructive">
            {t("admin.clearDataError")}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClear}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? t("admin.clearing") : t("admin.confirmClear")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
