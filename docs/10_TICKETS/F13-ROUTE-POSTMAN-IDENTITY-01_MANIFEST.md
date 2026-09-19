# F13-ROUTE-POSTMAN-IDENTITY-01 Manifest

Status: `PHASE 1-2 REMEDIATED / TECHNICAL PASS (2026-09-18)`. Directory foundation (Phase 1) and ranking contract (Phase 2) implemented, remediated against Independent Backend Review 002 (defect B1 + M2-M5), tested, and the real postman directory loaded into the operational database under explicit PO authorization. Phase 3 (UI) is READY FOR IMPLEMENTATION by Antigravity. Phase 4/5 remain BLOCKED on PO inputs per DoR v2. See Section 11 (initial implementation) and Section 12 (remediation).

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Ticket Name: `F1.3 — Bổ sung Mã bưu tá + Tên bưu tá vào Tuyến phát Ranking`
- Owner: `Antigravity (Gemini)` — discovery/read-only audit executor.
- Phase: `Discovery / Read-Only Audit`
- Governance Version: `V2 Active`
- Registration authority: Product Owner decision received in chat, 2026-09-15, as part of the same instruction that paused `F41-DASHBOARD-MINIMUM-01` and activated `F13-BCVH-MONTHLY-CUMULATIVE-01`.
- Activation authority: Product Owner decision received in chat, 2026-09-17: the predecessor is PO PASS and work proceeds to the next approved Roadmap step.
- Branch registered on: `codex/da-impl-006`
- Activation baseline commit: `03b925e8025f609c9d7fc92da4db57f81756f0a4`

## 2. Objective (for whoever activates this ticket)

Bổ sung "Mã bưu tá" (postman/carrier code) và "Tên bưu tá" (postman name) vào Tuyến phát Ranking (Route Ranking), căn cứ trên các trường có trong BatchFile nguồn. Before any implementation: **audit the BatchFile's actual mapping and historical data** to confirm the postman code/name fields exist reliably, are stable per route, and reconcile against however Tuyến phát Ranking currently identifies a route — do not implement against an assumed mapping.

## 3. Registered Scope (activation lock is in Section 5)

Named by the Product Owner, to be confirmed/refined at activation:

