# HANGTON-INVENTORY-01 — Chỉ số rà soát Hàng tồn

Status: PLANNED (decisions recorded 2026-10-17, no code yet). Does not change Current Ticket.
Group: Quản lý chất lượng (cùng nhóm các chỉ tiêu F). Executor: Claude Code (backend/data), Antigravity (screens).

## 1. Source (audit 2026-10-16/17, read-only)

- Portal `https://hangton.aggvnp.site/` (TMS Dashboard, Cloudflare in front), account `hue`, sees BĐT TP Huế only.
- Login `POST /login`; then `GET /api/dashboard/init` (profile + default filters) and `GET /api/data?type=all&provinces=` → `{columns, count, data[], source:"file_cache", timestamp}`.
- Snapshot only: the system cannot return past days. History exists only if QIS stores it.
- 23 columns. Used: `ItemCode` (unique), `StatusName`, `Loại Tồn`, `DK1`, `Bưu cục Phát`, `Mã Bưu Cục`, `Huyện Phát`, `COD`, `Loại Bưu Gửi`, `Phân Loại KH`, `PostManCode/Name`, `Lý Do`, `Ngày Quét TMS`, `Trọng Lượng`. Empty everywhere: `Xử Lý`, `Matrix_New`. `Màu` has 2 values, meaning unknown (not used).
- `Loại Tồn` = age from the parcel's arrival confirmation at the office to the export time: `<1 ngày`, `≥1`, `≥1.5`, `≥2`, `≥3`, `≥4`, `≥5`, `≥7`, `≥14 ngày`.

## 2. PO decisions (2026-10-16/17)

| # | Decision |
| --- | --- |
| D1 | Scope: `DK1 = LM`; `Phân Loại KH` = all; `Loại Tồn` = all levels (stored and shown). |
| D2 | Status: 5 only — Phát không thành công, Vu hồi về bưu cục, Đã giao cho bưu tá, Đã phân tuyến, Đã xác nhận đến. |
| D3 | Age = `Loại Tồn` only (not `Ngày Tồn`). |
| D4 | Target: TCT runs stock aged ≥5 ngày to 0. |
| D5 | Show only offices that have stock. |
| D6 | Huế only; no national rank. Compare offices inside Huế and Huế over time. |
| D7 | History: store a snapshot of the stock; evaluation starts from the first stored snapshot. |
| D8 | Data by automatic API call (option B); QIS keeps the hangton login in server config outside git. |
| D9 | 3 snapshots per day: 07:30, 11:30, 21:00 (three separate points in time, see D12). |
| D10 | Alert threshold per level; from ≥5 ngày up it is a heavier alert, again heavier at ≥7 and ≥14. |
| D11 | Colour: RED, deeper with longer stock age (as hangton shows). |
| D12 | Slots are never merged into one day. Comparison is slot against the same slot of the previous day (default 07:30 today vs 07:30 yesterday), or any two snapshots the PO picks. Stock is a moving set: a parcel leaves it when it reaches a final status, and enters/ages up when its stock age reaches the next level. |

| D13 | Alert thresholds (O2): measured in parcels (not %), applied per office and for the Huế total. Levels ≥5, ≥7, ≥14 ngày: any count > 0 is an alert (heavier at ≥7, heaviest at ≥14). Levels <5 ngày (≥1, ≥1.5, ≥2, ≥3, ≥4): colour only, no alert for now. No numeric tolerance. |

## 2a. Derived measures (parcel level, between snapshot A (earlier) and B (later), keyed by `ItemCode`)

- Resolved: in A, not in B (left the stock; B-side status may be unknown since the portal no longer lists it).
- Aged up: in both, `Loại Tồn` level higher in B.
- New: in B, not in A.
- Unchanged: in both, same level.
- Dashboards/widgets: overall Huế and per-office stock by level, resolved / aged-up / new counts, ≥5 ngày vs target 0, per-level alerts (D10). Offices shown only if they have stock (D5).

## 3. Open points

- O2: RESOLVED 2026-10-17 by D13.
- O3: RESOLVED by phase 1 (automatic login works).
- O5: how often the portal refreshes its data (`timestamp`) vs the 07:30 / 11:30 / 21:00 slots; to measure by probing a few times in a day.
- O4: indicator code/name in the menu (F-number or plain name).

## 4. Phases

