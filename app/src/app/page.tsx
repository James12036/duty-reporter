"use client";

/**
 * Report Duck 2.0 — Main Page
 *
 * - 7 shared rooms ("room-1" … "room-7"), each its own Yjs room.
 * - Room names are editable by hand (✏️ Rename) and shared with everyone.
 * - Refresh (A-C) / Refresh (D) clear all rooms and rename them to the
 *   shift's preset names.
 */

import { useCallback, useEffect, useState } from "react";
import RoomTabs from "@/components/RoomTabs";
import EditorField from "@/components/EditorField";
import RoomNameBar from "@/components/RoomNameBar";
import PinGate from "@/components/PinGate";
import DuckLogo from "@/components/DuckLogo";
import {
  ROOMS,
  ROOM_IDS,
  DEFAULT_ROOM_NAMES,
  AC_ROOM_NAMES,
  AC_SEED_CONTENT,
  AC_SEED_ROOM_IDS,
  D_ROOM_NAMES,
} from "@/config/rooms";
import {
  connectRoom,
  disconnectRoom,
  disconnectAll,
  clearRoomsContent,
  refreshRooms,
  collectAllContent,
  downloadAsFile,
  connectMeta,
  writeRefreshTimestamp,
  setRoomName,
} from "@/lib/yjs";
import type { RoomSession } from "@/lib/yjs";

export default function Home() {
  return (
    <PinGate>
      <DutyApp />
    </PinGate>
  );
}

