# F13-ROUTE-POSTMAN-IDENTITY-01 — Independent Design Review 001

- Ticket: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Reviewed document: `docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_PROPOSAL.md` (author Antigravity, commit `5cc012f`)
- Reviewer: Claude Code (Opus 5) — independent of the proposal author
- Date: 2026-09-17
- Branch / baseline: `codex/da-impl-006` @ `5cc012f8a56213042b6b4237e85a11bbfa4976ef`
- Mode: review only. Read-only SQLite queries (`OPEN_READONLY`) on `backend/src/db/database.sqlite` and a read-only parse of `2026.09.17 - DB Buu ta.xls`. No code, schema, database or business-data change. No Browser/Playwright.

## 1. Verdict

**BLOCKED — Design of Record not yet approvable as written.**

The core direction is **sound and verified** (flow day + route → BatchFile → postman code → directory; name join by code only; multi-postman preservation; data minimization). Implementation must not start from the proposal as submitted because of 2 design defects (R1 permission/location, R2 query performance) and 3 gaps (R3 audit/rollback, R4 period contract, R5 import semantics). This review supplies the corrected minimal contract (Sections 4–7). Remaining blocker after adopting it is **Product Owner decisions D1–D4 only** (Section 8); no further technical blocker.

## 2. Verification of proposal claims (real evidence)

| Claim | Evidence | Result |
| --- | --- | --- |
| Directory: 198 rows, 198 unique codes, header `Tên tài khoản` / `Họ tên người dùng` / `Mã bưu cục` | Sheet `BaoCaoChiTietNguoiDung`, header at sheet row 9; 199 non-blank rows of which 1 is the column-number row (`1..14`) → 198 real rows, 198 distinct; code shapes `53A999`, `53B999`, `53F999`, `53H999`, `53N999`, `53K999`; 11 distinct `Mã bưu cục`; 0 blank names; `Chức danh` = `Bưu tá` only; `Tình trạng hoạt động` = `Hoạt động` only | **PASS** (parser must skip the numbering row) |
| Day + route join is the right grain | 2026-08-10..12: 12,213 `fact_f13` items; 11,378 found in `network_delivery_point` by `ma_bg = ma_buu_gui AND ngay_phat = ngay_do_kiem`; of those **11,378/11,378 same `route_po_code = ma_tuyen` and same `ma_bcvh`**; only 6 items matched on a different date | **PASS** — `ngay_phat` and `ngay_do_kiem` are the same calendar semantic; both TEXT `YYYY-MM-DD` |
| Multi-postman 21.3% of (day, route) | Live DB: 1,974 / 9,269 distinct (`ngay_phat`, `route_po_code`) pairs have >1 `postman_code` = 21.3% | **PASS** |
| (day, route) never spans BCVH | Pairs with >1 `ma_bcvh`: **0** | **PASS** |
| Route coverage | Aug 2026, `53%` BCVH: 2,916 / 3,157 (92.4%) `fact_f13` (day, route) pairs have BatchFile rows | **PASS** (consistent with 118/123) |
| 277 / 172 / 105 / 26, 81.93% | Figures are from the 4 `.xlsb` files. **Live DB differs**: holds May, Jun, Aug only (440,091 rows; **July not imported**) → 185 codes, 136 matched (87.28% volume), 49 missing, 63 DB-only, 0 multi-BCVH codes, 0 BCVH mismatch | **PASS WITH NOTE** — counts are period-dependent; Tab 2 must be computed live, never hard-coded |
| "API < 50 ms" | No index on (`ngay_phat`, `route_po_code`). Existing `idx_network_delivery_point_query(ngay_phat, ma_bcvh, postman_code)` only seeks `ngay_phat`. A one-month EXISTS probe over 3,157 pairs took **33,104 ms** | **FAIL** — unsubstantiated (R2) |
| Catalog at `/admin/postman-catalog`, "cấp quyền admin" | No admin module/route namespace exists in `App.jsx`; roles are only `admin`/`viewer` via `requireRole`; `ADMIN-USER-MODULE-ACCESS-01` is a separate queued audit | **FAIL** vs PO requirement (R1) |

## 3. Findings

