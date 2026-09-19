# F13-ROUTE-POSTMAN-IDENTITY-01 Checkpoint 001

## Section 1 — Activation

Product Owner decision received in chat on 2026-09-17 after PO UI PASS of `F13-BCVH-MONTHLY-CUMULATIVE-01`: **“ok pass bước tiếp theo nhé”**.

Per the approved upgrade Roadmap, `F13-ROUTE-POSTMAN-IDENTITY-01` is the next F1.3 ticket. It is activated at `DISCOVERY / READ-ONLY AUDIT` only.

- Objective: assess adding `Mã bưu tá` and `Tên bưu tá` to F1.3 Route Ranking from actual BatchFile evidence.
- Executor: `Antigravity (Gemini)`.
- Activation baseline: `03b925e8025f609c9d7fc92da4db57f81756f0a4`.
- Branch: `codex/da-impl-006`.
- No implementation or PO PASS is authorized.

## Section 2 — Scope Lock

The audit must:

1. Identify the exact BatchFile source, sheets and header-based mapping for postman code/name.
2. Trace the existing route-ranking pipeline from import/source to storage, service/API and UI.
3. Reconcile BatchFile identities against routes already present in Route Ranking using real read-only evidence.
4. Quantify missing, duplicate and conflicting mappings and determine whether identity is time-dependent.
5. Propose the minimal truthful data contract/UI placement and list schema/import/backfill implications.
6. Return open decisions and a phased recommendation to PO/CTO.

Out of scope: product-code edits, schema/migration, imports, backfills, business-data writes, F1.3 KPI/SSOT changes, Browser/Web automation, and any work from other tickets.

