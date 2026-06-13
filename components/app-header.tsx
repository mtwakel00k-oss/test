"use client";

import { ShoppingBag, Sun, Moon, Languages } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/tenant";

interface TenantData {
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
}

interface AppHeaderProps {
  cartItemCount: number;
  onCart: () => void;
}

export function AppHeader({ cartItemCount, onCart }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchApi("/api/tenant/logo")
      .then((r) => r.json())
      .then((data: { name?: string; logo_url?: string | null; slug?: string }) => {
        setTenant({
          name: data.name || "",
          slug: (data.slug as string) || "",
          logo_url: data.logo_url ?? null,
          role: "",
        })
        if (data.logo_url) setLogoUrl(data.logo_url);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm transition-all">
      <div className="mx-auto max-w-2xl px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-primary/20 shadow-inner">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt={tenant?.name || "Logo"} className="w-full h-full object-cover block" onError={() => { console.error("Logo load failed", logoUrl) }} />
              ) : (
                <ShoppingBag className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base font-black text-foreground truncate leading-tight">
                {tenant?.name || "Restaurant"}
              </h1>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">مفتوح الآن</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-foreground/70 hover:text-foreground"
              aria-label="Change language"
            >
              <Languages className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-foreground/70 hover:text-foreground"
              aria-label="Toggle theme"
            >
              <Sun className="w-5 h-5 hidden dark:block" />
              <Moon className="w-5 h-5 block dark:hidden" />
            </button>

            <button 
              onClick={onCart} 
              className="relative p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 size-5 bg-foreground text-background text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-background">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
