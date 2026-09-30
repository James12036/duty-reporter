# 🦆 Report Duck 2.1

報告鴨 2.1 — 7 個房間 × 3 個文字框即時協作報告工具。

## 功能

1. **7 個共享房間**，每間房 3 個文字框：**EOS／Overlapping／Others**（各自獨立實時同步；EOS 較大、Overlapping／Others 較細；Others 標籤旁邊有提示：(ASGP, MTR Patrol, C/P, etc)）
2. **房間名稱可以人手改** — 撳編輯區右上「✏️ Rename」，改名即時同步畀所有人
3. **Refresh (A-C)** — 清空所有房間，並改名為：MP CW、SUP CW、MP SKW、SUP SKW、SUP SO、Other 1、Other 2（唔會再自動填入模板內容）
4. **Refresh (D)** — 清空所有房間，並改名為：D、D2、D7、H3、Other 1、Other 2、Other 3
5. **Download** — 一鍵下載全部房間內容（按 EOS／Overlapping／Others 分段）做 .txt
6. **Admin** — 一個版面實時睇晒 7 間房（唯讀）：有內容嘅文字框先顯示；無內容嘅房顯示「No content yet」
7. **修正打字跳頂問題** — 有其他人同時打字時，唔會再彈返去頂部（改用 diff 式 textarea binding，保留捲軸同游標位置）

登入方式不變：個人 access code + 共用 password。

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

（本地開發版：`/Users/James/report-duck-2/app`，功能相同）

## 檔案結構

- `app/src/config/rooms.ts` — 房間清單、3 個文字框定義（ROOM_FIELDS）、Refresh 名稱組合
- `app/src/lib/textarea-binding.ts` — 修正跳頂問題嘅核心（diff 式同步）
- `app/src/lib/yjs.ts` — Yjs 連線／房間名同步／Refresh、Download、Admin 觀察
- `app/src/components/` — RoomTabs、RoomNameBar、EditorField（3 框）、AdminView、PinGate、DuckLogo
- `app/server.js` — Next.js + y-websocket 單一端口伺服器
- `app/auth.js` — access code 登入（server-only，唔會出 client bundle）
- `render.yaml` — Render 部署設定

## 版本存檔

- **Report Duck 1.0**：git tag `duck-1.0` + 本地完整副本 `/Users/James/report-duck-1.0-archive`（連 git 歷史同 node_modules，可直接運行）
- **Report Duck 2.0**：git tag `duck-2.0`（需要時 `git checkout duck-2.0` 即可取回）