- Source: the BatchFile format (the same family of files already handled elsewhere in this project for delivery-route data — see `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 19 for the existing 29-column BatchFile audit and its header-based parser, `backend/src/services/networkMapImport/parseDeliveryRoutesBatchFileExcel.js`, as the nearest known precedent for this file family — not assumed to be the same pipeline or the same file).
- Target: Tuyến phát Ranking (Route Ranking) in F1.3 — `frontend/src/features/ranking/RouteRankingPage.jsx`, `backend/src/services/F13DashboardService.js`'s route-ranking path, and the underlying `fact_f13` route identification (`ma_tuyen`/`ten_tuyen`).
- Required before implementation: a read-only audit of (a) whether the BatchFile's postman code/name fields exist and are populated for the routes Tuyến phát Ranking already tracks, (b) whether a route-to-postman mapping is 1:1, stable, or changes over time/period, and (c) what the historical data shows for routes already ranked — a route's postman identity must not be presented as more certain than the source data supports.

Explicitly out of scope at registration:

- Any product code, database, schema, or API change.
- Any change to the F1.3 KPI, `danh_gia_2026`, or any frozen SSOT document.
- `F13-BCVH-MONTHLY-CUMULATIVE-01` (separate, independent ticket registered by the same Product Owner decision — not merged into this ticket's scope, per explicit instruction that the two tickets are independent).
- `F41-DASHBOARD-MINIMUM-01` / F4.1 (separately `PAUSED BY PO PRIORITY`, unrelated).

## 4. Next Step

Antigravity performs the activated discovery/read-only audit and returns evidence to the Product Owner/CTO. No implementation begins from this activation.


## 5. Product Owner Activation — 2026-09-17

After granting PO UI PASS to `F13-BCVH-MONTHLY-CUMULATIVE-01`, the Product Owner directed: **“bước tiếp theo”**. The approved Roadmap order identifies this ticket as the next F1.3 upgrade. The ticket is therefore activated at `DISCOVERY / READ-ONLY AUDIT` only.

### 5.1 Audit questions

1. Identify the exact BatchFile source(s), sheet/header mapping and real fields for postman code and postman name.
2. Trace the current Route Ranking data path from source/import through persisted data and API to `RouteRankingPage.jsx`.
3. Measure real mapping coverage for ranked routes: populated, missing, duplicate and conflicting identities.
4. Determine whether route-to-postman identity is 1:1, changes by date/period, or can contain multiple postmen; preserve historical truth and do not collapse ambiguous mappings.
5. Determine the safest minimal data contract and UI placement for `Mã bưu tá` and `Tên bưu tá`, without changing F1.3 KPI calculations.
6. Report schema/import/backfill implications, risks, open Product Owner decisions and a phased recommendation. Do not implement the recommendation.

### 5.2 Scope and safety gates

- Read-only inspection of source files, code and database is authorized.
- No product code, schema, migration, import, backfill or business-data write.
- No F1.3 KPI/SSOT change.
- Do not merge with Import, RBAC, F4.1 or the closed BCVH monthly-cumulative ticket.
- Do not use Browser/Web automation. Local source inspection, read-only database queries and local tests are allowed.
- Return the audit report to PO/CTO; Design and implementation require separate authorization.

## 6. DB Bưu Tá Discovery & Cross-Reconciliation Audit (2026-09-17)

Product Owner supplied the official postman directory file: `2026.09.17 - DB Buu ta.xls` (27.5 KB, exported from system at `17/09/2026 11:01` for unit `53-BĐTP Huế`, active status).

### 6.1. Source Structure & Mapping Lock
- Header row (Row 8): `STT`, `Mã BĐT`, `Tên BĐT`, `Mã BĐH`, `Tên BĐH`, `Mã bưu cục`, `Tên bưu cục`, `Tên tài khoản`, `Họ tên người dùng`, `Chức danh`, `Loại hợp đồng`, `Số điện thoại`, `Mã HRM`, `Tình trạng hoạt động`.
- **Locked Field Mapping**:
  - `Tên tài khoản` = `Mã bưu tá` (`POSTMAN_CODE`).
  - `Họ tên người dùng` = `Tên bưu tá`.
  - `Mã bưu cục` = Mã BCVH (dùng để kiểm tra chéo / cross-check).
- **Data Minimization & Security Lock**:
  - Only necessary fields are admitted to system storage: `ma_buu_ta`, `ten_buu_ta`, `ma_bcvh`, `ten_bcvh`, `trang_thai_hoat_dong`.
  - **Do NOT store**: `Số điện thoại`, `Mã HRM`, `Loại hợp đồng`.
- Total data rows: 198 rows.
- Distinct postman codes: 198 codes.
- Duplicate postman codes in DB: **0** (all codes strictly unique).

### 6.2. Cross-Reconciliation with BatchFiles (All 4 Months: May, June, July, August 2026)
Across 678,328 delivery point records in all 4 monthly BatchFiles (`2026.06.01...`, `2026.07.01...`, `2026.08.01...`, `2026.09.01...`):
- Total distinct postman codes appearing in BatchFiles: **277 codes**.
- **1. Codes Matched (Có cả trong BatchFile và Danh bạ)**: **172 codes** (chiếm 81.93% tổng sản lượng bưu gửi phát: 555,765 / 678,328 điểm phát).
- **2. BatchFile Codes Missing in DB Bưu tá (Mã BatchFile chưa có tên)**: **105 codes** (chiếm 18.07% sản lượng: 122,563 điểm phát).
  - Phân bổ khối lượng:
    - 29 mã có sản lượng rất thấp (<= 10 bưu gửi): phát sinh ngẫu nhiên / điều động tạm thời.
    - 25 mã có sản lượng 11 - 100 bưu gửi.
    - 51 mã có sản lượng > 100 bưu gửi (ví dụ `53A152` Thuận Hóa 15,617 BG; `53B246` 7,917 BG; `53B040` 7,572 BG; `53F069` 7,133 BG). Lý do chưa có trong file 17/09: hợp đồng khác chức danh bưu tá (lái xe, thuê ngoài) hoặc đã luân chuyển/nghỉ việc trước ngày xuất file.
- **3. DB Bưu tá Codes Only in DB (Chưa phát sinh bưu gửi trong BatchFile)**: **26 codes** (nhân sự mới hoặc bưu tá chuyên trách/văn phòng).
- **4. Xung đột / Bất nhất BCVH (Conflicts)**: **0** (toàn bộ 172 mã khớp đều có mã bưu cục trong Danh bạ trùng khớp hoàn toàn với bưu cục chính trong BatchFile).

## 7. Khóa Luồng Ghép Dữ Liệu (Locked Stitching Pipeline)

```
[F1.3 theo ngày + mã tuyến]
  fact_f13 (ngay_do_kiem, ma_tuyen, ten_tuyen, danh_gia_2026)
       │
       ▼ (Join theo ngay_phat = ngay_do_kiem AND route_po_code = ma_tuyen)
[BatchFile cùng ngày + mã tuyến]
  network_delivery_point (postman_code, ma_bcvh, ...)
       │
       ▼ (Join theo ma_buu_ta = postman_code)
[Danh bạ Bưu tá]
  dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh)
       │
       ▼