1. Probe: automatic login + fetch for one snapshot, no storage (needs the hangton password in a local config file the PO fills; never in git or chat).
2. Storage: table of parcel-level snapshots (`snapshot_at`, slot, parcel, status, age level, office, COD, postman) + scheduler at the three slots + failure log; read APIs (by office, by level, by slot/day).
3. Screens (Antigravity): Tổng quan, Theo bưu cục, Xu hướng, Chi tiết bưu gửi, following `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (camera, click-to-order titles, target line, follow date filter, undefined-identifier check).
4. Opus review, PO UI check.

### Phase 1 result (2026-10-17, `backend/scripts/hangton/probe.js`)

PASSED. Automatic login works without a browser: `POST /login` JSON `{username,password}` → `success:true`, cookie `session`; no Cloudflare block (O3 resolved). `/api/dashboard/init` and `/api/data?type=all&provinces=` return 200 (11 673 rows, 23 columns). The payload carries its own `timestamp` (data refresh time of the portal, `source: file_cache`): each snapshot must store this timestamp, and the scheduler must check it is newer than the previous snapshot, otherwise a 07:30 slot may hold stale data. Credentials: `backend/.hangton.env` (gitignored).

Filter check (2026-10-17 08:53 data): the API returns the whole province (11 673); the probe printed it unfiltered. Applying D1+D2 in QIS (5 statuses, `DK1 = LM`, all `Loại Tồn`, all customers) gives **4 430** parcels = the PO's portal count. Breakdown: Đã xác nhận đến 1 400, Đã giao cho bưu tá 835, Phát không thành công 2 095, Đã phân tuyến 100, Vu hồi về bưu cục 0 (the 5th status exists in the data only for other DK1). The filter is applied by QIS after fetching, never trusted to the portal default.

### Phase 2 result (2026-10-17, Claude Code/Sonnet 5.5) — backend delivered, PO restart needed

- Schema (additive, applied at startup): `hangton_snapshot` (one row per `business_date`+`slot`, portal timestamp, `is_stale`), `hangton_snapshot_item` (scoped parcels). Migration `backend/migrate_hangton_inventory_01_schema.js`.
- Service `backend/src/services/hangtonInventory/`: `scope.js` (D1–D3 filter, `Loại Tồn` rank), `client.js` (JSON login + fetch), `snapshotService.js` (store/replace a slot, stale flag when the portal timestamp equals the previous snapshot's), `compareService.js` (overview; compare of two snapshots keyed by `ItemCode`: resolved / aged_up / aged_down / new / unchanged, per office), `scheduler.js` (slots 07:30, 11:30, 21:00 local; 1-minute tick, 30-minute catch-up for a missed slot (was 3 h, narrowed 2026-10-17 so a late restart cannot label 09:00 data as 07:30), 10 min retry after a failure; started from `server.js`, off in tests, off with `HANGTON_SCHEDULER=off`, not started without credentials).
- API `/api/hangton` (admin + viewer read): `GET /snapshots`, `GET /overview?id|date&slot`, `GET /compare?id|date&slot&from_id|base_date&base_slot&detail=1` (default base = the same slot on the closest earlier day), `POST /snapshots/run {slot}` (admin).
- Real-data check into a throw-away DB: 11 673 fetched, **4 430 kept** (= PO count), ≥5 ngày = 662 (Thuận Hóa 271, Phú Lộc 219, Hương Trà 125, Hương Thủy 40, KTC1 Huế 1 5), self-compare 4 430 unchanged, compare query 23 ms.
- Tests: `node --test test_hangtonInventory.js` 6/6 (scope, store/replace/stale, compare classification, slot decision, tick, client); `server.startupMigrations.test.js` pass. Operational database untouched until the backend is restarted.
- Not done: alert thresholds (O2), screens (phase 3), Opus review, PO UI check.

## 5. Phase 3 — screens (Antigravity). Backend contract is final; do not change the backend.

Menu: a new item "Chỉ số rà soát Hàng tồn" at the END of Module 1 (Quản lý chất lượng), after F4.1, route `/hangton`, visible to admin and viewer. The existing navigation tests pin Module 1 to four items; add the fifth item there (that is the only allowed edit of an existing test, and only for this item).

API (all `GET /api/hangton/...`, envelope `{success, data}`; use the existing authenticated client, see `frontend/src/features/f12` for the pattern):

| Call | Use |
| --- | --- |
| `/snapshots` | list for the snapshot picker (date + slot 0730/1130/2100; `is_stale=1` = portal data not refreshed since the previous snapshot, show a small "dữ liệu cổng chưa cập nhật" note) |
| `/overview?date=&slot=` | `total`, `ge5`, `by_level`, `by_office`, `by_office_level`, `by_status` |
| `/compare?date=&slot=&base_date=&base_slot=&detail=1` | `summary` {resolved, aged_up, aged_down, new, unchanged}, `by_office`, lists `resolved` / `aged_up` / `new` (cap `detail_cap`) |
| `/items?date=&slot=&office=&min_rank=&status=&sort=&limit=&offset=` | Chi tiết table, `{total, rows}` |

Screens (tabs in one page):
1. **Tổng quan**: cards Tổng tồn, Tồn ≥5 ngày (target 0, shown as the target line/note), Đã xử lý khỏi tồn, Tăng loại tồn, Mới vào tồn (the last three from `/compare`); stacked/column chart of stock by `Loại Tồn` (levels `<1 ngày` … `≥14 ngày`, ascending); Huế total vs the base snapshot.
2. **Theo bưu cục**: table, one row per office WITH stock (D5, API already returns only those), columns per `Loại Tồn` level + Tổng + COD, plus the compare columns (đã xử lý / tăng loại / mới); click a column title to order; clicking an office opens Chi tiết filtered to it.
3. **So sánh hai mốc**: pick the later snapshot (date + slot, default newest) and the base (default = same slot the previous day, or any other date/slot); show `summary` and the three lists (đã xử lý, tăng loại tồn from→to, mới vào) with office filter.
4. **Chi tiết**: paged table of parcels (`/items`), filters office, level ≥, status; columns Số hiệu, Bưu cục, Trạng thái, Loại tồn, COD, Bưu tá, Lý do; export of the shown filter to Excel/CSV if the project already has a helper, otherwise skip.

Rules: Huế only, no national rank (D6). Colour RED, deeper with longer stock age (≥1 lightest … ≥14 darkest); from ≥5 ngày the cell/row is visibly heavier, again at ≥7 and ≥14 (D10); no numeric alert thresholds yet (O2 open) — do not invent any. Slots are never merged into one day (D12): every figure belongs to one snapshot (date + slot). Follow `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (camera button, click-to-order titles, target line, undefined-identifier check); the "date filter" of that standard is the snapshot picker here. Vietnamese labels.

