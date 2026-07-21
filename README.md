# 📋 Duty Reporter

**Mobile-first daily duty result collection with real-time collaborative sync.**

Field officers report results via a web app. All text fields sync in real-time across every connected device using **Yjs CRDTs** — no overwrites, no locks, no conflicts.

---

## Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Client A     │   │  Client B     │   │  Client C     │
│  (Mobile)     │   │  (Mobile)     │   │  (Desktop)    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │ Yjs CRDT          │ Yjs CRDT         │ Yjs CRDT
       │ (y-websocket)     │                  │
       └───────────────────┼──────────────────┘
                   ┌───────▼────────┐
                   │  y-websocket   │   Node.js (port 1234)
                   │  Sync Server   │   • 1 room per category
                   └───────┬────────┘   • CRDT merge engine
                           │            • Awareness protocol
                   ┌───────▼────────┐
                   │  Next.js 14    │   React (port 3000)
                   │  Tailwind CSS  │   • Mobile-first UI
                   └────────────────┘   • Category tabs
                                        • Live presence
```

### How it works

1. **5 categories** (configurable) — each is a separate Yjs "room" with its own `Y.Text`
2. **When a user types**, the Y.Text is updated locally and synced to the server via WebSocket
3. **The server broadcasts** the update to all other clients in the same room
4. **Yjs CRDT** merges concurrent edits automatically — two officers can type at the same time and both edits are preserved (no overwrites)
5. **Awareness protocol** shows who else is viewing each category in real-time

### Why CRDTs instead of locking

| Approach | Pros | Cons |
|----------|------|------|
| **Field locking** ("Someone is typing…") | Simple to understand | Users get blocked; lock timeout bugs; poor UX when many people need to edit |
| **CRDT (this app)** | No blocking; concurrent edits merge; always available | Slightly more complex protocol |

---

## Project Structure

```
duty-reporter/
├── server/                          # y-websocket sync server
│   ├── package.json
│   └── server.js                    # HTTP + WebSocket server (port 1234)
│
├── app/                             # Next.js frontend
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── public/
│   │   └── manifest.json            # PWA manifest
│   └── src/
│       ├── app/
│       │   ├── globals.css          # Tailwind + mobile optimizations
│       │   ├── layout.tsx           # Root layout with viewport config
│       │   └── page.tsx             # Main page (client component)
│       ├── components/
│       │   ├── CategoryTabs.tsx     # Horizontal scrollable tab bar
│       │   ├── ConnectionStatus.tsx  # Live/offline indicator + who's here
│       │   └── EditorField.tsx      # Yjs-synced textarea
│       ├── config/
│       │   └── categories.ts        # ← EDIT THIS to change categories
│       └── lib/
│           └── yjs.ts               # Yjs connection manager
│
└── .gitignore
```

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### 1. Clone and install

```bash
cd duty-reporter

# Install sync server dependencies
cd server && npm install

# Install frontend dependencies
cd ../app && npm install
```

### 2. Start the sync server

```bash
cd server
node server.js
# → Listening on ws://0.0.0.0:1234
# → 5 rooms pre-created
```

Verify:

```bash
curl http://localhost:1234/health
# → {"status":"ok","rooms":["anti-street-gambling",...],"connections":0}
```

### 3. Start the frontend

```bash
cd app
npm run dev
# → http://localhost:3000
```

### 4. Test real-time sync

Open **two browser tabs** to `http://localhost:3000`.

- Tab 1: Type in "Anti-street Gambling Result"
- Tab 2: Watch it update in real-time
- Switch categories — each one has independent content
- The awareness indicator shows who else is viewing the current category

---

## How to Change Categories

Edit **one file**: `app/src/config/categories.ts`

```typescript
export const CATEGORIES: Category[] = [
  {
    id: "anti-street-gambling",       // unique slug (Yjs room name)
    label: "Anti-street Gambling Result", // display name
    icon: "🎲",                       // emoji
    color: "border-red-500",          // Tailwind border color
  },
  // Add, remove, or reorder items here
];
```

> ⚠️ **Important**: Changing an `id` creates a NEW room — old data won't carry over.
> To rename a category, change only the `label` and keep the `id` the same.

---

## Deployment

### Option A: Single VPS (simplest)

Deploy both the server and frontend on one machine.

#### Sync Server (systemd)

```bash
# /etc/systemd/system/duty-sync.service
[Unit]
Description=Duty Reporter Sync Server
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/duty-reporter/server
ExecStart=/usr/bin/node server.js
Restart=always
Environment=PORT=1234
# Environment=YPERSISTENCE=/opt/duty-reporter/data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now duty-sync
```

#### Frontend (Next.js)

```bash
cd /opt/duty-reporter/app
npm run build
npm run start -- -p 3000
```

Set `NEXT_PUBLIC_WS_URL` in `.env.production`:

```
NEXT_PUBLIC_WS_URL=wss://sync.yourdomain.com
```

#### Nginx reverse proxy

```nginx
# Sync server (WebSocket)
server {
    listen 443 ssl;
    server_name sync.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:1234;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Frontend
server {
    listen 443 ssl;
    server_name duty.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option B: Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  sync:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "1234:1234"
    environment:
      - PORT=1234
    restart: always

  app:
    build:
      context: ./app
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_WS_URL=ws://sync:1234
    depends_on:
      - sync
    restart: always
```

### Option C: Cloudflare Tunnel (zero-config HTTPS)

```bash
# Expose the sync server
cloudflared tunnel --url http://localhost:1234
# → https://sync-xxxx.trycloudflare.com

# Expose the frontend
cloudflared tunnel --url http://localhost:3000
# → https://app-xxxx.trycloudflare.com
```

Set `NEXT_PUBLIC_WS_URL=wss://sync-xxxx.trycloudflare.com` in `.env`.

---

## Adding Persistence (survive server restarts)

By default, all data lives in memory and is lost if the sync server restarts. Yjs content survives on connected clients and re-syncs, but to persist on the server:

```bash
cd server
npm install y-leveldb
```

Then uncomment the LevelDB section in `server/server.js` (lines ~30-45) and set:

```bash
YPERSISTENCE=./data node server.js
```

---

## Adding Authentication

The current version uses random animal names for awareness. To add real auth:

1. **Add an auth layer** (NextAuth.js, Clerk, Firebase Auth, or a simple JWT)
2. **Pass the user identity** to `connectCategory()` in `app/src/lib/yjs.ts`
3. **Validate tokens** on the WebSocket server (check the `req` object in the `connection` handler)

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Real-time sync** | Yjs + y-websocket | Battle-tested CRDT, no conflicts, merges concurrent edits |
| **Frontend** | Next.js 14 + React 18 | SSR for fast load, client components for interactivity |
| **Styling** | Tailwind CSS | Utility-first, mobile-first, fast to iterate |
| **Sync server** | Node.js + ws | Lightweight, single process, low overhead |
| **Type safety** | TypeScript | Catches bugs at compile time |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Reconnecting…" never connects | Check sync server is running: `curl localhost:1234/health` |
| Text not syncing between tabs | Verify both tabs are on the same category tab |
| Server crashes on WebSocket connect | Ensure `y-websocket` v2.0.4 is installed (`npm ls y-websocket`) |
| Build fails with `sessionStorage` error | Run `npm run build` — the SSR guard is already in place |
| Port already in use | Change `PORT` in server env or `-p` flag for Next.js |
