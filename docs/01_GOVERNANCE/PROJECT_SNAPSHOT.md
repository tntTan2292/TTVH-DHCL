# PROJECT SNAPSHOT

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Current Snapshot](#2-current-snapshot)
- [3. Usage Rules](#3-usage-rules)
- [4. Continuation Notes](#4-continuation-notes)

## 1. Purpose

This document is the Governance V2 current-state snapshot for AI onboarding.

It is designed to be the shortest safe entry point for a new AI session while preserving continuity with the existing Governance V1 workflow.

## 2. Current Snapshot

| Field | Value |
| --- | --- |
| Current Phase | `NETWORK-MANAGEMENT-001 Phase 2 — Ba bản đồ, COMPLETED / PO PASS / CLOSED` |
| Current Ticket | `NETWORK-MANAGEMENT-001 (Phase 2 Closed)` |
| Next Ticket | `None. Phase 2 (Ba bản đồ) is COMPLETED / PO PASS / CLOSED. PO Gate 2 is PASS. Awaiting Product Owner direction for Phase 3 (Import).` |
| Last PO Status | `PO GATE 2 PASS (2026-08-05): Product Owner visually rechecked and officially confirmed PO ROUTE VISUAL RECHECK PASS — LEGEND AND ROAD ROUTES ACCEPTED across all 3 map screens (Mạng điểm phục vụ, Sơ đồ ĐTC2, Sơ đồ tuyến phát with Calendar Date Picker, OSRM road routes, and interactive Legend Box). Phase 2 is COMPLETED / PO PASS / CLOSED.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` (Section 26: Phase 2 PO Gate 2 PASS closure record) |
| Current Checkpoint | `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` (Section 16: Phase 2 PO Gate 2 PASS closure record) |
| Current State | `PHASE 2 CLOSED / AWAITING PO DIRECTION FOR PHASE 3` |
| Technical Status | `NETWORK-MANAGEMENT-001 Phase 2 (Ba bản đồ) implemented and validated: real data seeded from 3 PO-supplied sources, 3 Leaflet map screens with Calendar Date Picker, OSRM road network routing, and Legend Box. 39 backend tests pass, 20 frontend tests pass, oxlint clean, vite build succeeds. Full evidence: checkpoint Section 16.` |
| Runtime Status | `NETWORK-MANAGEMENT-001 Phase 2: PO ROUTE VISUAL RECHECK PASS — LEGEND AND ROAD ROUTES ACCEPTED confirmed by Product Owner for all 3 map screens.` |
| PO UI Check Required | `No — PO Gate 2 passed by Product Owner on 2026-08-05.` |
| PO Product Status | `NETWORK-MANAGEMENT-001 Phase 2: COMPLETED / PO PASS / CLOSED.` |
| Last Closed Ticket | `NETWORK-MANAGEMENT-001 (Phase 2)` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` |
| Last Reviewed Phase | `NETWORK-MANAGEMENT-001 Phase 2 (Ba bản đồ): Product Owner PO Gate 2 PASS` |
| Last Reviewed Implementation Commit | `36da1fcd` |
| Phase Review Status | `NETWORK-MANAGEMENT-001 Phase 1: COMPLETED / TECHNICAL PASS, PO Gate 1 PASS. Phase 2 (Ba bản đồ): COMPLETED / PO PASS / CLOSED, PO Gate 2 PASS. Phases 3-4: PLANNED / NOT ACTIVE.` |
| Next Phase Authorization | `NETWORK-MANAGEMENT-001 Phase 3 (Import) and Phase 4 (Nghiệm thu) each require their own explicit Product Owner authorization before starting; none is self-activated by Phase 2's completion. Awaiting Product Owner direction for Phase 3.` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-08-05` |

## 3. Usage Rules

- Read this document immediately after `README_AI.md`.
- Treat this document as the single live project-state snapshot for AI onboarding.
- Do not infer current state from chat history when this snapshot is available.
- Do not use this document to override SSOT, frozen docs, or Product Owner decisions.
- Keep workflow behavior unchanged unless a dedicated governance change is approved.
- `Last Closed Manifest` must always be a concrete GitHub Blob URL pointing to the manifest of the most recently closed ticket when Current Ticket = None.
- `Last Closed Manifest` must not contain placeholder labels or descriptive text.
- `Last PO Status` must reflect the latest authoritative Product Owner visible outcome, including explicit failure states when a ticket remains active.
- `Claude Code` reads this document as its single live-state source instead of re-reading the full `README_AI.md` chain every session; see `CLAUDE.md` for the condensed Claude Code onboarding equivalent.
- Whenever `Current Ticket` changes (a ticket closes or a new ticket activates), append exactly one new line to `PROJECT_PROGRESS.md`'s ticket history in the same update; never edit or delete prior lines. This snapshot does not itself keep historical entries.

## 4. Continuation Notes

This snapshot is intentionally narrow.

It exists to answer only the questions a fresh AI needs in order to continue:

- where the project is
- what ticket is active
- what comes next
- what branch is active
- what manifest governs the current reading scope

Current handoff: `AUTO-IMPORT-011`, an emergency remediation ticket activated `2026-08-05` for two Product Owner-reported Import symptoms, is now `CLOSED / PO RUNTIME PASS`. Symptom A (recurring `2098`-dated file import bypassing future-date validation) was root-caused, fixed, and verified with a previously-failing regression test now passing. Symptom B (HUE/TCT browser window not appearing) was discovery-only, never technically root-caused; after a Product Owner-performed server restart, both HUE and TCT opened, authenticated, and imported successfully, and the Product Owner accepted the result as `PO RUNTIME PASS`. No code fix was applied for Symptom B — see `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_002.md` for the closure disposition and the standing instruction to capture live backend console output before any future restart if it recurs.

Follow-up (`AUTO-IMPORT-012`, `2026-08-05`, `COMPLETED / TECHNICAL PASS`, closed same day): the test-isolation defect found and flagged under `AUTO-IMPORT-011` (`test_dkclHueF13SyncService.js` writing into production `Data DKCL/F1.3` and `database.sqlite`, confirmed twice) is fixed. `backend/src/services/importPipeline.js` now carries the same `NODE_ENV=test`-gated isolation guard `backend/src/config/db.js` already had, requiring `QIS_TEST_DATA_ROOT` for the file-system paths the same way the DB guard requires `QIS_TEST_DB_PATH`. A new shared helper `backend/test/importTestSandbox.js` builds a fresh OS temp sandbox (full `Incoming/Processing/Processed/Error/Quarantine × HUE/TCT` layout plus an isolated SQLite file with schema applied) per test run. All four Import test files that read/write the database or file system (`test_dkclHueF13SyncService.js`, `test_importPipelineRace.js`, `test_importProcessor.js`, `test_e2e_import_engine.js`) now use it; each was run twice consecutively with stable, passing results and zero measurable impact on production (`fact_f13` remained at the authoritative `663,126` baseline throughout, zero `2098`/`AUTO002` rows, no new production files). `QIS_ALLOW_TEST_FUTURE_DATE=true` (from `AUTO-IMPORT-011`) remains set only inside these isolated test files, confirmed absent from any `.env`, launcher, or production configuration.

`NETWORK-MANAGEMENT-001` reactivated (`2026-08-05`): Product Owner issued `PO GATE 1 PASS` and explicitly authorized Phase 2 (Ba bản đồ) implementation, ending the prior `PAUSED` state. Phase 2 is now `COMPLETED / TECHNICAL PASS` — see the dedicated paragraph below. The prior `F13-STANDARDIZATION-001` program's Tuyến Ranking (Route Ranking) delta closed on `2026-08-04` with explicit Product Owner `PO PASS` (implementation commit `03ce28bacc36b49d961caa1c006a011beb804bc7`); that program itself remains open and unclosed, unaffected. `F13-DATA-2098-CLEANUP-IMPL` remains `COMPLETED / TECHNICAL PASS / CLOSED` as of `2026-08-04` — a separate, earlier occurrence of the same data pattern, database-only in scope, which could not have prevented the AUTO-IMPORT-011 recurrence since it never touched the file system or code.

Phase 2 (Ba bản đồ) implementation (`2026-08-05`): under explicit Product Owner authorization following PO Gate 1 PASS, Claude Code first re-synced from the Product Owner-supplied remote HEAD `216f16277239781bbebfdc34982fdc772f28893c` and confirmed Phase 1 unaffected. An out-of-band workspace anomaly was found and remediated before any coding: the 3 root-level reference HTML files were missing from the working tree (tracked but deleted, not committed, unrelated to any Phase 1/2 action) and were restored via `git checkout -- <file>` (a pure restore, not a destructive action), then confirmed byte-identical to `HEAD`. A precise inventory of all 3 `Data QLML/` Excel files (sheets, columns, roles) was performed before writing any code, as required, and is recorded in checkpoint Section 13 — including the discovery that `2026.08. Mang DTC2.xlsx` (new since Phase 1) contains a "TỔ CHỨC LẠI" (reorganization) block alongside a "HIỆN TRẠNG" (current-state) block, with the Product Owner's locked decision to use only the current-state network, matching the reference HTML. Real data was seeded from the actual sources into the Phase 1 schema via a one-time script (not the Phase 3 Import feature): Mạng điểm phục vụ 151 điểm (0 warnings, exact match to the locked baseline); Mạng đường thư cấp 2 28 hành trình / 148 lượt dừng / 47 mã điểm / 1,435 km (0 warnings, exact match — geometry read from the reference HTML's `MAIL_ROUTES` array since the Excel has no coordinates, per Product Owner instruction); Sơ đồ tuyến phát 143,475 điểm kept of 160,554 rows (a small, reported-not-forced discrepancy against the locked 143,467 baseline and the HTML's own stated 143,463, documented in checkpoint Section 13, not resolved). Both Phase 1 and Phase 2 SQLite migrations are now applied automatically on every backend startup (previously only run manually), verified by an actual server restart. Three real Leaflet map screens now render this data (`admin`+`viewer` read access preserved, Import still `admin`-only and disabled/not implemented), with data-fetching and Leaflet-display code kept in separate components so Phase 3 Import can swap the data source later. Sơ đồ tuyến phát enforces Ngày→BCVH→Bưu tá selection at both API and UI — verified in a real browser that the points endpoint is never called until all three are chosen. Backend 31/31 and frontend 13/13 automated tests pass, `oxlint` clean, `vite build` succeeds; `fact_f13` confirmed unchanged (666,153 rows — the correct current baseline, having legitimately grown from 663,126 via the unrelated, intervening `AUTO-IMPORT-011` ticket) before and after; all 6 source Excel/HTML files confirmed byte-identical (SHA-256) before and after; `Data QLML/` never added to git. Full evidence: `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 13; `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 17. This closes Phase 2 only — Phase 3/4 remain `PLANNED / NOT ACTIVE` and each requires its own explicit Product Owner authorization; the Import scope was not reopened.

`NETWORK-MANAGEMENT-001` activation (`2026-08-04`): Product Owner explicitly authorized this ticket, naming three independent screens — Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát — to be brought into QIS V2 as SQLite-backed, authenticated modules (`admin`+`viewer` read; `admin`-only Import with preview, error/duplicate detection, file fingerprint, and history). A locked four-phase plan (Phase 1 Nền tảng, Phase 2 Ba bản đồ, Phase 3 Import, Phase 4 Nghiệm thu) was written into manifest `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md`, with only Phase 1 set to `AUTHORIZED / READY FOR IMPLEMENTATION`. The Product Owner locked the audit baseline used to scope the ticket: Mạng điểm phục vụ 151 unique mã điểm (from 260 audited Excel rows, 109 excluded as `Tạm dừng`); Mạng đường thư cấp 2 28 hành trình / 148 lượt dừng / 47 mã điểm / 1.435 km (temporary HTML-seed baseline, no business Excel source yet); Sơ đồ tuyến phát 143,467 điểm (from a Product Owner-audited tháng 06/2026 Excel, audited outside this repository). Source Excel files are not in the workspace/repository; Claude Code must not re-audit them or guess column mapping, and must request them from the Product Owner at the start of the phase that needs them. This is a documentation-only governance activation: no product code, schema, or database was changed. Checkpoint `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` was created. 02 pre-existing stashes and the three source HTML files at repository root remain untouched.

Program activation (`2026-08-04`): Product Owner approved the rapid standardization plan for the F1.3 module group, program `F13-STANDARDIZATION-001`. Two documentation-only steps were executed: (1) creation of the activation package — manifest `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` and checkpoint `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md`; (2) the full five-phase plan (Phase 0 Khóa nền số liệu, Phase 1 Chuẩn hóa cấu trúc F1.3, Phase 2 Hoàn thiện điều hành, Phase 3 Pareto và Evidence, Phase 4 Regression và đóng F1.3) locked into that single manifest, with only Phase 0 set to `READY FOR IMPLEMENTATION`. Locked product decisions and locked out-of-scope items are recorded once in the manifest (Sections 7-8) and must not be duplicated elsewhere.

Phase 0 implementation (`2026-08-04`, commit `e3ca24292f39b5c59022b161b63c4603cced1949`): recommendations engine switched from the non-authoritative `ket_qua_f13` to `danh_gia_2026` (this remediates the previously-recorded `RESIDUAL-01`, superseding the candidate below); the two audited `/f13`-prefix API path defects fixed; `dd/MM/yyyy HH:mm:ss` timestamp parsing fixed. Technically validated (backend/frontend test suites, oxlint, `vite build`); not separately closed with its own Product Owner runtime confirmation.

Tuyến Ranking (Route Ranking) delta closure (`2026-08-04`, PO PASS, `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 16): Route Ranking data contract standardized (`a0d4b041`); violations classified into `Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân` with a corresponding `/f13/evidence-list` API contract (`a892a276`); UI/UX refined (`6e575308`); pagination `10 tuyến/trang` and default ascending `passed_rate` sort added and Product Owner-confirmed (`03ce28ba`). Scope is Tuyến Ranking and its violation drill-down only — no other F1.3 screen, and no other phase of the program, is closed by this. The Shipment Performance Center delta remains preserved in `stash@{0}`, untouched, pending Product Owner reactivation of the deferred `F13-SHIPMENT-001` ticket.

Phase 1 (Nền tảng) implementation (`2026-08-05`): under explicit Product Owner authorization to implement Phase 1, Claude Code added 5 new independent SQLite tables (`network_import_log`, `network_service_point`, `network_level2_route`, `network_level2_route_stop`, `network_delivery_point`) additively to `backend/src/db/schema.sql` and applied them to the live operational database via an idempotent migration script — zero rows seeded, `fact_f13` confirmed unchanged at 663,126 rows before/after. Authenticated API foundation mounted at `/api/network-map` (`admin`+`viewer` read; `admin`-only Import scaffolding returning `501 NOT_IMPLEMENTED`, no Excel logic); the Sơ đồ tuyến phát points endpoint rejects any query missing Ngày/BCVH/Bưu tá with `400`. Frontend: new `Quản lý mạng lưới` nav group and 3 role-gated scaffold screens (no Leaflet map, no OSRM call) proving API connectivity and gating the Import button to `admin` only. Backend tests 20/20 pass, frontend tests 12/12 pass, oxlint clean, `vite build` succeeds; 7 pre-existing backend test failures unrelated to this ticket were found and left untouched (Windows-native `koffi` scripts and pre-existing F1.3 data-snapshot/contract tests — none reference any `network_*` table or this ticket's new files). No Excel was read; no business data was fabricated; PO-confirmed baseline figures (151/28+148+47/143,467) remain unimplemented data targets for Phase 3. 02 pre-existing stashes, the 3 root-level reference HTML files, and the newly-observed `Data QLML/` Excel files were left untouched. Full evidence: `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 12; `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 16. This closes Phase 1 only — Phase 2/3/4 remain `PLANNED / NOT ACTIVE` and each requires its own explicit Product Owner authorization.

Exact next authorized action (for `NETWORK-MANAGEMENT-001`): `Await Product Owner PO Gate 2 review and explicit authorization before starting Phase 3 (Import). Do not begin Phase 3 without that authorization.`

Cleanup execution (`2026-08-04`): Product Owner authorized permanent removal of year-2098 test/future data. All six date-bearing fields were scanned; zero 2098 values existed in any event timestamp, so the predicate `ngay_do_kiem LIKE '2098%'` was verified complete and precise. After a verified `VACUUM INTO` backup (`backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite`, `integrity_check = ok`), 4 `fact_f13` rows and 4 `import_log` rows were deleted in a single guarded transaction. Zero 2098 rows remain; date range is now `2026-01-01`-`2026-08-03`. 2026 production data is unchanged (663,126 rows, 213 days, per-month counts identical) and the authoritative KPI `danh_gia_2026` is unchanged at `58.6233%`. `DQ-01` and `DQ-03` are closed; `DQ-07` is retracted. Evidence: `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md`.

Prior ticket: `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN` is `CLOSED — PO DECISIONS RECORDED` as of `2026-08-04`. The read-only audit found the product exposes only a small fraction of the 45 columns per shipment; origin-handover-to-delivery latency separates passing from failing shipments by 10.97h vs 47.68h across 595,046 complete chains and is surfaced nowhere; 10 customer accounts carry 37.5% of all failures; 46 of 154 routes are chronically failing; and three F1.3 navigation entries (Pareto/RCA, Evidence, Message Center) are placeholder screens whose backend endpoints are implemented by static inspection, with runtime behavior not verified. Evidence: `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md`.

Prior ticket: `F13-SHARED-NAV-FILTERS-IMPL` is `CLOSED / PO UI PASS` as of `2026-08-04`.

Implementation & Closure (`2026-08-04`): Product Owner awarded `PO UI PASS` to `F13-SHARED-NAV-FILTERS-IMPL`. Implemented parameter dual-read fallback (`bcvh_id || ma_bcvh`) across Dashboard, BCVH Ranking, and Route Ranking; updated Route Ranking title to `"Bảng xếp hạng Tuyến Bưu tá"`; replaced Route Ranking static BCVH list with dynamic metadata from `/f13/dashboard/meta`; updated `GlobalFilterBar` default prop `showKpiFilter = false`; preserved URL filter parameters (`from_date`, `to_date`, `bcvh_id`) across cross-module navigation via `urlPreservation.js`. Ticket closed. No active ticket. Repository awaits explicit Product Owner direction before opening any next scope.

Next-direction candidates — recorded as candidates only, **not authorized tickets**:

1. Formally start `F13-STANDARDIZATION-001` Phase 1 (Chuẩn hóa cấu trúc F1.3 — naming/navigation, Evidence as the official shipment detail screen, redirects, Message Center hide, legacy-page removal), the next item in the original five-phase sequence.
2. Reactivate the deferred `F13-SHIPMENT-001` (Shipment Performance Center), whose delta changes remain preserved in `stash@{0}`.
3. `F13-SURFACE-CLEANUP-PLAN` — Evidence merge, Message Center hide, Vietnamese Shipment Ranking naming, redirect behavior, and verified orphan-page removal.
4. Later: Pareto product design, which must distinguish Pareto analysis from true RCA.

`RESIDUAL-01` (recommendations engine using `ket_qua_f13`) is **remediated** as of Phase 0 implementation commit `e3ca2429`; no longer an open candidate. Evidence MERGE and Message Center HIDE remain **pending Product Owner confirmation**. No repository authority records an explicit Product Owner decision on either; approval must not be inferred.

Fresh-chat onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. Current Manifest: `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md`
5. Current Checkpoint: `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md`

Next authorized action: `Await Product Owner PO Gate 2 review / explicit authorization for NETWORK-MANAGEMENT-001 Phase 3 (Import).` AUTO-IMPORT-011/012 remain CLOSED; if Symptom B (HUE/TCT browser open failure) recurs, open a new remediation ticket and capture live backend console output before any restart.