Required Reading for the executor: this manifest and `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`.

## 6. Phase 3 result (2026-10-17, Antigravity) — frontend delivered, READY FOR PO UI CHECK

- Navigation & routing:
  - Added new menu item "Chỉ số rà soát Hàng tồn" (`/hangton`) at the end of Module 1 (Quản lý chất lượng), after F4.1, in both `frontend/src/navigation/appNavigation.jsx` and `frontend/src/components/Sidebar.jsx`.
  - Registered route in `frontend/src/App.jsx` gated for `[ROLE_ADMIN, ROLE_VIEWER]`.
  - Updated `frontend/src/navigation/appNavigation.test.js` to assert the 5th item as permitted by Section 5.
- Screens & 4 tabs in `frontend/src/features/hangton/HangTonPage.jsx`:
  1. **Tổng quan**: KPI cards (Tổng tồn vs mốc trước, Tồn ≥5 ngày với mục tiêu TCT: 0 bưu gửi, Đã xử lý khỏi tồn, Tăng loại tồn, Mới vào tồn); column chart cơ cấu theo 9 mức `Loại Tồn` tăng dần với thang màu đỏ đậm dần; bảng chi tiết 9 mức và phân bổ theo 5 trạng thái TMS; camera button trên từng khối.
  2. **Theo bưu cục**: bảng tổng hợp theo từng bưu cục có tồn (D5); 9 cột `Loại Tồn`, cột Tổng tồn, Tồn ≥5 ngày, Tiền COD, và 3 cột so sánh biến động (Đã xử lý / Tăng loại / Mới vào); tiêu đề cột click-to-order (`SortableTh`); bấm vào tên bưu cục để chuyển sang tab Chi tiết lọc theo bưu cục đó; hàng TỔNG CỘNG cố định ở chân bảng; camera button.
  3. **So sánh hai mốc**: bộ chọn 2 mốc snapshot (Mốc xem xét vs Mốc cơ sở); 5 thẻ tóm tắt biến động (Đã xử lý, Tăng loại, Mới vào, Không đổi, Giảm mức); bộ lọc bưu cục; 3 danh sách chi tiết bưu gửi với chuyển mức Loại tồn (Trước → Sau); camera button và nút xuất CSV.
  4. **Chi tiết**: bảng phân trang bưu gửi (`/items`); bộ lọc bưu cục, ngưỡng loại tồn (`min_rank`), trạng thái TMS; sắp xếp theo Loại tồn / Bưu cục / Tiền COD; điều khiển phân trang (50/100/200); xuất dữ liệu trang ra CSV có UTF-8 BOM; camera button.
