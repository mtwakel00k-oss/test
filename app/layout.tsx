import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import "./globals.css"
import { LangProvider } from "@/lib/lang-context"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/lib/theme"
import { Geist, Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import { scopeFromPath, scopedCookieKey } from "@/lib/i18n-scope";
import { OfflineDetector } from "@/components/offline-detector"
import { SentryBoundary } from "@/components/sentry-boundary"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://simploo.vercel.app"),
  title: {
    default: "RestoOS - Smart POS & Ordering System",
    template: "%s | RestoOS"
  },
  description: "Multi-tenant restaurant management system with POS, kitchen display, delivery tracking, and customer ordering.",
  keywords: ["restaurant", "pos", "ordering", "delivery", "kitchen", "management", "saas"],
  authors: [{ name: "RestoOS" }],
  creator: "RestoOS",
  publisher: "RestoOS",
  robots: "index, follow",
  alternates: {
    canonical: "https://simploo.vercel.app",
  },
  openGraph: {
    type: "website",
    url: "https://simploo.vercel.app",
    siteName: "RestoOS",
    title: "RestoOS - Smart Restaurant Management",
    description: "Complete restaurant management platform with POS, kitchen display, delivery tracking, and customer ordering.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RestoOS Dashboard"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "RestoOS - Smart Restaurant Management",
    description: "Complete restaurant management platform with POS, kitchen display, delivery tracking, and customer ordering.",
    images: ["/og-image.png"]
  },
  verification: {
    google: "google-site-verification-code"
  }
}

async function getLang(): Promise<"ar" | "en" | "fr"> {
  try {
    const c = await cookies()
    const h = await headers()
    const url = h.get("x-pathname") || h.get("x-url") || h.get("referer") || ""
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
  } catch {} /* cookie unavailable during static generation */

  return (
      <html suppressHydrationWarning lang={lang} dir={dir} data-locale={lang} className={cn(htmlClass, geist.variable, instrumentSerif.variable)}>
      <head>
        <link rel="preconnect" href="https://icefntwfwvtonkdyshde.supabase.co" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#09090b" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "RestoOS",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Cloud",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock"
              },
              description: "Multi-tenant restaurant management system with POS, kitchen display, delivery tracking, and customer ordering."
            })
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none">
          تخطي إلى المحتوى الرئيسي
        </a>
        <div id="bg-orbs" aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="orb-1 absolute rounded-full" />
          <div className="orb-2 absolute rounded-full" />
          <div className="orb-3 absolute rounded-full" />
          <div className="orb-4 absolute rounded-full" />
        </div>
        <LangProvider lang={lang}>
          <ThemeProvider>
            <SentryBoundary>
              <div id="main-content" role="main" tabIndex={-1}>
                {children}
              </div>
            </SentryBoundary>
            <Toaster />
            <OfflineDetector />
          </ThemeProvider>
        </LangProvider>
      </body>
    </html>
  )
}