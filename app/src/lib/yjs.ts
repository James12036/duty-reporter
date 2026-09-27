/**
 * Yjs + y-websocket integration for Report Duck 2.0.
 *
 * - One Y.Doc per room ("room-1" … "room-7"), each with a Y.Text "content".
 * - A shared "meta" room holds the last-refresh timestamp and the editable
 *   room names (Y.Map "roomnames") so renames sync to every officer.
 * - Batch operations (Refresh / Clear / Download) open short-lived
 *   connections per room so they always act on server state.
 */

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

/** Auto-detect WebSocket URL from the current page location. */
function getWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:3002";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export interface RoomSession {
  roomId: string;
  ytext: Y.Text;
  awareness: WebsocketProvider["awareness"];
  connected: boolean;
  /** Subscribe to connection status changes. Returns unsubscribe fn. */
  onStatus: (cb: (connected: boolean) => void) => () => void;
}

export interface MetaSession {
  doc: Y.Doc;
  refreshAt: Y.Text;
  names: Y.Map<string>;
  awareness: WebsocketProvider["awareness"];
  connected: boolean;
  onStatus: (cb: (connected: boolean) => void) => () => void;
}

type SessionEntry = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: WebsocketProvider["awareness"];
};

const sessions = new Map<string, SessionEntry>();
const META_ROOM = "meta";

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
    const stored = sessionStorage.getItem("duck2-user");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }

  const identity = {
    name: animals[Math.floor(Math.random() * animals.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
  };
  try { sessionStorage.setItem("duck2-user", JSON.stringify(identity)); } catch { /* ignore */ }
  _userIdentity = identity;
  return identity;
}

function makeStatusSubscriber(e: SessionEntry) {
  return (cb: (connected: boolean) => void) => {
    const handler = ({ status }: { status: string }) => cb(status === "connected");
    e.provider.on("status", handler);
    cb(e.provider.wsconnected); // emit current state immediately
    return () => e.provider.off("status", handler);
  };
}

// ── Room connections ────────────────────────────────────────────

function createSession(roomId: string): SessionEntry {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(getWsUrl(), roomId, doc, {
    connect: true,
    maxBackoffTime: 10000,
  });
  provider.awareness.setLocalState(getUserIdentity());

  const entry: SessionEntry = { doc, provider, awareness: provider.awareness };
  sessions.set(roomId, entry);
  return entry;
}

export function connectRoom(roomId: string): RoomSession {
  const entry = sessions.get(roomId) ?? createSession(roomId);
  return {
    roomId,
    ytext: entry.doc.getText("content"),
    awareness: entry.awareness,
    connected: entry.provider.wsconnected,
    onStatus: makeStatusSubscriber(entry),
  };
}

export function disconnectRoom(roomId: string) {
  const s = sessions.get(roomId);
  if (s) {
    s.provider.disconnect();
    s.doc.destroy();
    sessions.delete(roomId);
  }
}

export function disconnectAll() {
  sessions.forEach((_, id) => disconnectRoom(id));
}

// ── Meta room (last refresh + shared room names) ────────────────

function createMetaSession(): SessionEntry {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(getWsUrl(), META_ROOM, doc, {
    connect: true,
    maxBackoffTime: 10000,
  });
  provider.awareness.setLocalState(null);

  const entry: SessionEntry = { doc, provider, awareness: provider.awareness };
  sessions.set(META_ROOM, entry);
  return entry;
}

export function connectMeta(): MetaSession {
  const entry = sessions.get(META_ROOM) ?? createMetaSession();
  return {
    doc: entry.doc,
    refreshAt: entry.doc.getText("refreshAt"),
    names: entry.doc.getMap<string>("roomnames"),
    awareness: entry.awareness,
    connected: entry.provider.wsconnected,
    onStatus: makeStatusSubscriber(entry),
  };
}

/** Write the last-refresh timestamp into the meta room (sync-safe). */
export async function writeRefreshTimestamp(ts: string): Promise<void> {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(getWsUrl(), META_ROOM, doc, {
    connect: true,
    maxBackoffTime: 5000,
  });

  // Wait for sync with a timeout so this can never hang forever
  await waitForSync(provider, 10000);

  const ytext = doc.getText("refreshAt");
  ytext.delete(0, ytext.length);
  ytext.insert(0, ts);

  // Allow the change to propagate before disconnecting
  await new Promise((r) => setTimeout(r, 1200));

  provider.disconnect();
  doc.destroy();
}

/** Rename one room (shared with every officer). */
export function setRoomName(roomId: string, name: string): void {
  const meta = connectMeta();
  meta.names.set(roomId, name);
}

// ── Batch operations ────────────────────────────────────────────

/** Resolve once the provider has synced, or give up after ms. */
function waitForSync(provider: WebsocketProvider, ms = 8000): Promise<void> {
  return new Promise<void>((resolve) => {
    if (provider.synced) { resolve(); return; }
    const timer = setTimeout(() => resolve(), ms);
    provider.once("sync", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Clear every room's content. Connects to each room, waits for sync, clears, then disconnects. */
export async function clearRoomsContent(roomIds: string[]): Promise<void> {
  const providers: WebsocketProvider[] = [];

  for (const id of roomIds) {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(getWsUrl(), id, doc, {
      connect: true,
      maxBackoffTime: 5000,
    });
    providers.push(provider);

    await waitForSync(provider);

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

export interface RefreshSeed {
  /** Room ids that receive the seed content */
  roomIds: string[];
  content: string;
}

/**
 * Refresh: clear every room, optionally write seed content into some of them,
 * then apply the shift's room names to all users.
 */
export async function refreshRooms(
  roomIds: string[],
  names: string[],
  seed?: RefreshSeed
): Promise<void> {
  const providers: WebsocketProvider[] = [];
  const seedIds = new Set(seed?.roomIds ?? []);

  for (const id of roomIds) {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(getWsUrl(), id, doc, {
      connect: true,
      maxBackoffTime: 5000,
    });
    providers.push(provider);

    await waitForSync(provider);

    const ytext = doc.getText("content");
    ytext.delete(0, ytext.length);
    if (seed && seed.content && seedIds.has(id)) {
      ytext.insert(0, seed.content);
    }
  }

  // Allow changes to propagate to all peers before disconnecting
  await new Promise((r) => setTimeout(r, 600));

  for (const p of providers) {
    p.disconnect();
    p.doc.destroy();
  }

  const meta = connectMeta();
  meta.doc.transact(() => {
    roomIds.forEach((id, i) => {
      meta.names.set(id, names[i] ?? `Room ${i + 1}`);
    });
  }, "refresh-rooms");
}

/**
 * Observe every room's content in real time (used by the Admin overview).
 * Opens silent temporary connections (no presence) — call the returned
 * function to tear them all down.
 */
export function observeRooms(
  roomIds: string[],
  onUpdate: (snapshot: Record<string, string>) => void
): () => void {
  const snapshot: Record<string, string> = {};
  const entries: { provider: WebsocketProvider; doc: Y.Doc }[] = [];

  const emit = () => onUpdate({ ...snapshot });

  roomIds.forEach((id) => {
    const doc = new Y.Doc();
    const ytext = doc.getText("content");
    const provider = new WebsocketProvider(getWsUrl(), id, doc, {
      connect: true,
      maxBackoffTime: 10000,
    });
    provider.awareness.setLocalState(null); // silent observer — no presence dot

    ytext.observe(() => {
      snapshot[id] = ytext.toString();
      emit();
    });
    provider.on("sync", () => {
      snapshot[id] = ytext.toString();
      emit();
    });

    entries.push({ provider, doc });
  });

  return () => {
    entries.forEach(({ provider, doc }) => {
      provider.disconnect();
      doc.destroy();
    });
  };
}

/** Collect content from all rooms and return formatted text. */
export function collectAllContent(roomIds: string[], labels: string[]): Promise<string> {
  return (async () => {
    const providers: WebsocketProvider[] = [];
    const texts: { label: string; text: string }[] = [];

    for (let i = 0; i < roomIds.length; i++) {
      const id = roomIds[i];
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(getWsUrl(), id, doc, {
        connect: true,
        maxBackoffTime: 5000,
      });
      providers.push(provider);

      await waitForSync(provider);

      const text = doc.getText("content").toString().trim();
      texts.push({ label: labels[i] ?? id, text });
    }

    // Disconnect all temporary connections
    for (const p of providers) {
      p.disconnect();
      p.doc.destroy();
    }

    // Build formatted output
    const lines: string[] = [];
    const now = new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
    lines.push(`Report Duck 2.0 — ${now}`);
    lines.push("=".repeat(40));
    lines.push("");

    for (const { label, text } of texts) {
      lines.push(`[${label}]`);
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
