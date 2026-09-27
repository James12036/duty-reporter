# 🦆 Report Duck 2.0

報告鴨 2.0 — 7 房間即時協作報告工具（Report Duck 1.0 嘅改良版）。

## 2.0 改動（對比 1.0）

1. **7 個房間**（原 6 個分類）
2. **房間名稱可以人手改** — 撳編輯區右上「✏️ Rename」，改名即時同步畀所有人
3. **Refresh (A-C)** → 清空所有房間，頭 5 間填入 A-C 模板內容（EOS／Overlapping／Others 三段），並將 7 間改名為：MP CW、SUP CW、MP SKW、SUP SKW、SUP SO、Other 1、Other 2
4. **Refresh (D)** → 清空所有房間，並將 7 間改名為：D、D2、D7、H3、Other 1、Other 2、Other 3
5. **修正打字跳頂問題** — 有其他人同時打字時，唔會再彈返去頂部（改用 diff 式 textarea binding，保留捲軸同游標位置）
6. **Admin** — 撳右上角「Admin」掣，喺一個版面實時睇晒 7 間房目前嘅輸入內容（唯讀）

登入方式同 1.0 一樣：個人 access code + 共用 password。

## 技術架構

- Next.js 14（前端）＋ y-websocket（Yjs CRDT 同步）合併喺單一 Node 服務（`app/server.js`，同一個端口出 HTTP 同 WebSocket）
- 每間房一個 Y.Doc（`room-1` … `room-7`）；共用 `meta` room 儲存「最後 Refresh 時間」同「房間名稱」
- ⚠️ 資料只存喺記憶體：每次重啟／redeploy 會清空（同 1.0 一樣，未加持久化）

## 線上（Render）

- **https://duty-reporter.onrender.com** — Render free plan，設定喺 `render.yaml`
- Build：`cd app && npm install --include=dev && npm run build`｜Start：`cd app && node server.js`
- Push 上 GitHub（`James12036/duty-reporter`，`main` branch）會自動部署
- UptimeRobot 每 5 分鐘 ping `/health` 保持清醒

## 本地運行

```bash
cd app
npm install --include=dev   # 首次
npm run build               # 首次／改動後
NODE_ENV=production PORT=3002 node server.js
# 開 http://localhost:3002
```

## 檔案結構

- `app/src/config/rooms.ts` — 房間清單、Refresh 名稱組合、A-C 模板內容
- `app/src/lib/textarea-binding.ts` — 修正跳頂問題嘅核心（diff 式同步）
- `app/src/lib/yjs.ts` — Yjs 連線／房間名同步／Refresh、Clear、Download
- `app/src/components/` — RoomTabs、RoomNameBar、EditorField、AdminView、PinGate、DuckLogo
- `app/server.js` — Next.js + y-websocket 單一端口伺服器
- `app/auth.js` — access code 登入（server-only，唔會出 client bundle）
- `render.yaml` — Render 部署設定

## Report Duck 1.0 存檔

1.0 已凍結保存，需要時可以隨時用返：

- Git tag `duck-1.0`（喺呢個 repo 嘅歷史入面，已 push 上 GitHub）
- 本地完整副本：`/Users/James/report-duck-1.0-archive`（連 git 歷史同 node_modules，可直接運行）
