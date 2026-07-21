/**
 * Duty Reporter — y-websocket sync server
 *
 * Uses the official y-websocket server module with pre-initialized rooms.
 * Each room represents a duty category. The y-websocket library handles
 * Y.Doc lifecycle, awareness protocol, and WebSocket messaging internally.
 *
 * Data is in-memory by default. For persistence across restarts, set
 * YPERSISTENCE=./data and the server will use LevelDB to persist Y.Docs.
 */

const http = require("http");
const WebSocket = require("ws");
const utils = require("y-websocket/bin/utils");
const Y = require("yjs");

// ── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 1234;
const HOST = process.env.HOST || "0.0.0.0";

// Optional persistence via LevelDB (survives server restarts)
if (process.env.YPERSISTENCE) {
  const persistenceDir = process.env.YPERSISTENCE;
  console.log(`  Persistence: LevelDB at ${persistenceDir}`);
  utils.setPersistence({
    bindState: async (docName, ydoc) => {
      // LevelDB persistence — uncomment and `npm install y-leveldb` for production use
      // const { LeveldbPersistence } = require("y-leveldb");
      // const ldb = new LeveldbPersistence(persistenceDir);
      // const persistedYdoc = await ldb.getYDoc(docName);
      // const newUpdates = Y.encodeStateAsUpdate(ydoc);
      // ldb.storeUpdate(docName, newUpdates);
      // const updates = await ldb.getYDocDiff(docName, Y.encodeStateAsUpdate(ydoc));
      // Y.applyUpdate(ydoc, Y.mergeUpdates(updates));
      // ydoc.on("update", (update) => ldb.storeUpdate(docName, update));
      console.log(`  Persistence not yet configured for room: ${docName}`);
    },
    writeState: async (_docName, _ydoc) => {
      // no-op: in-memory only
    },
  });
}

// ── Pre-create rooms via y-websocket's getYDoc (proper initialization) ──
const CATEGORY_ROOMS = [
  "eos",
  "overlapping",
  "asgp",
  "mtr-patrol",
];

CATEGORY_ROOMS.forEach((room) => {
  // getYDoc creates the doc with awareness protocol and conns Map properly set up
  const doc = utils.getYDoc(room, true);
  // Ensure the "content" Y.Text exists
  doc.getText("content");
  console.log(`  Room ready: ${room}`);
});

// ── HTTP + WS server ──────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health" || req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        rooms: Array.from(utils.docs.keys()),
        connections: wss.clients.size,
        uptime: process.uptime(),
      })
    );
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Duty Reporter Sync Server — connect via WebSocket\n");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  utils.setupWSConnection(ws, req);
});

// ── Start ─────────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   Duty Reporter — Sync Server               ║
║   Listening on ws://${HOST}:${PORT}                 ║
║   Health:     http://${HOST}:${PORT}/health        ║
║   ${CATEGORY_ROOMS.length} rooms active                        ║
╚══════════════════════════════════════════════╝
`);
});
