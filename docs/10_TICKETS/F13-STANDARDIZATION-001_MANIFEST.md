# F13-STANDARDIZATION-001 — MANIFEST

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Program Structure — Five Phases](#6-program-structure--five-phases)
- [7. Locked Product Decisions](#7-locked-product-decisions)
- [8. Locked Out Of Scope](#8-locked-out-of-scope)
- [9. Executor Plan](#9-executor-plan)
- [10. PO Gates](#10-po-gates)
- [11. Documents To Update](#11-documents-to-update)
- [12. Validation](#12-validation)
- [13. Next Ticket](#13-next-ticket)
- [14. PO Acceptance Checklist](#14-po-acceptance-checklist)
- [15. Authority Escalation](#15-authority-escalation)
- [16. Route Ranking Delta Closure](#16-route-ranking-delta-closure)
- [17. Evidence / Chi tiết bưu gửi — Discovery Delta](#17-evidence--chi-tiết-bưu-gửi--discovery-delta)
- [18. Evidence / Chi tiết bưu gửi — PO Decision + Implementation Authorization](#18-evidence--chi-tiết-bưu-gửi--po-decision--implementation-authorization)
- [19. Evidence / Chi tiết bưu gửi — PO RUNTIME CHECK PASS, Closure (delta only)](#19-evidence--chi-tiết-bưu-gửi--po-runtime-check-pass-closure-delta-only)
- [20. Evidence Product-Value Audit (Tuyến Ranking → Shipment Detail → Evidence)](#20-evidence-product-value-audit-tuyến-ranking--shipment-detail--evidence)
- [21. Evidence Consolidation — PO Decision + Plan](#21-evidence-consolidation--po-decision--plan)
- [22. Evidence Consolidation — Phase 1 Implementation](#22-evidence-consolidation--phase-1-implementation)
- [23. Evidence Consolidation — Phase 1 Remediation](#23-evidence-consolidation--phase-1-remediation)
- [24. Evidence Consolidation — PO Finding Locked Into Phase 2 (2026-08-12)](#24-evidence-consolidation--po-finding-locked-into-phase-2-2026-08-12)

## 1. Ticket Information

- Ticket ID: `F13-STANDARDIZATION-001`
- Ticket Name: F1.3 Module Standardization Program
- Phase: Program activation (documentation-only), followed by a Product Owner-authorized Tuyến Ranking delta (Section 16, `PO PASS / CLOSED`, `2026-08-04`). Phase 0: foundational items implemented, not separately closed. Phases 1-4: `PLANNED / NOT ACTIVE`.
- Owner: Claude Code (implementation, backend, data, tests, documentation, Git per `DEC-020`)
- Governance Version: `V2 Active`
- Authorization: Product Owner, `2026-08-04` — approval of the rapid standardization plan for the F1.3 module group, this program

## 2. Objective

Activate a single five-phase standardization program for the F1.3 module group under one program ticket (not five independent tickets), authorizing only Phase 0 for implementation while Phases 1-4 remain planned and not active.

## 3. Current Status

- Current state: `NO ACTIVE TICKET / AWAITING PRODUCT OWNER DIRECTION` (program), as of `2026-08-04`, following the Route Ranking delta closure (Section 16).
- Phase 0: foundational items implemented (commits `e3ca2429`, `a0d4b041`) and technically validated; not separately closed with its own Product Owner runtime confirmation.
- Phase 1: not started; PO Gate 1 not reached.
- Phase 2: `PLANNED / NOT ACTIVE` for Operation Dashboard and BCVH Ranking; its Tuyến Ranking item was executed and closed out of sequence as a bounded delta (Section 16), with explicit Product Owner `PO PASS`.
- Phases 3-4: `PLANNED / NOT ACTIVE`.
- PO UI Check Required: `Yes` for the Route Ranking delta — satisfied; see Section 16.
- PO Product Status: Route Ranking (Tuyến Ranking) and its violation drill-down `PO PASS / CLOSED`. All other F1.3 screens and the remaining Phase 0-4 scope are unaffected by this status and remain as stated above.

## 4. Required Reading

- `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md` — current checkpoint; self-contained
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — live state
- `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` — source audit evidence referenced by Phase 0-3 scope (data-quality register, MERGE/HIDE/REMOVE recommendations, Product Opportunity Matrix)
- `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md` — prior cleanup evidence relevant to Phase 0 data-lock scope

## 5. Business Context

- Business problem: the F1.3 module group (Operation Dashboard, BCVH Ranking, Route Ranking, Pareto/RCA, Evidence, Message Center) grew through separate tickets with inconsistent naming, navigation, KPI sourcing, and unused legacy pages. The Product Owner authorized one coordinated program to standardize the group instead of continuing ticket-by-ticket drift.
- Business impact: a single locked five-phase plan gives every future AI session (Claude Code, Antigravity, ChatGPT/CTO) one authoritative reference for scope, sequencing, and PO gates across the whole F1.3 group, reducing re-litigation and scope creep.
- Approved business rule constraints: this ticket is documentation-only. It creates the governance package and locks the five-phase plan; it must not implement, modify product code, modify the database, or perform any Phase 0 work.

## 6. Program Structure — Five Phases

### PHASE 0 — Khóa nền số liệu (`AUTHORIZED / READY FOR IMPLEMENTATION`)

- Recommend operational use of the standard KPI field `danh_gia_2026`.
- Verify and correct, exactly within audited scope, the data/API obstacles already audited that directly serve this program.
- Lock one unified KPI computation source for the F1.3 modules.
- Not implemented under this documentation-only ticket.

### PHASE 1 — Chuẩn hóa cấu trúc F1.3 (`PLANNED / NOT ACTIVE`)

- Standardize module naming and navigation.
- Keep Evidence as the official shipment detail screen.
- Redirect old paths appropriately.
- Temporarily hide Message Center.
- Remove or isolate unused legacy pages.
- PO Gate 1 sits after Phase 1.

### PHASE 2 — Hoàn thiện điều hành (`PLANNED / NOT ACTIVE`)

Scope: Operation Dashboard, BCVH Ranking, Tuyến Ranking.

- Add only views backed by real, audited data.
- Small-sample warning for BCVH.
- Identify persistently failing routes.
- Compare by route type.
- Ensure drill-down and cross-module figures stay consistent.
- PO Gate 2 sits after Phase 2.

### PHASE 3 — Pareto và Evidence (`PLANNED / NOT ACTIVE`)

- Complete Pareto across the already-verified data dimensions.
- Complete Evidence as the single lookup for detailed shipment verification.
- Preserve filters when moving from overview to verification data.
- Document explicitly that Pareto identifies priority issue groups only, not true root-cause analysis.

### PHASE 4 — Regression và đóng F1.3 (`PLANNED / NOT ACTIVE`)

- Cross-module figure verification.
- API, navigation, access, performance, and responsive checks.
- Final PO acceptance.
- Governance update and program closure.
- PO Gate 3 sits after Phase 4.

## 7. Locked Product Decisions

1. Evidence is the official shipment detail screen.
2. Message Center is temporarily hidden and deferred.
3. Pareto must not be presented as true root-cause analysis.
4. No feature is built without sufficiently reliable data.
5. The program does not expand to any module outside F1.3.
6. Data Import reconciliation is not part of this program.
7. Phases execute sequentially within one program.
8. No new ticket is required after each Phase if the prior Phase meets its locked exit criteria.
9. Only the Product Owner may change scope or bring a deferred item back into scope.

## 8. Locked Out Of Scope

- True root-cause analysis when no root-cause code exists.
- Postman/carrier performance evaluation without reliable postman data.
- COD amount calculation without complete COD data.
- Building the Message Center lifecycle.
- Displaying customer data not PO-approved for access.
- Data Import reconciliation and independent Import remediation.
- Any module outside the F1.3 group.

## 9. Executor Plan

- ChatGPT: CTO, PO scope interpretation, and product decisions.
- Claude Code (Sonnet): discovery, implementation, tests, and documentation.
- Antigravity: runtime/UI validation per checklist.
- Codex reviewer: diff or regression review only when explicitly assigned.
- Opus: architecture blockers or hard decisions only; not used for routine work.

## 10. PO Gates

- PO Gate 1: after Phase 1 closes.
- PO Gate 2: after Phase 2 closes.
- PO Gate 3: after Phase 4 closes (final program acceptance).

## 11. Documents To Update

- `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` — created (this document)
- `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md` — created
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — updated to activate the program and point to this manifest/checkpoint
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — updated to register the new manifest and checkpoint
- `PROJECT_PROGRESS.md` — one new append-only line recording program activation

## 12. Validation

- Authority pointer chain verified: `README_AI.md` -> `CODEX_PROMPT_STANDARD.md` -> `PROJECT_SNAPSHOT.md` -> this manifest -> this checkpoint -> Phase 0 required reading.
- `PROJECT_SNAPSHOT.md` no longer shows `Current Ticket = None` after this activation.
- Prior tickets (`F13-DATA-2098-CLEANUP-IMPL`, `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN`, `F13-SHARED-NAV-FILTERS-IMPL`) remain `CLOSED`; this ticket does not reopen them.
- Only Phase 0 is `AUTHORIZED / READY FOR IMPLEMENTATION`; Phases 1-4 remain `PLANNED / NOT ACTIVE`.
- No product code or database file changed — confirmed by `git status`/`git diff` scope: documentation and governance files only.
- Build or lint validation: not applicable — no product code was modified.

## 13. Next Ticket

- Next ticket ID: `None`. No active ticket / Awaiting Product Owner direction.
- No next Phase or ticket is self-activated by this closure. Starting Phase 1, or any other scope, requires explicit Product Owner authorization.

## 14. PO Acceptance Checklist

`PO UI Check Required = Yes` for the Route Ranking delta — satisfied by the Product Owner runtime test recorded in Section 16 (pagination `10 tuyến/trang`, ascending `passed_rate` default sort, page navigation, reconciliation table). PO Gates 1-3 (Section 10) remain unreached; they apply once Phase 1 and later phases are formally executed, not to this delta.

## 15. Authority Escalation

No escalation required. The Route Ranking delta closure in Section 16 is a direct execution of explicit Product Owner authorization and an explicit Product Owner `PO PASS` runtime result; it does not extend to any phase, screen, or ticket not named there.

## 16. Route Ranking Delta Closure

- Status: `COMPLETED / PO PASS / CLOSED`
- Closed on: `2026-08-04`
- Closure authority: Product Owner runtime test — `PO PASS`
- Latest Product Owner-tested implementation commit: `03ce28bacc36b49d961caa1c006a011beb804bc7`

Product Owner-confirmed result: Tuyến Ranking (`/f13/ranking/route`) and the violation drill-down detail window (`/f13/ranking/route/violations`) were runtime-tested. Pagination `10 tuyến/trang` correct; default sort ascending by `Tỷ lệ đạt` correct, weakest-performing route ranked first; page navigation correct; reconciliation (đối soát) table correct.

Main implementation chain: `a892a276310705920cb298264ebfeb2db3ae64da` (violation-reason classification and API contract), `6e5753089ccda7b4f90706c32ed1482be3aadb12` (UI/UX refinement), `03ce28bacc36b49d961caa1c006a011beb804bc7` (pagination and default sort — this PO PASS). Built on prior branch commits `e3ca24292f39b5c59022b161b63c4603cced1949` (Phase 0 foundations) and `a0d4b041573798b08eb2992698bdc9cc20031083` (Route Ranking contract standardization).

This closure covers only Tuyến Ranking and its violation drill-down. It does not close Operation Dashboard, BCVH Ranking, Pareto/RCA, Evidence, Message Center, or Shipment Performance Center; it does not close Phase 0, Phase 1, Phase 2 in full, Phase 3, Phase 4, or the `F13-STANDARDIZATION-001` program. `stash@{0}` (`F13-SHIPMENT-001`) and `stash@{1}` (pre-existing HTML maps) are untouched by this closure and remain preserved.

No next ticket or Phase is activated by this closure. Repository state returns to `NO ACTIVE TICKET / AWAITING PRODUCT OWNER DIRECTION`.

## 17. Evidence / Chi tiết bưu gửi — Discovery Delta

- Status: `DISCOVERY COMPLETE / AWAITING PO DECISION`
- Opened: `2026-08-10`
- Authority: user-instructed delta-only discovery, scoped explicitly to the Evidence/Chi tiết bưu gửi screen only, within this existing program group (`F13-STANDARDIZATION-001`), not a new naming series. No product code was changed.

### Scope of this delta

Read-only survey of the "Chi tiết bưu gửi" (shipment detail) / "Evidence" screen area only. No other F1.3 or Network Management screen was audited. `NETWORK-MANAGEMENT-001`/`NETWORK-MANAGEMENT-002` were not reopened. `Data QLML/`, `.claude/`, and both pre-existing git stashes were not touched.

### Findings

1. **The nav-visible "Evidence" screen is a non-functional placeholder, unchanged since the `2026-08-04` audit.** `frontend/src/navigation/appNavigation.jsx` lists `Evidence` at `/f13/evidence` inside the `F1.3 Quality Management` group, `admin`-only. `frontend/src/App.jsx` routes it to `<PlaceholderPage title="Evidence List" />` — no real component, confirmed by direct file read.
2. **A second, functionally real screen already implements shipment-level drill-down but is not linked in navigation.** `ShipmentPerformancePage.jsx` ("Shipment Performance Center") is mounted at `/f13/ranking/shipment`, `admin`-only, and is reachable only by typing the URL directly — it does not appear in `appNavigation.jsx`. It renders real runtime data (executive brief, impact overview, timeline, root cause, evidence summary, recommendation, drilldown) fetched via `f13DashboardClient.getShipmentEvidenceList(fromDate, bcvhId, routeId, 1, 1000)`.
3. **The two screens are backed by the same single API contract.** Backend: one real endpoint, `GET /f13/evidence-list` (`backend/src/routes/f13Routes.js`, `admin`-only) → `DashboardController.getEvidence` → `f13DashboardService.getEvidenceList(date, bcvh, route, page, pageSize, reason)`, requiring `date`/`bcvh`/`route` (400 otherwise). Frontend client `F13DashboardClient.js` exposes `getEvidenceList(...)` (the real HTTP call) and `getShipmentEvidenceList(...)`, the latter a direct pass-through alias of the former (drops only the `reason` parameter) — confirmed unchanged from the exact finding already recorded in `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md`. There is no second, independent data source; "Evidence" and "Shipment Performance Center" are the same data, parameters, and access level under two different UI shells (one built, one placeholder).
4. **A third, narrower consumer of the same contract exists.** `RouteViolationEvidencePage.jsx` (`/f13/ranking/route/violations`, `admin`-only) also consumes evidence-list-shaped data via `routeViolationEvidenceData.js`, scoped to route-violation drill-down specifically — distinct usage, same underlying API family.
5. **This exact convergence is already recorded three times in existing governance and remains unresolved by any Product Owner decision:**
   - This manifest, Section 6/7 (Phase 1: "Keep Evidence as the official shipment detail screen"; Phase 3: "Complete Evidence as the single lookup for detailed shipment verification") — both `PLANNED / NOT ACTIVE`.
   - `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN_MANIFEST.md` Section 16: "Still outstanding and unchanged by this review: MERGE confirmation (Evidence → Shipment Ranking)" — recorded `2026-08-04`, never closed by a Product Owner decision since.
   - `F13-SHIPMENT-001_MANIFEST.md` (`DEFERRED / PRESERVED`, delta preserved in `stash@{0}`, deferred by Product Owner `2026-07-28`): "Existing runtime Shipment page exists but remains shell-like and currently reuses `GET /f13/evidence-list` as a shipment exception feed."
   - A fourth artifact, `F13-SURFACE-CLEANUP-PLAN`, was named as a next-direction candidate in `PROJECT_SNAPSHOT.md` (covering "Evidence merge, Message Center hide, Vietnamese Shipment Ranking naming, redirect behavior, and verified orphan-page removal") but was never created as its own manifest.

### Assessment (technical only — no business rule inferred)

No new technical fact contradicts the `2026-08-04` MERGE recommendation. The system already has one working shipment-detail implementation (`ShipmentPerformancePage.jsx`, orphaned from navigation) and one empty nav-visible placeholder (`/f13/evidence`) pointing at the same backend contract. Building a second, separate Evidence implementation would duplicate the same API and data rather than complete a gap.

### Decision required from Product Owner (not inferred here)

1. Confirm or amend the MERGE direction: fold the existing `ShipmentPerformancePage.jsx` functionality into the nav-visible `/f13/evidence` path (retiring the placeholder and the orphaned `/f13/ranking/shipment` route), rather than building Evidence as a separate screen.
2. Confirm which of the three overlapping planning artifacts (`F13-STANDARDIZATION-001` Phase 1/3, `F13-SHIPMENT-001`, `F13-SURFACE-CLEANUP-PLAN`) should carry the implementation scope, to avoid opening a fifth, competing plan for the same screen.
3. Authorize (or continue to defer) implementation. No implementation is authorized by this discovery delta.

### What must remain unchanged

No product code, route, navigation entry, API contract, schema, or database was modified by this delta. `git diff --name-only` at the time of writing shows only documentation files touched by this delta.

## 18. Evidence / Chi tiết bưu gửi — PO Decision + Implementation Authorization

- Status: `IMPLEMENTATION AUTHORIZED` (as of `2026-08-11`), scope locked below.
- Authority: explicit Product Owner remediation decision (12 numbered points), superseding the "Decision required" list in Section 17. Answers Section 17's three open questions: MERGE confirmed (point 1-3); this manifest (`F13-STANDARDIZATION-001`) carries the scope, not `F13-SHIPMENT-001` or `F13-SURFACE-CLEANUP-PLAN` (point 10); implementation authorized now (all points).

### Locked PO decision

1. `ShipmentPerformancePage.jsx` becomes the official component rendered at `/f13/evidence`.
2. `/f13/evidence` is the canonical route.
3. `/f13/ranking/shipment` is not deleted; it redirects to `/f13/evidence`, preserving the full query string / deep-link context.
4. `/f13/evidence` read access opens to `ROLE_ADMIN` and `ROLE_VIEWER`.
5. Add a real Tuyến (route) selector on Evidence: sourced from real data/API, dependent on the selected BCVH, supporting "Tất cả tuyến" if the data contract allows it, no fake fallback values (`BC_HUE01`/`R_HUE01_01`), correct behavior when a BCVH change invalidates the current `route_id`.
6. The screen must open usefully from the Sidebar with zero query params — no fabricated/fake default context.
7. Keep the existing F1.3 single-day analysis contract; do not silently switch to a `from_date`–`to_date` range just because `GlobalFilterBar` exposes two date fields. Verify current authority first and document how Evidence stays consistent with Dashboard/BCVH Ranking/Tuyến Ranking.
8. Address the implicit `pageSize=1000` cap: verify the `/f13/evidence-list` pagination contract; implement real pagination or an equivalent that guarantees no record loss; search/sort/aggregate counts must have clear semantics over the full matching set, never silently limited to the first 1,000 rows.
9. Preserve drill-down context: `from_date`/`date`, `bcvh_id`, `bcvh_name`, `route_id`, `route_name`, `shipment_id`.
10. No competing ticket: do not activate `F13-SHIPMENT-001` (stash), do not create `F13-SURFACE-CLEANUP-PLAN`.
11. No change to Dashboard, BCVH Ranking, or Tuyến Ranking beyond the minimum wiring genuinely required to preserve deep links.
12. Do not reopen `NETWORK-MANAGEMENT-001`/`002`; do not touch `Data QLML/`; keep both stashes untouched; do not commit `.claude/`.

### Contract verification performed before implementation (read-only, this round)

- **Date semantics (point 7):** `fact_f13.ngay_do_kiem` is single-day (`WHERE ngay_do_kiem = ?` in `FactBuuGuiRepository.getEvidenceListFacts`); Route Ranking (`RoutePerformancePage.jsx`) already resolves one `analysisDate` from `toDateParam || fromDateParam` via the shared `resolveDefaultRouteDate({ param, metaMaxDate })` helper (`routeRankingCalculations.js`), leaving `GlobalFilterBar`'s two date inputs as display-only surface over one authoritative evaluation day. Evidence reuses this exact same helper and the same `toDateParam || fromDateParam` resolution rule, so its single analysis day is derived identically to Dashboard/BCVH Ranking/Tuyến Ranking — no range-filtering semantics introduced.
- **BCVH list source (supports point 5/6):** `kpiController.getDashboardMeta` (`GET /f13/dashboard/meta`, `admin`+`viewer`) already returns real `bcvh_units` and `max_date`; `RoutePerformancePage.jsx` already consumes it for its BCVH selector and default date. Evidence reuses the identical pattern instead of a new endpoint.
- **Route list source (point 5):** `GET /f13/ranking/route?date&bcvh&route_type=all` (`admin`+`viewer`, already implemented) returns real per-BCVH, per-date routes (`ma_tuyen`/`ten_tuyen`) — this is the real data source for the Tuyến selector; no new backend endpoint needed.
- **"Tất cả tuyến" (point 5):** `FactBuuGuiRepository.getEvidenceListFacts(date, bcvh, route)` currently hard-requires an exact `ma_tuyen` match (`AND ma_tuyen = ?`), and `DashboardController.getEvidence` 400s when `route` is missing — the current contract does **not** allow "all routes" for one BCVH+date. Assessed as a safe, backward-compatible technical relaxation (drop the `ma_tuyen` predicate only when `route` is absent/`'all'`; existing callers that always pass a real route, e.g. `RouteViolationEvidencePage.jsx`, are unaffected) — not a business-rule change, so authorized to implement directly per point 5's "nếu data contract cho phép".
- **Pagination (point 8):** `f13DashboardService.getEvidenceList` already implements real, correct pagination server-side (`page`/`page_size` → `total_items`/`total_pages`, computed over the full filtered set, independent of the page returned) — the 1,000-row cap is a **frontend-only** defect: `ShipmentPerformancePage.jsx` calls with a single hardcoded `pageSize=1000` and never requests further pages. Remediation: a pure helper fetches every backend page for the current filter and concatenates before any search/sort/render, so counts and search/sort always operate on the complete matching set, with a bounded safety ceiling that surfaces (never silently drops) an over-ceiling condition.
- **Access role (point 4):** `/evidence-list` is currently `allowAdminOnly` in `f13Routes.js`; `/ranking/route` and `/dashboard/meta` (the two data sources the new selector needs) are already `admin`+`viewer`. `ProtectedRoute` (`frontend/src/components/ProtectedRoute.jsx`) is the only live route gate — it reads only the per-route `allowedRoles` prop passed from `App.jsx`. The separate `VIEWER_ALLOWED_PATH_PREFIXES` constant in `frontend/src/auth/roles.js` is confirmed still dead (not read by `ProtectedRoute` or any live gate, same finding already recorded for `NETWORK-MANAGEMENT-002`) — left untouched per that same precedent instruction not to edit dead defensive configuration.
- **No authority conflict found.** No conflict between this plan and any frozen document, SSOT, or other active ticket was identified; nothing required escalation.

### Authorized implementation scope (delta-only)

- `frontend/src/features/shipment/ShipmentPerformancePage.jsx` — real BCVH/date/route resolution (no fake fallback), real Tuyến selector with "Tất cả tuyến", full-result-set fetch (no silent 1,000 cap), preserved drill-down context, usable with zero query params.
- `frontend/src/features/shipment/shipmentPerformanceData.js` — new pure pagination-aggregation helper.
- `frontend/src/App.jsx` — `evidence` route now renders `ShipmentPerformancePage` (`admin`+`viewer`); `ranking/shipment` becomes a query-preserving redirect to `/f13/evidence`.
- `frontend/src/navigation/appNavigation.jsx` — `Evidence` nav entry opened to `admin`+`viewer`.
- `backend/src/routes/f13Routes.js` — `/evidence-list` opened to `admin`+`viewer`.
- `backend/src/controllers/DashboardController.js` — `getEvidence` validation: `route` becomes optional.
- `backend/src/repositories/FactBuuGuiRepository.js` — `getEvidenceListFacts`: `route` becomes optional (drops the `ma_tuyen` predicate only when absent/`'all'`).
- Corresponding test updates: `App.role-routing.test.js`, `FactBuuGuiRepository.evidenceListFacts.test.js`, new `shipmentPerformanceData` pagination-helper tests, new `ShipmentPerformancePage` source-contract tests.
- Explicitly not touched: `RoutePerformancePage.jsx`, `BcvhRankingPage.jsx`, `DashboardPage.jsx` (Dashboard/BCVH/Tuyến Ranking, point 11), `RouteViolationEvidencePage.jsx`, `frontend/src/auth/roles.js`, `NETWORK-MANAGEMENT-001`/`002` files, `Data QLML/`, both stashes, `.claude/`.

### Implementation record

- `frontend/src/features/shipment/ShipmentPerformancePage.jsx` rewritten: real defaults sourced from `getDashboardMeta()` (date/BCVH) and `getRouteRanking(..., 'all')` (route list) — no more hardcoded `'2026-06-23'`/fake BCVH/route IDs; a real Tuyến `<select>` (`Tất cả tuyến` + real per-BCVH options) added to the filter bar; BCVH re-selection and BCVH-invalidates-route detection both reset `route_id`/`route_name` together; full drill-down context (`from_date`, `bcvh_id`, `bcvh_name`, `route_id`, `route_name`, `shipment_id`) preserved; title updated to "Evidence — Chi tiết bưu gửi".
- `frontend/src/features/shipment/shipmentPerformanceData.js` — new pure `fetchAllEvidenceRows()` helper walks every backend page (`page`/`page_size` → `total_pages`) and concatenates, replacing the single hardcoded `pageSize=1000` call; a bounded safety ceiling (`maxPages`) reports `truncated: true` instead of silently dropping rows past it, surfaced in the UI as a visible warning banner.
- `frontend/src/App.jsx` — `evidence` route now renders `ShipmentPerformancePage` (`admin`+`viewer`); new `LegacyShipmentRedirect` component makes `ranking/shipment` a query-string-preserving redirect to `/f13/evidence` (`admin`+`viewer`, not deleted).
- `frontend/src/navigation/appNavigation.jsx` — `Evidence` nav entry role restriction removed (now visible to `admin`+`viewer`, matching every other F1.3 non-admin-only entry).
- `backend/src/routes/f13Routes.js` — `/evidence-list` moved from `allowAdminOnly` to `allowViewerRead`.
- `backend/src/controllers/DashboardController.js` — `getEvidence` validation relaxed to `date`+`bcvh` only; `route` optional, `'all'`/absent treated as "every route".
- `backend/src/repositories/FactBuuGuiRepository.js` — `getEvidenceListFacts` drops the `ma_tuyen` predicate only when `route` is absent/`'all'`; existing callers passing a real route (`RouteViolationEvidencePage.jsx`) unaffected.
- Confirmed untouched (`git diff --name-only`): `RoutePerformancePage.jsx`, `BcvhRankingPage.jsx`, `DashboardPage.jsx`, `RouteViolationEvidencePage.jsx`, `frontend/src/auth/roles.js`, all `NETWORK-MANAGEMENT-001`/`002` files, `Data QLML/`, both stashes, `.claude/`.

### Validation

- Backend: `FactBuuGuiRepository.evidenceListFacts.test.js` (2 new tests for the optional-route path), `F13DashboardService.evidenceList.test.js` unchanged — targeted suite 16/16 pass. Full `routes+controllers+services+repositories` sweep: 107/111 pass; the same 4 failures (`DashboardController.recovery.test.js` live-KPI-database tests, `timelineService.recovery.test.js` monthly-rank test) were confirmed present on the pre-existing baseline via `git stash` (105/109 pass/fail before this delta) — pre-existing, environment/live-data-dependent, unrelated to this delta's files.
- Frontend: `shipmentPerformanceData.test.js` (10, incl. 5 new `fetchAllEvidenceRows` tests), new `ShipmentPerformancePage.contract.test.js` (7), `App.role-routing.test.js` (updated), `auth/roles.test.js`, `RouteViolationEvidencePage.smoke.test.js` — 25/25 pass. `oxlint` clean on all changed files. `vite build` succeeds (688 modules).
- Runtime: not performed by Claude Code this round. The only credential present in this workspace is `QIS_VIEWER_PASSWORD_HASH` (a hash, not plaintext) — no usable viewer or admin plaintext credential is available, the same precedent already recorded for the `NETWORK-MANAGEMENT-001` Phase 4 verification round. A concrete PO/Antigravity runtime checklist is provided below instead of fabricated browser evidence.

### PO / Antigravity runtime checklist

1. Open `/f13/evidence` from the Sidebar with no query params, as both `admin` and `viewer` — confirm it loads a real date/BCVH (not blank, not an error) and a working Tuyến selector.
2. Open `/f13/evidence` via an existing drill-down link (with `from_date`/`bcvh_id`/`bcvh_name`/`route_id`/`route_name`/`shipment_id`) — confirm context matches the source screen.
3. Change BCVH — confirm the Tuyến selector refreshes to that BCVH's real routes and any previously selected route is cleared to "Tất cả tuyến".
4. Select "Tất cả tuyến" — confirm rows from every route for that BCVH/date appear (not just one route).
5. Select a specific Tuyến — confirm rows narrow to that route only.
6. Select a `shipment_id` — confirm the detail widgets update to that shipment.
7. Open the old URL `/f13/ranking/shipment?...` with query params — confirm it redirects to `/f13/evidence` with the same params intact.
8. Confirm both `admin` and `viewer` can reach `/f13/evidence` (viewer previously blocked).
9. Test empty (a date/BCVH/route combination with zero Không đạt rows), loading, and a deliberately broken network/auth case — confirm each renders its intended state, not a crash.
10. If a real BCVH+date combination is known to exceed 1,000 Không đạt rows, confirm the full count now loads (compare `Evidence runtime` KPI card total against the source Tuyến Ranking/Dashboard figure for that BCVH/date) — otherwise confirm at least one combination under 1,000 still matches exactly.
11. Cross-check the Evidence total for a given BCVH/date/route against the equivalent count on Dashboard/BCVH Ranking/Tuyến Ranking for the same context, to confirm the single-day contract stayed consistent.

Governance state: `READY FOR PO CHECK`. Claude Code does not self-award PO PASS.

## 19. Evidence / Chi tiết bưu gửi — PO RUNTIME CHECK PASS, Closure (delta only)

- Status: `CLOSED — PO RUNTIME CHECK PASS`
- Closed on: `2026-08-11`
- Closure authority: explicit Product Owner runtime recheck of implementation commit `a66fa57d` (governance baseline before the check: `ca170c40`)
- Scope of this closure: the Evidence/Chi tiết bưu gửi delta only (Sections 17-19 of this manifest). It does **not** close `F13-STANDARDIZATION-001` as a program — Phase 0 remains partially implemented/not separately closed, Phases 1-4 remain `PLANNED / NOT ACTIVE` (this delta implemented only the Evidence/Chi tiết bưu gửi item named inside Phase 1/3, not the phases themselves).

### Product Owner runtime check result

`8/9 mục PASS`, 1 item `NOT TESTABLE` (not a fail — see below):

1. **PASS** — `/f13/evidence` accepted as the canonical Evidence screen.
2. **PASS** — legacy `/f13/ranking/shipment` URL redirects while preserving the full query/drill-down context.
3. **PASS** — single-day analysis contract accepted (no from/to range switch).
4. **PASS** — real BCVH list.
5. **PASS** — real Tuyến list.
6. **PASS** — "Tất cả tuyến" behavior.
7. **PASS** — shipment_id selection/synchronization.
8. **PASS** — loading/empty/error states and overall UI/UX.
9. **NOT TESTABLE** — the >1,000-row live-dataset check: the real production dataset's largest matching Không đạt set found was **318 records**, below the previous 1,000-row cap this delta was fixing. The Product Owner therefore could not runtime-observe the cap actually being exceeded and fixed. This is recorded as `NOT TESTABLE` against live data, not `FAIL` and not a live-runtime `PASS` — the underlying fix has independent coverage: `fetchAllEvidenceRows()`'s page-walking behavior (including the over-ceiling `truncated: true` warning path) has **automated test PASS** (`shipmentPerformanceData.test.js`, 5 tests, confirmed passing at commit `a66fa57d`), but that automated coverage is not itself a live-runtime PASS and is not represented as one here.

### Admin + Viewer access — recorded per actual evidence only

The Product Owner's report does not state that both `admin` and `viewer` sessions were live-logged-in and used to reach `/f13/evidence` during this recheck. Per the closure instruction, this is therefore **not** recorded as a live dual-role runtime PASS. What is confirmed instead:

- **Technical verification**: `frontend/src/App.jsx` gates `evidence` behind `<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}>`, identical in form to the other `admin`+`viewer` F1.3 routes (`dashboard`, `ranking/bcvh`, `ranking/route`).
- **Automated routing test PASS**: `App.role-routing.test.js` asserts this exact route/role contract in source and passes (confirmed at commit `a66fa57d`).
- If a future round captures an actual dual-role login trace (Antigravity runtime evidence, per `DEC-020`), that evidence should be added here as an explicit update rather than inferred.

### Backend test status — recorded precisely, not as "full backend PASS"

Full backend sweep at commit `a66fa57d`: **107/111 pass**. The 4 failures (`DashboardController.recovery.test.js` ×3 live-KPI-database tests, `timelineService.recovery.test.js` ×1 monthly-rank test) are **pre-existing** — confirmed present on the pre-delta baseline via `git stash` (105/109 pass/fail before this delta touched anything), unrelated to any file this delta changed. This is not described as "full backend PASS" anywhere in this closure; it is described exactly as 107/111 with the 4 pre-existing failures named.

### What remains open in `F13-STANDARDIZATION-001`

- Phase 0: partially implemented, not separately closed (unaffected by this delta).
- Phases 1-4: `PLANNED / NOT ACTIVE` (unaffected by this delta; this delta satisfied only the Evidence-specific item named inside Phase 1/3's scope, not the phases in full).
- `F13-SHIPMENT-001` (`stash@{0}`): remains `DEFERRED / PRESERVED`, not reactivated by this closure.
- `F13-SURFACE-CLEANUP-PLAN`: remains a named-but-never-created candidate, not created or activated by this closure.

### No next ticket activated

Per explicit instruction, no next ticket is created or activated by this closure. Repository state after this closure: no active ticket, `AWAITING PO DIRECTION` for any next F1.3 or other scope.

`NETWORK-MANAGEMENT-001`/`NETWORK-MANAGEMENT-002` were not reopened; `Data QLML/`, `.claude/`, and both stashes (`stash@{0}`, `stash@{1}`) confirmed untouched by this closure. No product code was changed in this closure round (documentation-only).

## 20. Evidence Product-Value Audit (Tuyến Ranking → Shipment Detail → Evidence)

- Status: `AUDIT COMPLETE / AWAITING PO DECISION`
- Opened: `2026-08-11`, following explicit Product Owner instruction that the prior `PO RUNTIME CHECK PASS` closure (Section 19) proved only technical function, not product value.
- Authority: discovery/planning only, within this existing program group. No product code, route, component, schema, or database change was made. `F13-SHIPMENT-001` (`stash@{0}`) not opened; Dashboard/BCVH Ranking/`Data QLML/` not touched or audited; `NETWORK-MANAGEMENT-001`/`002` not reopened.

Full audit, in detail, in its own dedicated checkpoint (to avoid duplicating the same evidence in two documents): `docs/06_REVIEWS/Shared/F13-EVIDENCE-PRODUCT-VALUE-AUDIT_CHECKPOINT_001.md`.

### Central finding

The frozen `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`/`EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` define Evidence Center as a distinct verification/validation stage **after** Shipment Performance Center, explicitly forbidding both "duplicating Shipment Performance Center" and "carrying Recommendation content." What actually runs at the Product Owner-accepted canonical `/f13/evidence` today is `ShipmentPerformancePage.jsx` — the Shipment Performance Center component itself, including a `ShipmentRecommendation` widget — which is, by the frozen document's own stated rules, exactly what Evidence Center is forbidden from being. This is escalated as Decision 1 (checkpoint Section 12), not silently resolved.

### Summary of findings (full detail in the dedicated checkpoint)

1. Tuyến Ranking's "Mở chi tiết bưu gửi vi phạm" button still targets its own separate, `PO PASS`-closed screen (`/f13/ranking/route/violations`, `RouteViolationEvidencePage.jsx`) because that screen was built and closed under a different ticket delta (`2026-08-04`) before `/f13/evidence` was canonicalized (`2026-08-11`) — the two were never reconciled, not an oversight.
2. Three implementations now share the identical backend contract (`GET /f13/evidence-list`) but split functionality: the violations screen has violation-reason classification but no route selector, no viewer access, and an un-fixed 1,000-row cap; `/f13/evidence` has the route selector, viewer access, and the pagination fix, but never surfaces `violation_reason` at all.
3. Evidence today functions as a shipment-level exception list for a manager who already knows the failing BCVH/date/route — matching what the frozen IA calls Shipment Performance Center's job, not Evidence Center's.
4. Widget-by-widget verdict: `ShipmentEvidenceSummary` is the one substantive widget; `ShipmentExecutiveBrief` is real but redundant; `ShipmentImpactOverview`/`ShipmentTimeline`/`ShipmentDrilldown` are decorative or fully redundant; `ShipmentRootCause` never surfaces the one thing it should (`violation_reason`); `ShipmentRecommendation` just echoes the delay number and is a direct frozen-architecture violation.
5. Denominators are guaranteed identical between the two screens by construction (same repository query) **given the same date/BCVH/route**, but the two screens use an incompatible URL contract (`date` vs `from_date`/`to_date`) that would silently corrupt the date context if the link target were swapped without translation — flagged before it becomes a live defect.
6. Proposed target flow: Tuyến Ranking → violation list (merge onto the already-real `RouteViolationEvidencePage.jsx`, adding Evidence's route selector/viewer access/pagination fix) → select one shipment → real single-shipment cause/timeline panel → explicit, honestly-labeled hand-off to Action Center.
7. KEEP/REMOVE/MERGE/REDESIGN classification for every screen area and widget is recorded in full in the dedicated checkpoint Section 10.
8. A no-code wireframe and 8 reconciliation-checkable acceptance criteria are recorded in the dedicated checkpoint Section 11.

### Decisions requested from Product Owner (full text: dedicated checkpoint Section 12)

1. Frozen-architecture path: amend the frozen Evidence Center docs to match the real, already-accepted product, or build toward the frozen verification/RCA spec as separate new scope with the current screen renamed/re-routed?
2. Confirm or amend the merge direction (retire Evidence's own table, consolidate onto the violations screen's structure).
3. `ShipmentRecommendation`: remove per the frozen boundary, or redesign into a real rule-driven widget if the boundary is relaxed?
4. Final route/URL for the merged screen.
5. Sequencing/authorization to proceed at all.

No implementation authorized by this audit. Governance state: `AUDIT COMPLETE / AWAITING PO DECISION`. **Superseded by Section 21** — the Product Owner issued the decision.

## 21. Evidence Consolidation — PO Decision + Plan

- Status: `PLAN COMPLETE / AWAITING PO APPROVAL`
- Opened: `2026-08-11`, immediately after the Section 20 audit, on explicit Product Owner decision.
- Baseline: `e2c32178`. Planning only — no product code changed, no frozen document edited.

Full plan in its own dedicated document (to avoid duplicating the same content in three places): `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md`.

### Product Owner decision received (answers Section 20's 5 requests)

1. Keep `/f13/evidence` as the single shared violation-detail screen.
2. Tuyến Ranking must lead into Evidence; the separate shipment-detail flow is not maintained.
3. Streamline Evidence per the audit.
4. Remove Recommendation within this scope.
5. Planning a controlled amendment of the frozen architecture documents is permitted (planning only — the documents themselves remain unedited pending separate approval).

### Three new defects found during planning

- **F-1 (blocking)**: `f13DashboardService.getEvidenceList()`'s mapper returns only 6 fields and discards `ma_tuyen`/`ten_tuyen`/`ma_bcvh`/`ten_bcvh`, even though the repository's `SELECT *` already returns them. Consequence: in "Tất cả tuyến" mode every row silently falls back to the URL parameter, so **every shipment displays "Tất cả tuyến" as its route** and route-name search matches nothing — the headline capability of the previous round cannot actually attribute a violation to a route. Fixed by an additive pass-through in Phase 1.
- **F-2 (latent crash)**: `RoutePerformancePage.jsx:262` references an out-of-scope `row` (`route.failed ?? row.total_failed`), throwing a `ReferenceError` whenever `route.failed` is nullish — currently masked because the backend always populates it. One-line fix in Phase 3.
- **F-3 (baseline correction)**: the true full frontend suite at `e2c32178` is **256 pass / 13 fail of 269**, not the "25/25" previously reported for a narrow targeted subset. All 13 are proven pre-existing (`git diff --name-only b83900af HEAD` over the route/dashboard/pages directories returns empty). One of them — `RoutePerformancePage.dateResolution.test.js` asserting a button label that does not match the code — sits directly in Phase 3's path and must be reconciled deliberately.

### Plan summary

- **Contract**: Tuyến Ranking sends `from_date` **and** `to_date` with the same resolved analysis day (plus `bcvh_id`, optional `route_id`, `reason`, `return_to`); Evidence keeps the parameter names it already reads, so the entire dialect translation lands in the link builder being rewritten anyway. The single-day rule is unchanged.
- **Reconciliation**: Evidence's "Tất cả không đạt" must equal Tuyến Ranking's `Không đạt` for the same day/BCVH/route; the three group counts must sum to it; the all-routes total must equal the sum of per-route totals; displayed total must equal `meta.pagination.total_items`.
- **Wireframe**: three regions — context/filter, violation list with group tabs, evidence detail panel — plus specified desktop, mobile, loading, empty and error behaviour.
- **Widget disposition**: KEEP the filter bar and the shipment table; MERGE in the violation group tabs, Executive Brief and Timeline; REDESIGN Root Cause into a real evidence-detail panel; REMOVE Impact Overview, Recommendation, Drilldown and the stale "shell" disclaimer.
- **Old screen**: `/f13/ranking/route/violations` becomes a **translating** redirect (`date` → both `from_date` and `to_date`) opened to `admin`+`viewer` so old bookmarks land on the correct day rather than the newest imported day; the component is retired only after Product Owner acceptance.
- **Acceptance**: 14 criteria, AC-1..AC-5 for count reconciliation and AC-6..AC-9 for the date-parameter protections. AC-10 requires a real dual-role login as evidence, correcting the previous round's inability to demonstrate it.
- **Phases**: (1) additive backend pass-through, (2) Evidence screen rebuild, (3) rewire Tuyến Ranking + translating redirect + F-2, (4) retire the old component after acceptance.

### Frozen documents requiring amendment (planning only — none edited)

`EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`, `EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md`, `EVIDENCE_CENTER_WIDGET_SPECIFICATION.md`, both `SHIPMENT_PERFORMANCE_CENTER_*` architecture files, both Evidence/Shipment UX architecture files, `SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md`, and the "Frozen Documents" list in `PROJECT_PROGRESS.md`. Each requires separate explicit Product Owner approval before any edit. Full rationale per document: plan Section 8.

No implementation authorized by this plan. Governance state: `PLAN COMPLETE / AWAITING PO APPROVAL`. **Superseded by Section 22** — the Product Owner approved the plan and Phase 1 was implemented.

## 22. Evidence Consolidation — Phase 1 Implementation

- Status: `PHASE 1 IMPLEMENTED / READY FOR PO CHECK`
- Implemented: `2026-08-11`. Implementation commit `b147df7c` (plan approved at `34f42c57`).
- Authority: explicit Product Owner approval of the Evidence Consolidation plan (Section 21), scoped strictly to Phase 1.

### Product Owner approval and decisions received this round

1. Start Phase 1 exactly as locked in the plan.
2. Screen name (for Phase 2/3, not implemented this round): **"Evidence — Chi tiết bưu gửi vi phạm"**.
3. Arriving from Tuyến Ranking (for Phase 3, not implemented this round): keep the exact violation group the manager clicked; clicking the total `Không đạt` figure opens "Tất cả không đạt".
4. Do not show an Action Center button until a real hand-off flow exists (for Phase 2, not implemented this round).
5. Amending the 8 frozen architecture documents is approved in principle, but **not mixed into Phase 1**; a separate governance delta must be prepared before Phase 2 starts.
6. Only assert the three violation groups sum to the total after proving mutual exclusion and exhaustiveness; otherwise reconcile via the set of unique `ma_bg` — not via arithmetic sum alone.

Decisions 2-5 are recorded here as locked for Phase 2/3 and were **not implemented in this round** (Phase 1 is backend-contract-only per the plan; implementing them now would have exceeded the explicit "no Giai đoạn 2-4" instruction).

### Implementation — additive backend fix only

`backend/src/services/f13DashboardService.js`, `getEvidenceList()`'s row mapper: now also returns `ma_tuyen`, `ten_tuyen`, `ma_bcvh`, `ten_bcvh`, which `FactBuuGuiRepository.getEvidenceListFacts()`'s `SELECT *` already returned but the mapper was discarding (F-1 from the plan). No new query, no existing field changed, no query predicate changed. Both current consumers (`ShipmentPerformancePage.jsx`'s `routeId: item.ma_tuyen || routeIdParam` / `routeName: item.ten_tuyen || routeName` mapping, and `RouteViolationEvidencePage.jsx`, which never reads these fields) already prefer a real API value over their own fallback via `||` — **confirmed by code read that zero frontend changes were required** for the display/search fix to take effect; the defect was entirely a backend field-discard, not a frontend mapping gap. No frontend file was touched this round.

### Data/context contract — locked

Confirms the contract already recorded in the plan (Section 3), now backed by passing tests instead of a plan-only assertion:

| Field | Source | Contract |
| --- | --- | --- |
| Ngày | `ngay_do_kiem`, single day | Unchanged — `WHERE ngay_do_kiem = ?` |
| BCVH | `ma_bcvh`/`ten_bcvh` | Now returned per row (was previously discarded) |
| Tuyến | `ma_tuyen`/`ten_tuyen` | Now returned per row (was previously discarded) — fixes "Tất cả tuyến" showing the literal string "Tất cả tuyến" as every row's route |
| Nhóm vi phạm | `violation_reason`, one of `Chậm nộp tiền`/`Không đạt khác`/`Chưa xác định nguyên nhân` | Unchanged — confirmed by new tests to be a true partition (mutually exclusive, exhaustive) of the failed set, not merely summing to the same number by coincidence |
| Số lượng đối chiếu | `meta.violation_summary` (3 group counts + `total_failed`) and `meta.pagination.total_items` | Unchanged contract; now additionally proven equal to the unique-`ma_bg`-set sizes, not just the numeric sum, per Product Owner instruction 6 |
| Bưu gửi | `ma_bg`, `thoi_gian_ptc`, `thoi_gian_nop_tien`, `do_tre_gio`, `danh_gia_2026` | Unchanged |

### Tests

- 2 new tests proving route/BCVH pass-through, for both a single-route request and "Tất cả tuyến" (route omitted) — the second is a direct regression guard for the exact reported defect (asserts two different rows resolve two different, correct route values, never a shared fallback).
- 2 new tests proving the reconciliation requirement precisely as instructed: one proves `violation_reason` classification is a true partition (union of the three groups' unique `ma_bg` sets equals the full failed set; no `ma_bg` counted in more than one group) *before* asserting the numeric summary; one proves the classifier always returns exactly one of the three known labels across every timestamp-presence/parseability combination it can encounter.
- Targeted evidence-list suite (service + repository): **20/20 pass** (14 pre-existing + 6 new).
- Full backend sweep: **111/115 pass**. The same 4 failures already on record (`DashboardController.recovery.test.js` ×3 live-KPI-database tests, `timelineService.recovery.test.js` ×1 monthly-rank test) — pre-existing, unrelated to this change, unchanged in count.
- Full frontend sweep (no frontend file touched this round, run to confirm no incidental regression): **256/269 pass**, identical to the F-3 baseline recorded in the plan — reported as the true full-suite figure, not narrowed to a targeted subset.
- No lint step exists for the backend (`backend/package.json` has no `lint` script); no frontend file changed, so `oxlint`/`vite build` were not re-run this round.

### Scope discipline

Backend-only, additive-only change. No Phase 2-4 work performed. No frozen document edited. `F13-SHIPMENT-001` not opened; Dashboard, BCVH Ranking, `Data QLML/`, and every `NETWORK-MANAGEMENT` file untouched; `.claude/` and both stashes (`stash@{0}`, `stash@{1}`) confirmed untouched — `git status --porcelain` shows only the two backend files listed above plus documentation.

Governance state: `PHASE 1 IMPLEMENTED / READY FOR PO CHECK`. Claude Code does not self-award PO PASS. **Superseded by Section 23** — Product Owner runtime evidence surfaced 2 additional defects, remediated same round.

## 23. Evidence Consolidation — Phase 1 Remediation

- Status: `PHASE 1 REMEDIATION IMPLEMENTED / READY FOR PO RECHECK`
- Implemented: `2026-08-11`. Frontend-only.
- Authority: Product Owner runtime evidence on Phase 1, reporting 2 additional defects — both still within Phase 1 scope; no widget consolidation, no frozen document, no Phase 2-4.

Full record (root cause, fix, ground-truth database verification, tests): `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 13.

### DEFECT A — Vietnamese IME input corrupted the search box

Root cause: the shared `GlobalFilterBar` search `<input>` (used by Dashboard, BCVH Ranking, Route Ranking, and Evidence) synchronously pushed a URL/search update on every keystroke via `setSearchParams`, a React Router navigation that re-renders the whole page tree — heavy enough to land mid-IME-composition and corrupt Vietnamese text (e.g. "phía" → "pịa"). No `compositionstart`/`compositionend` handling existed at all. Fixed in the shared component (the only place the `<input>` DOM element exists): new `frontend/src/components/shared/searchCommitController.js`, a composition-aware debounced commit controller — never commits mid-composition, commits the final value immediately on `compositionend`, debounces (300ms) plain typing/paste/delete so a burst of keystrokes coalesces into one commit. Diacritic-insensitive search fallback also added (`stripVietnameseDiacritics`/`matchesSearchQuery` in `shipmentPerformanceData.js`) — exact match tried first, diacritic-stripped fallback only widens matching, never breaks exact route-code search (codes are digits, stripping is a no-op on them).

### DEFECT B — Empty state did not distinguish "no violations" from "no match"

Re-verification performed before any code change, per explicit instruction: a direct, read-only query (`OPEN_READONLY`) against the real operational database for `ma_bcvh='535790'` (BCVH A Lưới), `ngay_do_kiem='2026-08-10'`. Ground truth for Tuyến `53579015` ("535790 - Hương Phong"): **exactly 2 real shipments that day, both `Đạt`, zero `Không đạt`.** Conclusion: **the filter was correct — this was real data, not a filter defect.** Dropdown contract verified: `getRouteRanking()` groups directly from `fact_f13` for the exact date+BCVH, so a route can only appear in the dropdown if it has real activity that day — no change made to dropdown population (already correct by construction). The empty state, previously one generic message shown unconditionally (including a "chọn 'Tất cả tuyến'" suggestion even while already in that mode), is now computed as `emptyStateContent` with 3 distinguished branches, keyword checked first: (1) keyword present and unmatched → names the keyword, offers "Xóa từ khóa"; (2) no keyword, specific route selected, zero rows → names the route/ngày/BCVH, states explicitly this is a real result not a filter error, offers "Xem Tất cả tuyến"; (3) no keyword, "Tất cả tuyến" selected, zero rows anywhere → states the whole context has no Evidence, no route suggestion (already there).

### Tests and validation

24 new tests across 4 files (`searchCommitController.test.js` ×8, `shipmentPerformanceData.test.js` +7, `SharedLayout.searchInput.test.js` ×4, `ShipmentPerformancePage.remediation.test.js` ×5), covering IME composition, paste, delete, fast typing, and the 3 empty-state branches. Full frontend sweep: **280/293 pass** — the same 13 pre-existing failures already on record, unchanged; no backend file touched this round, backend sanity re-run confirms **111/115**, identical to the Phase 1 baseline. `oxlint` clean on all changed files.

### Scope discipline

Frontend-only. No widget consolidation (Phase 2), no frozen document, no Phase 2-4 work. `F13-SHIPMENT-001` not opened; Dashboard/BCVH Ranking/`Data QLML/`/`NETWORK-MANAGEMENT` untouched (the shared search-input fix changes correctness for those screens' existing search boxes only, no new feature/scope). `.claude/` and both stashes confirmed untouched. The DEFECT B database query was read-only against the existing production file — zero rows inserted/updated/deleted.

Governance state: `PHASE 1 REMEDIATION IMPLEMENTED / READY FOR PO RECHECK`. Claude Code does not self-award PO PASS.

## 24. Evidence Consolidation — PO Finding Locked Into Phase 2 (2026-08-12)

- Status: `FINDING LOCKED INTO PHASE 2 SCOPE / NOT IMPLEMENTED`
- Authority: Product Owner finding, explicitly scoped as documentation only — updates the Phase 2 finding/acceptance-criteria record. **No implementation performed.** Phase 2 remains blocked on its own prerequisite (the frozen-document governance delta, Section 18/21) regardless.

Product Owner confirmed search now filters correctly (the `2026-08-11` remediation is not reopened), but its presentation misleads: a keyword match ("hồng th", 9 rows) caused `ShipmentExecutiveBrief` to auto-display one representative shipment/route, hid other matching routes, and left the "Evidence Runtime" KPI showing the pre-search total (`30`) with no results list near the search box. A 10-point contract is now locked into Phase 2 (no auto-selection on search; an explicit "Tìm thấy [n] thuộc [m] tuyến cho '[keyword]'" summary; results grouped by real route with expandable shipment lists; every matching/near-matching route shown, not just the first; detail panel updates only on explicit selection; pre-search/post-search/selected counts kept visibly distinct; the Tuyến dropdown stays independent of search; explicit 0/1/n states plus a clear-keyword control and desktop/mobile behavior; reconciliation by real `ma_bg`/`ma_tuyen`, never route-name text; no interim patch to `ShipmentExecutiveBrief`, whose disposition is already locked). 9 new acceptance criteria (AC-15 to AC-23) added to the plan.

Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 14.

No product code, route, component, schema, or frozen document was changed. `F13-SHIPMENT-001` not opened; Dashboard, BCVH Ranking, `Data QLML/`, `NETWORK-MANAGEMENT` untouched; `.claude/` and both stashes confirmed untouched.
