"use client";

/**
 * Duty Reporter — Main Page
 *
 * Renders the category tabs and the collaborative editor for the active category.
 * Each category gets its own Yjs room for independent real-time sync.
 */

import { useState, useEffect, useCallback } from "react";
import CategoryTabs from "@/components/CategoryTabs";
import EditorField from "@/components/EditorField";
import PinGate from "@/components/PinGate";
import DuckLogo from "@/components/DuckLogo";
import { CATEGORIES, AC_REFRESH_ROOMS, AC_REFRESH_TEMPLATE, D_REFRESH_ROOMS, D_REFRESH_TEMPLATE } from "@/config/categories";
import { connectCategory, disconnectCategory, disconnectAll, clearAllCategories, collectAllContent, downloadAsFile, refreshForAC } from "@/lib/yjs";
import type { WebsocketProvider } from "y-websocket";
import type * as Y from "yjs";

interface CategorySession {
  ytext: Y.Text;
  awareness: WebsocketProvider["awareness"];
  connected: boolean;
}

export default function Home() {
  return (
    <PinGate>
      <DutyApp />
    </PinGate>
  );
}

function DutyApp() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [session, setSession] = useState<CategorySession | null>(null);
  const [mounted, setMounted] = useState(false);

  const [busyRefresh, setBusyRefresh] = useState(false);

  // ── Hydration guard (Next.js SSR) ────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Connect to the active category room ──────────────────────
  useEffect(() => {
    if (!mounted) return;

    const s = connectCategory(activeCategory);
    setSession(s);

    // Subscribe to connection changes
    const onStatus = (ev: { status: string }) => {
      setSession((prev) => prev ? { ...prev, connected: ev.status === "connected" } : prev);
    };
    // The provider is internal to connectCategory — we subscribe via awareness
    // but we also poll for connection state
    const interval = setInterval(() => {
      const fresh = connectCategory(activeCategory);
      setSession((prev) =>
        prev?.connected !== fresh.connected ? { ...prev!, connected: fresh.connected } : prev
      );
    }, 3000);

    return () => {
      clearInterval(interval);
      disconnectCategory(activeCategory);
    };
  }, [activeCategory, mounted]);

  // ── Cleanup all on page unload ───────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => disconnectAll();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Clear all categories (with confirmation) ─────────────────
  const handleClearAll = useCallback(() => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "⚠️ Clear ALL fields?\n\nThis will erase every category's content for ALL officers. This action cannot be undone."
    );
    if (!ok) return;
    const ids = CATEGORIES.map((c) => c.id);
    clearAllCategories(ids);
  }, []);

  // ── Refresh for A-C: clear all rooms, seed EOS + Overlapping ─
  const handleRefreshAC = useCallback(async () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Refresh for A-C?\n\nThis will clear ALL rooms, then fill EOS and Overlapping with the A-C template."
    );
    if (!ok) return;
    setBusyRefresh(true);
    try {
      await refreshForAC(
        CATEGORIES.map((c) => c.id),
        [...AC_REFRESH_ROOMS],
        AC_REFRESH_TEMPLATE
      );
    } finally {
      setBusyRefresh(false);
    }
  }, []);

  // ── Refresh for D: clear all rooms, seed EOS only ────────────
  const handleRefreshD = useCallback(async () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Refresh for D?\n\nThis will clear ALL rooms, then fill EOS with the D template."
    );
    if (!ok) return;
    setBusyRefresh(true);
    try {
      await refreshForAC(
        CATEGORIES.map((c) => c.id),
        [...D_REFRESH_ROOMS],
        D_REFRESH_TEMPLATE
      );
    } finally {
      setBusyRefresh(false);
    }
  }, []);

  // ── Download all content as .txt ──────────────────────────────
  const handleDownload = useCallback(async () => {
    const ids = CATEGORIES.map((c) => c.id);
    const content = await collectAllContent(ids);
    const date = new Date().toISOString().slice(0, 10);
    downloadAsFile(`duty-report-${date}.txt`, content);
  }, []);

  const activeLabel =
    CATEGORIES.find((c) => c.id === activeCategory)?.label || "";

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
              Report Duck 1.0
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-6 h-0.5 bg-gold rounded-full" />
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={handleRefreshAC}
            disabled={busyRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-emerald-50 text-emerald-800 border border-emerald-200
                       hover:bg-emerald-100 active:scale-[0.97] transition-all
                       disabled:opacity-50 disabled:active:scale-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Refresh for A-C
          </button>
          <button
            onClick={handleRefreshD}
            disabled={busyRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-amber-50 text-amber-800 border border-amber-200
                       hover:bg-amber-100 active:scale-[0.97] transition-all
                       disabled:opacity-50 disabled:active:scale-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Refresh for D
          </button>
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-red-50 text-red-600 border border-red-200
                       hover:bg-red-100 active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Clear
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-brand-50 text-brand-700 border border-brand-200
                       hover:bg-brand-100 active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download
          </button>
        </div>
      </header>

      {/* Category Tabs */}
      <CategoryTabs
        activeId={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* Editor — card on warm-grey canvas, fade-in on tab switch */}
      <main className="flex-1 px-3 py-3">
        <div
          key={activeCategory}
          className="h-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(15,28,44,0.08)] border border-gray-100 animate-fade-slide overflow-hidden"
        >
          <EditorField
            categoryLabel={activeLabel}
            ytext={session?.ytext ?? null}
            awareness={session?.awareness ?? null}
            connected={session?.connected ?? false}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-3 text-center text-[11px] text-gray-400">
        Report Duck 1.0 · Changes sync in real-time across all devices
      </footer>
    </div>
  );
}
