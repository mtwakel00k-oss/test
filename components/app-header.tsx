"use client";

import { ShoppingBag, Sun, Moon, Store } from "lucide-react";
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
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt={tenant?.name || "Logo"} className="w-full h-full object-cover block" onError={() => { console.error("Logo load failed", logoUrl) }} />
              ) : (
                <Store className="w-5 h-5 text-primary" />
              )}
            </div>
            <h1 className="text-lg font-bold text-foreground truncate max-w-[130px] sm:max-w-[180px]">
              {tenant?.name || "Restaurant"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              aria-label="Toggle theme"
            >
              <Sun className="w-5 h-5 text-foreground hidden dark:block" />
              <Moon className="w-5 h-5 text-foreground block dark:hidden" />
            </button>

            <button onClick={onCart} className="relative p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
              <ShoppingBag className="w-5 h-5 text-foreground" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -end-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
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
