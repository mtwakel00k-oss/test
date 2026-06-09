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
    <header className="sticky top-0 z-40 bg-transparent px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt={tenant?.name || "Logo"} className="w-full h-full object-cover rounded-full" onError={() => { console.error("Logo load failed", logoUrl) }} />
            ) : (
              <Store className="w-4 h-4 text-green-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 leading-none">مطعمك</p>
            <h1 className="text-sm font-black text-slate-800 truncate max-w-[140px]">
              {tenant?.name || "Restaurant"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center"
            aria-label="Toggle theme"
          >
            <Sun className="w-4 h-4 text-slate-600 hidden dark:block" />
            <Moon className="w-4 h-4 text-slate-600 block dark:hidden" />
          </button>
          <button
            onClick={onCart}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center relative"
          >
            <ShoppingBag className="w-4 h-4 text-slate-700" />
            {cartItemCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {cartItemCount > 9 ? "9+" : cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100">
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-slate-400 flex-1">ابحث عن وجبتك...</span>
        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
      </div>
    </header>
  );
}
