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
import { CATEGORIES } from "@/config/categories";
import { connectCategory, disconnectCategory, disconnectAll } from "@/lib/yjs";
import type { WebsocketProvider } from "y-websocket";
import type * as Y from "yjs";

interface CategorySession {
  ytext: Y.Text;
  awareness: WebsocketProvider["awareness"];
  connected: boolean;
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [session, setSession] = useState<CategorySession | null>(null);
  const [mounted, setMounted] = useState(false);

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
        <h1 className="text-xl font-extrabold tracking-tight text-brand-800">
          Duty Reporter
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
        Duty Reporter v1.0 · Changes sync in real-time across all devices
      </footer>
    </div>
  );
}
