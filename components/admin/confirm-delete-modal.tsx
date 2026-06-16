"use client"

import { AlertTriangle, Trash2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface ConfirmDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
  confirmLabel?: string
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  loading,
  confirmLabel,
}: ConfirmDeleteModalProps) {
  const { t, lang } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md overflow-hidden p-0 gap-0"
        showCloseButton={false}
      >
        {/* Red accent bar at top */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-rose-500" />

        <div className="p-6">
          <DialogHeader className="p-0">
            <div className="flex items-start gap-4">
              {/* Animated icon */}
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/10 flex items-center justify-center shrink-0 ring-1 ring-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="space-y-2 min-w-0">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {t("common.confirmDelete")}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {t("common.confirmDeleteDesc")}{" "}
                  <span className="font-semibold text-foreground break-words">
                    {itemName}
                  </span>
                  {lang === "ar" ? "؟" : "?"}
                </DialogDescription>
                <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                  <span className="inline-block h-1 w-1 rounded-full bg-red-400/60" />
                  {t("common.irreversible")}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Subtle separator */}
          <div className="my-5 border-t border-border/40" />

          <DialogFooter className="p-0 flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none h-10 px-5 gap-2 text-sm font-medium"
            >
              <X className="h-4 w-4" />
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                "flex-1 sm:flex-none h-10 px-5 gap-2 text-sm font-semibold transition-all duration-200",
                !loading && "shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
              )}
            >
              <Trash2 className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? t("common.deleting") : (confirmLabel || t("common.delete"))}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
