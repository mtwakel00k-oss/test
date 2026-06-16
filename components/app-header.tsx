"use client";

import { ShoppingBag, Sun, Moon } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/tenant";
import { LanguageSwitcher } from "@/components/language-switcher";
import { motion } from "framer-motion";

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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    fetchApi("/api/tenant/logo")
      .then((r) => r.json())
      .then((data: { name?: string; logo_url?: string | null; slug?: string }) => {
        setTenant({
          name: data.name || "",
          slug: (data.slug as string) || "",
          logo_url: data.logo_url ?? null,
          role: "",
        });
        if (data.logo_url) setLogoUrl(data.logo_url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
          : "bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm"
      }`}
    >
      <div className="mx-auto max-w-2xl px-4 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="size-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center overflow-hidden shrink-0 border border-emerald-500/20 shadow-inner relative"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={tenant?.name || "Logo"}
                  fill
                  sizes="44px"
                  className="object-cover"
                  onError={() => setLogoUrl(null)}
                />
              ) : (
                <ShoppingBag className="w-6 h-6 text-emerald-600" />
              )}
            </motion.div>
            <div className="flex flex-col min-w-0">
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="text-base font-black text-foreground truncate leading-tight"
              >
                {tenant?.name || "Restaurant"}
              </motion.h1>
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="text-[10px] font-bold text-emerald-6000/70 uppercase tracking-widest"
              >
                مفتوح الآن
              </motion.span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
              <LanguageSwitcher />
            </motion.div>

            <motion.button
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-foreground/70 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95"
              aria-label="Toggle theme"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sun className="w-5 h-5 hidden dark:block" />
              <Moon className="w-5 h-5 block dark:hidden" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              onClick={onCart}
              className="relative p-2.5 rounded-xl bg-emerald-600 text-emerald-foreground shadow-lg shadow-emerald-500/30 hover:bg-emerald-500 active:scale-[0.97] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute -top-1.5 -end-1.5 size-5 bg-foreground text-background text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-background"
                >
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}