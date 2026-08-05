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
| Current Phase | `Awaiting Product Owner Direction` |
| Current Ticket | `None` |
| Next Ticket | `None self-activated. NETWORK-MANAGEMENT-001 Phase 1 (Nền tảng) remains COMPLETED / TECHNICAL PASS, PAUSED — explicit Product Owner instruction to not resume it this round. F13-STANDARDIZATION-001 and F13-SHIPMENT-001 (stash@{0}) remain unaffected next-direction candidates, unauthorized.` |
| Last PO Status | `AUTO-IMPORT-011 CLOSED 2026-08-05: COMPLETED / PO RUNTIME PASS. After a server restart, Product Owner confirmed HUE and TCT browser login opened, authenticated, and imported successfully for both sources. Symptom B is recovered as a runtime outcome; no technical root cause was determined and no code fix was applied. Follow-up AUTO-IMPORT-012 (test-isolation fix) remains COMPLETED / TECHNICAL PASS, unaffected. NETWORK-MANAGEMENT-001 Phase 1 remains PAUSED per explicit Product Owner instruction this round.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `None — no active ticket. See Last Closed Manifest.` |
| Current Checkpoint | `None — no active ticket.` |
| Current State | `NO ACTIVE TICKET / AWAITING PRODUCT OWNER DIRECTION` |
| Technical Status | `AUTO-IMPORT-011: Symptom A (future-date validation bug) fixed and verified. AUTO-IMPORT-012: test-isolation defect fixed and verified. Symptom B: recovered via server restart; no technical root cause, no code fix — if it recurs, a new remediation ticket must capture live backend console output at the moment of failure before any restart. NETWORK-MANAGEMENT-001 Phase 1 unaffected, PAUSED.` |
| Runtime Status | `AUTO-IMPORT-011 PO RUNTIME PASS confirmed directly by Product Owner (HUE + TCT open, authenticate, and import successfully). NETWORK-MANAGEMENT-001 Phase 1 and F13-STANDARDIZATION-001 Route Ranking runtime states unchanged, unaffected.` |
| PO UI Check Required | `No — no active ticket. AUTO-IMPORT-011's PO UI Check is satisfied (PO RUNTIME PASS recorded).` |
| PO Product Status | `AUTO-IMPORT-011: PO RUNTIME PASS / CLOSED. AUTO-IMPORT-012: COMPLETED / TECHNICAL PASS (no PO UI check applicable), unaffected. NETWORK-MANAGEMENT-001 Phase 1: technically complete, not yet PO-reviewed, PAUSED, unaffected.` |
| Last Closed Ticket | `AUTO-IMPORT-011 — Emergency Import remediation, COMPLETED / PO RUNTIME PASS / CLOSED, 2026-08-05` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-IMPORT-011_MANIFEST.md` |
| Last Reviewed Phase | `AUTO-IMPORT-011 closure: Product Owner PO RUNTIME PASS after server restart (HUE + TCT open, authenticate, import successfully)` |
| Last Reviewed Implementation Commit | `pending — see Git Handoff once committed` |
| Phase Review Status | `AUTO-IMPORT-011 CLOSED / PO RUNTIME PASS. AUTO-IMPORT-012 CLOSED / TECHNICAL PASS, unaffected. NETWORK-MANAGEMENT-001 Phase 1 (Nền tảng): COMPLETED / TECHNICAL PASS, PAUSED per explicit Product Owner instruction this round.` |
| Next Phase Authorization | `No ticket is authorized. Repository awaits explicit Product Owner direction before opening any next scope, including whether to resume NETWORK-MANAGEMENT-001. If Symptom B (HUE/TCT browser open failure) recurs, open a new remediation ticket and capture live backend console output at the moment of failure before any restart.` |
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

`NETWORK-MANAGEMENT-001` (previous Current Ticket, activated `2026-08-04`) remains `PAUSED` — explicit Product Owner instruction not to resume it this round, in addition to being unaffected by the AUTO-IMPORT-011/012 work: Phase 1 (Nền tảng) remains `COMPLETED / TECHNICAL PASS`, awaiting PO Gate 1. The prior `F13-STANDARDIZATION-001` program's Tuyến Ranking (Route Ranking) delta closed on `2026-08-04` with explicit Product Owner `PO PASS` (implementation commit `03ce28bacc36b49d961caa1c006a011beb804bc7`); that program itself remains open and unclosed, unaffected. `F13-DATA-2098-CLEANUP-IMPL` remains `COMPLETED / TECHNICAL PASS / CLOSED` as of `2026-08-04` — a separate, earlier occurrence of the same data pattern, database-only in scope, which could not have prevented the AUTO-IMPORT-011 recurrence since it never touched the file system or code.

`NETWORK-MANAGEMENT-001` activation (`2026-08-04`): Product Owner explicitly authorized this ticket, naming three independent screens — Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát — to be brought into QIS V2 as SQLite-backed, authenticated modules (`admin`+`viewer` read; `admin`-only Import with preview, error/duplicate detection, file fingerprint, and history). A locked four-phase plan (Phase 1 Nền tảng, Phase 2 Ba bản đồ, Phase 3 Import, Phase 4 Nghiệm thu) was written into manifest `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md`, with only Phase 1 set to `AUTHORIZED / READY FOR IMPLEMENTATION`. The Product Owner locked the audit baseline used to scope the ticket: Mạng điểm phục vụ 151 unique mã điểm (from 260 audited Excel rows, 109 excluded as `Tạm dừng`); Mạng đường thư cấp 2 28 hành trình / 148 lượt dừng / 47 mã điểm / 1.435 km (temporary HTML-seed baseline, no business Excel source yet); Sơ đồ tuyến phát 143,467 điểm (from a Product Owner-audited tháng 06/2026 Excel, audited outside this repository). Source Excel files are not in the workspace/repository; Claude Code must not re-audit them or guess column mapping, and must request them from the Product Owner at the start of the phase that needs them. This is a documentation-only governance activation: no product code, schema, or database was changed. Checkpoint `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` was created. 02 pre-existing stashes and the three source HTML files at repository root remain untouched.

Program activation (`2026-08-04`): Product Owner approved the rapid standardization plan for the F1.3 module group, program `F13-STANDARDIZATION-001`. Two documentation-only steps were executed: (1) creation of the activation package — manifest `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` and checkpoint `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md`; (2) the full five-phase plan (Phase 0 Khóa nền số liệu, Phase 1 Chuẩn hóa cấu trúc F1.3, Phase 2 Hoàn thiện điều hành, Phase 3 Pareto và Evidence, Phase 4 Regression và đóng F1.3) locked into that single manifest, with only Phase 0 set to `READY FOR IMPLEMENTATION`. Locked product decisions and locked out-of-scope items are recorded once in the manifest (Sections 7-8) and must not be duplicated elsewhere.

Phase 0 implementation (`2026-08-04`, commit `e3ca24292f39b5c59022b161b63c4603cced1949`): recommendations engine switched from the non-authoritative `ket_qua_f13` to `danh_gia_2026` (this remediates the previously-recorded `RESIDUAL-01`, superseding the candidate below); the two audited `/f13`-prefix API path defects fixed; `dd/MM/yyyy HH:mm:ss` timestamp parsing fixed. Technically validated (backend/frontend test suites, oxlint, `vite build`); not separately closed with its own Product Owner runtime confirmation.

Tuyến Ranking (Route Ranking) delta closure (`2026-08-04`, PO PASS, `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 16): Route Ranking data contract standardized (`a0d4b041`); violations classified into `Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân` with a corresponding `/f13/evidence-list` API contract (`a892a276`); UI/UX refined (`6e575308`); pagination `10 tuyến/trang` and default ascending `passed_rate` sort added and Product Owner-confirmed (`03ce28ba`). Scope is Tuyến Ranking and its violation drill-down only — no other F1.3 screen, and no other phase of the program, is closed by this. The Shipment Performance Center delta remains preserved in `stash@{0}`, untouched, pending Product Owner reactivation of the deferred `F13-SHIPMENT-001` ticket.

