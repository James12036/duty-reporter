"use client";

/**
 * RoomTabs — Horizontal scrollable tab bar for the 7 rooms.
 * Labels are the shared, editable room names (fall back to "Room N").
 * Warm ivory palette (2.1.2).
 */

import { ROOMS } from "@/config/rooms";

interface RoomTabsProps {
  activeId: string;
  names: string[];
  onSelect: (id: string) => void;
}

export default function RoomTabs({ activeId, names, onSelect }: RoomTabsProps) {
  return (
    <nav className="sticky top-0 z-20 bg-[#F7F3EA]/95 backdrop-blur-sm border-b border-[#EAE2D2] shadow-sm">
      <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-2 py-2 gap-1">
        {ROOMS.map((room, i) => {
          const isActive = activeId === room.id;
          const label = names[i] || room.defaultName;
          return (
            <button
              key={room.id}
              onClick={() => onSelect(room.id)}
              className={`
                flex-shrink-0 snap-start px-3.5 py-2 text-sm font-medium
                whitespace-nowrap rounded-lg border transition-all duration-200
                active:scale-[0.96]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                ${
                  isActive
                    ? `${room.active} shadow-sm`
                    : "border-transparent text-[#8A8174] hover:text-[#5D564B] hover:bg-[#EFE8DA]"
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
