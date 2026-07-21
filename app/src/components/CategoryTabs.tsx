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
      <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mb-px">
        {CATEGORIES.map((cat: Category) => {
          const isActive = activeId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`
                flex-shrink-0 snap-start px-4 py-3 text-sm font-medium
                whitespace-nowrap border-b-2 transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                ${isActive
                  ? `${cat.color} text-brand-700 bg-brand-50/50`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
