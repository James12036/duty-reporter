/**
 * Server-only access-code gate.
 * PINs never ship in the Next.js client bundle.
 */

const crypto = require("crypto");

const PINS = new Set([
  "60524",
  "50418",
  "1198",
  "58928",
  "45692",
  "58545",
  "34055",
  "50743",
  "59127",
  "1620",
  "7153",
  "4398",
  "7225",
  "7481",
  "21887",
  "24932",
  "48841",
  "51204",
  "54345",
  "58068",
  "58582",
  "62269",
  "62707",
  "63034",
  "63144",
  "63162",
  "63193",
  "63334",
  "25229",
  "35906",
  "35927",
  "10179",
  "23696",
  "60368",
  "63112",
  "20088",
  "25892",
  "53151",
  "15768",
  "24816",
  "62021",
  "62279",
  "8636",
]);

const COOKIE_NAME = "duty_auth";
const MAX_AGE = 60 * 60 * 24 * 400; // ~13 months — no idle timeout
const SECRET = process.env.AUTH_SECRET || "duty-reporter-session-v1";

const loginAttempts = new Map();

function normalizePin(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest();
}

function timingSafeEqualStr(a, b) {
  const ha = sha256(a);
  const hb = sha256(b);
  return crypto.timingSafeEqual(ha, hb);
}

function isValidPin(raw) {
  const pin = normalizePin(raw);
  if (!pin) return false;
  for (const candidate of PINS) {
    if (pin.length === candidate.length && timingSafeEqualStr(pin, candidate)) {
      return true;
    }
  }
  return false;
}

function signToken() {
  const sig = crypto.createHmac("sha256", SECRET).update("v1").digest("hex");
  return `v1.${sig}`;
}

function isValidToken(token) {
  if (!token || typeof token !== "string") return false;
  return timingSafeEqualStr(token, signToken());
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return isValidToken(cookies[COOKIE_NAME]);
}

function isSecureRequest(req) {
  const proto = req.headers["x-forwarded-proto"];
  if (proto) return String(proto).split(",")[0].trim() === "https";
  return Boolean(req.socket && req.socket.encrypted);
}

function cookieHeader(req) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(signToken())}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE}`,
  ];
  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { n: 0, t: now };
  if (now - rec.t > 10 * 60 * 1000) {
    rec.n = 0;
    rec.t = now;
  }
  rec.n += 1;
  loginAttempts.set(ip, rec);
  return rec.n > 20;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 4096) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body, extraHeaders) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...(extraHeaders || {}),
  });
  res.end(JSON.stringify(body));
}

async function handleAuthRequest(req, res, pathname) {
  if (pathname === "/api/session" && req.method === "GET") {
    sendJson(res, 200, { ok: isAuthenticated(req) });
    return true;
  }

  if (pathname === "/api/login" && req.method === "POST") {
    const ip = clientIp(req);
    if (isRateLimited(ip)) {
      sendJson(res, 429, { ok: false, error: "Too many attempts. Try again later." });
      return true;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { ok: false, error: "Invalid request." });
      return true;
    }

    if (!isValidPin(body && body.pin)) {
      sendJson(res, 401, { ok: false, error: "Invalid access code." });
      return true;
    }

    sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader(req) });
    return true;
  }

  return false;
}

module.exports = {
  COOKIE_NAME,
  isAuthenticated,
  handleAuthRequest,
};
