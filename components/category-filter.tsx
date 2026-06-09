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
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      {all.map((cat) => {
        const isSelected = cat === selectedCategory;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
              isSelected
                ? "bg-green-500 text-white border-green-500 shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:border-green-300 hover:text-green-600"
            }`}
          >
            {cat === "All" ? t("menu.all") : cat}
          </button>
        );
      })}
    </div>
  );
}
