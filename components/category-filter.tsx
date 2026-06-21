"use client";

import { useRef, useEffect } from "react";
import { useTranslation } from "@/lib/use-translation";
import { Sparkles } from "lucide-react";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const { t } = useTranslation();
  const all = ["All", ...categories];
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const offset = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [selectedCategory]);

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 scroll-smooth snap-x snap-mandatory" role="tablist" aria-label="تصفية حسب التصنيف">
        {all.map((cat) => {
          const isSelected = cat === selectedCategory;
          return (
            <button
              key={cat}
              ref={isSelected ? activeRef : null}
              onClick={() => onSelectCategory(cat)}
              role="tab"
              aria-selected={isSelected}
              className={`relative flex-shrink-0 snap-start whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-500 active:scale-95 ${
                isSelected
                  ? "bg-accent text-accent-foreground shadow-[0_0_20px_oklch(0.45_0.015_260/0.2)]"
                  : "border border-border/30 bg-card/50 text-muted-foreground/70 hover:border-accent/30 hover:text-foreground hover:bg-accent/5"
              }`}
            >
              {cat === "All" ? t("menu.all") : cat}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent z-10" />
    </div>
  );
}
