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
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
      {all.map((cat) => {
        const isSelected = cat === selectedCategory;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {cat === "All" ? t("menu.all") : cat}
          </button>
        );
      })}
    </div>
  );
}
