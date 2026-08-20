/**
 * Duty Reporter — Unified Server
 *
 * Runs both the Next.js frontend and y-websocket sync server on one port.
 * Deploy to Render, Railway, or Fly.io as a single service.
 */

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const WebSocket = require("ws");
const utils = require("y-websocket/bin/utils");
const auth = require("./auth");

const dev = process.env.NODE_ENV !== "production";
const PORT = process.env.PORT || 3000;

// ── Pre-create rooms ──────────────────────────────────────────────
const ROOMS = ["eos", "overlapping", "asgp", "mtr-patrol", "cnap-check", "others"];
ROOMS.forEach((room) => {
  const doc = utils.getYDoc(room, true);
  doc.getText("content");
  console.log(`  Room ready: ${room}`);
});

// ── Next.js app ────────────────────────────────────────────────────
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");

    const parsedUrl = parse(req.url, true);

    // Health check stays public (UptimeRobot)
    if (parsedUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        rooms: Array.from(utils.docs.keys()),
        connections: wss.clients.size,
        uptime: process.uptime(),
      }));
      return;
    }

    // Access-code login / session check
    auth.handleAuthRequest(req, res, parsedUrl.pathname).then((handled) => {
      if (handled) return;
      handle(req, res, parsedUrl);
    }).catch(() => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Server error." }));
    });
  });

  // ── WebSocket on same HTTP server ──────────────────────────────
  const wss = new WebSocket.Server({ server });
  wss.on("connection", (ws, req) => {
    if (!auth.isAuthenticated(req)) {
      ws.close(4401, "Unauthorized");
      return;
    }
    utils.setupWSConnection(ws, req);
  });

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   Duty Reporter — Ready                     ║
║   http://localhost:${PORT}                       ║
║   ${ROOMS.length} rooms active                          ║
╚══════════════════════════════════════════════╝
`);
  });
});
