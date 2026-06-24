"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"

interface UnauthorizedAccessProps {
  message?: string
  returnHref?: string
  returnLabel?: string
}

export function UnauthorizedAccess({
  message = "عذراً، هذه الصفحة مخصصة لإدارة المطعم فقط.",
  returnHref,
  returnLabel = "العودة إلى الصفحة الرئيسية",
}: UnauthorizedAccessProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="relative max-w-md w-full"
      >
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary/5 to-transparent blur-3xl" />
        </div>
        <div className="bg-card/40 border border-white/5 rounded-2xl backdrop-blur-sm p-8 text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20">
            <Lock className="size-7 text-rose-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-lg font-bold text-foreground">
              لا توجد صلاحية
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={() => router.push(returnHref || "/")}
            className="inline-flex items-center gap-2 rounded-xl bg-accent/15 px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/25"
          >
            {returnLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