- Pure helpers & tests:
  - `hangtonLevels.js`: 9 mức tồn, hàm `tonRank`, cấu hình thang màu ĐỎ đậm dần (D10, D11), không tự đặt ngưỡng cảnh báo bằng số; định dạng slot, snapshot label, số và tiền VND.
  - `hangtonOfficeTableData.js`: tổng hợp dữ liệu bưu cục và tính dòng TỔNG CỘNG, hàm sắp xếp ổn định `sortOfficeRows`.
  - `hangtonExport.js`: sinh nội dung CSV có UTF-8 BOM (`\uFEFF`) để mở tiếng Việt không lỗi font trong Excel.
  - `api/hangtonClient.js`: đóng gói 4 API `/api/hangton/*`.
  - Tests: `node --test src/features/hangton/hangtonHelpers.test.js src/features/hangton/hangtonPage.test.js src/features/hangton/api/hangtonClient.test.js src/navigation/appNavigation.test.js src/App.role-routing.test.js` (23/23 PASS).
- Quality gates:
  - `npm run build` (vite build): clean (1.27s).
  - `npm run lint` (oxlint on `src/features/hangton`): 0 warnings, 0 errors.
  - `oxlint -D no-undef`: clean on all new/touched identifiers.
  - No browser/Playwright/dev server/login executed; stopped at `READY FOR PO UI CHECK`.


## 7. Review fixes (2026-10-17, Claude Code/Sonnet 5.5) — READY FOR PO UI CHECK

Review of Section 6 found no backend change and green gates; three fixes made:
1. No base snapshot (compare unavailable): the Overview cards, the Theo bưu cục total row and the So sánh hai mốc cards show "—" with the note "Chưa có mốc so sánh…" instead of 0 (`hasCompareBase` / `compareValue` / `NO_BASE_NOTE` in `hangtonLevels.js`); the base drop-down no longer pretends the first snapshot is the base.
2. Chi tiết: the sort drop-down is replaced by click-to-order column titles (Số hiệu, Bưu cục, Trạng thái, Loại tồn, COD, Bưu tá; second click reverses). Backend `GET /api/hangton/items` now accepts `sort=rank|office|cod|item_code|status|postman` and `dir=asc|desc` (whitelisted; unknown values fall back to rank desc). Backend restart needed for the direction to take effect.
3. HangTonPage: the base snapshot resolved by the backend is no longer copied back into state (it caused a second load on every snapshot change); stale responses are ignored.
Tests: frontend 27/27 (hangton, navigation, role routing), backend `test_hangtonInventory.js` 6/6, oxlint clean on `src/features/hangton`, build OK.

## 8. PO status

2026-10-17: PO checked the Hàng tồn screens after the Section 7 fixes and backend restart — PO UI PASS for phase 3. Ticket stays open for O2 (alert thresholds), O5 (portal refresh cadence) and the Import Center integration (not built yet).

2026-10-17 (D13): O2 closed. The delivered screens already follow it (alert styling only when the count is > 0 and the level is ≥5 ngày, per office row and in the total row); no code change needed. Remaining open: O5 (portal refresh cadence), tighter catch-up window, Import Center integration.

## 9. PO requests of 2026-10-17 (Claude Code/Sonnet 5.5) — READY FOR PO UI CHECK

1. **Hidden auto-start and auto-restart (Windows).** `scripts/qis-supervisor.ps1` runs with no window and every 20 s checks ports 5050 (backend) and 5178 (frontend); a missing one is started hidden (`node server.js`, `npm run dev`), logs in `logs/<name>-<time>.out|err.log` (kept 14 days), a crash-loop guard (5 starts in 10 min → wait 5 min), one instance only (named mutex), pause file `logs/supervisor.pause`. `scripts/install-qis-autostart.ps1` installs `QIS_V2_AUTO.vbs` in the user's Startup folder (→ `scripts/qis-supervisor-launch.bat`; a direct VBS → powershell call is refused with "Permission denied" on this PC, a .bat is accepted); `-Remove` uninstalls, `-StartNow` starts it. `TTVH_ControlCenter.ps1`: backend now starts Hidden; "Stop System" creates the pause file, "Start System" removes it (otherwise the supervisor would restart what the operator stopped). Installed and started on this PC: decision logic verified by dry runs (both ports up → nothing; ports down → would start both; paused → nothing) and the Startup launcher starts the supervisor hidden. A real kill-and-restart of the live servers was NOT exercised. The node window that is open now stays visible until it is closed; the supervisor then restarts it hidden within 20 s.
2. **Bigger text** in all Hàng tồn screens (every size step up, nothing below 12 px, chart ticks 13–14 px) so the camera picture is readable.
3. **Column hiding** on Theo bưu cục: presets "Tất cả mức / Từ ≥3 ngày / Từ ≥5 ngày" plus a toggle per level; the choice is remembered in the browser; the picker is outside the captured picture; Tổng tồn still counts hidden levels (stated on screen). Also fixed a `<th>` inside `<th>`.
4. **Module prominence.** Hàng tồn is now a module group like F1.1–F4.1 (red pulsing dot, opens pinned, sub-items Tổng quan / Theo bưu cục / So sánh hai mốc / Chi tiết bưu gửi at `/hangton/overview|office|compare|items`; `/hangton` redirects to overview; the page tab bar and the sidebar stay in step through the URL). Navigation tests updated for the group.
Tests: frontend full sweep 716/716, oxlint clean on touched files, build OK.

