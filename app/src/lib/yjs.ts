/**
 * Yjs + y-websocket integration
 *
 * Creates a Y.Doc per category and connects it to the sync server.
 * Each doc has a single Y.Text shared type named "content".
 * Awareness tracks who else is viewing each category.
 */

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

/** Auto-detect WebSocket URL from current page location */
function getWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:3000";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export interface CategorySession {
  ytext: Y.Text;
  awareness: WebsocketProvider["awareness"];
  connected: boolean;
  /** Subscribe to connection status changes. Returns unsubscribe fn. */
  onStatus: (cb: (connected: boolean) => void) => () => void;
}

type SessionEntry = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: WebsocketProvider["awareness"];
};

const sessions = new Map<string, SessionEntry>();

// ── User identity (lazy, browser-only) ──────────────────────────

let _userIdentity: { name: string; color: string } | null = null;

function getUserIdentity(): { name: string; color: string } {
  if (_userIdentity) return _userIdentity;
  if (typeof window === "undefined") return { name: "User", color: "#6366f1" };

  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  const animals = [
    "Fox", "Wolf", "Bear", "Hawk", "Lynx",
    "Otter", "Raven", "Deer", "Falcon", "Puma",
  ];
  try {
    const stored = sessionStorage.getItem("duty-user");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }

  const identity = {
    name: animals[Math.floor(Math.random() * animals.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
  };
  try { sessionStorage.setItem("duty-user", JSON.stringify(identity)); } catch { /* ignore */ }
  _userIdentity = identity;
  return identity;
}

// ── Public API ───────────────────────────────────────────────────

export function connectCategory(categoryId: string): CategorySession {
  const existing = sessions.get(categoryId);
  if (existing) {
    return makeSession(existing);
  }

  const doc = new Y.Doc();
  const provider = new WebsocketProvider(getWsUrl(), categoryId, doc, {
    connect: true,
    maxBackoffTime: 10000,
  });

  provider.awareness.setLocalState(getUserIdentity());

  const entry: SessionEntry = { doc, provider, awareness: provider.awareness };
  sessions.set(categoryId, entry);
  return makeSession(entry);
}

export function disconnectCategory(categoryId: string) {
  const s = sessions.get(categoryId);
  if (s) {
    s.provider.disconnect();
    s.doc.destroy();
    sessions.delete(categoryId);
  }
}

export function disconnectAll() {
  sessions.forEach((_, id) => disconnectCategory(id));
}

// ── Batch operations ──────────────────────────────────────────

/** Clear all category texts. Connects to each room, waits for sync, clears, then disconnects. */
export async function clearAllCategories(categoryIds: string[]): Promise<void> {
  const providers: WebsocketProvider[] = [];

  for (const id of categoryIds) {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(getWsUrl(), id, doc, {
      connect: true,
      maxBackoffTime: 5000,
    });
    providers.push(provider);

    // Wait for the doc to sync with the server before clearing
    await new Promise<void>((resolve) => {
      if (provider.synced) { resolve(); return; }
      provider.once("sync", () => resolve());
    });

    const ytext = doc.getText("content");
    ytext.delete(0, ytext.length);
  }

  // Allow changes to propagate to all peers before disconnecting
  await new Promise((r) => setTimeout(r, 600));

  for (const p of providers) {
    p.disconnect();
    p.doc.destroy();
  }
}

/** Collect content from all categories and return formatted text. */
export function collectAllContent(categoryIds: string[]): Promise<string> {
  return (async () => {
    const providers: WebsocketProvider[] = [];
    const texts: { id: string; text: string }[] = [];

    for (const id of categoryIds) {
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(getWsUrl(), id, doc, {
        connect: true,
        maxBackoffTime: 5000,
      });
      providers.push(provider);

      // Wait for full sync with server before reading
      await new Promise<void>((resolve) => {
        if (provider.synced) { resolve(); return; }
        provider.once("sync", () => resolve());
      });

      const text = doc.getText("content").toString().trim();
      texts.push({ id, text });
    }

    // Disconnect all temporary connections
    for (const p of providers) {
      p.disconnect();
      p.doc.destroy();
    }

    // Build formatted output
    const lines: string[] = [];
    const now = new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
    lines.push(`Report Duck 1.0 — ${now}`);
    lines.push("=".repeat(40));
    lines.push("");

    for (const { id, text } of texts) {
      lines.push(`[${id.toUpperCase()}]`);
      lines.push(text || "(empty)");
      lines.push("");
    }

    return lines.join("\n");
  })();
}

/** Trigger a .txt download in the browser. */
export function downloadAsFile(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Helpers ──────────────────────────────────────────────────────

function makeSession(e: SessionEntry): CategorySession {
  return {
    ytext: e.doc.getText("content") as Y.Text,
    awareness: e.awareness,
    connected: e.provider.wsconnected,
    onStatus(cb: (connected: boolean) => void) {
      const handler = ({ status }: { status: string }) =>
        cb(status === "connected");
      e.provider.on("status", handler);
      // Immediately emit current state
      cb(e.provider.wsconnected);
      return () => e.provider.off("status", handler);
    },
  };
}
