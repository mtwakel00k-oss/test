"use client"

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-card rounded-xl border border-border p-6 w-full max-w-sm mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
        <div className="flex gap-2 mt-6">
          <button onClick={onCancel}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >{cancelLabel}</button>
          <button onClick={onConfirm}
            className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2.5 text-sm font-semibold hover:bg-destructive/90 transition-colors"
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
