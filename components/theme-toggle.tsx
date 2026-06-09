"use client"

import { useTheme } from "@/lib/theme"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  const toggle = () => {
    const isDark = document.documentElement.classList.contains("dark")
    const t = isDark ? "light" : "dark"
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      ;(document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => setTheme(t))
    } else {
      setTheme(t)
    }
  }

  return (
    <button onClick={toggle}
      className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all overflow-hidden"
      aria-label="Toggle theme">
      <span className="absolute transition-all duration-300 rotate-0 scale-100 dark:-rotate-90 dark:scale-0">
        <Moon className="h-4 w-4" />
      </span>
      <span className="absolute transition-all duration-300 rotate-90 scale-0 dark:rotate-0 dark:scale-100">
        <Sun className="h-4 w-4" />
      </span>
    </button>
  )
}
