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
| Current Phase | `NETWORK-MANAGEMENT-001 Phase 1 — Nền tảng, COMPLETED / TECHNICAL PASS` |
| Current Ticket | `NETWORK-MANAGEMENT-001` |
| Next Ticket | `None beyond NETWORK-MANAGEMENT-001. Phase 1 (Nền tảng) is implemented and technically validated; PO Gate 1 confirmation and/or explicit authorization to start Phase 2 (Ba bản đồ) is the next authorized action within this ticket. F13-STANDARDIZATION-001 Phase 1 (five-phase F1.3 program) remains a separate, unstarted next-direction candidate requiring its own explicit Product Owner authorization. F13-SHIPMENT-001 remains DEFERRED / PRESERVED (stash@{0}), pending Product Owner reactivation.` |
| Last PO Status | `PO PASS ISSUED 2026-08-04 (F13-STANDARDIZATION-001, prior program): Product Owner runtime-tested Tuyến Ranking (Route Ranking) and its violation drill-down detail window — PO PASS / CLOSED for that delta only, unaffected by this ticket. NETWORK-MANAGEMENT-001 activation (2026-08-04) and Phase 1 implementation (2026-08-05): Product Owner explicitly authorized ticket activation with locked four-phase structure and locked baseline, then explicitly authorized Phase 1 (Nền tảng) implementation. Phase 1 is technically validated; no PO UI check has been performed yet — Phase 1 produced schema/API foundation and scaffold screens only, not a screen ready for product acceptance.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` |
| Current Checkpoint | `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` |
| Current State | `PHASE 1 COMPLETED / TECHNICAL PASS — READY FOR PO GATE 1` |
| Technical Status | `NETWORK-MANAGEMENT-001 Phase 1 (Nền tảng) implemented and technically validated: 5 new independent SQLite tables added additively (zero rows, zero impact on existing data — fact_f13 confirmed unchanged at 663,126 rows), authenticated /api/network-map read+admin-only-import route foundation, 3 role-gated frontend scaffold screens with nav entry. Backend tests 20/20 pass, frontend tests 12/12 pass, oxlint clean, vite build succeeds. Full evidence: checkpoint Section 12. F13-STANDARDIZATION-001 program (prior): Tuyến Ranking (Route Ranking) delta remains COMPLETED / PO PASS / CLOSED (a892a276, 6e575308, 03ce28ba); Phase 0 foundational items (e3ca2429, a0d4b041) remain implemented and technically validated, not separately PO-runtime-confirmed; Phases 1-4 of that program remain PLANNED / NOT ACTIVE, unaffected. Prior ticket F13-DATA-2098-CLEANUP-IMPL remains COMPLETED / TECHNICAL PASS / CLOSED.` |
| Runtime Status | `NETWORK-MANAGEMENT-001 Phase 1: technically validated (automated tests, build, live-DB migration verification); no Antigravity/PO runtime UI check performed yet — screens are foundation scaffolds, not final UI. F13-STANDARDIZATION-001 Route Ranking and its violation drill-down: Product Owner-confirmed PASS on 2026-08-04, unaffected.` |
| PO UI Check Required | `No for Phase 1 itself (backend/schema/API foundation; PO Gate 1 per the manifest is a technical-validation gate). Required starting at Phase 2 (Ba bản đồ) per PO Gate 2, and again at Phase 3 (Import) per PO Gate 3, and at Phase 4 (Nghiệm thu) final acceptance per PO Gate 4.` |
| PO Product Status | `NETWORK-MANAGEMENT-001 Phase 1: technically complete, not yet PO-reviewed (PO Gate 1 not yet requested/granted). F13-STANDARDIZATION-001 Tuyến Ranking (Route Ranking) and its violation drill-down: PO PASS / CLOSED, unaffected.` |
| Last Closed Ticket | `F13-STANDARDIZATION-001 — Tuyến Ranking (Route Ranking) delta only` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` |
| Last Reviewed Phase | `F13-STANDARDIZATION-001 Route Ranking delta closure: Product Owner PO PASS` |
| Last Reviewed Implementation Commit | `03ce28bacc36b49d961caa1c006a011beb804bc7` |
| Phase Review Status | `NETWORK-MANAGEMENT-001 Phase 1 (Nền tảng): COMPLETED / TECHNICAL PASS, awaiting PO Gate 1. Phases 2-4: PLANNED / NOT ACTIVE. (F13-STANDARDIZATION-001 Route Ranking delta remains COMPLETED / PO PASS / CLOSED; its own Phase 0 implemented not separately closed; Phases 1-4 PLANNED / NOT ACTIVE — unaffected.)` |
| Next Phase Authorization | `NETWORK-MANAGEMENT-001 Phase 2 (Ba bản đồ), Phase 3 (Import), and Phase 4 (Nghiệm thu) each require their own explicit Product Owner authorization before starting; none is self-activated by Phase 1's technical completion. PO Gates 2-4 require explicit Product Owner confirmation.` |
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

Current handoff: active ticket is `NETWORK-MANAGEMENT-001` (Quản lý mạng lưới), `PHASE 1 COMPLETED / TECHNICAL PASS — READY FOR PO GATE 1` as of `2026-08-05`. The prior `F13-STANDARDIZATION-001` program's Tuyến Ranking (Route Ranking) delta closed on `2026-08-04` with explicit Product Owner `PO PASS` (implementation commit `03ce28bacc36b49d961caa1c006a011beb804bc7`); that program itself — Phase 0 closure, Phase 1-4 — remains open and unclosed, unaffected by this activation. `F13-DATA-2098-CLEANUP-IMPL` remains `COMPLETED / TECHNICAL PASS / CLOSED` as of `2026-08-04` (CTO review, implementation commit `3b605beb7ed2deeae239dbb050cf9b03fbad9c43`).

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

Fresh-chat onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. Current Manifest: `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md`
5. Current Checkpoint: `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md`

Next authorized action: `Await Product Owner PO Gate 1 review / explicit authorization for NETWORK-MANAGEMENT-001 Phase 2 (Ba bản đồ).`
