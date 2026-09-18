# F13-ROUTE-POSTMAN-IDENTITY-01 — Design of Record

- Ticket: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Version: `DoR v2` (supersedes `F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_PROPOSAL.md` = DoR v1 wherever they differ)
- Status: `PHASE 1–3 APPROVED FOR IMPLEMENTATION / PHASE 4–5 BLOCKED ON PO INPUTS`
- Authority: Product Owner decisions D1–D4 received in chat `2026-09-18`, on top of Independent Design Review 001 (`docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_REVIEW_001.md`)
- Baseline: `codex/da-impl-006` @ `5193865`
- Author: Claude Code (Opus 5). Evidence sources: DoR v1 (Antigravity discovery), Design Review 001, plus the read-only key audit in Section 12.2.
- This document is documentation only. No code, schema, migration or database change is authorized by writing it.

## 1. Scope

In scope: postman identity (`Mã bưu tá`, `Tên bưu tá`) on F1.3 Tuyến phát Ranking; the `Rà soát danh mục bưu tá` function inside the existing Quản lý mạng lưới group; the directory table, its history and rollback; the daily-BF dependency (design only, Phase 4); the redesign of the current Sơ đồ tuyến phát import into `Bổ sung thời gian phát từ BCCP định vị` (design only, Phase 5).

Not in scope / unchanged: F1.3 KPI, `danh_gia_2026`, any frozen SSOT; `ADMIN-USER-MODULE-ACCESS-01` and any new RBAC model; BCVH ranking; F4.1.

Postman fields are display-only. They never enter a KPI numerator/denominator, the ranking sort key, or any classification rule.

## 2. Product Owner decisions (locked)

- **D1 — name conflicts.** A name entered manually in `Rà soát danh mục bưu tá` is never silently overwritten by a later directory file. A differing name goes to a `Xung đột cần rà soát` list for the PO to decide. A record still owned by the file (never hand-edited) may be updated by a newer file. Every change is recorded and reversible.
- **D2 — display anchor.** In both daily and period views, `Mã bưu tá` / `Tên bưu tá` are anchored to the selected evaluation date (`ngày đánh giá`). The header/caption states which date the postmen belong to. All postmen of that route on that date are shown, each code with its own name. No representative is chosen, and no postman is borrowed from another date.
- **D3 — codes absent from a newer directory file.** Never deleted. Kept so historical rows stay correct, and marked `Không có trong danh bạ mới nhất`. Absence from a file is never grounds to delete history.
- **D4 — data source.** Waiting for a month-end BatchFile is rejected. The daily BF becomes the shared base source for both F1.3 and Sơ đồ tuyến phát, fetched and imported automatically (PO will supply the source and the retrieval method later). The existing manual full-BF import at Sơ đồ tuyến phát is redesigned into `Bổ sung thời gian phát từ BCCP định vị`, which only enriches delivery time for shipments already present from the daily BF. No BCCP sample file, no parser and no fetch mechanism may be guessed before the PO supplies them.

## 3. Disposition of Independent Design Review 001 (R1–R8)

