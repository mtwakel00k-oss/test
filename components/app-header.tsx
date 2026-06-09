"use client";

import { ShoppingBag, Sun, Moon, Store } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/tenant";
import { LanguageSwitcher } from "./language-switcher";

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
    <header className="sticky top-0 z-40 bg-transparent px-4 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onCart}
            className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm shadow-xs flex items-center justify-center relative hover:bg-card transition-colors border border-border/50"
            aria-label="Cart"
          >
            <ShoppingBag className="w-4 h-4 text-foreground" />
            {cartItemCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartItemCount > 9 ? "9+" : cartItemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm shadow-xs flex items-center justify-center hover:bg-card transition-colors border border-border/50"
            aria-label="Toggle theme"
          >
            <Sun className="w-4 h-4 text-muted-foreground hidden dark:block" />
            <Moon className="w-4 h-4 text-muted-foreground block dark:hidden" />
          </button>
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground leading-none">مطعمك</p>
            <h1 className="text-sm font-bold text-foreground truncate max-w-[100px] leading-tight">
              {tenant?.name || "Restaurant"}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-xs ring-2 ring-border shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={tenant?.name || "Logo"}
                className="w-full h-full object-cover block"
                onError={() => { console.error("Logo load failed", logoUrl) }}
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-0 pb-2">
        <div className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 shadow-xs border border-border/50">
          <div className="w-7 h-7 rounded-lg bg-primary-bg flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <span className="flex-1 text-sm text-muted-foreground text-right">ابحث عن وجبتك...</span>
          <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </header>
  );
}