Phase 1 (Nền tảng) implementation (`2026-08-05`): under explicit Product Owner authorization to implement Phase 1, Claude Code added 5 new independent SQLite tables (`network_import_log`, `network_service_point`, `network_level2_route`, `network_level2_route_stop`, `network_delivery_point`) additively to `backend/src/db/schema.sql` and applied them to the live operational database via an idempotent migration script — zero rows seeded, `fact_f13` confirmed unchanged at 663,126 rows before/after. Authenticated API foundation mounted at `/api/network-map` (`admin`+`viewer` read; `admin`-only Import scaffolding returning `501 NOT_IMPLEMENTED`, no Excel logic); the Sơ đồ tuyến phát points endpoint rejects any query missing Ngày/BCVH/Bưu tá with `400`. Frontend: new `Quản lý mạng lưới` nav group and 3 role-gated scaffold screens (no Leaflet map, no OSRM call) proving API connectivity and gating the Import button to `admin` only. Backend tests 20/20 pass, frontend tests 12/12 pass, oxlint clean, `vite build` succeeds; 7 pre-existing backend test failures unrelated to this ticket were found and left untouched (Windows-native `koffi` scripts and pre-existing F1.3 data-snapshot/contract tests — none reference any `network_*` table or this ticket's new files). No Excel was read; no business data was fabricated; PO-confirmed baseline figures (151/28+148+47/143,467) remain unimplemented data targets for Phase 3. 02 pre-existing stashes, the 3 root-level reference HTML files, and the newly-observed `Data QLML/` Excel files were left untouched. Full evidence: `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 12; `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 16. This closes Phase 1 only — Phase 2/3/4 remain `PLANNED / NOT ACTIVE` and each requires its own explicit Product Owner authorization.

Exact next authorized action (for `NETWORK-MANAGEMENT-001`): `Await Product Owner PO Gate 1 review and explicit authorization before starting Phase 2 (Ba bản đồ). Do not begin Phase 2 or Phase 3 without that authorization.`

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

Fresh-chat onboarding chain (no active ticket):

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. No Current Manifest — Current Ticket is `None`. Consult `Last Closed Manifest` (`AUTO-IMPORT-011_MANIFEST.md`) for continuity only; do not treat it as active scope.
5. Await Product Owner direction before activating any next ticket.

Next authorized action: `Product Owner runtime-confirms the Symptom A fix; provides live-reproduction access or automate_sync.py context for Symptom B; decides on the test-isolation follow-up ticket and the orphaned evidence file. NETWORK-MANAGEMENT-001 Phase 2 (Ba bản đồ) remains separately gated behind PO Gate 1, unaffected.`