| ID | Finding | Disposition | Where |
| --- | --- | --- | --- |
| R1 | `/admin/postman-catalog` created an Admin/RBAC dependency | **RESOLVED** — `/network-map/postman-catalog` inside Quản lý mạng lưới, reusing existing gates only | §7, §8 |
| R2 | No `(ngay_phat, route_po_code)` index; 33.1 s probe; "<50 ms" unsupported | **RESOLVED** — additive covering index; no performance figure is committed until measured, and measurement is a Phase 2 completion-gate item | §6.3, §11 |
| R3 | No audit trail / rollback for directory edits | **RESOLVED** — `dm_buu_ta_event` (own table; `network_import_log`'s `CHECK` forbids reuse) + batch rollback | §6.2, §9 |
| R4 | Period view contract missing | **RESOLVED by D2** — postmen anchored to the selected evaluation date in both views | §5.3 |
| R5 | Re-import semantics undefined | **RESOLVED by D1 + D3** — conflict queue, file-owned rows updatable, absent codes retained and flagged | §6.4, §7 |
| R6 | Current month shows `—` until the monthly BF is imported | **SUPERSEDED by D4** — daily BF becomes the base source (Phase 4). Until Phase 4 lands, Phase 3 UI must state the data-coverage date range explicitly | §5.4, §12.1 |
| R7 | BCVH mismatch handling | **RESOLVED** — name joins on `ma_buu_ta` only; BCVH is a cross-check flag, never a join condition or filter, because a postman may deliver in support of another unit | §5.1 |
| R8 | v1 quoted file-based counts as if they were live-DB counts | **RESOLVED** — both bases stated; all catalog figures are computed live, never hard-coded | §5.5, §10.2 |

## 4. Placement and permissions (no new RBAC)

- Route: `/network-map/postman-catalog`, in the existing sidebar group with `Mạng điểm phục vụ` / `Mạng đường thư cấp 2` / `Sơ đồ tuyến phát` (`frontend/src/components/Sidebar.jsx`), guarded by the existing `ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}` pattern in `App.jsx`.
- API: registered in the existing `backend/src/routes/networkMapRoutes.js`, reusing its existing middleware composition exactly: read = `requireAuth + requireRole(['admin','viewer'])`; edit / file upload / rollback = `requireAuth + requireRole(['admin'])`.
- No new role, no new permission table, no new module registry, no dependency on `ADMIN-USER-MODULE-ACCESS-01`.

## 5. Data contract

### 5.1 Join rules

1. `fact_f13(ngay_do_kiem, ma_tuyen)` → `network_delivery_point(ngay_phat = ngay_do_kiem, route_po_code = ma_tuyen)`.
2. `network_delivery_point.postman_code` → `dm_buu_ta.ma_buu_ta` — **the only key used to obtain a name**.
3. `dm_buu_ta.ma_bcvh` vs `network_delivery_point.ma_bcvh` — cross-check only. A difference sets `bcvh_mismatch = true` and never suppresses, filters or replaces the name (a postman may support another unit).

Codes are normalized (`TRIM` + `UPPER`) at write time on both sides; no normalization inside the ranking query. Ordering within a route is `item_count DESC, ma_buu_ta ASC` — deterministic, not a ranking of people.

### 5.2 Route row payload (additive to the existing `/api/f13/ranking/route` response)

```json
"postman_anchor_date": "2026-08-15",
"postman_status": "OK | NO_BF_FOR_DATE | ROUTE_NOT_IN_BF",
"postmen": [
  { "ma_buu_ta": "53A819", "ten_buu_ta": "NGUYỄN VĂN A", "item_count": 41,
    "name_status": "NAMED | UNNAMED", "bcvh_mismatch": false }
]
```

The existing `buu_ta: null` field in `backend/src/services/F13DashboardService.js` stays as-is; these fields are additive so no existing consumer breaks.

### 5.3 Anchor rule (D2)

- Daily view: anchor date = the selected date.
- Period view (`/api/f13/ranking/route/periods`): the KPI columns keep their existing period semantics, while `postmen[]` is resolved **only** for `postman_anchor_date` = the evaluation date the PO selected for that view. The response always carries `postman_anchor_date`, and the UI prints it in the column header/caption (e.g. `Mã bưu tá (ngày 15/08/2026)`).
- Never aggregate postmen across the period, never fall back to a neighbouring date, never collapse to one representative.

### 5.4 Missing-data rules

| Case | `postman_status` | Display |
| --- | --- | --- |
| No `network_delivery_point` row for the anchor date at all | `NO_BF_FOR_DATE` | `—` for both columns + caption "chưa có dữ liệu BF ngày này" |
| Date present, route absent from BF | `ROUTE_NOT_IN_BF` | `—` for both columns |
| Code present, no name in directory | `OK` + `name_status = UNNAMED` | code shown, name `—`, links to the catalog's unnamed tab |

Nothing is fabricated or inferred. The ranking page also shows the BF data-coverage range so a user can tell "no data yet" from "no postman".

### 5.5 Evidence base for the figures

Two bases exist and must always be labelled: the 4 monthly `.xlsb` files (678,328 points; 277 codes; 172 matched = 81.93%; 105 unnamed; 26 directory-only) and the live database (440,091 rows, May/Jun/Aug 2026 only — July not imported; 185 codes; 136 matched = 87.28%; 49 unnamed; 63 directory-only; 0 BCVH mismatch; 0 (day, route) pairs spanning two BCVH; multi-postman 1,974 / 9,269 pairs = 21.3%). Every screen computes from the database at request time.

## 6. Schema (additive, reversible)

### 6.1 `dm_buu_ta`

```sql
CREATE TABLE IF NOT EXISTS dm_buu_ta (
  ma_buu_ta TEXT PRIMARY KEY,                 -- Tên tài khoản, normalized
  ten_buu_ta TEXT NOT NULL,                   -- Họ tên người dùng
  ma_bcvh TEXT,                               -- Mã bưu cục (cross-check only)
  ten_bcvh TEXT,
  trang_thai_hoat_dong TEXT,                  -- as exported, e.g. 'Hoạt động'
  nguon TEXT NOT NULL CHECK (nguon IN ('IMPORT','MANUAL')),
  in_latest_import INTEGER NOT NULL DEFAULT 0,-- D3 marker
  last_import_batch_id TEXT,
  updated_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dm_buu_ta_bcvh ON dm_buu_ta(ma_bcvh);
```

Stored fields are exactly the five business fields plus source/update metadata. **Never stored anywhere** — table, event JSON, preview cache, logs, archive: `Số điện thoại`, `Mã HRM`, `Loại hợp đồng`, `Chức danh`, `Mã/Tên BĐT`, `Mã/Tên BĐH`. The uploaded directory file is parsed in memory and is not archived (it contains personal data), unlike `network_import_archive` for network files.

### 6.2 `dm_buu_ta_event` (history + rollback)

```sql
CREATE TABLE IF NOT EXISTS dm_buu_ta_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,                     -- one per import confirm / manual save / conflict resolution
  ma_buu_ta TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','RESOLVE_CONFLICT','ROLLBACK')),
  before_image TEXT,                          -- JSON of the five allowed fields only
  after_image TEXT NOT NULL,
  nguon TEXT NOT NULL CHECK (nguon IN ('IMPORT','MANUAL')),
  file_name TEXT, file_fingerprint TEXT,
  created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dm_buu_ta_event_batch ON dm_buu_ta_event(batch_id);
CREATE INDEX IF NOT EXISTS idx_dm_buu_ta_event_code ON dm_buu_ta_event(ma_buu_ta, created_at);
```

`network_import_log` is deliberately not reused: its `CHECK (module IN ('service_point','level2_route','delivery_route'))` would force a rebuild of a shared, populated table.

### 6.3 Ranking index (R2)

```sql
CREATE INDEX IF NOT EXISTS idx_network_delivery_point_route_day
  ON network_delivery_point(ngay_phat, route_po_code, postman_code);
```

Pure additive index; rollback is `DROP INDEX`. The service issues one grouped query per request for the anchor date (and BCVH filter), never one query per route. No materialized aggregate in Phase 1 — it would couple to import confirm/rollback for no measured need.

### 6.4 `dm_buu_ta_conflict` (D1)

```sql
CREATE TABLE IF NOT EXISTS dm_buu_ta_conflict (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_buu_ta TEXT NOT NULL,
  ten_hien_tai TEXT NOT NULL,                 -- current stored (manual) name
  ten_tu_file TEXT NOT NULL,                  -- name proposed by the newer file
  ma_bcvh_file TEXT, ten_bcvh_file TEXT, trang_thai_file TEXT,
  batch_id TEXT NOT NULL,                     -- the import batch that raised it
  file_name TEXT, file_fingerprint TEXT,
  trang_thai TEXT NOT NULL CHECK (trang_thai IN ('OPEN','KEPT_MANUAL','APPLIED_FILE')) DEFAULT 'OPEN',
  resolved_by TEXT, resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_buu_ta_conflict_open
  ON dm_buu_ta_conflict(ma_buu_ta) WHERE trang_thai = 'OPEN';
```

Migration follows the project pattern (`migrate_*_schema.js` + its test + `schema.sql` + startup registration in `server.js`), idempotent, with a DB backup taken first. Full schema rollback: `DROP INDEX idx_network_delivery_point_route_day;` + `DROP TABLE dm_buu_ta_conflict; DROP TABLE dm_buu_ta_event; DROP TABLE dm_buu_ta;`. No existing table is altered.

## 7. Directory import semantics (D1 + D3)

For each row of a newer directory file, per code:

| Existing record | File row | Action |
| --- | --- | --- |
| none | any | `INSERT`, `nguon = IMPORT`, `in_latest_import = 1` |
| `nguon = IMPORT`, same name | — | `unchanged`, refresh `in_latest_import = 1` (BCVH/status updated if changed, logged as `UPDATE`) |
| `nguon = IMPORT`, different name | — | `UPDATE` applied (file still owns the record), event written |
| `nguon = MANUAL`, same name | — | `unchanged`; ownership stays `MANUAL` |
| `nguon = MANUAL`, different name | — | **No write.** Row goes to `dm_buu_ta_conflict` as `OPEN`; the stored name keeps showing until the PO decides |
| code not in file | — | keep row, set `in_latest_import = 0`, mark `Không có trong danh bạ mới nhất`. Never delete |

BCVH / status from the file always refresh (they are not personal names and carry no manual-edit conflict), and each refresh is logged. Conflict resolution is an admin action writing `KEPT_MANUAL` or `APPLIED_FILE` with a `RESOLVE_CONFLICT` event, so it is itself reversible.

Preview before confirm reports: `insert`, `update`, `unchanged`, `conflict`, `absent_from_file`, `rejected` (bad code shape, empty name, duplicate code in file). Confirm applies one transaction with one `batch_id`. Re-uploading the same file is allowed; identical content yields all-`unchanged` and no events.

Parser rules for `2026.09.17 - DB Buu ta.xls`-shaped files: sheet is found by header set, header row located by text (`Tên tài khoản`, `Họ tên người dùng`, `Mã bưu cục`), the column-number row directly under the header is skipped, code must match `^53[A-Z]\d{3}$` (live BF shapes observed: `53A/53B/53F/53H/53N/53T` + 3 digits) or the row is reported as rejected — never silently dropped.

## 8. API surface

| Method & path | Gate | Purpose |
| --- | --- | --- |
| `GET /api/f13/ranking/route` *(existing)* | admin+viewer | adds `postman_anchor_date`, `postman_status`, `postmen[]` |
| `GET /api/f13/ranking/route/periods` *(existing)* | admin+viewer | same fields, anchored per D2 |
| `GET /api/network-map/postman-catalog` | admin+viewer | Tab 1: directory list (search, BCVH filter, `nguon`, `in_latest_import`) |
| `GET /api/network-map/postman-catalog/unnamed` | admin+viewer | Tab 2: live list of BF codes without a name |
| `GET /api/network-map/postman-catalog/conflicts` | admin+viewer | Tab 3: open conflicts |
| `POST /api/network-map/postman-catalog/import/preview` | admin | parse + classify, short-lived session cache, minimized payload |
| `POST /api/network-map/postman-catalog/import/confirm` | admin | apply in one transaction, write events |
| `PUT /api/network-map/postman-catalog/:ma_buu_ta` | admin | manual name/status (creates the record for an unnamed code; `nguon = MANUAL`) |
| `POST /api/network-map/postman-catalog/conflicts/:id/resolve` | admin | `KEPT_MANUAL` or `APPLIED_FILE` |
| `GET /api/network-map/postman-catalog/history` | admin | batches + events |
| `POST /api/network-map/postman-catalog/rollback/:batchId` | admin | restore `before_image`; refused if a later batch touched the same codes (reported, not forced) |

## 9. Reconciliation view (`unnamed`)

Computed live from `network_delivery_point` minus `dm_buu_ta`, per PO request: `Mã bưu tá`, `Mã/Tên BCVH` (dominant, plus a marker when several), `Các tuyến thường phát` (top N by volume), `Kỳ xuất hiện` (first/last delivery date and months covered), `Sản lượng` (delivery-point count), sorted by volume descending, with an inline name field and `Lưu` for admins. Optional `from_date`/`to_date`/`ma_bcvh` filters; default range = all imported data. Saving a name takes effect immediately for all historical rows of that code, because the name is joined at read time and never copied into fact rows.

## 10. UI (minimum)

### 10.1 Tuyến phát Ranking (`frontend/src/features/route/RoutePerformancePage.jsx`)

`Mã bưu tá` and `Tên bưu tá` are added after `Tên tuyến`. Column header carries the anchor date (D2). One postman → code / name on one line; several → every code–name pair is kept and shown (stacked lines, or the first plus `(+n)` with an accessible popover listing every pair with its item count — never a single representative). `—` with a reason caption for the two missing statuses, `—` for an unnamed code, a small marker for `bcvh_mismatch`. Existing KPI column groups, locked widths, heatmap SSOT and typography rules are unchanged; visual fit is Antigravity's work and the PO's UI check.

### 10.2 Rà soát danh mục bưu tá (`/network-map/postman-catalog`)

Three tabs: **Danh mục bưu tá** (directory, with `Nguồn` and `Không có trong danh bạ mới nhất`), **Mã chưa có tên** (§9), **Xung đột cần rà soát** (D1: current name vs file name, source batch, keep/apply buttons). Plus an import dialog (preview → confirm) and a history panel with rollback. Viewers see everything read-only; write controls appear for admins only. No counts are hard-coded.

## 11. Phases and completion gates

| Phase | Content | Executor | Completion gate |
| --- | --- | --- | --- |
| **1. Directory foundation** — ready now | Migration (`dm_buu_ta`, `dm_buu_ta_event`, `dm_buu_ta_conflict`, ranking index) + tests; directory import preview/confirm with D1/D3 rules; manual edit; conflict resolve; history + rollback; `unnamed` query | Claude Code | Migration idempotency test PASS; import classification tests (insert/update/unchanged/conflict/absent/rejected) PASS; rollback restores before-image; no forbidden field anywhere in code or payloads. Loading the real `2026.09.17 - DB Buu ta.xls` into the operational DB is a business-data write and needs its own PO go-ahead |
| **2. Ranking contract** — ready now | `postmen[]` + anchor date in daily and period endpoints; repository/service tests for multi-postman, unnamed, no-BF-date, route-absent, BCVH mismatch | Claude Code | Tests PASS; `EXPLAIN QUERY PLAN` shows the covering index; **measured** timings recorded for a day query and a period query — no performance claim is published without the measurement |
| **3. UI** — ready now | Ranking columns with anchor-date header; catalog page with three tabs, import dialog, history | Antigravity | Technical validation PASS → `READY FOR PO CHECK` (PO UI acceptance; never self-awarded) |
| **4. Daily BF auto-import** — **BLOCKED** | Scheduled fetch + import of the daily BF as the shared base for F1.3 and Sơ đồ tuyến phát; idempotent per (day, source), re-runnable, observable | TBD at activation | **Cannot start**: PO must first supply the BF source and retrieval method. Design will be written against the real source, never guessed |
| **5. BCCP định vị enrichment** — **BLOCKED** | Redesign of the current Sơ đồ tuyến phát import into `Bổ sung thời gian phát từ BCCP định vị` | TBD at activation | **Cannot start**: PO must first supply a BCCP sample file. Parser and join key are locked only after a read-only audit of that real file |

Phases 1–3 are implementable today and are self-contained: they add no dependency on Phase 4/5 and are not invalidated by them (the daily BF writes the same `network_delivery_point` contract the ranking join already reads). **The design as a whole is not "ready to implement": Phases 4 and 5 remain blocked until the two PO inputs arrive.**

## 12. Phase 4 and 5 — what is fixed now and what is not

### 12.1 Daily BF (Phase 4)

Fixed now: the daily BF is the shared base source for F1.3 and Sơ đồ tuyến phát; it carries the fields already known from the monthly BF (`ngay_phat`, `ma_buu_gui`, `route_po_code`, `postman_code`, `ma_bcvh`, `LAT`/`LON`); the F1.3 stitching chain stays exactly as in §5.1; manual full-BF import by the PO stops being required. Not fixed: source system, transport, authentication, schedule, file naming/format and failure handling — all await the PO's instructions. Until Phase 4 lands, Phase 3 must display the actual coverage range of `network_delivery_point` so no user reads "no data yet" as "no postman".

### 12.2 BCCP định vị (Phase 5) — constraints already locked, plus key audit

Locked constraints: enrichment of delivery time only, for shipments that already exist from the BF; no duplicate rows; no change to `route_po_code`, `postman_code`, coordinates or any F1.3 KPI/SSOT; join key prioritizes `Mã bưu gửi` with `ngày phát` as an additional check, to be confirmed against real data before it is locked; every import reports `matched`, `unmatched`, `unchanged`, `conflict`; re-import and rollback supported; afterwards Sơ đồ tuyến phát uses BF base data plus BCCP time to order the delivery journey.

Read-only audit of the proposed key on the live database (440,091 rows, May/Jun/Aug 2026), for the PO's decision at Phase 5 activation:

- `ma_buu_gui` is nearly unique: 439,944 distinct values over 440,091 rows.
- 145 shipment codes appear on more than one `ngay_phat` (re-delivery attempts) — so `ma_buu_gui` **alone is not a safe key**; `(ma_buu_gui, ngay_phat)` is required.
- Exactly 1 `(ma_buu_gui, ngay_phat)` pair still has 2 rows — a residual ambiguity that the BCCP import must report as `conflict` instead of writing blindly.
- `network_delivery_point` already stores `status_time`, `thoi_gian_nhap_phat` (39 rows null) and `ca_phat` from the BF. The BCCP time must therefore land in a **new, additive column** (e.g. `thoi_gian_phat_bccp` + `nguon_thoi_gian_phat`), never overwriting a BF-sourced field, so rollback is a column-level revert and the BF stays the system of record for everything else.

Not fixed and not to be guessed: BCCP file structure, sheet/header names, time format and semantics, and the final join key — all locked only after the sample file arrives. Phase 5 may be split into its own ticket at activation; that split is a PO/CTO decision, not made here.

## 13. Open inputs required from the Product Owner

1. Daily BF: source system and retrieval method (Phase 4 gate).
2. BCCP định vị: a real sample file (Phase 5 gate — parser and join key).
3. Go-ahead to load the real `2026.09.17 - DB Buu ta.xls` into the operational database at Phase 1 closeout (business-data write).
