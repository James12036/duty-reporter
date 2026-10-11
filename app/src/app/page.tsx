"use client";

/**
 * Report Duck 2.1.1 — Main Page
 *
 * - 7 shared rooms ("room-1" … "room-7"), each its own Yjs room; the room
 *   editor shows text fields (EOS / Overlapping / Others).
 * - Room names are editable by hand (✏️ Rename) and shared with everyone.
 * - Refresh (A-B): clear all rooms, rename, show all 3 boxes.
 *   Refresh (C): clear all rooms, rename (same set), show EOS + Others only.
 *   Refresh (D): clear all rooms, rename (D set), show EOS + Others only (2.1.1).
 * - Admin opens a live, read-only overview of all rooms at once.
 * - Warm ivory palette (2.1.1): #F7F3EA canvas, #FFFDF8 cards.
 */

import { useCallback, useEffect, useState } from "react";
import RoomTabs from "@/components/RoomTabs";
import EditorField from "@/components/EditorField";
import RoomNameBar from "@/components/RoomNameBar";
import AdminView from "@/components/AdminView";
import PinGate from "@/components/PinGate";
import DuckLogo from "@/components/DuckLogo";
import {
  ROOMS,
  ROOM_IDS,
  ROOM_FIELDS,
  DEFAULT_ROOM_NAMES,
  AB_ROOM_NAMES,
  D_ROOM_NAMES,
  MODE_FIELD_IDS,
} from "@/config/rooms";
import type { RefreshMode } from "@/config/rooms";
import {
  connectRoom,
  disconnectRoom,
  disconnectAll,
  refreshRooms,
  collectAllContent,
  downloadAsFile,
  connectMeta,
  writeRefreshTimestamp,
  setRoomName,
  normalizeRefreshMode,
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
  const [refreshMode, setRefreshMode] = useState<RefreshMode>("ab");
  const [mounted, setMounted] = useState(false);
  const [busyRefresh, setBusyRefresh] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Hydration guard (Next.js SSR) ────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Shared meta state: last refresh + room names + shift mode ─
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

    const onMode = () => setRefreshMode(normalizeRefreshMode(meta.refreshMode.toString()));

    onRefreshAt();
    meta.refreshAt.observe(onRefreshAt);
    onNames();
    meta.names.observe(onNames);
    onMode();
    meta.refreshMode.observe(onMode);

    return () => {
      meta.refreshAt.unobserve(onRefreshAt);
      meta.names.unobserve(onNames);
      meta.refreshMode.unobserve(onMode);
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

  // ── Refresh family (2.1.1): confirm → clear + rename + set mode ─
  const runRefresh = useCallback(async (names: string[], mode: RefreshMode, message: string) => {
    if (typeof window === "undefined") return;
    if (!window.confirm(message)) return;
    setBusyRefresh(true);
    try {
      await refreshRooms(ROOM_IDS, [...names], mode);
      setRoomNames([...names]);
      setRefreshMode(mode);
      const ts = Date.now();
      setLastRefreshAt(ts);
      writeRefreshTimestamp(String(ts)).catch(() => {});
    } finally {
      setBusyRefresh(false);
    }
  }, []);

  // ── Refresh (A-B): clear all rooms, rename to the A-B set (3 boxes)
  const handleRefreshAB = useCallback(
    () =>
      runRefresh(
        AB_ROOM_NAMES,
        "ab",
        `Refresh (A-B)?\n\nThis will clear ALL 7 rooms for everyone, then name the rooms:\n${AB_ROOM_NAMES.join(", ")}.`
      ),
    [runRefresh]
  );

  // ── Refresh (C): same names as A-B, but only EOS + Others (2.1.1)
  const handleRefreshC = useCallback(
    () =>
      runRefresh(
        AB_ROOM_NAMES,
        "c",
        `Refresh (C)?\n\nThis will clear ALL 7 rooms for everyone, then name the rooms:\n${AB_ROOM_NAMES.join(", ")}.\n\nThe Overlapping box will be hidden — only EOS and Others are shown — until Refresh (A-B) is used.`
      ),
    [runRefresh]
  );

  // ── Refresh (D): clear all rooms, rename to the D set (EOS + Others)
  const handleRefreshD = useCallback(
    () =>
      runRefresh(
        D_ROOM_NAMES,
        "d",
        `Refresh (D)?\n\nThis will clear ALL 7 rooms for everyone, then name the rooms:\n${D_ROOM_NAMES.join(", ")}.\n\nThe Overlapping box will be hidden — only EOS and Others are shown — until Refresh (A-B) is used.`
      ),
    [runRefresh]
  );

  // ── Download all rooms' content as .txt ───────────────────────
  const handleDownload = useCallback(async () => {
    const content = await collectAllContent(ROOM_IDS, roomNames);
    const date = new Date().toISOString().slice(0, 10);
    downloadAsFile(`duty-report-${date}.txt`, content);
  }, [roomNames]);

  const activeIndex = Math.max(0, ROOMS.findIndex((r) => r.id === activeRoom));
  const activeName = roomNames[activeIndex] || ROOMS[activeIndex].defaultName;
  const activeSession = session && session.roomId === activeRoom ? session : null;

  // Which boxes to show this shift (2.1.1: C and D modes hide Overlapping)
  const visibleFields = ROOM_FIELDS.filter((f) => MODE_FIELD_IDS[refreshMode].includes(f.id));

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F3EA]">
        <div className="text-[#A79D8D]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto w-full bg-[#F7F3EA]">
      {/* Navy top band */}
      <div className="h-1 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-500" />

      {/* Header */}
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <DuckLogo size={48} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-brand-800">
              Report Duck <span className="text-[0.8em]">2.1.1</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-6 h-0.5 bg-gold rounded-full" />
              <p className="text-xs text-[#91887C]">
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

        {/* Action buttons — A-B → C → D → Download → Admin (light warm set, 2.1.1) */}
        <div className="flex flex-wrap items-center gap-1 mt-3">
          <button
            onClick={handleRefreshAB}
            disabled={busyRefresh}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                       bg-[#E3EBCB] text-[#4A5D28] border border-[#C4D3A0]
                       hover:bg-[#D8E2BB] active:scale-[0.97] transition-all
                       disabled:opacity-50 disabled:active:scale-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A9BC80]"
          >
            Refresh (A-B)
          </button>
          <button
            onClick={handleRefreshC}
            disabled={busyRefresh}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                       bg-[#E9E0EF] text-[#5B4370] border border-[#D1C1DC]
                       hover:bg-[#DFD3E8] active:scale-[0.97] transition-all
                       disabled:opacity-50 disabled:active:scale-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A5C9]"
          >
            Refresh (C)
          </button>
          <button
            onClick={handleRefreshD}
            disabled={busyRefresh}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                       bg-[#FFE2C7] text-[#A8430F] border border-[#F2AE7C]
                       hover:bg-[#FFD6B0] active:scale-[0.97] transition-all
                       disabled:opacity-50 disabled:active:scale-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B183]"
          >
            Refresh (D)
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                       bg-[#DCE7F3] text-[#1E3A5F] border border-[#B3C9E0]
                       hover:bg-[#CFDEED] active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92AED1]"
          >
            Download
          </button>
          <button
            onClick={() => setShowAdmin(true)}
            className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                       bg-[#EAE3D6] text-[#574B3C] border border-[#CDBFA9]
                       hover:bg-[#DFD6C4] active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9BFAE]"
          >
            Admin
          </button>
        </div>
      </header>

      {/* Room Tabs */}
      <RoomTabs activeId={activeRoom} names={roomNames} onSelect={setActiveRoom} />

      {/* Editor — card on warm ivory canvas, fade-in on tab switch */}
      <main className="flex-1 px-3 py-3">
        <div
          key={activeRoom}
          className="h-full bg-[#FFFDF8] rounded-2xl shadow-[0_1px_3px_rgba(15,28,44,0.08)] border border-[#EAE2D2] animate-fade-slide overflow-hidden"
        >
          <RoomNameBar name={activeName} onRename={handleRename} />
          <EditorField
            roomName={activeName}
            session={activeSession}
            connected={activeSession?.connected ?? false}
            fields={visibleFields}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-3 text-center text-[11px] text-[#A79D8D]">
        Report Duck 2.1.1 · Changes sync in real-time across all devices
      </footer>

      {/* Admin — live overview of all rooms */}
      {showAdmin && (
        <AdminView
          roomIds={ROOM_IDS}
          roomNames={roomNames}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}
