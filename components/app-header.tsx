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
  isOpen?: boolean;
}

export function AppHeader({ cartItemCount, onCart, isOpen: propIsOpen }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [fetchedIsOpen, setFetchedIsOpen] = useState(true);

  const isOpen = propIsOpen !== undefined ? propIsOpen : fetchedIsOpen;

  useEffect(() => {
    fetchApi("/api/tenant/logo")
      .then((r) => r.json())
      .then((data: { name?: string; logo_url?: string | null; slug?: string; is_open?: boolean }) => {
        setTenant({
          name: data.name || "",
          slug: (data.slug as string) || "",
          logo_url: data.logo_url ?? null,
          role: "",
        });
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (typeof data.is_open === "boolean") setFetchedIsOpen(data.is_open);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 md:px-6">
      <div
        className={`mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full px-4 py-2.5 transition-all duration-700 ${
          isScrolled
            ? "glass shadow-[var(--shadow-md)]"
            : "border border-border/40 bg-card/60 shadow-[var(--shadow-sm)]"
        }`}
        style={{ transitionTimingFunction: "var(--ease-premium)" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="relative size-11 shrink-0 overflow-hidden rounded-2xl border border-primary/15 bg-primary/8 shadow-inner"
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={tenant?.name || "Logo"}
                fill
                sizes="44px"
                priority
                className="object-cover"
                onError={() => setLogoUrl(null)}
              />
            ) : (
              <div className="grid size-full place-items-center">
                <ShoppingBag className="size-5 text-primary" strokeWidth={1.5} />
              </div>
            )}
          </motion.div>
          <div className="min-w-0 flex flex-col">
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.32, 0.72, 0, 1] }}
              className="truncate text-base font-semibold leading-tight text-foreground"
            >
              {tenant?.name || "Restaurant"}
            </motion.h1>
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
              className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] ${isOpen ? "text-success" : "text-destructive"}`}
            >
              <span className={`size-1.5 rounded-full ${isOpen ? "bg-success" : "bg-destructive"} `} aria-hidden="true" />
              {isOpen ? "مفتوح الآن" : "مغلق"}
            </motion.span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageSwitcher />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="grid size-11 place-items-center rounded-full border border-border/40 bg-background/60 text-muted-foreground transition-all duration-500 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Toggle theme"
          >
            <Sun className="size-[18px] hidden dark:block" strokeWidth={1.5} />
            <Moon className="size-[18px] block dark:hidden" strokeWidth={1.5} />
          </button>
          <button
            onClick={onCart}
            aria-label={`${cartItemCount > 0 ? cartItemCount + " items in " : ""}Cart`}
            className="relative grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.5} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background ring-2 ring-background">
                {cartItemCount > 9 ? "9+" : cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