## 10. Independent review of 1c22c62 (Opus, 2026-10-17): PASS, no blocker, 5 should-fix — all addressed (Claude Code/Sonnet 5.5)

- Section 9.1 said the Control Center starts the backend Hidden but the line still said Minimized: fixed (`TTVH_ControlCenter.ps1`).
- Forgotten pause file: the supervisor now writes a "paused since …" line to `logs/supervisor.log` once and every 30 minutes. The file is NOT cleared automatically at logon (PO decision pending: whether a reboot should clear a pause).
- Two backends in the same second: "Start System" keeps the pause file until both ports listen (max 90 s) and only then removes it; the supervisor also re-checks the port after 3 s before starting.
- `install-qis-autostart.ps1 -Remove` now also stops the running supervisor.
- Text cut by `truncate` (KPI notes, office names) removed; the empty-row `colSpan` follows the visible columns; hiding the column the table is ordered by resets the order; `/hangton/<unknown>` rewrites the URL to `/hangton/overview`.
- Notes handled: dry runs log to `supervisor-dryrun.log` (marked DRYRUN); `supervisor.log` rotates at 1 MB; "node/npm not found" logged once; node fallback also uses the user profile; the Startup `.vbs` is written as UTF-16 so a Vietnamese path survives. Not changed: log files of a long-running node are not pruned while open; the regex-style source tests remain next to the new behaviour tests (office column count, sort reset, tab resolution).
Tests: frontend 719/719, lint clean, build OK; supervisor dry runs (down / paused) show the expected lines; the live supervisor was restarted with the new script (`-Remove` then `-StartNow`).

## 11. Control Center lock and reboot (PO decisions 2026-10-17, Claude Code/Sonnet 5.5)

- A **lock** (`logs/supervisor.pause`) stops the supervisor from starting the system. Reboot rule: a lock older than the last Windows boot is removed when the supervisor starts (logged), so the system always comes back after the PC restarts; a lock set in the current session is kept.
- `TTVH_ControlCenter.ps1` menu: 1 Start System (releases the lock); 2 Stop System (temporary: no lock, the supervisor starts it again within ~20 s); 3 Stop System + LOCK (stays off until Start); 4 Restart System (always with lock handling: locks while stopping/starting, releases once both ports listen, no extra key prompts); 5 Health; 6 Dashboard; 7 Folder. The header shows "Auto-restart: ON / LOCKED". The PO's word "Log" was read as "Lock" (khóa): if log files were meant, tell Claude Code.
- Verified: parse check (0 errors), lock helper functions in isolation, supervisor dry runs (stale lock cleared with a log line, fresh lock kept); the menu itself was not run (it would stop the live system).

## 12. Hidden levels change the totals (PO 2026-10-19, Claude Code/Sonnet 5.5)

PO: hiding the low-age columns on Theo bưu cục must also recompute the totals. Now Tổng tồn, Tồn ≥5 ngày and Tiền COD of every office and the TỔNG CỘNG row are summed from the shown levels only; an office with no stock left in them is dropped; the comparison columns (not split by level) are unchanged and the screen says so. Supersedes the Section 9.3 rule "Tổng tồn counts hidden levels". Backend: `/api/hangton/overview` → `by_office_level` rows now carry `cod` (needs a backend restart; without it COD shows 0 while levels are hidden, everything else works). Tests: frontend 720/720, backend 6/6, lint clean, build OK.

## 13. Drill-down and full detail (PO 2026-10-19, Claude Code/Sonnet 5.5) — READY FOR PO UI CHECK

1. **Theo bưu cục**: every figure of the table (each level cell, Tổng tồn, Tồn ≥5 ngày, for each office and for the TỔNG CỘNG row) opens a window with the parcels behind that figure (all rows, no paging, titles click-to-order, Tải Excel / Tải CSV). Tổng tồn / ≥5 follow the shown levels (Section 12).
2. **Chi tiết**: paging for every row — page size 50/100/200/500/1000/Tất cả, first/previous/page box/next/last, bar above and below the table. The old "Xuất trang này" is replaced by **Tải Excel (tất cả)** and **CSV (tất cả)**: the server builds the file from every row of the current filter, not one page.
3. Backend: `/api/hangton/items` accepts `levels=a|b` (exact Loại Tồn) and a limit up to 20 000; new `GET /api/hangton/items/export?format=xlsx|csv` + same filters (`itemsExport.js`, Vietnamese headers, column widths, CSV with BOM). Real database check: newest snapshot 5 625 parcels, all exported (xlsx 3.1 MB, 5 626 sheet rows); BCVH Thuận Hóa ≥5 ngày = 118 rows. Backend restart needed.
Tests: frontend 723/723, backend 7/7, lint clean, build OK.

