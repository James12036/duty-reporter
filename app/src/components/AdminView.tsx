"use client";

/**
 * Admin view — live, read-only overview of ALL rooms' content (2.1.2).
 * Full-screen overlay; updates in real time as officers type.
 * - Text boxes with content are shown; empty boxes are hidden.
 * - Rooms with no content at all are still listed, marked "No content yet".
 * - Header actions: 📥 Download｜📋 Copy All｜📋 Copy EOS & Overlapping｜✕ Close.
 *   Copy All = every field; Copy EOS & Overlapping = only EOS + Overlapping.
 * - Copy output is plain room blocks — NO heading, time or "=" separator lines.
 * Uses silent observer connections (no presence shown in any room).
 * Warm ivory palette.
 */

import { useEffect, useState } from "react";
import { observeRooms, collectAllContent, downloadAsFile } from "@/lib/yjs";
import { ROOM_FIELDS } from "@/config/rooms";
import type { RoomFieldId } from "@/config/rooms";

interface AdminViewProps {
  roomIds: string[];
  roomNames: string[];
  onClose: () => void;
}

/**
 * Build plain text for the given fields across all rooms.
 * Format per room: "[Name]" then "Label:" + content for each non-empty field;
 * rooms with nothing in the selected fields show "No content yet".
 * No heading, no timestamp, no "=" separator.
 */
function buildCopyText(
  roomIds: string[],
  roomNames: string[],
  contents: Record<string, Record<string, string>>,
  fieldIds: readonly RoomFieldId[]
): string {
  const only = ROOM_FIELDS.filter((f) => fieldIds.includes(f.id));
  const lines: string[] = [];

  roomIds.forEach((id, i) => {
    lines.push(`[${roomNames[i] ?? id}]`);
    const fields = contents[id] ?? {};
    const nonEmpty = only.filter((f) => (fields[f.id] ?? "").trim() !== "");

    if (nonEmpty.length === 0) {
      lines.push("No content yet");
    } else {
      nonEmpty.forEach((f, j) => {
        if (j > 0) lines.push("");
        lines.push(`${f.label}:`);
        lines.push((fields[f.id] ?? "").trim());
      });
    }
    lines.push("");
  });

  return lines.join("\n").trimEnd() + "\n";
}

/** Copy text to the clipboard (native API, with a legacy fallback). */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

type CopyMode = "all" | "eos";

export default function AdminView({ roomIds, roomNames, onClose }: AdminViewProps) {
  const [contents, setContents] = useState<Record<string, Record<string, string>>>({});
  const [copiedMode, setCopiedMode] = useState<CopyMode | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const close = observeRooms(roomIds, setContents);
    return close;
  }, [roomIds]);

  const flashCopied = (mode: CopyMode) => {
    setCopiedMode(mode);
    window.setTimeout(() => setCopiedMode(null), 1800);
  };

  const handleCopyAll = async () => {
    const text = buildCopyText(roomIds, roomNames, contents, ["eos", "overlapping", "others"]);
    if (await copyToClipboard(text)) flashCopied("all");
  };

  const handleCopyEosOverlapping = async () => {
    const text = buildCopyText(roomIds, roomNames, contents, ["eos", "overlapping"]);
    if (await copyToClipboard(text)) flashCopied("eos");
  };

  // Download all rooms' content as .txt (moved here from the main page in 2.1.2)
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const content = await collectAllContent(roomIds, roomNames);
      const date = new Date().toISOString().slice(0, 10);
      downloadAsFile(`duty-report-${date}.txt`, content);
    } finally {
      setDownloading(false);
    }
  };

  const headerBtn =
    "inline-flex items-center justify-center h-[30px] w-[68px] rounded-md leading-tight font-medium " +
    "transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9BFAE] " +
    "whitespace-nowrap";
  const beigeBtn = "bg-[#FAF6EC] text-[#7C7263] border border-[#E6DDCB] hover:bg-[#F3EDDF]";
  const copiedBtn = "bg-[#E3EBCB] text-[#4A5D28] border border-[#C4D3A0]";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F7F3EA]">
      {/* Header — title + actions (actions wrap on narrow phones) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#FFFDF8] border-b border-[#EAE2D2]">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-brand-800">Admin</h2>
          <span className="hidden sm:inline text-[11px] text-[#91887C] truncate">
            All rooms · live
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-0.5 ml-auto">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`${headerBtn} text-[10px] ${beigeBtn} ${downloading ? "opacity-50" : ""}`}
          >
            {downloading ? "📥 Saving…" : "📥 Download"}
          </button>
          <button
            onClick={handleCopyAll}
            className={`${headerBtn} text-[10px] ${copiedMode === "all" ? copiedBtn : beigeBtn}`}
          >
            {copiedMode === "all" ? "✓ Copied" : "📋 Copy All"}
          </button>
          <button
            onClick={handleCopyEosOverlapping}
            className={`${headerBtn} text-[9px] ${copiedMode === "eos" ? copiedBtn : beigeBtn}`}
          >
            {copiedMode === "eos" ? ("✓ Copied") : (<>Copy EOS &<br />Overlapping</>)}
          </button>
          <button onClick={onClose} className={`${headerBtn} text-[10px] ${beigeBtn}`}>
            ✕ Close
          </button>
        </div>
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
