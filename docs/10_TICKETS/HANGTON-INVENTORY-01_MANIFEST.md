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

## 2a. Derived measures (parcel level, between snapshot A (earlier) and B (later), keyed by `ItemCode`)

- Resolved: in A, not in B (left the stock; B-side status may be unknown since the portal no longer lists it).
- Aged up: in both, `Loại Tồn` level higher in B.
- New: in B, not in A.
- Unchanged: in both, same level.
- Dashboards/widgets: overall Huế and per-office stock by level, resolved / aged-up / new counts, ≥5 ngày vs target 0, per-level alerts (D10). Offices shown only if they have stock (D5).

## 3. Open points

- O2: numeric alert thresholds per level (counts or rates; per office or Huế total).
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

Required Reading for the executor: this manifest and `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`.
