import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import "./globals.css"
import { LangProvider } from "@/lib/lang-context"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/lib/theme"
import { Geist, Tajawal } from "next/font/google";
import { cn } from "@/lib/utils";
import { scopeFromPath, scopedCookieKey } from "@/lib/i18n-scope";
import { OfflineDetector } from "@/components/offline-detector"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "Burger House - Order Your Favorites",
  description: "Order your favorite meals from Burger House with fast delivery",
}

async function getLang(): Promise<"ar" | "en" | "fr"> {
  try {
    const c = await cookies()
    const h = await headers()
    const url = h.get("x-url") || h.get("referer") || ""
    const scope = scopeFromPath(url)
    const key = scopedCookieKey(scope)
    const lang = c.get(key)?.value
    if (lang === "en" || lang === "fr") return lang
    return "ar"
  } catch {
    return "ar"
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang()
  const dir = lang === "ar" ? "rtl" : "ltr"

  let htmlClass = ""
  try {
    const c = await cookies()
    const theme = c.get("theme")?.value
    if (theme === "dark") htmlClass = "dark"
  } catch {}

  return (
    <html suppressHydrationWarning lang={lang} dir={dir} data-locale={lang} className={cn(htmlClass, geist.variable, tajawal.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#09090b" />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <LangProvider lang={lang}>
          <ThemeProvider>
            {children}
            <Toaster />
            <OfflineDetector />
          </ThemeProvider>
        </LangProvider>
      </body>
    </html>
  )
}