[Route Ranking Display — RoutePerformancePage.jsx]
  Hiển thị: Mã tuyến | Tên tuyến | Mã bưu tá | Tên bưu tá | [Kết quả ngày] | [Kết quả kỳ]
```

- **Quy tắc bảo toàn đa bưu tá (Multi-postman preservation)**:
  - Nếu trong cùng 1 ngày, tuyến có nhiều bưu tá cùng đi phát: giữ đầy đủ toàn bộ bưu tá (ví dụ: `53A819, 53A856` kèm tên tương ứng), không được gán ép hay cắt xén đại diện 1 người.
- **Quy tắc an toàn khi thiếu dữ liệu**:
  - Nếu mã bưu tá chưa có tên trong danh bạ: hiển thị `Mã bưu tá` kèm Tên bưu tá là `—` (không fabricated).
  - Nếu ngày xem chưa có dữ liệu BatchFile: hiển thị `—` cho cả Mã và Tên bưu tá.

## 8. Đề Xuất Design Cho Chức Năng “Rà Soát Danh Mục Bưu Tá”

Chức năng phục vụ Product Owner / Quản trị viên chủ động quản lý danh bạ và bổ sung tên cho 105 mã mới phát hiện từ BatchFile:

1. **Vị trí đề xuất**: Phân hệ Quản trị Mạng lưới / Cấu hình hệ thống (`/admin/postman-catalog` hoặc tab trong Network Management).
2. **Cấu trúc 2 Tab trực quan**:
   - **Tab 1: "Danh bạ bưu tá hiện hữu"**:
     - Bảng tra cứu danh bạ (198 bưu tá hiện có): `STT`, `Mã bưu tá`, `Tên bưu tá`, `Mã BCVH`, `Tên BCVH`, `Trạng thái`.
     - Cho phép tìm kiếm nhanh theo mã hoặc tên, lọc theo BCVH.
     - Cho phép sửa nhanh Tên bưu tá hoặc trạng thái.
   - **Tab 2: "Rà soát mã mới từ BatchFile (Chưa có tên)"**:
     - Tự động thống kê các `POSTMAN_CODE` xuất hiện trong BatchFile nhưng vắng mặt trong Danh bạ (105 mã).
     - Hiển thị thông tin hỗ trợ PO nhận diện: `Mã bưu tá`, `Bưu cục phát sinh`, `Số bưu gửi đã phát`, `Kỳ xuất hiện (tháng)`, `Tên tuyến thường phát`.
     - Ô nhập nhanh **`Tên bưu tá`** inline ngay trên bảng kèm nút **`Lưu vào danh mục`** để PO gán tên tức thì mà không cần nạp lại file Excel.
3. **Hiệu lực tức thời**: Ngay khi PO nhập và lưu tên bưu tá cho một mã mới, bảng Route Ranking tại `/f13/ranking/route` sẽ tự động hiển thị tên bưu tá tương ứng cho toàn bộ dữ liệu lịch sử của mã đó.


## 9. Independent Design Review 001 (2026-09-17)

Reviewer: Claude Code (Opus 5), independent of the proposal author. Full record: `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_REVIEW_001.md`.

- **Verdict: BLOCKED** — direction verified, proposal not approvable as written.
- Verified: Section 7 stitching pipeline (parcel-level cross-check 11,378/11,378 same route + BCVH); name join by postman code only; multi-postman preservation (21.3%); 198 unique directory codes; data minimization.
- Blocking: R1 `/admin/postman-catalog` → corrected to `/network-map/postman-catalog` reusing `requireRole(['admin','viewer'])` read / `['admin']` write (no new Admin/RBAC). R2 missing `(ngay_phat, route_po_code)` index (33.1 s one-month probe) → additive covering index.
- Gaps: R3 audit/rollback (`dm_buu_ta_event`; `network_import_log` CHECK prevents reuse), R4 period contract, R5 re-import semantics, R6 current-month BatchFile lag, R7 BCVH mismatch flag, R8 live DB holds May/Jun/Aug only (185 codes / 136 matched / 49 unnamed / 63 DB-only).
- This manifest's Sections 7-8 are superseded where they conflict with the review's Sections 4-7.
- Open PO decisions: D1 import vs manual precedence; D2 period view; D3 codes absent from newer file; D4 accept current-month lag.
- Next gate: PO answers D1-D4 and approves the corrected Design of Record. No implementation authorized.

## 10. Product Owner Decisions D1-D4 and Design of Record v2 (2026-09-18)

- **D1** manual names are never auto-overwritten; differing names go to `dm_buu_ta_conflict` for PO resolution; records still owned by the file may be updated by a newer file; every change is logged in `dm_buu_ta_event` and reversible.
- **D2** postman code/name are anchored to the selected evaluation date in both daily and period views; the anchor date is shown in the header; all postmen of that route on that date are displayed; no representative and no borrowing from another date.
- **D3** codes absent from a newer directory file are retained and marked `Không có trong danh bạ mới nhất`; absence is never grounds to delete history.
- **D4** the daily BF becomes the shared base source for F1.3 and Sơ đồ tuyến phát and will be imported automatically; the existing Sơ đồ tuyến phát import is redesigned into `Bổ sung thời gian phát từ BCCP định vị` (delivery-time enrichment only, no duplicate rows, no change to route/postman/coordinates/KPI, join on Mã bưu gửi plus ngày phát after a real-data audit, with matched/unmatched/unchanged/conflict reporting, re-import and rollback).
- Design of Record: `docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_OF_RECORD.md` (v2). Sections 7-8 of this manifest and the v1 proposal are superseded where they conflict with it.
- Status: Phases 1-3 ready for implementation (Claude Code for 1-2, Antigravity for 3); Phase 4 blocked on the BF source/retrieval method; Phase 5 blocked on a BCCP sample file. No implementation has started and no PO PASS is claimed.

## 11. Phase 1-2 Implementation (2026-09-18, Claude Code / Sonnet 5)

Baseline: `codex/da-impl-006` @ `b15d648`. Implemented exactly Phase 1 (directory foundation) and Phase 2 (ranking contract) per DoR v2; Phase 3 (UI) left for Antigravity; Phase 4/5 untouched.

**Migration**: `backend/migrate_f13_route_postman_identity_phase1_schema.js` — additive `dm_buu_ta` / `dm_buu_ta_event` / `dm_buu_ta_conflict` + `idx_network_delivery_point_route_day` covering index, idempotent, registered in `server.js` startup chain. `dm_buu_ta` carries exactly the five locked business fields plus source/update metadata — no phone/HRM/contract/Chức danh/BĐT/BĐH column exists anywhere.

**Phase 1 backend**: `backend/src/services/postmanCatalog/` — `parseDanhBaBuuTaExcel.js` (content-based header/sheet detection, skips the column-number row, validates `^53[A-Z]\d{3}$`), `postmanCatalogImport.js` (classify/apply implementing the D1/D3 decision table exactly), `postmanCatalogService.js` (directory list, manual edit, D1 conflict resolve, self-contained history/rollback — `dm_buu_ta_event`, not the shared `network_import_log`/`network_import_snapshot`, whose `module` CHECK excludes this feature), `unnamedPostmenService.js` (§9 live reconciliation query), `previewSessionCache.js` (in-memory-only preview cache — parsed rows carry names, so they are never written to disk or to `network_import_session`). `PostmanCatalogController.js` + 9 new routes under `/api/network-map/postman-catalog` in `networkMapRoutes.js`, reusing the existing `requireRole(['admin','viewer'])` read / `['admin']` write gates — no new RBAC.

**Phase 2 backend**: `backend/src/services/postmanRankingService.js` — one grouped query per request (`idx_network_delivery_point_route_day`), joins `dm_buu_ta` by `ma_buu_ta` only, BCVH is a cross-check flag never a filter, `NO_BF_FOR_DATE`/`ROUTE_NOT_IN_BF`/`OK` status per D2/§5.4. Wired additively into `F13DashboardService.getRouteRanking` (daily view, anchored to the requested `date`) and `routePeriodService.getRoutePeriods` (period view, anchored to the service's own resolved `anchor_date` — never the period range) — both add `postman_anchor_date` / `postman_status` / `postmen[]` without touching any existing field, KPI, or SSOT.

**R2 performance (completion gate)**: `EXPLAIN QUERY PLAN` confirms `SEARCH dp USING COVERING INDEX idx_network_delivery_point_route_day`. Measured against the live operational DB's busiest real date (`2026-08-17`, 6,974 rows): 102-route day-style query 15 ms; 123-route period-style query 13 ms.

**Tests (all passing)**: migration idempotency 6/6; `postmanCatalogImport.test.js` 7/7 (insert/update/unchanged/conflict/absent_from_file classification, D1, D3, no-PII); `postmanCatalogService.test.js` 9/9 (manual edit, conflict KEPT_MANUAL/APPLIED_FILE, rollback of INSERT and UPDATE, rollback refused when blocked by a later batch, re-import-after-rollback no duplicates, directory search/filter); `unnamedPostmenService.test.js` 4/4; `postmanRankingService.test.js` 6/6 (multi-postman preservation, unnamed code, BCVH mismatch flag-not-filter, no-BF-date, route-absent, never-borrows-another-date). Full backend sweep (`node --test`, then `--experimental-sqlite --test`): 385/389 unique tests pass; the 4 remaining failures are pre-existing/environmental — 2 in `DashboardController.r6.integration.test.js` need a separately-running HTTP server ("fetch failed"), 1 in `DashboardController.recovery.test.js` (mocked-repository call-count assertion, fails identically on baseline), and 1 is the already-registered `F13-DASHBOARD-RECOVERY-DEFECTS-01` defect in `timelineService.recovery.test.js` — none reference `dm_buu_ta`, `postman`, or any file this ticket touched (corrected count per Independent Backend Review 002 §3/M5; the manifest previously said "3 `DashboardController.r6.integration.test.js`", which was wrong). `oxlint` 0 errors / 0 warnings on every file this ticket authored or modified.

**Real data load** (PO-authorized, gated): `backend/scripts/backup_before_f13_route_postman_identity_phase1.js` took a `VACUUM INTO` snapshot of the live `database.sqlite` (online-backup-safe against the running server) to `backend/src/db/backups/database.pre-f13-route-postman-identity-01-phase1-migration.2026-09-18T03.sqlite` (1.1 GB, `PRAGMA integrity_check` = ok, `fact_f13` = 817,115 matching live) — restore is: stop the backend, replace `backend/src/db/database.sqlite` with this file, restart. `backend/scripts/import_real_dm_buu_ta.js --dry-run` confirmed 198/198 valid rows, 0 rejected, 0 duplicate codes, 0 forbidden fields on the parsed shape, all classifying `insert` (DB was empty). `--confirm` inserted exactly 198 rows (`batch_id=real-import-1789702317981-2bd10283`), verified against the source file (sample rows byte-match); a second `--confirm` run (real re-import, not a synthetic test) classified all 198 as `unchanged` — 0 inserted/updated, row and event counts unchanged, proving idempotency against the real file. Ranking integration re-verified against real data: `route_po_code=533140129`, `ngay_phat=2026-08-17` now resolves `ma_buu_ta=53A885`, `ten_buu_ta=HOÀNG LÂM` through the live join.

**Not done in this pass**: Phase 3 UI (Antigravity); Phase 4/5 (blocked on PO inputs, unchanged). No PO UI PASS claimed — Phases 1-2 are technical validation only per DoR v2 §11.

## 12. Independent Backend Review 002 (2026-09-18, Claude Code / Opus 5)

Status after review: `PHASE 1 VERIFIED / PHASE 2 BLOCKED ON DEFECT B1`. Full record: `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_BACKEND_REVIEW_002.md`.

- Verified PASS: real 198-row load matches the source file exactly; data minimization holds everywhere including event images; re-import produces no duplicates; D1/D3, history and rollback behave as designed; viewer read-only vs admin write enforced on all 9 endpoints; F1.3 KPI unchanged (31/31 routes match raw `fact_f13`); the new index is ~7x faster with identical results; the pre-migration backup is valid, restorable and genuinely pre-migration; the 4 failing tests are pre-existing (reproduced on baseline `b15d648`).
- **B1 (blocking)**: `GROUP BY` alias ambiguity in `backend/src/services/postmanRankingService.js` merges two or more unnamed postmen on the same route/day into one row (232 of 9,269 date-route pairs; example route `533140131` on `2026-08-17` returns `53A152 = 82` instead of `53A152 = 65` + `53B246 = 17`). Test fixtures never cover two unnamed codes on one route.
- Minor findings M2 (BCVH/status not refreshed for MANUAL rows, diverges from DoR v2 §7), M3 (rollback leaves OPEN conflicts; conflict events reuse the import batch id), M4 (migration not standalone-safe on an empty database), M5 (Section 11 test attribution).
- Deployment answer for another database/machine: schema travels with the code (schema.sql + idempotent startup migration), data does not — run `node scripts/import_real_dm_buu_ta.js --dry-run` then `--confirm` from `backend/`, or use the Phase 3 UI import once it exists. Restoring the pre-migration backup also removes the 198 rows, so the import must be re-run afterwards.
- Phase 3 UI does not start until B1 is fixed and re-verified. Phase 4/5 remain blocked on PO inputs.

## 13. Backend Remediation for Independent Backend Review 002 (2026-09-18, Claude Code / Sonnet 5)

Fixed B1 and all four minor findings (M2-M5) from Section 12, on baseline `55319f9`. No F1.3/KPI/ranking-sort change; the real 198 `dm_buu_ta` rows were not reloaded or altered.

**B1 (blocking) — fixed.** Root cause confirmed exactly as reported: `backend/src/services/postmanRankingService.js` grouped/ordered by the `ma_buu_ta`/`route_po_code` SELECT aliases, which SQLite silently resolved to the LEFT-JOINed `dm_buu_ta.ma_buu_ta` real column instead — every code absent from the directory fell into one shared `NULL` group, dropping one code and inflating another's `item_count`. Fix: `GROUP BY`/`ORDER BY` now use the raw `UPPER(TRIM(dp.route_po_code))` / `UPPER(TRIM(dp.postman_code))` expressions, never an alias that collides with a joined column name. Re-verified live: route `533140131` / `2026-08-17` now returns `53A152 = 65` and `53B246 = 17` as two separate rows (previously one merged `53A152 = 82` row with `53B246` missing). 4 new regression tests added to `postmanRankingService.test.js` (10/10 pass): two unnamed postmen on one route/day, one named + one unnamed, three named, and an exact per-postman-and-route-total preservation check across all four fixtures — closing the exact gap the review named ("no fixture has two unnamed codes on the same route").

**M2 — fixed.** `postmanCatalogImport.js`: a `MANUAL`-owned record with the same name now still adopts `ma_bcvh`/`ten_bcvh`/`trang_thai_hoat_dong` from a newer file (`ten_buu_ta` and `nguon` stay pinned) — matching DoR v2 §7 exactly. 2 new tests confirm the protected name survives a conflicting file (still routed to the conflict queue) and that BCVH/status refresh when the name matches.

**M3 — fixed, two parts.** (1) `resolveConflict` now writes its `RESOLVE_CONFLICT` event and `last_import_batch_id` under a new, independent batch id (`resolve-conflict-<id>-...`), never the original import's batch id, so a later human decision can no longer be silently undone by rolling back the earlier import. (2) `rollbackBatch` now closes any still-`OPEN` conflict rows raised by the batch being rolled back (`trang_thai='KEPT_MANUAL'`, `resolved_by` noted as auto-closed), inside the same transaction, so the review queue never keeps showing a conflict against a batch that no longer applies. A supporting fix was needed in `checkRollbackEligibility`: a batch whose only outcome was raising a conflict (D1 "no write" — no `dm_buu_ta_event` row) was previously reported `BATCH_NOT_FOUND`; it is now recognized as eligible (nothing to restore, only a conflict to close). 2 new tests cover both parts, including the full sequence import → conflict → resolve (own batch id) → rollback of the original import (correctly a no-op, does not disturb the resolution).

**M4 — fixed.** `migrate_f13_route_postman_identity_phase1_schema.js` now applies `NETWORK-MANAGEMENT-001` Phase 1 + Phase 2 (idempotent, no-op when already applied) before creating its own ranking index, so it is genuinely standalone-safe against a fresh/empty database — matching the deployment order `server.js`'s startup chain already uses. Verified directly against a brand-new empty file (previously failed with `SQLITE_ERROR: no such column: route_po_code`, now succeeds) and a new migration test (`M4: standalone-safe on a genuinely empty database`).

**M5 — fixed.** Section 11's test-attribution corrected: 2 (not 3) failures are in `DashboardController.r6.integration.test.js`; the 3rd pre-existing failure is in `DashboardController.recovery.test.js` (a mocked-repository call-count assertion, reproduced identically on baseline).

**Validation.** Run under the identical two conditions Independent Backend Review 002 used. `node --test` (node:sqlite-flag-gated files fail to load without the flag, as before): 379/386 pass, 7 fail. `node --experimental-sqlite --test`: 394/398 pass, 4 fail — and those 4 failing test names are byte-identical to the set Review 002 §3 already classified pre-existing/environmental (`DashboardController.r6.integration.test.js` ×2, `DashboardController.recovery.test.js` ×1, `timelineService.recovery.test.js` ×1). Test count rose 389 → 398 (9 new: 4 B1 regression + 2 M2 + 2 M3 + 1 M4) — no new failure. `oxlint`: 0 errors / 0 warnings on every file touched. Operational DB row counts confirmed byte-identical before and after this remediation: `dm_buu_ta` 198, `dm_buu_ta_event` 198, `dm_buu_ta_conflict` 0, `fact_f13` 817,115, `network_delivery_point` 440,091 — no reload, no schema rewrite (only code changed; the already-applied migration was not re-run destructively). No Browser/Playwright used.

Phase 3 UI is now unblocked pending Antigravity's own start. Phase 4/5 remain blocked on PO inputs, unchanged. No PO UI PASS is claimed by this remediation.

## 14. Focused Re-Review 003 of the remediation (2026-09-19, Claude Code / Opus 5)

Status after re-review: `PHASE 1-2 COMPLETE / TECHNICAL PASS; PHASE 3 UI UNBLOCKED`. Full record: `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_BACKEND_REREVIEW_003.md`.

- **B1 CLOSED** — verified across the entire dataset (92 dates / 9,269 date-route pairs / 12,445 postman rows): 0 missing codes, 0 wrong item counts, 0 extra codes, 0 route-total mismatches; the 232 formerly affected pairs are all correct; `533140131` / `2026-08-17` = `53A152 = 65` + `53B246 = 17`; daily ranking matches raw data 31/31 (was 30/31); no performance regression (20 ms, covering index still used).
- **M2/M3/M4/M5 CLOSED** — manual name pinned while BCVH/status refresh; conflict resolution owns its batch id and survives a rollback of the originating import, while rollback auto-closes that batch's open conflicts; migration standalone-safe and idempotent on an empty database; manifest test attribution corrected.
- Confirmed unchanged: the 198 directory rows and all business data (`dm_buu_ta` 198 / events 198 / 1 batch / 0 conflicts, `fact_f13` 817,115, `network_delivery_point` 440,091); F1.3 KPI and ranking (KPI files byte-identical to `4f339b1`, 31/31 routes match raw `fact_f13`); the 4 failing tests remain pre-existing (sweep 394/398; the 5 files involved are byte-identical at `b15d648`, `4f339b1` and `72d58e0`); no new failures.
- Next: Phase 3 UI by Antigravity per Design of Record v2, ending at `READY FOR PO CHECK`. Phase 4/5 remain blocked on the PO daily-BF source and a BCCP định vị sample file.
