"use client";

import { useRef, useEffect } from "react";
import { useTranslation } from "@/lib/use-translation";


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
              className={`relative flex-shrink-0 snap-start whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 border border-primary/20"
                  : "border border-border/30 bg-card/80 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5"
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
