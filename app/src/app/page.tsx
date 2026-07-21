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
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto w-full bg-white shadow-sm">
      {/* Header */}
      <header className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">📋 Duty Reporter</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {/* Category Tabs */}
      <CategoryTabs
        activeId={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* Editor */}
      <EditorField
        key={activeCategory}
        categoryLabel={activeLabel}
        ytext={session?.ytext ?? null}
        awareness={session?.awareness ?? null}
        connected={session?.connected ?? false}
      />

      {/* Footer */}
      <footer className="mt-auto px-4 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
        Duty Reporter v1.0 · Changes sync in real-time across all devices
      </footer>
    </div>
  );
}
