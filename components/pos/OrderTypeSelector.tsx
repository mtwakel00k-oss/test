import { cn } from "@/lib/utils"
import type { OrderType } from "@/types/order"

interface OrderTypeSelectorProps {
  value: OrderType
  phone: string
  onTypeChange: (type: OrderType) => void
  onPhoneChange: (phone: string) => void
  phoneError: string
}

const OPTIONS: { value: OrderType; label: string }[] = [
  { value: "dine_in", label: "داخل المطعم" },
  { value: "takeaway", label: "طلب خارجي" },
  { value: "delivery", label: "توصيل" },
]

export function OrderTypeSelector({
  value,
  phone,
  onTypeChange,
  onPhoneChange,
  phoneError,
}: OrderTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        نوع الطلب
      </label>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onTypeChange(opt.value)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              value === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value === "delivery" && (
        <div className="space-y-1.5">
          <input
            type="tel"
            dir="ltr"
            maxLength={15}
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="رقم الهاتف (مثال: 0555123456)"
            className={cn(
              "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
              phoneError ? "border-destructive" : "border-border",
            )}
          />
          {phoneError && (
            <p className="text-xs text-destructive">{phoneError}</p>
          )}
        </div>
      )}
    </div>
  )
}
