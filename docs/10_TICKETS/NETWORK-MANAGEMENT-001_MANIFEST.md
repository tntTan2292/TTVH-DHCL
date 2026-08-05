# NETWORK-MANAGEMENT-001 — MANIFEST

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Program Structure — Four Phases](#6-program-structure--four-phases)
- [7. Locked Baseline (PO-Confirmed)](#7-locked-baseline-po-confirmed)
- [8. Locked Product Decisions](#8-locked-product-decisions)
- [9. Locked Out Of Scope](#9-locked-out-of-scope)
- [10. Executor Plan](#10-executor-plan)
- [11. PO Gates](#11-po-gates)
- [12. Documents To Update](#12-documents-to-update)
- [13. Validation](#13-validation)
- [14. Next Ticket](#14-next-ticket)
- [15. Authority Escalation](#15-authority-escalation)
- [16. Phase 1 Implementation Closure](#16-phase-1-implementation-closure)
- [17. Phase 2 Implementation Closure](#17-phase-2-implementation-closure)

## 1. Ticket Information

- Ticket ID: `NETWORK-MANAGEMENT-001`
- Ticket Name: Quản lý mạng lưới (Network Management) — Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát
- Phase: Phase 1 (Nền tảng) and Phase 2 (Ba bản đồ) `COMPLETED / TECHNICAL PASS`; Phase 3-4 remain `PLANNED / NOT ACTIVE`.
- Owner: Claude Code (implementation, backend, data, tests, documentation, Git per `DEC-020`)
- Governance Version: `V2 Active`
- Authorization: Product Owner, `2026-08-04` — explicit activation request naming `NETWORK-MANAGEMENT-001` and locking scope/baseline per the four-phase structure below

## 2. Objective

Activate a single four-phase program to bring three independent map-based screens (Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát — currently three standalone, unauthenticated HTML files with embedded business data) into QIS V2 as SQLite-backed, authenticated modules, under one program ticket, with only Phase 1 (Nền tảng) authorized for implementation and Phases 2-4 held as planned/not active until each prior phase closes.

## 3. Current Status

- Current state: `PHASE 2 UI/UX REMEDIATION COMPLETED / READY FOR PO VISUAL RECHECK`, as of `2026-08-05`.
- Recorded PO evaluation: `PO UI FAIL / FUNCTIONAL PASS`.
- Phase 1 (Nền tảng): `COMPLETED / TECHNICAL PASS`. PO Gate 1 `PASS` (Product Owner, `2026-08-05`).
- Phase 2 (Ba bản đồ): `FUNCTIONAL PASS`. UI/UX remediated per reference HTML comparison audit.
- Phase 3 (Import): `PLANNED / NOT ACTIVE`.
- Phase 4 (Nghiệm thu): `PLANNED / NOT ACTIVE`.
- PO UI Check Required: `Yes` for Phase 2 UI/UX Remediation (PO Gate 2 visual re-check).
- PO Product Status: Phase 2 UI/UX Remediation completed, ready for PO visual recheck.

## 4. Required Reading

- `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` — current checkpoint; self-contained
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — live state
- Source files referenced by this ticket (read-only, not modified by this activation):
  - `Ban_do_mang_diem_phuc_vu_BDTP_Hue.html` (Mạng điểm phục vụ reference UX/legend)
  - `Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html` (Mạng đường thư cấp 2 reference UX + embedded `MAIL_ROUTES` baseline data)
  - `ban_do_duong_giao_thong_bcvh_postman_06_2026.html` (Sơ đồ tuyến phát reference UX, filter pattern: Ngày → BCVH → Bưu tá)
- `backend/src/db/schema.sql`, `backend/src/middleware/authMiddleware.js`, `backend/src/routes/f13Routes.js`, `backend/src/services/importPipeline.js`, `backend/src/services/importProcessor.js` — existing conventions for auth, SQLite schema, and import pipeline to be reused/extended in Phase 1 onward.
- `frontend/src/navigation/appNavigation.jsx`, `frontend/src/auth/roles.js`, `frontend/src/auth/AuthContext.jsx` — existing role-gated navigation/auth conventions.

## 5. Business Context

- Business problem: three network-management maps exist today only as standalone HTML files carrying embedded business data (points, routes, delivery records) with no authentication, no database, and no import governance. This is a data-exposure and data-integrity risk and blocks any controlled update workflow.
- Business impact: bringing these three screens into QIS V2 as authenticated, SQLite-backed modules with a governed Excel import workflow (preview, error/duplicate detection, file fingerprint, history, no accidental re-import) lets admin maintain network data safely while viewer retains read access, matching the access model already used elsewhere in QIS V2.
- Approved business rule constraints: this governance-activation step is documentation-only. It creates the ticket package and locks the four-phase plan and the PO-confirmed baseline; it must not implement, modify product code, modify the database, or perform any Phase 1 work.

## 6. Program Structure — Four Phases

### PHASE 1 — Nền tảng (`AUTHORIZED / READY FOR IMPLEMENTATION`)

- Establish SQLite schema for the three independent modules (no required data linkage between them).
- Establish authenticated API foundation: `admin` + `viewer` read access; `admin`-only Import, enforced at both API and UI.
- Reuse existing `requireAuth` / `requireRole` middleware pattern (`backend/src/middleware/authMiddleware.js`).
- Not implemented under this documentation-only ticket.

### PHASE 2 — Ba bản đồ (`PLANNED / NOT ACTIVE`)

- Build the three independent map screens (Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát), each opened directly from its own module entry, preserving the reference HTML files' core UX.
- Sơ đồ tuyến phát must only query data after Ngày + BCVH + Bưu tá are all selected; must not bulk-load a full month into the browser.
- Must not send bulk tuyến-phát coordinates to the public OSRM service.
- No product/business data may be publicly exposed via static HTML; all data flows through authenticated API.

### PHASE 3 — Import (`PLANNED / NOT ACTIVE`)

- Excel import for each module (admin-only, both API and UI), each following its own PO-confirmed update rule (Section 7).
- Import must include: preview before commit, error/duplicate detection, file fingerprint to block duplicate re-uploads, and persisted import history.
- Sơ đồ tuyến phát import is sequential by month and must preserve existing (older-month) data — no destructive overwrite of prior months.

### PHASE 4 — Nghiệm thu (`PLANNED / NOT ACTIVE`)

- Cross-module regression: auth, role visibility (admin vs viewer), import correctness, no forbidden-scope drift into other modules.
- Final PO acceptance across all three screens.
- Governance update and program closure.

## 7. Locked Baseline (PO-Confirmed)

The following figures are Product Owner-confirmed audit results and are the locked scope baseline. Claude Code must not re-audit the underlying Excel files in this or any future execution step; source Excel files are not currently in the workspace/repository and must not be guessed at — they will be supplied by the Product Owner at the start of the phase that needs them.

1. **Mạng điểm phục vụ**
   - Audited Excel source: 260 rows.
   - 109 rows excluded as `Tạm dừng`.
   - Initialization baseline: 151 unique mã điểm.
   - Implementation must receive the source file from the Product Owner to verify column mapping before import logic is built.

2. **Mạng đường thư cấp 2**
   - Initialization source: the existing reference HTML (`Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html`), used temporarily as the seed source.
   - Baseline: 28 hành trình, 148 lượt dừng, 47 mã điểm, tổng cự ly 1.435 km.
   - No business Excel source exists yet; when the Product Owner supplies one, it must be audited and Import mapping added as a follow-up within this ticket's Phase 3, not assumed now.

3. **Sơ đồ tuyến phát**
   - Excel tháng 06/2026 already audited outside this repository by the Product Owner.
   - Baseline after prioritizing records with valid coordinates: 143,467 điểm.
   - Import is sequential by month and must preserve prior months' data.
   - Data must only be queried after Ngày + BCVH + Bưu tá are all selected.
   - Implementation must receive the source Excel file back from the Product Owner; no substitute/sample data may be created.

## 8. Locked Product Decisions

1. Three screens are independent; no required data linkage between them in this program.
2. SQLite + authenticated API for all three modules; no module may expose business data via static/public HTML.
3. `admin` and `viewer` may both view; only `admin` may see and use Import, enforced at both UI and API layers.
4. Import requires: preview, error/duplicate validation, file fingerprint, persisted history, and protection against duplicate re-ingestion.
5. Sơ đồ tuyến phát import never discards prior months' data; it appends/extends month by month.
6. Sơ đồ tuyến phát screen must not bulk-load a full month client-side; it queries only after all three filters (Ngày, BCVH, Bưu tá) are selected.
7. No bulk transmission of tuyến-phát coordinates to the public OSRM service.
8. No fabricated data, features, or scope expansion beyond what is named in this manifest.
9. Only the Product Owner may change scope or bring a deferred item (e.g. Mạng đường thư cấp 2's business Excel source) back into scope.

## 9. Locked Out Of Scope

- Any product code implementation under this governance-activation step.
- Any Excel re-audit by Claude Code in this ticket step; PO-confirmed figures in Section 7 are locked inputs, not to be independently re-derived.
- Cross-module data linkage between the three screens.
- Bulk OSRM routing calls for Sơ đồ tuyến phát.
- Any module outside Quản lý mạng lưới's three named screens.
- Business Excel source ingestion for Mạng đường thư cấp 2 until the Product Owner supplies that file.

## 10. Executor Plan

- ChatGPT: CTO, PO scope interpretation, and product decisions.
- Claude Code (Sonnet): implementation, backend, data, tests, documentation, and Git, per `DEC-020`.
- Antigravity: discovery, UI/UX, responsive/visual work, and Windows runtime evidence, per `DEC-020`.
- Codex: legacy/non-default; not used unless the Product Owner explicitly authorizes it for a specific ticket.
- Opus: architecture blockers, complex multi-component defects, or independent review only; not used for routine work.

## 11. PO Gates

- PO Gate 1: after Phase 1 (Nền tảng) closes — technical validation only (no user-facing UI yet expected).
- PO Gate 2: after Phase 2 (Ba bản đồ) closes — PO UI Check on the three map screens.
- PO Gate 3: after Phase 3 (Import) closes — PO UI Check on Import (admin) across all three modules.
- PO Gate 4: after Phase 4 (Nghiệm thu) closes — final program acceptance.

## 12. Documents To Update

- `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` — created (this document)
- `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` — created
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — updated to activate the program and point to this manifest/checkpoint
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — updated to register the new manifest and checkpoint
- `README_AI.md` — updated live-state pointer
- `PROJECT_PROGRESS.md` — one new append-only line recording program activation

## 13. Validation

- Authority pointer chain verified: `README_AI.md` -> `CODEX_PROMPT_STANDARD.md` -> `PROJECT_SNAPSHOT.md` -> this manifest -> this checkpoint -> Phase 1 required reading.
- `PROJECT_SNAPSHOT.md` no longer shows `Current Ticket = None` after this activation.
- Prior ticket `F13-STANDARDIZATION-001` (program, Tuyến Ranking delta closed) is untouched by this activation; not reopened, not superseded.
- Only Phase 1 is `AUTHORIZED / READY FOR IMPLEMENTATION`; Phases 2-4 remain `PLANNED / NOT ACTIVE`.
- No product code or database file changed — confirmed by `git status`/`git diff` scope: documentation and governance files only.
- 02 existing stashes (`F13-SHIPMENT-001` deferred delta; pre-existing HTML maps) and the three source HTML files at repository root are untouched.
- Build or lint validation: not applicable — no product code was modified.

## 14. Next Ticket

- Next ticket ID: `None` beyond this activation. Phase 3 (Import) is the next item in sequence but is not self-activated.
- No Phase 3 or 4 work is self-activated by this manifest; each requires the prior phase to close and, per PO Gates (Section 11), explicit Product Owner confirmation at Gate 2 (this Phase 2 closure) and Gate 3 before Import is considered accepted.

## 15. Authority Escalation

No escalation required. This activation is a direct execution of explicit Product Owner authorization naming `NETWORK-MANAGEMENT-001`, its four-phase structure, and its locked baseline figures (Section 7). No conflict was found between this authorization and current repository governance state (`PROJECT_SNAPSHOT.md` showed `Current Ticket = None / Awaiting Product Owner Direction` immediately prior to this activation).

## 16. Phase 1 Implementation Closure

- Status: `COMPLETED / TECHNICAL PASS`
- Closed on: `2026-08-05`
- Closure authority: direct execution of explicit Product Owner Phase 1 implementation authorization (this ticket's activation prompt), technically validated by Claude Code; PO Gate 1 (Section 11) itself remains a separate, not-yet-requested Product Owner confirmation.

Full implementation evidence, file-by-file changes, and validation commands/output are recorded in `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 12 and are not duplicated here.

Summary: SQLite schema foundation (5 new, independent, empty tables — `network_import_log`, `network_service_point`, `network_level2_route`, `network_level2_route_stop`, `network_delivery_point`) added additively to `backend/src/db/schema.sql` and applied to the live operational database via an idempotent migration script with zero rows seeded and zero impact on existing tables (`fact_f13` confirmed unchanged at 663,126 rows). Authenticated API foundation mounted at `/api/network-map`: `admin`+`viewer` read access, `admin`-only Import scaffolding (returns `501 NOT_IMPLEMENTED`, no Excel logic), and the Sơ đồ tuyến phát points endpoint hard-rejects any query missing Ngày/BCVH/Bưu tá. Frontend: new `Quản lý mạng lưới` nav group and 3 role-gated routes/screens that prove API connectivity and gate the Import button to `admin` only, with no Leaflet map and no OSRM call. No product/business data was fabricated or inserted; the PO-confirmed baseline figures (151 mã điểm; 28 hành trình/148 lượt dừng/47 mã điểm/1.435 km; 143,467 điểm) remain unimplemented data targets for Phase 3, not touched by Phase 1. 02 pre-existing stashes, the 3 root-level reference HTML files, and the newly-observed `Data QLML/` Excel files were left untouched.

This closure covers Phase 1 (Nền tảng) only. It does not start, authorize, or imply authorization for Phase 2 (Ba bản đồ), Phase 3 (Import), or Phase 4 (Nghiệm thu); each requires its own explicit Product Owner authorization per Section 11 (PO Gates).

## 17. Phase 2 Implementation Closure

- Status: `COMPLETED / TECHNICAL PASS`
- Closed on: `2026-08-05`
- Closure authority: direct execution of explicit Product Owner Phase 2 implementation authorization (following PO Gate 1 `PASS`), technically validated by Claude Code; PO Gate 2 (Section 11) itself remains a separate, not-yet-requested Product Owner confirmation.

Full implementation evidence, source inventory, documented mapping decisions, and validation commands/output are recorded in `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 13 and are not duplicated here.

Summary: the three modules were seeded with real data from the actual PO-supplied sources — Mạng điểm phục vụ (151 điểm, 0 warnings, matches locked baseline exactly, from `Data QLML/Mang_diem_phuc_vu_kem_du_lieu_ban_do.xlsx`); Mạng đường thư cấp 2 (28 hành trình / 148 lượt dừng / 47 mã điểm / 1,435 km, 0 warnings, matches locked baseline exactly — route/stop geometry read from the reference HTML's `MAIL_ROUTES` array per the Product Owner's own instruction that Excel has no coordinates and HTML is the coordinate/geometry reference; the "TỔ CHỨC LẠI" proposal block in the new `2026.08. Mang DTC2.xlsx` was explicitly not used); Sơ đồ tuyến phát (143,475 điểm kept of 160,554 rows from `Data QLML/2026.07.01 - BatchFile Phat thang 06.2026.xlsb`, applying the same three exclusion categories the reference HTML's own stats already name — a small, reported-not-forced discrepancy against the locked 143,467 baseline and the HTML's own stated 143,463 is documented in the checkpoint for Product Owner awareness). All three screens now render as real Leaflet maps backed by the authenticated `/api/network-map` read API (data layer and Leaflet display layer kept strictly separate, so Phase 3 Import can replace the data source without rewriting any map component). Sơ đồ tuyến phát enforces the cascading Ngày→BCVH→Bưu tá selection at both API and UI — the points endpoint is never called, and no bulk/full-month data is ever loaded, until all three are chosen. Phase 1's `admin`/`viewer` read access and `admin`-only (still-disabled) Import gate are preserved unchanged. No Excel/HTML source file was modified (SHA-256-verified before and after); `Data QLML/` was never added to git. `fact_f13` confirmed unchanged (666,153 rows, the correct current baseline following the intervening, unrelated `AUTO-IMPORT-011` ticket) before and after. Both Phase 1 and Phase 2 schema migrations are now applied automatically on every backend startup, not manually on one machine.

This closure covers Phase 2 (Ba bản đồ) only. It does not start, authorize, or imply authorization for Phase 3 (Import) or Phase 4 (Nghiệm thu); each requires its own explicit Product Owner authorization per Section 11 (PO Gates). No F1.3 Import/Dashboard/Ranking code or any module outside this ticket's three named screens was modified.

## 22. Phase 2 Delivery Route Calendar Date Picker Remediation Closure

- Status: `PHASE 2 DELIVERY ROUTE CALENDAR DATE PICKER REMEDIATION COMPLETED / READY FOR PO VISUAL RECHECK`
- Closed on: `2026-08-05`
- Recorded state: `PO UI FAIL / FUNCTIONAL PASS` -> remediated with Calendar Date Picker.
- Scope discipline: strictly NO browser tools used. Pure source code, unit test, UI component, and frontend engineering.
- Implemented:
  1. Calendar Date Picker Component: Built reusable `CalendarDatePicker.jsx` featuring single input field with `CalendarDays` icon, `DD/MM/YYYY` display formatting, and a dropdown calendar popover.
  2. Data Availability Rules: Only dates present in `ngay_nhap_phat` metadata (`dates` array) are enabled; dates without data are disabled (muted grayed-out text, non-clickable).
  3. Visual Highlighting: Enabled dates feature distinct blue background/badge and dot indicators for immediate visual clarity.
  4. Month & Year Navigation: Header controls allow smooth month/year browsing.
  5. Clear & Reset Cascade: Changing date via calendar resets BCVH, Postman, Ca, and map points state, and reloads BCVH options for the new date.
  6. Query Gate: Queries points ONLY when mandatory filters (`selectedDate`, `selectedBcvh`, `selectedPostman`) are selected.
  7. Data Integrity: Preserved 143,475 points baseline, 39 records missing import time kept as NULL, shift rules unchanged, Mạng điểm phục vụ & Sơ đồ ĐTC2 untouched.
- Verification: 39 backend unit tests pass, 12 frontend remediation unit tests pass, oxlint 0 errors/warnings, Vite build succeeds. Data invariants verified (151 service points, 28 routes / 148 stops / 47 points / 1435 km, 143,475 delivery points, `fact_f13` = 666,153 rows).