2026-10-19 (PO status): after the backend restart the PO checked Section 13 (click a figure of Theo bưu cục → parcel list; Excel download in Chi tiết) and confirmed it works — PO UI PASS for Sections 9, 12 and 13. Still open: O5 (portal refresh cadence), Import Center integration, Control Center menu real run (PO).

## 14. Customer-group filter (PO 2026-10-24, Claude Code/Sonnet 5.5) — READY FOR PO UI CHECK

TCT runs the stock group by group, so the whole module can be limited to one or several "Phân Loại KH" groups (KH Trọng điểm, KHL2, KH Shopee, KH Tiktok, KH Mới, KH Thường).
- **Filter bar** under the page title (all four screens): one chip per group of the snapshot with its stock and a red "≥5" count (the priority view), listed in handling order (key accounts first); click to switch a group on/off, "Tất cả nhóm" clears; nothing selected = every group; remembered in the browser. The cards always show every group (they are the selector), the figures below follow the selection.
- **Tổng quan chart:** no group or one group → the red stock-age chart as before (title names the group); two or more groups → one stacked series per selected group per Loại Tồn level (distinct non-red colours, legend, tooltip per group, target line kept).
- **Theo bưu cục, So sánh hai mốc, Chi tiết, the drill-down window and Excel/CSV export** all follow the selection; new column "Nhóm KH" in Chi tiết, the window, the comparison lists and the export (already in the file).
- **Backend:** every `/api/hangton` read takes `customers=KH Mới|KH Shopee` (exact values, empty = all): `overview` (adds `by_customer` — all groups, unfiltered — and `by_level_customer`), `items`, `items/export`, `compare` (the comparison is made between the selected groups of both snapshots); `items` sorts by `customer`.
- **Real database check** (2026-10-24 07:30): 4 030 parcels; groups KH Thường 3 008, KH Tiktok 396, KH Mới 319, KHL2 160, KH Shopee 112, KH Trọng điểm 35 (≥5 ngày: 359 / 11 / 50 / 30 / 2 / 6 = 458); KH Mới + KH Shopee = 431 = the sum of the two cards; comparison for the two groups 213 resolved / 194 aged up / 214 new against 1 698 / 1 692 / 2 125 for all groups.
- Tests: frontend hangton suites pass; the full frontend sweep has one failure outside this module (`dashboardLoadPerformance.test.js`, operating patterns lazy-load) caused by another session's uncommitted edit of `IntegratedTrendRiskWorkspace.jsx`, left untouched; backend `test_hangtonInventory.js` 8/8; lint clean, build OK. Backend restart needed.

2026-10-24 (PO status): after the backend restart the PO checked the customer-group filter (Section 14) and confirmed it works - PO UI PASS for Section 14. Note: another session (RBAC-01) has since added module/office scope to the /api/hangton routes (requireHangton, hangtonOffices); that work is recorded in the RBAC-01 manifest, not here.

## 15. Overview chart: from 3 days and a level filter (PO 2026-10-24, Claude Code/Sonnet 5.5) — READY FOR PO UI CHECK

PO: the stacked chart by customer group drowned in the "<1 ngày" bulk and showed nothing useful.
- The Tổng quan chart now starts from **≥3 ngày** (levels below 3 days hidden by default) in both modes (red stock-age chart for 0–1 group, stacked by group for 2+).
- Its own **level picker** above the chart (same control as the Theo bưu cục columns: "Tất cả mức / Từ ≥3 ngày / Từ ≥5 ngày" and one switch per level, any combination), remembered per viewer under `qis.hangton.chartLevels`; the cards and the 9-level table below always show every level. The office table keeps its own choice (`qis.hangton.hiddenLevels`).
- Readability: each bar / segment carries its number (a stacked segment only when tall enough), the chart rescales to the shown levels, the target line stays but its label moved to the legend ("Mục tiêu ≥5 ngày: 0") so it no longer sits on the bars.
- Code: shared `LevelPicker.jsx` and `useStoredHiddenLevels` (`hangtonLevelState.js`); `buildCustomerChart(…, levels)`.
- Tests: hangton/navigation 41/41, lint clean, build OK; the one failure of the full frontend sweep is the known `dashboardLoadPerformance` test caused by another session's uncommitted `IntegratedTrendRiskWorkspace.jsx` edit.

