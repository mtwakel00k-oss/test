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
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 scroll-smooth snap-x snap-mandatory">
        {all.map((cat) => {
          const isSelected = cat === selectedCategory;
          return (
            <button
              key={cat}
              ref={isSelected ? activeRef : null}
              onClick={() => onSelectCategory(cat)}
              className={`relative flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/30"
              }`}
            >
              {cat === "All" ? t("menu.all") : cat}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
    </div>
  );
}
