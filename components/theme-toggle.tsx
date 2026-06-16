"use client"

import { useTheme } from "@/lib/theme"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  const toggle = () => {
    const isDark = document.documentElement.classList.contains("dark")
    const t = isDark ? "light" : "dark"
    const d = document as Document & { startViewTransition: (cb: () => void) => void }
    if (d.startViewTransition) {
      d.startViewTransition(() => setTheme(t))
    } else {
      setTheme(t)
    }
  }

  return (
    <button onClick={toggle}
      className="h-9 w-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
      aria-label="Toggle theme">
      <span className="block">
        <Sun className="h-4 w-4 hidden dark:block" />
        <Moon className="h-4 w-4 block dark:hidden" />
      </span>
    </button>
  )
}
