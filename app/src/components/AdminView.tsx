"use client";

/**
 * Admin view — live, read-only overview of ALL rooms' content (2.1).
 * Full-screen overlay; updates in real time as officers type.
 * - Text boxes with content are shown; empty boxes are hidden.
 * - Rooms with no content at all are still listed, marked "No content yet".
 * Uses silent observer connections (no presence shown in any room).
 * Warm ivory palette (2.1.1).
 */

import { useEffect, useState } from "react";
import { observeRooms } from "@/lib/yjs";
import { ROOM_FIELDS } from "@/config/rooms";

interface AdminViewProps {
  roomIds: string[];
  roomNames: string[];
  onClose: () => void;
}

export default function AdminView({ roomIds, roomNames, onClose }: AdminViewProps) {
  const [contents, setContents] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const close = observeRooms(roomIds, setContents);
    return close;
  }, [roomIds]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F7F3EA]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FFFDF8] border-b border-[#EAE2D2]">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-brand-800">Admin</h2>
          <span className="text-[11px] text-[#91887C] truncate">All rooms · live</span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md text-xs font-medium
                     bg-[#FAF6EC] text-[#7C7263] border border-[#E6DDCB]
                     hover:bg-[#F3EDDF] active:scale-[0.97] transition-all
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9BFAE]"
        >
          ✕ Close
        </button>
      </div>

      {/* Live room cards — every room listed; empty boxes hidden, empty rooms marked */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {roomIds.map((id, i) => {
          const nonEmpty = ROOM_FIELDS.filter(
            (field) => (contents[id]?.[field.id] ?? "").trim() !== ""
          );

          return (
            <section
              key={id}
              className="bg-[#FFFDF8] rounded-2xl border border-[#EAE2D2] shadow-[0_1px_3px_rgba(15,28,44,0.08)] overflow-hidden"
            >
              <header className="px-4 py-2 border-b border-[#EFE8DA] bg-[#FAF6EE]">
                <h3 className="text-sm font-bold text-brand-800 truncate">{roomNames[i] ?? id}</h3>
              </header>

              {nonEmpty.length === 0 ? (
                <div className="px-4 py-3 text-[13px] italic text-[#C6BCAA]">No content yet</div>
              ) : (
                <div className="divide-y divide-[#EFE8DA]">
                  {nonEmpty.map((field) => (
                    <div key={field.id} className="px-4 py-3">
                      <span className="block mb-1 text-xs font-semibold text-brand-700">
                        {field.label}
                      </span>
                      <pre className="text-[13px] leading-relaxed text-[#3B352B] whitespace-pre-wrap break-words font-sans">
                        {contents[id][field.id]}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 text-center text-[11px] text-[#A79D8D] border-t border-[#EAE2D2] bg-[#FFFDF8]/70">
        Read-only · updates in real-time
      </div>
    </div>
  );
}