- **R1 (Blocking — placement/permission).** A new `/admin/...` area implies an Admin module that does not exist and couples this ticket to `ADMIN-USER-MODULE-ACCESS-01`/RBAC. Correction: place the catalog inside the existing **Mạng lưới** module (sidebar group of `Sơ đồ tuyến phát`) as `/network-map/postman-catalog`, reusing exactly the existing gates in `backend/src/routes/networkMapRoutes.js`: read = `requireRole(['admin','viewer'])`, write/import/rollback = `requireRole(['admin'])`; frontend `ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}` with write controls hidden for viewer. No new role, permission table or menu system.
- **R2 (Blocking — performance).** The proposed join must not run against 440k+ rows per request without an index. Correction: one additive covering index `idx_network_delivery_point_route_day ON network_delivery_point(ngay_phat, route_po_code, postman_code)` (pure index; rollback = `DROP INDEX`). Service performs one grouped query per request for the requested date(s) and BCVH, never N+1 per route. Materialized aggregate table rejected for Phase 1: it would couple to delivery-route import confirm and rollback (`network_import_snapshot`) for no measured need. Acceptance: `EXPLAIN QUERY PLAN` shows `SEARCH ... USING COVERING INDEX`, and a one-month period query measured (not asserted) on the operational DB copy.
- **R3 (Major — audit & rollback missing).** Inline name entry "tức thời toàn bộ lịch sử" has no before-image, author or source. `network_import_log` cannot be reused: its `CHECK (module IN ('service_point','level2_route','delivery_route'))` would require a SQLite table rebuild of a shared, populated table. Correction: own event table (Section 5).
- **R4 (Major — period contract absent).** Proposal defines only the daily view. `/f13/ranking/route/periods` exists (F13-ROUTE-RANKING-PERIOD-01). Contract must define postmen for a period (Section 6), subject to PO D2.
- **R5 (Major — re-import semantics undefined).** Future directory files can omit codes or rename. Rules for absent codes and import-vs-manual precedence are business rules → PO D1/D3.
- **R6 (Minor — data freshness).** `fact_f13` reaches 2026-09-16 while BatchFile ends 2026-08-31 (monthly file). The current month will always show `—` until the monthly BatchFile is imported. The UI must state the reason, and PO must accept the lag (D4).
- **R7 (Minor — BCVH cross-check).** Name join is by `ma_buu_ta` only (correct in proposal). A directory `ma_bcvh` differing from the route's BatchFile `ma_bcvh` must raise a flag (`bcvh_mismatch = true`), never suppress or replace the name. Currently 0 cases.
- **R8 (Minor — doc accuracy).** Proposal cites 678,328 points / 4 months as if in the DB; the DB has 3 months. Mention both bases. `buu_ta: null` in `F13DashboardService.js` (~line 1111) must stay as-is; new fields are additive.

## 4. Data contract (locked by this review)

- **Source A** `fact_f13(ngay_do_kiem, ma_bcvh, ma_tuyen)` — unchanged, KPI untouched.
- **Source B** `network_delivery_point(ngay_phat, route_po_code, postman_code, ma_bcvh)` — read only.
- **Source C** `dm_buu_ta(ma_buu_ta)` — directory.
- Join 1: `B.ngay_phat = A.ngay_do_kiem AND B.route_po_code = A.ma_tuyen`.
- Join 2: `C.ma_buu_ta = B.postman_code` — **only key for the name**. `C.ma_bcvh` is compared to `B.ma_bcvh` for a flag only.
- Keys normalized with `TRIM` + `UPPER` at import time (stored normalized), not in the query.
- Order within a route: `item_count DESC, postman_code ASC` (deterministic; no "representative postman").
- Postman fields never enter any KPI numerator/denominator, sort key of the ranking, or `danh_gia_2026`.

Per route row (additive to `getRoute` response):

```json
"postman_status": "OK | NO_BATCHFILE_FOR_DATE | ROUTE_NOT_IN_BATCHFILE",
"postmen": [
  { "ma_buu_ta": "53A819", "ten_buu_ta": "NGUYỄN VĂN A", "item_count": 41,
    "name_status": "NAMED | UNNAMED", "bcvh_mismatch": false }
]
```

`NO_BATCHFILE_FOR_DATE` = no `network_delivery_point` row for that `ngay_phat` at all; `ROUTE_NOT_IN_BATCHFILE` = date present, route absent. Both display `—`; `UNNAMED` displays the code and `—` for the name. Nothing is fabricated.

## 5. Schema (minimal, additive, reversible)

```sql
CREATE TABLE IF NOT EXISTS dm_buu_ta (
  ma_buu_ta TEXT PRIMARY KEY,               -- normalized Tên tài khoản
  ten_buu_ta TEXT NOT NULL,                 -- Họ tên người dùng
  ma_bcvh TEXT,                             -- Mã bưu cục (cross-check only)
  ten_bcvh TEXT,
  trang_thai_hoat_dong TEXT,                -- as in file, e.g. 'Hoạt động'
  nguon TEXT NOT NULL CHECK (nguon IN ('IMPORT','MANUAL')),
  in_latest_import INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dm_buu_ta_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,                   -- one per import confirm or manual save
  ma_buu_ta TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE')),
  before_image TEXT,                        -- JSON of the 5 allowed fields only
  after_image TEXT NOT NULL,
  nguon TEXT NOT NULL CHECK (nguon IN ('IMPORT','MANUAL')),
  file_name TEXT, file_fingerprint TEXT,
  created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dm_buu_ta_event_batch ON dm_buu_ta_event(batch_id);
CREATE INDEX IF NOT EXISTS idx_network_delivery_point_route_day
  ON network_delivery_point(ngay_phat, route_po_code, postman_code);
```

