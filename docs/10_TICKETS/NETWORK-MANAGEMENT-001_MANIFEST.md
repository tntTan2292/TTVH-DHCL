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
- [27. Phase 3 Implementation Closure](#27-phase-3-implementation-closure)
- [28. PO Gate 3 Runtime Remediation](#28-po-gate-3-runtime-remediation)
- [29. PO Gate 3 PASS — Closure](#29-po-gate-3-pass--closure)
- [30. Phase 4 — Sơ đồ tuyến phát Data Contract Audit + Remediation](#30-phase-4--sơ-đồ-tuyến-phát-data-contract-audit--remediation)

## 1. Ticket Information

- Ticket ID: `NETWORK-MANAGEMENT-001`
- Ticket Name: Quản lý mạng lưới (Network Management) — Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát
- Phase: Phase 1 (Nền tảng) `COMPLETED / TECHNICAL PASS`; Phase 2 (Ba bản đồ) `COMPLETED / PO PASS / CLOSED`; Phase 3 (Import) `COMPLETED / PO PASS / CLOSED`, PO Gate 3 `PASS` (`2026-08-06`, baseline `7da98a79eb78a1fb32b370fd27d90b4596b11a63`, Section 29); Phase 4 (Nghiệm thu) `IN PROGRESS` — Product Owner authorized and scoped a first item (Sơ đồ tuyến phát data contract audit + remediation), implemented and technically validated (Section 19), awaiting Product Owner runtime recheck.
- Owner: Claude Code (implementation, backend, data, tests, documentation, Git per `DEC-020`)
- Governance Version: `V2 Active`
- Authorization: Product Owner, `2026-08-04` — explicit activation request naming `NETWORK-MANAGEMENT-001` and locking scope/baseline per the four-phase structure below

## 2. Objective

Activate a single four-phase program to bring three independent map-based screens (Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát — currently three standalone, unauthenticated HTML files with embedded business data) into QIS V2 as SQLite-backed, authenticated modules, under one program ticket, with only Phase 1 (Nền tảng) authorized for implementation and Phases 2-4 held as planned/not active until each prior phase closes.

## 3. Current Status

- Current state: `PHASE 4 (NGHIỆM THU) IN PROGRESS — FIRST SCOPE ITEM (Sơ đồ tuyến phát data contract audit + remediation) TECHNICALLY COMPLETE, AWAITING PO RUNTIME RECHECK`, as of `2026-08-06`.
- Phase 1 (Nền tảng): `COMPLETED / TECHNICAL PASS`. PO Gate 1 `PASS` (Product Owner, `2026-08-05`).
- Phase 2 (Ba bản đồ): `COMPLETED / PO PASS / CLOSED`. PO Gate 2 `PASS` (Product Owner, `2026-08-05`).
- Phase 3 (Import): `COMPLETED / PO PASS / CLOSED`. PO Gate 3 `PASS` (Product Owner, `2026-08-06`, baseline `7da98a79eb8`). See checkpoint Section 29.
- Phase 4 (Nghiệm thu): Product Owner explicitly authorized starting Phase 4 with a first, PO-scoped item — a data contract audit and remediation of the Sơ đồ tuyến phát Import/Export/Archive pipeline (raw-BatchFile-native Import, "Biển số" removed, filename/content period cross-check, source-file archive) — discovery-first, then PO-approved remediation, implemented and technically validated same day (checkpoint Section 19). Cross-module Phase 4 acceptance items from manifest §6's enriched checklist remain outstanding until the Product Owner runs this recheck and any further Phase 4 scope items are authorized/completed.
- PO UI Check Required: `Yes` — Product Owner runtime recheck of this Phase 4 remediation (Import of the real raw BatchFile format, period-mismatch warning, Export without "Biển số", archive retrievability) not yet performed.
- PO Product Status: Phase 4 first scope item technically complete, not yet PO-reviewed.

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

**Phase 4 acceptance checklist (enriched after Phase 3 closure, `2026-08-06`, to make the generic bullets above concrete before PO Gate 3/4 review — not new scope, only specificity):**

1. **PO Gate 3 (Import UI check)** must PASS first, covering, on each of the 3 modules independently: Export produces a file that re-imports with 0 warnings via Preview; Preview never writes to the database; Confirm applies exactly the previewed changes (added/changed/unchanged/duplicate/error counts match); a second upload of the same unmodified file is rejected as a duplicate fingerprint; History lists the import with correct counts; Rollback restores the prior state and is itself blocked when a later import has touched the same scope (verify by attempting rollback of an import that a subsequent import already overlapped).
2. **Admin-only enforcement, re-verified independently at Phase 4**, not assumed from Phase 3 evidence: Import/Export/History/Rollback controls are absent (not just disabled) in the `viewer` UI on all 3 modules, and the corresponding API endpoints return `401`/`403` for an unauthenticated or `viewer`-role request, tested directly (not only via the UI).
3. **"Tạm dừng" point handling**, PO-locked in Phase 3: on Mạng điểm phục vụ, points with `trạng_thái = "Tạm dừng"` are hidden by default on the map, toggleable via the legend, visually distinct from all 5 active-status colors, and never present in an ĐTC2 existence check failure (i.e. ĐTC2 stops referencing a "Tạm dừng" `ma_diem` must still resolve real geometry) — verify all four sub-points together, not just the toggle.
4. **The 5 audited "Tạm dừng" points** (`536101, 536102, 537200, 534630, 534989`, imported into the live database during Phase 3 via `network_import_log.id = 10`) are present in `network_service_point` with `trạng_thái = "Tạm dừng"` preserved verbatim, hidden by default on the Mạng điểm phục vụ map, and (where referenced by an ĐTC2 stop) resolve to real geometry — a direct business-outcome check, not just a schema check.
5. **Cross-module regression**, all 3 modules together: no Phase 3 Import/Export/History/Rollback change altered Phase 1 authentication behavior or Phase 2's read-only map rendering/filter behavior (Sơ đồ tuyến phát's Ngày→BCVH→Bưu tá gating still enforced; no bulk OSRM call reintroduced); no F1.3 module or any code outside this ticket's three named screens was touched.
6. **Data-integrity re-confirmation**: `fact_f13` row count unchanged from the Phase 3 closure baseline (`669,847`); all `Data QLML/` source Excel files still byte-identical (SHA-256) to their Phase 3 closure checksums; both pre-existing git stashes (`stash@{0}`, `stash@{1}`) still present and untouched.
7. Only after all of the above PASS may Phase 4 close with governance update (this manifest, checkpoint, `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`) and program closure — Claude Code performs the technical portions of this checklist; final PO acceptance (item 1-4 above, as experienced in the UI) remains Product Owner-owned and must not be self-awarded.

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
- PO Gate 3: after Phase 3 (Import) closes — PO UI Check on Import (admin) across all three modules. `PASS` (Product Owner, `2026-08-06`, baseline `7da98a79eb8`) — see Section 29.
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

## 26. Phase 2 Governance Closure (PO Gate 2 PASS)

- Status: `PHASE 2 COMPLETED / PO PASS / CLOSED`
- Closed on: `2026-08-05`
- PO Evaluation Result: `PO ROUTE VISUAL RECHECK PASS — LEGEND AND ROAD ROUTES ACCEPTED` officially confirmed for all 3 map screens:
  1. Mạng điểm phục vụ (Service Points Map)
  2. Sơ đồ ĐTC2 (Level 2 Routes Map)
  3. Sơ đồ tuyến phát (Delivery Routes Map with Calendar Date Picker, OSRM road network routing, and interactive Legend Box)
- Gate Closure: `PO Gate 2: PASS (Product Owner, 2026-08-05)`
- Authority Chain Inspection: Phase 3 (Import) is `PLANNED / NOT ACTIVE` and is NOT pre-authorized without explicit Product Owner directive.
- Next State: `PHASE 2 CLOSED / AWAITING PO DIRECTION FOR PHASE 3`
- Scope discipline: Governance-only update. Zero product code, database schema, parser, UI component, or routing logic modified. Preserved 02 stashes (`stash@{0}` and `stash@{1}`) intact.

## 27. Phase 3 Implementation Closure

- Status: `COMPLETED / TECHNICAL PASS`
- Closed on: `2026-08-06`
- Closure authority: direct execution of explicit Product Owner Phase 3 Implementation Authorization, following the PO-approved "Corrected Recommended Design" review round; PO Gate 3 (Section 11) itself remains a separate, not-yet-requested Product Owner confirmation.

Full implementation evidence, locked-design confirmation, and validation commands/output are recorded in `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 14 and are not duplicated here.

Summary: Import/Export/History/Rollback built for all three modules exactly per the PO-approved design, in three steps (additive DB migration; backend Export/Preview/Confirm/History/Rollback; frontend admin-only UI + map handling + validation), each reaching Technical PASS before the next began. Locked decisions honored unchanged: điểm phục vụ upserts by `ma_diem` with `trang_thai` never transformed; ĐTC2 uses `network_level2_route.id` directly as the stable Route ID (no separate `route_key` needed — AUTOINCREMENT ids are never reused), validates `Mã điểm` existence only (never filtering on `trang_thai`, so "Tạm dừng" points remain valid geometry sources), and replaces stops only for admin-selected routes; tuyến phát keeps the `(ma_buu_gui, ngay_phat, route_po_code)` key unchanged, writes via `ON CONFLICT DO UPDATE` (never `INSERT OR IGNORE`), and now enforces that key with a real DB `UNIQUE` index; rollback records full before-images with an explicit INSERT/UPDATE/DELETE operation type per row and refuses to run when a later, still-active import touched the same scope. Using the finished Import feature, the 5 audited "Tạm dừng" points (`536101`, `536102`, `537200`, `534630`, `534989`) were actually imported into the live database — `network_service_point` grew from 151 to 156 rows, and 11 previously-orphaned ĐTC2 stop references now resolve real geometry. Two real defects (a migration that silently created no rows due to `db.run()` vs `db.exec()`, and a rollback-eligibility check that could miss a same-second later import) were found and fixed by the test suite before being shipped. 77 backend + 25 frontend automated tests pass; `oxlint` clean; `vite build` succeeds; full real-browser runtime validation performed as `admin`; `fact_f13` confirmed unchanged across three checkpoints; all 3 `Data QLML/` source Excel files confirmed byte-identical throughout.

This closure covers Phase 3 (Import) only. It does not start, authorize, or imply authorization for Phase 4 (Nghiệm thu), which requires its own explicit Product Owner authorization per Section 11 (PO Gates). No F1.3 code or any module outside this ticket's three named screens was modified.

## 28. PO Gate 3 Runtime Remediation

Product Owner's first PO Gate 3 runtime check (`2026-08-06`, baseline `2efa6fa227d1cda4c514f8afb4f8f91144acf59d`) returned `RUNTIME FAIL` on 3 defects: (1) Mạng đường thư cấp 2 (ĐTC2) drawing straight-line polylines instead of road geometry; (2) Sơ đồ tuyến phát no longer resiliently building road routes through actual delivery coordinates; (3) the Sơ đồ tuyến phát Date Picker allowing a July 2026 selection when only June 2026 had been imported. Claude Code ran an audit-only root-cause investigation first (no code changes), then was explicitly authorized to remediate all 3 within Phase 3 scope.

Root cause, PO-locked remediation decisions, implementation, and full validation evidence (automated tests, real-browser runtime re-check of all 3 map screens after a backend restart) are recorded in full in `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 15 — not duplicated here. Summary: none of the 3 defects were caused by the Phase 3 (Import) diff itself — ĐTC2 routing was never implemented since Phase 2, tuyến-phát routing lacked a provider timeout, and the Date Picker used `COALESCE(ngay_nhap_phat, ngay_phat)` as an undocumented/unlocked filter-date choice. All 3 are fixed: a shared `roadRoutingService.js` (renamed/generalized from the former delivery-only `deliveryRoutingService.js`) now serves both ĐTC2 and Sơ đồ tuyến phát with a 15s per-provider timeout, 2-provider fallback, and a Huế-bounds exclusion filter (never silently dropping or fabricating coordinates — 10 real out-of-bounds rows, inherited unchanged from the Phase 2 seed, are excluded from routing only and named explicitly in the UI); `ngay_phat` is now locked as the sole business date for the Date Picker/filters, with `ngay_nhap_phat`/`thoi_gian_nhap_phat` restricted to intra-day ordering only.

31/31 backend + 39/39 frontend automated tests pass (including new regression tests for each of the 3 defects), `oxlint` clean, `vite build` succeeds, real-browser runtime re-verified as `admin` across all 3 map screens after a backend restart. `fact_f13` (`669,847`) and `network_delivery_point` (`143,475`) row counts unchanged; all `Data QLML/` source files confirmed byte-identical; both pre-existing stashes untouched.

This remediation does **not** constitute PO Gate 3 PASS — it returns Phase 3 to `TECHNICAL PASS`, awaiting a Product Owner runtime recheck. It does not start, authorize, or imply authorization for Phase 4 (Nghiệm thu). No Import/Export/History/Rollback logic was changed; no F1.3 code or any module outside this ticket's three named screens was touched.

## 29. PO Gate 3 PASS — Closure

Product Owner explicitly granted `PO GATE 3 PASS` on `2026-08-06`, at baseline commit `7da98a79eb8` (branch `codex/da-impl-006`), covering all of Phase 3's Import/Export/History/Rollback delivery together with the full PO Gate 3 remediation chain that preceded it:

1. ĐTC2 road routing — full outbound/return journey display (checkpoint Section 15 root cause/fix, Section 16 direction split/turnaround/spiderfy, Section 17 arrow visibility).
2. Same-coordinate marker overlap, quay đầu (turnaround) identification, and direction-of-travel arrows (checkpoint Sections 16-17).
3. Sơ đồ tuyến phát routing resilience (per-provider timeout, 2-provider fallback, non-silent failure) and out-of-Huế-bounds coordinate exclusion/warning (checkpoint Section 15).
4. Date Picker/filter semantics keyed to `ngay_phat` (checkpoint Section 15).
5. Import, Export, History, and Rollback — confirmed no regression across the entire remediation chain (checkpoint Sections 15-17 each re-verified the admin panel, and no commit in the chain touched `NetworkImportController.js`, `backend/src/services/networkMapImport/`, or the frontend `import/` directory).

This closes Phase 3 (Import) as `COMPLETED / PO PASS / CLOSED`. Per this same Product Owner instruction, the program moves to `Phase 4 (Nghiệm thu): READY FOR PHASE 4 / AWAITING PO AUTHORIZATION` only — Phase 4 implementation is **not** started and is **not** self-activated by this closure; it requires its own explicit Product Owner authorization per Section 11. The Product Owner also named a future "Bản đồ tổng thể mạng lưới" (network-wide overview map) module in this same message — recorded here as a noted future scope item only, not locked into Phase 4's existing scope (Section 6), not authorized, and not started. This closure is documentation-only: no product code, schema, or database was changed by this update.

## 30. Phase 4 — Sơ đồ tuyến phát Data Contract Audit + Remediation

Product Owner explicitly opened Phase 4 (Nghiệm thu) with its first scoped item, in two steps:

1. **Audit (discovery-only)**: Claude Code audited the Sơ đồ tuyến phát data pipeline — read the real raw source (`Data QLML/2026.07.01 - BatchFile Phat thang 06.2026.xlsb`) directly and found its true 29-column header; found that the Phase 3 Import feature instead required a hand-built 12-column flat template ("Tuyến phát Import") sharing no header names/order/count with the real recurring monthly file, meaning an admin could not upload the real file as-is; found "Biển số" (`bien_so`) has no source column anywhere (not in the raw file, not in the reference HTML) and was always `NULL` end-to-end since Phase 1's original schema design; found no filename-vs-content period validation existed anywhere; confirmed the existing classify/apply/upsert logic (locked row key, `ON CONFLICT DO UPDATE`) is already multi-month-safe; confirmed no file-archive mechanism existed (uploads used `multer.memoryStorage()` only, discarded after each request).
2. **Remediation (PO-approved same day)**: implemented per the locked decisions below.

**Locked decisions honored:**
- Import now reads the original, unmodified 29-column raw BatchFile directly — zero manual reformatting, zero sheet/header/column changes required from the admin.
- New parser (`parseDeliveryRoutesBatchFileExcel.js`) resolves columns by **header name**, not fixed position — resilient to reordering, fails loudly (never silently mis-maps) if a required header is missing. Only the 11 fields the map already needs are persisted; the other 18 raw columns are accepted (read past, never rejected) but never stored in `network_delivery_point`.
- "Biển số" removed from Import and Export (and their header documentation) — no source data ever existed for it. The `bien_so` DB column stays in the schema, nullable, untouched — no breaking migration.
- Filename period support: `YYYY.MM.DD - BatchFile Phat thang MM.YYYY.xlsb` — the `YYYY.MM.DD` prefix is the file's export date (ignored for period purposes); `thang MM.YYYY` is the declared data period.
- Preview cross-checks the declared period against every parsed row's `ngay_phat`: match → shown normally; mismatch or multiple months present → an explicit warning, **never a hard block**.
- The existing classify/apply/upsert layer (`deliveryRoutesImport.js`) is **unchanged** — only the parsing layer was replaced — so sequential-month imports remain additive and safe (verified: importing a second month never alters the first month's rows).
- After a successful Confirm, the original raw source file is archived to disk (new `network_import_archive` table + `fileArchive.js`), recording filename, byte size, declared period, actual period (all distinct months found), uploader, and import time, keyed by the existing SHA-256 fingerprint. **No retention/expiry logic exists or was added** — files and rows are never auto-deleted, per explicit PO instruction.
- Preview→Confirm lifecycle: the raw uploaded buffer is staged to disk immediately at Preview time (`stageUploadedFile`), independent of multer's request-scoped memory buffer, and only promoted to the permanent archive after the Confirm transaction has already committed successfully (`promoteStagedFileToArchive`) — never dependent on an in-memory buffer surviving past the original HTTP request.

**Implementation**: new `backend/src/services/networkMapImport/parseDeliveryRoutesBatchFileExcel.js`, `fileArchive.js`; new migration `backend/migrate_network_management_001_phase4_schema.js` (`network_import_archive` table, wired into `server.js` startup and `schema.sql`); `NetworkImportController.js`'s `previewDeliveryRoutes`/`confirmDeliveryRoutes` rewired to the new parser + staging/archive; `exportBuilders.js` now defines its own Sơ đồ tuyến phát header list (11 columns, no "Biển số") instead of sharing one with an Import parser; `deliveryRoutesImport.js`'s classify/apply logic **unchanged**; the retired flat-template parser `parseDeliveryRoutesImportExcel.js` (and its test) removed — nothing referenced it after the rewire; `FlatImportPanel.jsx` gained a period-warning/period-match display and `.xlsb` added to the file-picker accept list.

**Validation**: new dedicated test files — `parseDeliveryRoutesBatchFileExcel.test.js` (13 tests, including one that parses the **real, unmodified** `Data QLML` BatchFile end-to-end and reproduces the exact known-good baseline: 143,475 non-duplicate rows), `fileArchive.test.js` (5 tests), `migrate_network_management_001_phase4_schema.test.js` (3 tests); `NetworkImportController.test.js` extended with 7 new Phase 4 tests (raw-file Preview/Confirm, period-mismatch warning, multi-month-content warning, missing-required-header rejection, archive-with-checksum retrieval, sequential 2-month safety); `exportBuilders.test.js` updated to assert "Biển số" is absent from Export. 104/104 across the full targeted backend suite, 53/53 frontend, `oxlint` clean, `vite build` succeeds.

**Real-browser + real-API runtime validation** (admin, after a backend restart): the real production BatchFile (already recorded as imported via the Phase 2 seed) was Previewed and correctly rejected `409 DUPLICATE_FILE` — proving the new pipeline recognizes it against its historical fingerprint without needing to touch existing June data. A structurally-identical realistic fixture (same 29-column raw layout) was Preview→Confirm→Archived via direct API calls: rows inserted correctly with `bien_so` staying `null`, archive record retrievable with a checksum matching the recorded fingerprint. A second, different-content fixture was imported for a later month and then Rolled Back via the real UI (drag-and-drop file simulated in the actual `FlatImportPanel`), confirming the period-match/period-mismatch UI text renders correctly and Rollback still works end-to-end. Two sequential-month imports (via API) confirmed June's 143,475 rows were never altered. Export downloaded and confirmed to no longer contain "Biển số" in its header. Import History panel confirmed unaffected/correct throughout. All test-injected rows and archived files were rolled back/removed after validation — `network_delivery_point` (143,475), `fact_f13` (669,847) confirmed back at the exact pre-test baseline. `Data QLML/` source files untouched; both pre-existing stashes untouched.

Does **not** constitute Phase 4 or program-wide PO PASS — awaiting Product Owner runtime recheck of this remediation, and further Phase 4 scope items (per manifest §6's enriched acceptance checklist) remain outstanding.