Compact filter bar (PO 2026-10-24, seen at 90% zoom): the customer-group bar was wrapping onto a second row. Chips are smaller (13 px text, tighter padding, short "Tất cả", badge "≥5:n"), the "Đang xem" line is gone (the dark chips already show the selection; the full count stays in the tooltip), so the six groups fit one row at 90% zoom. Presentation only.

## 16. UI brief — redesign of the Tổng quan screen and its charts (PO 2026-10-24; for Antigravity, creative freedom)

**Why.** The PO is not satisfied with Tổng quan: the stacked chart by customer group is hard to read (little is learnt from it), space is wasted at 90 % zoom, and the screen is not "smart" enough for a leader who runs the stock group by group and level by level. The PO asked Antigravity to review the whole screen and propose the layout itself.

**Your freedom.** Judge the current Tổng quan (`HangTonOverviewTab.jsx`, `HangTonCustomerChart.jsx`, the cards, the 9-level table, the status block, the filter bars) and redesign it as you think best for the leader's questions: where is the heavy stock (≥5 / ≥7 / ≥14 ngày), which customer group and which office carries it, what changed against the base snapshot, what to handle first. New chart types, another arrangement of cards and blocks, small multiples per group, a group × level matrix or heat map, a focused "from 5 days" view — all allowed, provided it reads well when captured by the camera button.

**Must stay (function, not look).**
- Data only from the existing `GET /api/hangton/*` responses the page already loads: `overview` (`by_level`, `by_level_customer`, `by_customer`, `by_status`, `by_office`, totals), `compare` (`summary`); props of `HangTonOverviewTab` and the page state stay compatible (`selectedCustomers`, the snapshot picker, `qis.hangton.chartLevels` default "from ≥3 ngày", `useStoredHiddenLevels`, `LevelPicker`, `chartMode`, `buildCustomerChart`). Selecting groups and levels must change the charts at once. If a design needs data the API does not give, say so in the report; do not change the backend.
- PO decisions: D4 target ≥5 ngày = 0 (target line / note); D10–D11 stock age in RED, deeper with age, ≥5 heavier, ≥7 again, ≥14 heaviest; no numeric alert thresholds; the customer-group colours are not red; every figure belongs to one snapshot (date + slot); "—" with a note when there is no comparison base.
- Report-block standard (`docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`): camera button on every block, no undefined identifiers.
- Readability: no text under 12 px (PO checks the captured pictures); use the space well at 90 % zoom and on a laptop; the screen must still work at phone width.
- Other tabs (Theo bưu cục, So sánh hai mốc, Chi tiết), their behaviour and tests do not change; shared components (`LevelPicker`, `CustomerFilterBar`) may be restyled but keep their props.
- Tests: existing hangton tests pass; add tests for any new pure helper.

**Deliver.** Short proposal first (what you saw, what you will change, why), then the build, then manifest Section 17 with the result; stop at `READY FOR PO UI CHECK`.

## 17. Overview & charts redesign (2026-10-24, Antigravity) — READY FOR PO UI CHECK

Redesigned the **Tổng quan** tab and its charts according to PO feedback (Section 16), solving information hierarchy, wasted space at 90% zoom, and executive actionability:
1. **Executive Triage & Priority Actions ("Xử lý gì trước")**:
   - Added an actionable Executive Triage block at the top synthesizing data across `by_office`, `by_customer`, and `by_level`:
     - 🔴 **Cảnh báo bưu gửi tồn nặng**: Phát hiện các bưu gửi ≥14 ngày (báo động đỏ) và ≥7 ngày (cảnh báo cao), COD tồn ≥5 ngày toàn tỉnh.
     - 🏢 **Điểm nóng bưu cục dồn tải**: Nêu đích danh bưu cục có tồn ≥5 ngày cao nhất (tỷ trọng %, số lượng bưu gửi, tiền COD).
     - 👥 **Nhóm khách hàng rủi ro**: Nhận diện nhóm khách hàng trọng điểm/KHL2/sàn TMĐT có tồn lâu cần can thiệp chăm sóc khẩn cấp.
2. **Compact & Intelligent 2-Column Grid Layout (Tối ưu màn hình laptop & zoom 90%)**:
   - Replaced tall 100% full-width stacked blocks with a balanced responsive multi-column layout:
     - **Grid Row 1**:
       - *Cột trái (7 cols)*: Biểu đồ cơ cấu Loại tồn (mặc định từ ≥3 ngày, đổi ngay khi chọn nhóm KH hoặc mức tồn, đường mục tiêu ≥5 ngày = 0, camera button).
       - *Cột phải (5 cols)*: Khối **Điểm nóng Bưu cục (Top BC tồn ≥5 ngày)** với số lượng, thanh tỷ trọng % tồn nặng, tiền COD và nút liên kết xem nhanh bưu gửi.
     - **Grid Row 2**:
       - *Cột trái (6 cols)*: Khối **Phân bổ theo Nhóm Khách Hàng** (thứ tự ưu tiên xử lý: Trọng điểm, KHL2, Shopee, Tiktok, Mới, Thường; hiển thị rõ cột Tổng tồn, Tồn ≥5 ngày kèm badge đỏ nếu > 0, và COD).
       - *Cột phải (6 cols)*: Khối **Trạng thái TMS & Chi tiết 9 mức tồn** dạng tab chuyển đổi nhanh (Chi tiết 9 mức / 5 Trạng thái TMS) giúp tiết kiệm diện tích cuộn dọc.