- **Never stored anywhere** (table, event JSON, preview session, logs, archive copy): `Số điện thoại`, `Mã HRM`, `Loại hợp đồng`, `Chức danh`, `Mã/Tên BĐT`, `Mã/Tên BĐH`. The uploaded file is parsed in memory and not archived (unlike `network_import_archive`) because it contains personal data.
- No DELETE path in Phase 1: codes are never removed; absence from a new file only sets `in_latest_import = 0`.
- Migration follows the project pattern (`migrate_*_schema.js` + test + `schema.sql` + `server.js` startup registration), idempotent, with pre-migration DB backup.
- **Rollback levels:** (a) data — `POST .../rollback/:batchId` restores `before_image` (UPDATE) or removes rows the batch INSERTed, admin only, refused if a later batch touched the same code; (b) feature — frontend hides columns/menu, API fields ignored, zero effect on KPI; (c) schema — `DROP INDEX idx_network_delivery_point_route_day; DROP TABLE dm_buu_ta_event; DROP TABLE dm_buu_ta;` (no existing table altered).

## 6. API (reuse `networkMapRoutes.js` + `f13Routes.js`, no new auth)

| Method & path | Gate | Purpose |
| --- | --- | --- |
| `GET /api/f13/ranking/route` (existing) | viewer+admin | add `postman_status`, `postmen[]` per row |
| `GET /api/f13/ranking/route/periods` (existing) | viewer+admin | add `postmen[]` aggregated over the period with `days_active` + `item_count` (per D2) |
| `GET /api/network-map/postman-catalog?q=&ma_bcvh=&page=` | viewer+admin | Tab 1 list |
| `GET /api/network-map/postman-catalog/unnamed?from_date=&to_date=&ma_bcvh=` | viewer+admin | Tab 2: live `postman_code` in B not in C, with `ma_bcvh` (dominant), `item_count`, top routes, `last_seen`; default range = all imported data |
| `POST /api/network-map/postman-catalog/import/preview` (multipart) | admin | parse `.xls/.xlsx`, validate header, show INSERT/UPDATE/unchanged/absent counts; minimized payload only in `network_import_session`-style short-lived cache |
| `POST /api/network-map/postman-catalog/import/confirm` | admin | apply in one transaction + events |
| `PUT /api/network-map/postman-catalog/:ma_buu_ta` | admin | manual name/status (creates code if unnamed; `nguon = MANUAL`) |
| `GET /api/network-map/postman-catalog/history` · `POST .../rollback/:batchId` | admin | audit & data rollback |

Validation: header must contain `Tên tài khoản` and `Họ tên người dùng`; code must match `^53[A-Z]\d{3}$` or be reported as rejected (not silently dropped); duplicate code in file → preview error; empty name → reject row.

## 7. UI (minimum)

- **Route Ranking (`frontend/src/features/route/RoutePerformancePage.jsx`)**: add `Mã bưu tá` and `Tên bưu tá` after `Tên tuyến`. 1 postman → code / name; ≥2 → first by `item_count` plus `(+n)` with an accessible full list (tooltip/popover showing code, name, item count). `—` with reason text for the two missing statuses; `—` name for `UNNAMED`; small warning marker for `bcvh_mismatch`. Columns not sortable in Phase 1; KPI column groups, widths lock and heatmap SSOT of the table otherwise unchanged (visual fit is Antigravity/PO UI check).
- **Rà soát danh mục bưu tá** (`/network-map/postman-catalog`, sidebar Mạng lưới): Tab 1 directory (search, BCVH filter, `Nguồn`, `Có trong file gần nhất`); Tab 2 unnamed codes sorted by `item_count DESC` with inline name input + `Lưu` (admin only); import preview/confirm dialog; history with rollback (admin only). Viewer sees read-only.

## 8. Product Owner decisions required before Phase 1

- **D1** Import vs manual precedence: when a new directory file has a different name for a code last set `MANUAL`, does the file overwrite (recommended: overwrite, shown in preview as UPDATE) or keep manual?
- **D2** Period view: show all postmen active in the period ordered by days/items (recommended) or daily view only in Phase 1?
- **D3** Codes absent from a newer file: keep name and mark `Không có trong file gần nhất` (recommended) or hide name?
- **D4** Accept that current-month rows show `—` until the monthly BatchFile is imported (and that July 2026 BatchFile is not yet in the live DB)?

## 9. Recommended phasing (after D1–D4)

1. Claude Code — migration (tables + index) with tests, directory import service + preview/confirm/rollback, PUT, unnamed-codes query, `EXPLAIN` + timing evidence. No KPI file touched except additive response fields.
2. Claude Code — route ranking daily + period `postmen[]` contract with repository tests (multi-postman, unnamed, no-BatchFile-date, route-absent, BCVH mismatch).
3. Antigravity — UI columns and catalog page; then `READY FOR PO CHECK`.

Importing the real `2026.09.17 - DB Buu ta.xls` into the operational DB is a business-data write and requires explicit PO go-ahead at Phase 1 closeout.
