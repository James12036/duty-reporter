"use client";

/**
 * CategoryTabs — Horizontal scrollable tab bar for category selection.
 * Mobile-optimized: snaps to items, no horizontal overflow cutoff.
 */

import { CATEGORIES } from "@/config/categories";
import type { Category } from "@/config/categories";

interface CategoryTabsProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function CategoryTabs({ activeId, onSelect }: CategoryTabsProps) {
  return (
    <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-2 py-2 gap-1">
        {CATEGORIES.map((cat: Category) => {
          const isActive = activeId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`
                flex-shrink-0 snap-start px-3.5 py-2 text-sm font-medium
                whitespace-nowrap rounded-lg border transition-all duration-200
                active:scale-[0.96]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                ${isActive
                  ? `${cat.active} shadow-sm`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <span className="mr-1.5 text-base align-middle">{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
