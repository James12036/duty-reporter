"use client";

/**
 * Admin view — live, read-only overview of ALL rooms' current content.
 * Full-screen overlay; updates in real time as officers type.
 * Uses silent observer connections (no presence shown in any room).
 */

import { useEffect, useState } from "react";
import { observeRooms } from "@/lib/yjs";

interface AdminViewProps {
  roomIds: string[];
  roomNames: string[];
  onClose: () => void;
}

export default function AdminView({ roomIds, roomNames, onClose }: AdminViewProps) {
  const [contents, setContents] = useState<Record<string, string>>({});

  useEffect(() => {
    const close = observeRooms(roomIds, setContents);
    return close;
  }, [roomIds]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f7f6f3]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-brand-800">Admin</h2>
          <span className="text-[11px] text-gray-500 truncate">All rooms · live</span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md text-xs font-medium
                     bg-gray-100 text-gray-700 border border-gray-200
                     hover:bg-gray-200 active:scale-[0.97] transition-all
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          ✕ Close
        </button>
      </div>

      {/* Live room cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {roomIds.map((id, i) => {
          const text = contents[id] ?? "";
          const trimmed = text.trim();
          const words = trimmed ? trimmed.split(/\s+/).length : 0;
          return (
            <section
              key={id}
              className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(15,28,44,0.08)] overflow-hidden"
            >
              <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/70">
                <h3 className="text-sm font-bold text-brand-800 truncate">
                  {roomNames[i] ?? id}
                </h3>
                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                  ~{words} words
                </span>
              </header>
              <pre className="px-4 py-3 text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words font-sans min-h-[2.5rem]">
                {trimmed ? text : <span className="text-gray-300 italic">(empty)</span>}
              </pre>
            </section>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 text-center text-[11px] text-gray-400 border-t border-gray-100 bg-white/70">
        Read-only · updates in real-time
      </div>
    </div>
  );
}