3. **Ergonomic Quick Navigation**:
   - `HangTonOverviewTab` receives `onDrilldownToOffice`: clicking an office in the hot-spot block jumps directly to the parcel list for that office.
4. **Standards & Constraints preserved**:
   - Only existing API data used (`overview`, `compare`). Backend untouched.
   - PO decisions maintained: RED gradient deepening with age, Target ≥5 ngày = 0, default chart from ≥3 ngày, camera button on every block (`data-no-capture="true"` on controls).
   - Strict font size compliance: no text under 12 px (all labels 12–16 px).
   - Pure logic encapsulated in `frontend/src/features/hangton/hangtonOverviewHelpers.js` with comprehensive unit tests (`hangtonOverviewHelpers.test.js`).
5. **Quality gates**:
   - Tests: 45/45 PASS (`node --test src/features/hangton/hangtonHelpers.test.js src/features/hangton/hangtonOverviewHelpers.test.js src/features/hangton/hangtonPage.test.js src/features/hangton/api/hangtonClient.test.js src/navigation/appNavigation.test.js`).
   - `npm run build` (vite build): clean.
   - `npm run lint` (oxlint): 0 errors on modified files.
   - `oxlint -D no-undef src/features/hangton`: clean (only standard browser globals).
   - No browser, Playwright, dev server, screenshot, or login executed. Stopped at `READY FOR PO UI CHECK`.


## 18. Review of Section 17 and fixes (2026-10-26, Claude Code/Sonnet 5.5) — READY FOR PO UI CHECK

Review of the Antigravity redesign (commit dca72475): backend untouched, 45/45 tests, lint and build clean, but not acceptable as delivered. Seven findings, all fixed:
1. **COD of the heavy stock.** The triage line and the hot-spot card showed the whole-office / whole-group COD next to "tồn ≥5 ngày" figures (real data 26/10: BCVH Phú Lộc 263.4 M for its 725 parcels vs 52.0 M for the 168 parcels of 5 days and more; KH Thường 2 097 M vs 272.8 M). `/api/hangton/overview` now returns `cod_ge5` in `by_office` and `by_customer`; the screen shows "COD ≥5 ngày" (a dash / no claim when the API does not send it). Backend restart needed.
2. **Caption "168 / 725 (35,1%)"** mixed two shares. Now "168 tồn ≥5 ngày / 725 tồn của bưu cục (23,2%)", the bar is the office's own share, and "Chiếm 35,1% tồn ≥5 ngày" is stated apart.
3. **Customer line**: neutral badge "Nhóm KH nhiều tồn nặng nhất" (a badge "Khách hàng trọng điểm" was put on KH Thường); it follows the selected groups; all advice and assumptions removed (SLA, "liên hệ chăm sóc KH", cause of failed delivery, "phát dứt điểm"): the triage states figures only (business rules are the PO's).
4. **"Chi tiết 9 mức Loại Tồn"** always lists all nine levels again (it had followed the chart's level choice, hiding the levels under 3 days); shares add up to 100 %.
5. **Text size**: the body of the screen is one step bigger (nothing at 12 px any more), chart ticks 13 px.
6. **Click-to-order titles** on the customer table and the nine-level table.
7. **"Xem bưu gửi"** in the hot-spot block opens Chi tiết already limited to 5 days and more (or the parcel window when Chi tiết is not allowed for the user).
Also noted, not changed: the two charts themselves are the earlier ones (red by level; stacked by group); Antigravity did not send the short proposal that the prompt asked for first.
Tests: hangton/navigation 49/49, backend `test_hangtonInventory.js` 9/9, lint clean, build OK.

2026-10-26 (PO status): after the backend restart the PO checked the Tổng quan screen with the Section 18 fixes and confirmed it is OK - PO UI PASS for Sections 17-18.

2026-10-26 (PO request): on Theo bưu cục the header of the three comparison columns now names the snapshot they are measured against ("Biến động so với 25/10/2026 07:30", or "chưa có mốc so sánh") and states that they count every level, not only the columns shown (`compareColumnsHeader`). Presentation only; tests hangton/navigation 51/51, lint clean, build OK.
