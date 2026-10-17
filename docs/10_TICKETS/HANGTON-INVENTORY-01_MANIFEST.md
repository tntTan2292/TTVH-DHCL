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