## Section 3 — Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/03_PLANNING/TTVH-DHCL-UPGRADE-ROADMAP-01.md`
- `docs/10_TICKETS/F13-ROUTE-POSTMAN-IDENTITY-01_MANIFEST.md`
- `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 19
- `backend/src/services/networkMapImport/parseDeliveryRoutesBatchFileExcel.js`
- `frontend/src/features/ranking/RouteRankingPage.jsx`
- Route-ranking paths in `backend/src/services/F13DashboardService.js`
- Relevant route/source fields around `ma_tuyen`, `ten_tuyen`, BatchFile postman code and postman name

## Section 4 — Discovery & Reconciliation Findings (2026-09-17)

Antigravity performed the read-only discovery audit across the codebase, 4 monthly BatchFiles, database records, and the newly provided `2026.09.17 - DB Buu ta.xls` directory file.

### 4.1. Core Audit Facts
1. **BatchFile Schema**: All 4 BatchFiles (`Data QLML/*.xlsb`) adhere to a 29-column schema. Column 5 is `POSTMAN_CODE`, Column 6 is `ROUTE_PO_CODE`. **No column stores postman name (`Tên bưu tá`)**.
2. **Active Route Ranking Component**: The active component mounted at `/f13/ranking/route` in `App.jsx` is `RoutePerformancePage.jsx` (not `RouteRankingPage.jsx` which is an orphan mock).
3. **Canonical Route Coverage**: 118 / 123 canonical Hue postman routes (95.9%) in `fact_f13` match `route_po_code` in BatchFile records.
4. **Multi-postman reality**: Route-to-postman is strictly N:M. 55 of 118 routes (46.6%) have multiple postmen over time; 21.3% of active (day, route) pairs have multiple postmen on the same day.
5. **Postman Directory (`2026.09.17 - DB Buu ta.xls`)**:
   - Total valid rows: 198 (all unique postman codes, 0 duplicates).
   - Mapping: `Tên tài khoản` = `Mã bưu tá`; `Họ tên người dùng` = `Tên bưu tá`; `Mã bưu cục` = Mã BCVH (cross-check).
   - Data minimization: Phone number, HRM code, and contract type are explicitly excluded from system storage.
6. **Cross-Reconciliation (BatchFiles vs DB Bưu tá)**:
   - Total distinct postmen in BatchFiles: 277 codes.
   - **Matched codes**: 172 codes (covering 555,765 / 678,328 = 81.93% of all delivery points).
   - **BatchFile codes missing in DB Bưu tá**: 105 codes (18.07% volume). 51 codes have >100 deliveries, 29 have <=10 deliveries.
   - **DB Bưu tá codes only in DB**: 26 codes (no deliveries in BatchFiles).
   - **BCVH mismatches**: 0.
7. **Locked Stitching Pipeline**: `fact_f13 (ngay_do_kiem, ma_tuyen)` -> `network_delivery_point (ngay_phat, route_po_code)` -> `postman_code` -> `dm_buu_ta (ma_buu_ta, ten_buu_ta)`. Preserves multiple postmen per route on a single day.
8. **Design Proposal**: Dedicated "Rà soát danh mục bưu tá" management UI (`/admin/postman-catalog`) with two tabs: (1) Current Directory, (2) New/Unnamed codes from BatchFiles with inline name entry.

## Section 5 — Completion Gate

Discovery audit is complete. Status advances to: `DISCOVERY AUDIT COMPLETE / READY FOR PO DESIGN OF RECORD APPROVAL`. No product-code, schema, migration, import, backfill or business data has been modified. Implementation and PO PASS remain strictly blocked pending separate PO/CTO approval.


## Section 6 — Independent Design Review 001 (2026-09-17)

Claude Code (Opus 5) review recorded in `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_REVIEW_001.md`. Result: **BLOCKED pending PO decisions D1-D4**. Direction PASS; R1 (placement/permission) and R2 (query performance) corrected in the review's contract; R3-R8 gaps addressed there. Review used read-only SQLite and read-only file parse only; no code, schema, migration, import or data write. Implementation and PO PASS remain blocked.

## Section 7 — Product Owner Decisions D1-D4 and Design of Record v2 (2026-09-18)

Product Owner approved the design direction and locked D1-D4 (conflict handling, anchor-date display, retention of codes absent from a newer file, daily BF as shared base source plus BCCP enrichment redesign). Claude Code published `docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_OF_RECORD.md` as DoR v2 and marked the v1 proposal superseded. R1-R8 from the Section 6 review are all dispositioned (DoR v2 Section 3): R1, R2, R3, R5, R7, R8 resolved; R4 resolved by D2; R6 superseded by D4 with an interim coverage-range requirement in Phase 3.

Phase gates: Phases 1-3 (directory foundation, ranking contract, UI) are ready for implementation; Phase 4 (daily BF auto-import) is blocked until the PO supplies the source and retrieval method; Phase 5 (BCCP định vị enrichment) is blocked until the PO supplies a sample file. PO UI acceptance applies at the end of Phase 3 only and is never self-awarded. This checkpoint update is documentation only: no code, schema, migration, import or database write was performed.

## Section 8 — Phase 1-2 Implementation and Real Data Load (2026-09-18, Claude Code / Sonnet 5)

PO authorized Phase 1-2 implementation and, contingent on backup/dry-run/rollback gates passing, loading the real `2026.09.17 - DB Buu ta.xls` into the operational database. Full technical detail is in `docs/10_TICKETS/F13-ROUTE-POSTMAN-IDENTITY-01_MANIFEST.md` Section 11; summarized here for the checkpoint record:

- Migration `dm_buu_ta` / `dm_buu_ta_event` / `dm_buu_ta_conflict` + ranking covering index applied to the live operational DB after a verified `VACUUM INTO` backup (`database.pre-f13-route-postman-identity-01-phase1-migration.2026-09-18T03.sqlite`, integrity-checked, `fact_f13` count matches live).
- Pre-load gate results, all PASS: 198/198 valid rows parsed (0 rejected, 0 duplicate codes); 0 forbidden fields (phone/HRM/contract) on the parsed record shape; conflict/history/rollback mechanism verified by 9 passing `postmanCatalogService.test.js` tests (KEPT_MANUAL, APPLIED_FILE, rollback of INSERT/UPDATE, rollback-refused-when-blocked, re-import-no-duplicates) against the exact production classify/apply functions on an isolated SQLite instance; full backend sweep 385/389 (4 pre-existing/environmental, unrelated).
- Real load executed: 198 rows inserted (`nguon=IMPORT`), verified 198/198 distinct, spot-checked against source. A second, real (non-synthetic) re-import against the same live file classified all 198 `unchanged` — proving no duplication on the actual production data, not just the test fixture.
- Phase 2 ranking join re-verified against live data after the load: a real (route, date) pair now resolves a real name through `dm_buu_ta` end-to-end.
- R2 performance gate: `EXPLAIN QUERY PLAN` uses the new covering index; measured 15 ms (102-route day query) / 13 ms (123-route period query) against the live DB's busiest real date.

Not done: Phase 3 UI (Antigravity, not started), Phase 4/5 (still blocked on PO inputs). No PO UI PASS is claimed by this section — Phases 1-2 are Claude Code's own technical validation only.

## Section 9 — Independent Backend Review 002 (2026-09-18, Claude Code / Opus 5)

Read-only independent review of Phase 1-2 at `4f339b1` against baseline `b15d648`. Result: **BLOCKED** on one defect; every other Product Owner verification item PASS. Full record: `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_BACKEND_REVIEW_002.md`.

- PASS: 198/198 directory rows match the source file; no phone/HRM/contract value is stored in any column or in any `dm_buu_ta_event` image; re-import yields 198 `unchanged` with no duplicates; D1 conflict queue and both resolutions behave as designed; D3 keeps and flags absent codes; rollback restores and is correctly refused when a later batch intervened; viewer gets 403 on all six write/history endpoints while admin is allowed; KPI matches raw `fact_f13` for 31/31 routes with only additive response fields; the new covering index gives ~102 ms -> ~15 ms with identical results; the pre-migration backup is `integrity_check = ok`, matches pre-change counts and contains no `dm_buu_ta`.
- 4 failing tests confirmed pre-existing: reproduced on baseline `b15d648` under identical invocation; the files involved are byte-identical at both commits. Manifest Section 11 attributes 3 of them to `DashboardController.r6.integration.test.js`; it is 2 there plus 1 in `DashboardController.recovery.test.js`.
- **B1 (blocking)**: `postmanRankingService.js` groups by the alias `ma_buu_ta`, which SQLite resolves to the joined `dm_buu_ta.ma_buu_ta` (NULL for codes without a name), so two or more unnamed postmen on the same route and day merge into one row — a code disappears and its volume is added to another. 232 of 9,269 (date, route) pairs affected, 501 code occurrences. Violates D2. Display-only; no stored data or KPI affected.
- Minor: M2 file no longer refreshes BCVH/status for MANUAL records (diverges from DoR v2 §7); M3 rollback leaves OPEN conflicts and conflict events reuse the import batch id; M4 the migration fails if run standalone against an empty database; M5 manifest test attribution.

Next gate: fix B1 with a regression test for two unnamed postmen on one route/day, then Phase 3 UI may start. No PO UI PASS is claimed or implied.

## Section 10 — Backend Remediation of Review 002 (2026-09-18, Claude Code / Sonnet 5)

Fixed B1 and M2-M5 on baseline `55319f9`. Full technical detail: `docs/10_TICKETS/F13-ROUTE-POSTMAN-IDENTITY-01_MANIFEST.md` Section 13. Summary:

- **B1 fixed**: `GROUP BY`/`ORDER BY` in `postmanRankingService.js` now use the raw `dp.route_po_code`/`dp.postman_code` expressions, never the SELECT aliases that collided with the joined `dm_buu_ta.ma_buu_ta` column. Live-reverified: route `533140131` / `2026-08-17` now returns `53A152 = 65` and `53B246 = 17` as two separate postmen. 4 new regression tests (two unnamed, one named + one unnamed, three named, total-preservation across all fixtures) — the exact fixture gap the review named.
- **M2 fixed**: a MANUAL-protected name is never overwritten, but BCVH/status now refresh from a newer file per DoR v2 §7.
- **M3 fixed**: `resolveConflict` logs under its own new batch id (no longer the original import's), so rolling back the earlier import cannot silently undo a later human decision; `rollbackBatch` now closes any OPEN conflicts the rolled-back batch raised.
- **M4 fixed**: the migration script now applies its two prerequisite NETWORK-MANAGEMENT-001 migrations (idempotent) before indexing, so it is genuinely standalone-safe on a fresh/empty database — verified directly.
- **M5 fixed**: manifest test-attribution corrected (2 in `DashboardController.r6.integration.test.js`, 1 in `DashboardController.recovery.test.js`).

Validation under the same two invocation conditions Review 002 used: `node --test` 379/386; `node --experimental-sqlite --test` 394/398, the same 4 pre-existing/environmental failures Review 002 §3 already classified, byte-identical by name — no new regression. `oxlint` clean on every touched file. Operational DB row counts confirmed unchanged before/after: `dm_buu_ta` 198, `dm_buu_ta_event` 198, `dm_buu_ta_conflict` 0, `fact_f13` 817,115, `network_delivery_point` 440,091 — no reload of the 198 postmen, no F1.3/KPI change. No Browser/Playwright used. Phase 3 UI is now unblocked for Antigravity to start; Phase 4/5 remain blocked on PO inputs. No PO UI PASS is claimed.

## Section 10 — Focused Re-Review 003 of the remediation (2026-09-19, Claude Code / Opus 5)

Read-only re-review of `72d58e0`, limited to the findings of Section 9 / Backend Review 002. Result: **PASS**. Full record: `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_BACKEND_REREVIEW_003.md`.

- **B1 CLOSED**: reconciliation across the whole BF dataset (92 dates, 9,269 (date,route) pairs, 12,445 postman rows) shows 0 missing codes, 0 wrong item_count, 0 extra codes, 0 route-total mismatches; the 232 formerly affected pairs (1,112 rows) are all correct; route `533140131` / `2026-08-17` returns `53A152 = 65` and `53B246 = 17` separately; daily ranking matches raw data for 31/31 routes; period view still anchored to one evaluation date; query still 20 ms on the covering index.
- **M2 CLOSED**: a `MANUAL` record keeps its name and ownership while BCVH/status refresh from a newer file; a differing name still writes nothing and goes to the conflict queue.
- **M3 CLOSED**: `resolveConflict` writes under its own `resolve-conflict-*` batch id, so rolling back the originating import no longer undoes the decision; `rollbackBatch` auto-closes conflicts raised by that batch (`KEPT_MANUAL`, attributed as auto-closed) without touching manual names.
- **M4 CLOSED**: the migration now succeeds against a brand-new empty database and remains idempotent on a second run and inside the startup chain.
- **M5 CLOSED**: manifest Section 11 test attribution corrected.
- Confirmations: live data untouched (`dm_buu_ta` 198, `dm_buu_ta_event` 198 in 1 batch, 0 conflicts, `fact_f13` 817,115, `network_delivery_point` 440,091); F1.3 KPI unchanged (31/31 routes match raw `fact_f13`; the two KPI files are byte-identical to `4f339b1`); sweep 394/398 with the same 4 pre-existing failures as baseline `b15d648`; 9 new tests all passing; no new defect.

Next gate: Phase 3 UI (Antigravity) may start; PO UI acceptance applies at the end of Phase 3 only and is never self-awarded. Phase 4/5 remain blocked on PO inputs.

## Section 11 — Phase 3 UI Implementation (2026-09-19, Antigravity)

Status: `PHASE 3 UI IMPLEMENTED / READY FOR PO UI CHECK`.

Antigravity completed the Phase 3 frontend implementation adhering strictly to Design of Record v2, PO decisions D1–D4, and the PO additions approved on 2026-09-19:

1. **Tuyến Ranking (`frontend/src/features/route/RoutePerformancePage.jsx`)**:
   - Renamed header from "Tên tuyến bưu tá" to "Tên tuyến".
   - Added group header "BƯU TÁ NGÀY DD/MM/YYYY" spanning the two columns "Mã bưu tá" and "Tên bưu tá", with date dynamically formatted as `DD/MM/YYYY` from the active anchor date.
   - Multi-postman rows align each code and name cleanly side-by-side using fixed line heights, sorted deterministically by postman code ascending. Secondary item counts are formatted cleanly without shrinking font sizes or cluttering the table.
   - Missing data states handled honestly without fabrication: "Chưa cập nhật" for unnamed codes, "—" when BF data is absent for the anchor date or route. Subtle "Khác BC" badge for cross-unit BCVH deliveries.
   - KPI metrics, rankings, heatmap classifications, and existing columns remain 100% untouched.

2. **Rà soát danh mục bưu tá (`/network-map/postman-catalog`)**:
   - Implemented `PostmanCatalogPage.jsx` mounted at `/network-map/postman-catalog` under group Quản lý mạng lưới with full responsive layout and rich design system aesthetics.
   - All summary numbers (total directory, unnamed codes, open conflicts) are 100% dynamic, computed at request time from live API data — never hard-coded.
   - Tab 1 (Danh mục bưu tá): full directory search, BCVH filter, source filter, D3 absent-from-latest-file indicator, admin edit modal.
   - Tab 2 (Mã mới chưa có tên): live reconciliation of delivery points minus directory, inline name input with immediate manual save, immediate propagation to Route Ranking upon save.
   - Tab 3 (Xung đột cần rà soát): D1 conflict queue with explicit dual-decision actions ("Giữ tên nhập tay" `KEPT_MANUAL` vs "Lấy theo file" `APPLIED_FILE`).
   - Import Modal: 2-step flow (Preview -> Summary Classification -> Confirm) with session token.
   - History Drawer: batch audit trail and rollback capabilities with collision checks.
   - Explicit confirmation dialogs for all modifications (inline save, modal edit, conflict resolution, rollback).
   - RBAC enforced: Viewer has read-only access across all tabs; Admin holds write and execution permissions.
   - Strict Data Minimization (PII Guard): zero storage, processing, or display of phone numbers, HRM codes, or contract types.

3. **Validation**:
   - 52/52 frontend unit and integration tests PASS (`RoutePerformancePage.postman.test.js`, `postmanCatalog.test.js`, `NetworkMapClient.test.js`, `httpClient.test.js`, `appNavigation.test.js`, `App.role-routing.test.js`).
   - 34/34 backend postman tests PASS (`postmanRankingService.test.js`, `postmanCatalogImport.test.js`, `postmanCatalogService.test.js`, `unnamedPostmenService.test.js`).
   - Operational database verified unchanged: `dm_buu_ta` 198, `dm_buu_ta_event` 198, `fact_f13` 817,115.
   - Frontend production build (`vite build`) compiles cleanly in 1.17s.
   - No Browser/Playwright automation used; handed over for PO manual check.
   - No PO UI PASS is self-awarded.

## 12. Postman Display on Tuyến Ranking Paused per PO Decision (2026-09-20)

- **PO Decision**: Product Owner decided to temporarily pause displaying postman identity on Tuyến Ranking (`/f13/ranking/route`) pending finalization of the presentation of delivery volume for multi-postman routes.
- **UI State**:
  - Hid columns "Mã bưu tá", "Tên bưu tá", and group header "BƯU TÁ NGÀY...".
  - Restored exact table layout and column name `Tên tuyến bưu tá` of Tuyến Ranking prior to Phase 3.
  - Implemented via toggle `SHOW_POSTMAN_COLUMNS = false` in `frontend/src/features/route/RoutePerformancePage.jsx`, preserving all underlying postman rendering, sorting, badge logic, and enabling instant reactivation when re-authorized.
- **Preservation Contract**:
  - Full code, API endpoints (`/api/network-map/postman-catalog/*`), the 198-postman directory in `dm_buu_ta`, and data flow through `mergeRouteData` remain 100% intact. Zero database revert, zero data deletion.
  - The Postman Catalog management UI at `/network-map/postman-catalog` remains active and unaffected under Quản lý mạng lưới.
  - Phase 4 and Phase 5 remain un-expanded and blocked on PO inputs.
- **Governance & Acceptance**:
  - Status: Postman display on Tuyến Ranking is `PAUSED PER PO DECISION`. No PO UI PASS is awarded for this part.
  - Verification: 48/48 frontend tests PASS; production build clean (1.75s); operational database verified intact.
