"use client";

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
  return (
    <div className="relative -mx-4">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 px-4 scroll-smooth">
        {all.map((cat) => {
          const isSelected = cat === selectedCategory;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`relative px-6 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all duration-300 active:scale-95 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {cat === "All" ? t("menu.all") : cat}
              {isSelected && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-foreground/50" />
              )}
            </button>
          );
        })}
      </div>
      {/* Fading Edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
    </div>
  );
}