function DutyApp() {
  const [activeRoom, setActiveRoom] = useState(ROOMS[0].id);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [roomNames, setRoomNames] = useState<string[]>(DEFAULT_ROOM_NAMES);
  const [mounted, setMounted] = useState(false);
  const [busyRefresh, setBusyRefresh] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  // ── Hydration guard (Next.js SSR) ────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Shared meta state: last refresh + room names ──────────────
  useEffect(() => {
    if (!mounted) return;

    const meta = connectMeta();

    const readNames = () =>
      ROOMS.map((room) => {
        const stored = meta.names.get(room.id);
        return typeof stored === "string" && stored.trim() ? stored : room.defaultName;
      });

    const onRefreshAt = () => {
      const raw = meta.refreshAt.toString().trim();
      const ts = raw ? Number(raw) : NaN;
      setLastRefreshAt(Number.isFinite(ts) && ts > 0 ? ts : null);
    };

    const onNames = () => setRoomNames(readNames());

    onRefreshAt();
    meta.refreshAt.observe(onRefreshAt);
    onNames();
    meta.names.observe(onNames);

    return () => {
      meta.refreshAt.unobserve(onRefreshAt);
      meta.names.unobserve(onNames);
    };
  }, [mounted]);

  // ── Connect to the active room ────────────────────────────────
  useEffect(() => {
    if (!mounted) return;

    const s = connectRoom(activeRoom);
    setSession(s);

    const unsubscribe = s.onStatus((connected) => {
      setSession((prev) => (prev && prev.roomId === activeRoom ? { ...prev, connected } : prev));
    });

    return () => {
      unsubscribe();
      disconnectRoom(activeRoom);
    };
  }, [activeRoom, mounted]);

  // ── Cleanup all on page unload ───────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => disconnectAll();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Rename the active room (shared with all users) ────────────
  const handleRename = useCallback(
    (name: string) => {
      setRoomName(activeRoom, name);
      // Optimistic update — the meta observer will confirm shortly
      setRoomNames((prev) => prev.map((n, i) => (ROOMS[i].id === activeRoom ? name : n)));
    },
    [activeRoom]
  );

  // ── Clear all rooms' content (names kept) ────────────────────
  const handleClearAll = useCallback(async () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "⚠️ Clear ALL rooms?\n\nThis will erase the content of all 7 rooms for ALL officers. Room names are kept. This action cannot be undone."
    );
    if (!ok) return;
    await clearRoomsContent(ROOM_IDS);
    const ts = Date.now();
    setLastRefreshAt(ts);
    writeRefreshTimestamp(String(ts)).catch(() => {});
  }, []);

  // ── Refresh (A-C): clear all rooms, rename to the A-C set ─────
  const handleRefreshAC = useCallback(async () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      `Refresh (A-C)?\n\nThis will clear ALL 7 rooms for everyone, fill the first 5 rooms with the A-C template, then name the rooms:\n${AC_ROOM_NAMES.join(", ")}.`
    );
    if (!ok) return;
    setBusyRefresh(true);
    try {
      await refreshRooms(ROOM_IDS, [...AC_ROOM_NAMES], {
        roomIds: AC_SEED_ROOM_IDS,
        content: AC_SEED_CONTENT,
      });
      setRoomNames([...AC_ROOM_NAMES]);
      const ts = Date.now();
      setLastRefreshAt(ts);
      writeRefreshTimestamp(String(ts)).catch(() => {});
    } finally {
      setBusyRefresh(false);
    }
  }, []);

  // ── Refresh (D): clear all rooms, rename to the D set ─────────
  const handleRefreshD = useCallback(async () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      `Refresh (D)?\n\nThis will clear ALL 7 rooms for everyone, then name the rooms:\n${D_ROOM_NAMES.join(", ")}.`
    );
    if (!ok) return;
    setBusyRefresh(true);
    try {
      await refreshRooms(ROOM_IDS, [...D_ROOM_NAMES]);
      setRoomNames([...D_ROOM_NAMES]);
      const ts = Date.now();
      setLastRefreshAt(ts);
      writeRefreshTimestamp(String(ts)).catch(() => {});
    } finally {
      setBusyRefresh(false);
    }
  }, []);

  // ── Download all rooms' content as .txt ───────────────────────
  const handleDownload = useCallback(async () => {
    const content = await collectAllContent(ROOM_IDS, roomNames);
    const date = new Date().toISOString().slice(0, 10);
    downloadAsFile(`duty-report-${date}.txt`, content);
  }, [roomNames]);

  const activeIndex = Math.max(0, ROOMS.findIndex((r) => r.id === activeRoom));
  const activeName = roomNames[activeIndex] || ROOMS[activeIndex].defaultName;
  const activeSession = session && session.roomId === activeRoom ? session : null;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto w-full bg-[#f7f6f3]">
      {/* Navy top band */}
      <div className="h-1 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-500" />

      {/* Header */}
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <DuckLogo size={48} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-brand-800">
              Report Duck 2.0
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-6 h-0.5 bg-gold rounded-full" />
              <p className="text-xs text-gray-500">
                {lastRefreshAt
                  ? `Last refresh: ${new Date(lastRefreshAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Not refreshed yet"}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons — same order as 1.0: A-C → D → Clear → Download */}
        <div className="flex items-center gap-1 mt-3">
          <button
            onClick={handleRefreshAC}
            disabled={busyRefresh}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap
                       bg-emerald-50 text-emerald-800 border border-emerald-200
                       hover:bg-emerald-100 active:scale-[0.97] transition-all
                       disabled:opacity-50 disabled:active:scale-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Refresh (A-C)
          </button>
          <button
            onClick={handleRefreshD}
            disabled={busyRefresh}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap
                       bg-amber-50 text-amber-800 border border-amber-200
                       hover:bg-amber-100 active:scale-[0.97] transition-all
                       disabled:opacity-50 disabled:active:scale-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Refresh (D)
          </button>
          <button
            onClick={handleClearAll}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap
                       bg-red-50 text-red-600 border border-red-200
                       hover:bg-red-100 active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Clear
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap
                       bg-brand-50 text-brand-700 border border-brand-200
                       hover:bg-brand-100 active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Download
          </button>
        </div>
      </header>

      {/* Room Tabs */}
      <RoomTabs activeId={activeRoom} names={roomNames} onSelect={setActiveRoom} />

      {/* Editor — card on warm-grey canvas, fade-in on tab switch */}
      <main className="flex-1 px-3 py-3">
        <div
          key={activeRoom}
          className="h-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(15,28,44,0.08)] border border-gray-100 animate-fade-slide overflow-hidden"
        >
          <RoomNameBar name={activeName} onRename={handleRename} />
          <EditorField
            roomName={activeName}
            ytext={activeSession?.ytext ?? null}
            awareness={activeSession?.awareness ?? null}
            connected={activeSession?.connected ?? false}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-3 text-center text-[11px] text-gray-400">
        Report Duck 2.0 · Changes sync in real-time across all devices
      </footer>
    </div>
  );
}
