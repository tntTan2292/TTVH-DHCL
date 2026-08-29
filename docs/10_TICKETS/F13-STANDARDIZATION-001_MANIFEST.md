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
- [25. Date-Filter Cross-Module Remediation (2026-08-13)](#25-date-filter-cross-module-remediation-2026-08-13)
- [26. Date-Filter Remediation — PO Runtime Recheck PASS, Closure (2026-08-13)](#26-date-filter-remediation--po-runtime-recheck-pass-closure-2026-08-13)
- [27. Evidence Consolidation Phase 1 — Formal Closure (2026-08-13)](#27-evidence-consolidation-phase-1--formal-closure-2026-08-13)
- [28. Frozen-Document Governance Delta — Execution (2026-08-13)](#28-frozen-document-governance-delta--execution-2026-08-13)
- [29. Evidence Consolidation Phase 2 — Implementation (2026-08-13)](#29-evidence-consolidation-phase-2--implementation-2026-08-13)
- [30. Evidence Consolidation Phase 2 — Runtime Recheck FAIL + Search-Result Remediation (2026-08-13)](#30-evidence-consolidation-phase-2--runtime-recheck-fail--search-result-remediation-2026-08-13)
- [31. Evidence Consolidation Phase 2 — Full-Screen PO Acceptance, Formal Closure (2026-08-13)](#31-evidence-consolidation-phase-2--full-screen-po-acceptance-formal-closure-2026-08-13)
- [32. Phase 3 — Rewire Tuyến Ranking + Redirect Old Path (2026-08-13)](#32-phase-3--rewire-tuyến-ranking--redirect-old-path-2026-08-13)

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

Governance state: `PO PHASE 1 REMEDIATION RECHECK PASS / CLOSURE PAUSED` (PO passed this recheck `2026-08-13`; formal closure itself stays paused pending Section 25). Claude Code does not self-award PO PASS.

## 24. Evidence Consolidation — PO Finding Locked Into Phase 2 (2026-08-12)

- Status: `FINDING LOCKED INTO PHASE 2 SCOPE / NOT IMPLEMENTED`
- Authority: Product Owner finding, explicitly scoped as documentation only — updates the Phase 2 finding/acceptance-criteria record. **No implementation performed.** Phase 2 remains blocked on its own prerequisite (the frozen-document governance delta, Section 18/21) regardless.

Product Owner confirmed search now filters correctly (the `2026-08-11` remediation is not reopened), but its presentation misleads: a keyword match ("hồng th", 9 rows) caused `ShipmentExecutiveBrief` to auto-display one representative shipment/route, hid other matching routes, and left the "Evidence Runtime" KPI showing the pre-search total (`30`) with no results list near the search box. A 10-point contract is now locked into Phase 2 (no auto-selection on search; an explicit "Tìm thấy [n] thuộc [m] tuyến cho '[keyword]'" summary; results grouped by real route with expandable shipment lists; every matching/near-matching route shown, not just the first; detail panel updates only on explicit selection; pre-search/post-search/selected counts kept visibly distinct; the Tuyến dropdown stays independent of search; explicit 0/1/n states plus a clear-keyword control and desktop/mobile behavior; reconciliation by real `ma_bg`/`ma_tuyen`, never route-name text; no interim patch to `ShipmentExecutiveBrief`, whose disposition is already locked). 9 new acceptance criteria (AC-15 to AC-23) added to the plan.

Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 14.

No product code, route, component, schema, or frozen document was changed. `F13-SHIPMENT-001` not opened; Dashboard, BCVH Ranking, `Data QLML/`, `NETWORK-MANAGEMENT` untouched; `.claude/` and both stashes confirmed untouched.

## 25. Date-Filter Cross-Module Remediation (2026-08-13)

- Status: `DATE-FILTER REMEDIATION IMPLEMENTED / READY FOR PO RECHECK`
- Authority: Product Owner product decision, "PO PRODUCT DECISION — AUTHORIZE BOUNDED DATE-FILTER REMEDIATION" (chat, `2026-08-13`), accepting the read-only diagnosis recorded in `F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 15 and authorizing a bounded fix under a 3-point contract.

### Contract

1. Operation Dashboard's "Bảng điều hành BCVH" table is a range screen — must genuinely aggregate `ngay_do_kiem BETWEEN from_date AND to_date`, inclusive.
2. BCVH Ranking keeps its single-evaluation-day contract; its own request must explicitly send `from_date === to_date`.
3. Tuyến Ranking and Evidence stay single-day, untouched.

### Root cause

`DashboardController.getBcvh` validated that `from_date` was present but never forwarded it — `f13DashboardService.getBcvhRanking(to_date, ...)` and the underlying repository methods (`getBcvhRanking`, `getBcvhOperationMetricsByDate`, `getFactByDate`) all queried a single exact day (`ngay_do_kiem = ?`), silently discarding `from_date`.

### Fix (purely parameter-driven — no branching on caller/page identity)

`backend/src/controllers/DashboardController.js` (`getBcvh`), `backend/src/services/f13DashboardService.js` (`getBcvhRanking(fromDate, toDate, ...)`), `backend/src/repositories/FactBuuGuiRepository.js` (`getBcvhRanking` now `BETWEEN`; new `getFactBetween`), `frontend/src/features/ranking/BcvhRankingPage.jsx` (request now explicitly sends `from_date: toDate, to_date: toDate`, a no-op on displayed data since `to_date` was already the only value ever honoured). Reversed ranges rejected `400 INVALID_RANGE`. Tuyến Ranking, Evidence, Pareto/RCA confirmed untouched by direct code trace.

### Numeric reconciliation

Reproduced live against the real database through the fixed code (not mocked) — BCVH Thuận Hóa `533140`: single day `2026-08-11` → `1,820/753/986`; range `2026-08-01`–`2026-08-11` → `18,895/10,179/7,841`; both match the PO's own reported evidence exactly. The 81-count gap on `2026-08-11` (`1820 - 753 - 986`) verified as pre-existing `danh_gia_2026 IS NULL` rows — the same unclassified category already modeled elsewhere in this codebase; no metric/formula changed.

### Tests and validation

12 new tests (9 backend in `DashboardController.dateFilterRemediation.test.js`, covering the PO's 7-point required-scenario list; 3 frontend source-level in `BcvhRankingPage.singleDayContract.test.js`), all passing. 9 pre-existing BCVH-ranking tests in `F13DashboardService.recovery.test.js` updated for the new signature — 23/23 pass. Full backend sweep: 209/213 (true baseline re-verified this round by stashing all tracked changes and temporarily removing the new test files: 200/204, 4 pre-existing failures, identical by name after the fix). Full frontend sweep: 283/296 (baseline 280/293, 13 pre-existing failures, identical by name). Net: +12 tests, 0 regressions. `oxlint` clean.

### Scope discipline

Bounded to the date-filter finding only. No widget consolidation, no frozen document, no Phase 2 work. `F13-SHIPMENT-001` not opened; `Data QLML/`, `NETWORK-MANAGEMENT` untouched; `.claude/` and both stashes confirmed untouched (re-verified after every stash/pop cycle used for baseline comparison).

Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 16.

Governance state: `CLOSED / PO DATE-FILTER RUNTIME RECHECK PASS` (recheck passed `2026-08-13` — see Section 26). Claude Code does not self-award PO PASS.

## 26. Date-Filter Remediation — PO Runtime Recheck PASS, Closure (2026-08-13)

- Status: `CLOSED / PO DATE-FILTER RUNTIME RECHECK PASS`
- Authority: Product Owner runtime recheck (chat, `2026-08-13`), performed after a backend restart.

Product Owner confirmed: (1) Operation Dashboard's "Bảng điều hành BCVH" now aggregates correctly across the full selected date range; (2) changing the range updates the table's figures correctly; (3) the earlier to_date-only observation was the old backend process not yet restarted to pick up the new implementation, **not** a residual defect at commit `0a15ddf4`; (4) a BCVH-filtered Sản lượng widget correctly scopes to that BCVH and omits national rank in that context — confirmed as intended behavior, not data loss or a missing-ranking defect (pre-existing, unmodified by this remediation).

Implementation commit `0a15ddf4`; documentation commit `4201fca6`. No residual defect. This closes the date-filter finding.

Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 17.

## 27. Evidence Consolidation Phase 1 — Formal Closure (2026-08-13)

- Status: `PHASE 1 CLOSED / PO PASS`
- Authority: Product Owner instruction (chat, `2026-08-13`), governance-only continuation directing formal closure now that the date-filter remediation recheck has passed.

Phase 1 (Section 22, F-1 backend fix) and its remediation (Section 23, DEFECT A/B) both received Product Owner runtime PASS. Formal closure was sequenced behind the date-filter remediation's own recheck, per the explicit `2026-08-12` PO instruction; that condition is now satisfied (Section 26). This closes **Phase 1 of the Evidence Consolidation plan only** — Phase 2 (widget consolidation, the 10-point search-result-presentation contract, Section 24) remains `NOT IMPLEMENTED` and requires its own separate implementation authorization. The `F13-STANDARDIZATION-001` program itself remains open (Phase 0 of the original 5-phase program plan partial; Phases 1-4 `PLANNED / NOT ACTIVE`).

Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 18.

## 28. Frozen-Document Governance Delta — Execution (2026-08-13)

- Status: `GOVERNANCE DELTA EXECUTED`
- Authority: Product Owner instruction (chat, `2026-08-13`) directing execution of the frozen-document amendment approved in principle on `2026-08-11` (Section 22's decision record; plan Section 8), as its own separate governance delta, not mixed into any implementation commit.

All 8 documents named in the plan's Section 8 amended — each gained a `## 0. GOVERNANCE AMENDMENT NOTICE (2026-08-13)` section at its top; original content preserved below as the historical record, not deleted or rewritten in place:

1. `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` — AMENDED (redefined to the merged violation-detail stage; drill-down chain collapsed to `Dashboard → BCVH → Tuyến → Evidence → Action`).
2. `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` — AMENDED (eight-zone list replaced with the three real regions).
3. `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` — AMENDED (re-specified against the real widget set; six retired widgets marked "no data source available").
4. `docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` — SUPERSEDED.
5. `docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` — SUPERSEDED.
6. `docs/03_UX/evidence/EVIDENCE_CENTER_UX_ARCHITECTURE.md` — AMENDED (journeys/wireflow aligned to the merged screen).
7. `docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` — SUPERSEDED.
8. `docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` — SUPERSEDED.

`PROJECT_PROGRESS.md`'s Frozen Documents list also updated with the controlled-amendment record (a 9th document, the registry itself, not one of the 8).

Documentation-only — no product code, schema, route, or test file touched. Confirmed via `git diff` on each of the 8 files: only an inserted amendment-notice section and a one-line historical annotation on the immediately-following heading; zero original body content deleted, reordered, or rewritten.

**Phase 2 prerequisite status**: both stated prerequisites — (a) Product Owner recheck of Phase 1, (b) the frozen-document governance delta — are now satisfied. **Phase 2 is not thereby authorized to begin implementation.** Per this Product Owner instruction's own explicit boundary ("Chưa triển khai product code Phase 2 trong lượt governance này"), Phase 2 implementation requires its own separate, explicit Product Owner authorization to start.

Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 19.

Governance state: `F13-STANDARDIZATION-001` — Date-Filter Remediation `CLOSED / PO PASS`; Evidence Consolidation Phase 1 `CLOSED / PO PASS`; frozen-document governance delta `EXECUTED`; Phase 2 `IMPLEMENTED / READY FOR PO RUNTIME RECHECK` (Section 29).

## 29. Evidence Consolidation Phase 2 — Implementation (2026-08-13)

- Status: `PHASE 2 IMPLEMENTED / READY FOR PO RUNTIME RECHECK`
- Authority: Product Owner instruction, "PO AUTHORIZATION — BEGIN EVIDENCE CONSOLIDATION PHASE 2 IMPLEMENTATION" (baseline `457329e2`, confirmed matching before any edit).

Implements plan Section 9's "Phase 2 — Evidence screen rebuild" scope plus the Section 14 search-result-presentation contract (AC-15..AC-23), authorized together in one instruction. `ShipmentPerformancePage.jsx` rewritten: violation group tabs (reused from `routeViolationEvidenceData.js`, not reimplemented), conditional Tuyến column, a keyword-only search-result summary region, three visibly distinct KPI counts, header-merged BCVH/Tuyến/Ngày badges, and removal of the auto-select-first-row effect (selection is now only ever explicit). New `ShipmentEvidenceDetail.jsx` consolidates the old Timeline+RootCause widgets into one evidence-detail panel. `ShipmentImpactOverview.jsx`, `ShipmentRecommendation.jsx`, `ShipmentDrilldown.jsx`, `ShipmentExecutiveBrief.jsx`, `ShipmentTimeline.jsx`, `ShipmentRootCause.jsx`, `ShipmentShellShared.jsx` all deleted (last one a disclosed minor deviation: deleted as dead code once its only consumers were reworked/removed, rather than "reworked" as the plan's file list literally said).

No metric/formula/date-contract/data-source change; no backend file touched; Operation Dashboard, BCVH Ranking, Tuyến Ranking, Pareto/RCA, Network Management confirmed untouched; `F13-SHIPMENT-001` not opened; `Data QLML/`, `.claude/`, both stashes confirmed untouched.

Live-database proof (service layer): real context (2026-07-27, BCVH 533140) — `reason=delayed_cash` returns exactly 217 rows matching `violation_summary.delayed_cash_count` exactly; 32 distinct real routes present in "Tất cả tuyến" mode.

19 new tests, all passing; full frontend sweep 302/315 (same 13 pre-existing failures by name, zero regressions); prior Phase 1/remediation tests (15) unmodified and still 100% passing; `oxlint` clean; `vite build` succeeds. Full AC-15..AC-23 → implementation/test mapping table: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 20.

Governance state: `PHASE 2 SEARCH-RESULT REMEDIATION IMPLEMENTED / READY FOR PO RECHECK` (superseded by Section 30). Claude Code does not self-award PO PASS and does not self-close Phase 2.

## 30. Evidence Consolidation Phase 2 — Runtime Recheck FAIL + Search-Result Remediation (2026-08-13)

- Status: `PHASE 2 SEARCH-RESULT REMEDIATION IMPLEMENTED / READY FOR PO RECHECK`
- Authority: Product Owner runtime recheck FAIL (tested at commit `b3de0ea6`/`857f9b55`), authorizing bounded diagnosis and remediation of the search-result-presentation contract only.

Defect: typing a keyword only ever showed one route, violating AC-17/AC-18. Root cause, reproduced via a real React render against real data (temporary, unsaved `jsdom` diagnostic, never committed): the evidence fetch was scoped server-side to the active violation-reason tab (default "Chậm nộp tiền"); a real 1,573-row/8-route context reduced to exactly 1 row/1 route under that default tab — the exact reported symptom. Fix: the fetch now always pulls every reason group; reason-tab scoping became a client-side filter; while a keyword is active, matching spans every reason group (AC-17/18 are unconditional); `contextTotal` re-derived from the tab-scoped subset. Reconciled against real data (8 groups/208 rows restored; route-selected mode stays correctly scoped to 44 rows; clearing search restores the tab-scoped 217, not the broad 1,573).

14 new tests (mapped to the PO's C.1-13 list), all passing; full frontend sweep 316/329 (same 13 pre-existing failures, zero regressions); `oxlint` clean; `vite build` succeeds. Bounded to Phase 2 search-result presentation only — no metric/date-contract/schema change, no backend file touched, no governance closure performed. Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 21.

Governance state: `SEARCH-RESULT REMEDIATION: PO RUNTIME PASS` (2026-08-13, tested at `e2ae87ac`/`1a6c490b`) — covered the search-result defect only, superseded by full closure in Section 31 below.

## 31. Evidence Consolidation Phase 2 — Full-Screen PO Acceptance, Formal Closure (2026-08-13)

- Status: `PHASE 2 CLOSED / PO FULL-SCREEN RUNTIME PASS`
- Authority: Product Owner instruction, "PO EVIDENCE CONSOLIDATION PHASE 2 FULL-SCREEN RUNTIME ACCEPTANCE PASS" (baseline `88c4bfd0`, confirmed matching before any edit).

Product Owner tested the complete merged Evidence screen against the full AC-1..AC-23 set: merged layout/zones, conditional Tuyến column, no auto-selection, detail panel updates only on explicit selection, identity/kết quả/nhóm vi phạm/timeline correct, `>3.0h` rule statement correct, Action Center hand-off state honest, `ShipmentExecutiveBrief`/`ShipmentImpactOverview`/`ShipmentRecommendation`/`ShipmentDrilldown` correctly removed, violation-reason tabs/search/clear-keyword/Tuyến dropdown all correct, desktop/mobile both usable with no acceptance-blocking defect — **AC-1 through AC-23, in full: PO RUNTIME PASS.**

This closes Evidence Consolidation Phase 2 in full, including the search-result-presentation remediation already passed in Section 30. Does not close: Phase 3 (rewire Tuyến Ranking's drill-down button; translating redirect for `/f13/ranking/route/violations`), Phase 4 (retire `RouteViolationEvidencePage.jsx`), or the `F13-STANDARDIZATION-001` program itself — all remain `PLANNED / NOT ACTIVE` / open, each requiring its own separate explicit Product Owner authorization.

Governance-only; no product code touched. `F13-SHIPMENT-001` not opened; `Data QLML/`, `NETWORK-MANAGEMENT`, and every other module untouched; `.claude/` and both stashes confirmed untouched. Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 22.

Governance state: Evidence Consolidation Phase 2 `CLOSED / PO FULL-SCREEN RUNTIME PASS`. Phase 3/4 and any next ticket remain unauthorized.

## 32. Phase 3 — Rewire Tuyến Ranking + Redirect Old Path (2026-08-13)

- Status: `PHASE 3 IMPLEMENTED / READY FOR PO RUNTIME RECHECK`
- Authority: Product Owner instruction, "PO AUTHORIZATION — BEGIN F13-STANDARDIZATION-001 PHASE 3" (baseline `b6177b88`, confirmed matching before any edit).

Tuyến Ranking's drill-down button now targets `/f13/evidence` directly with full context (`from_date`/`to_date` identical, `bcvh_id`/`bcvh_name`, `route_id`/`route_name`, `reason` default `delayed_cash`, `return_to`); `/f13/ranking/route/violations` converted into a translating redirect (widened to `admin`+`viewer`), old `date` bookmarks resolving to `from_date`/`to_date`. F-2 latent `ReferenceError` fixed (`route.total_failed`, not the out-of-scope `row`); drill-down button label reconciled to "Xem bưu gửi vi phạm," resolving the one pre-existing failing test that caused (F-3). Phase 4 explicitly not performed — `RouteViolationEvidencePage.jsx` untouched on disk, simply unrouted.

21 new/updated tests, all passing; full frontend sweep 325/337 (12 pre-existing failures, down from 13 — the resolved one is a disclosed, plan-sanctioned consequence of the label reconciliation, not scope creep); `oxlint` clean; `vite build` succeeds. No backend touched; `F13-SHIPMENT-001` not opened; Phase 2 not reopened. Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 23.

Governance state: `PHASE 3 IMPLEMENTED / READY FOR PO RUNTIME RECHECK`. Claude Code does not self-close Phase 3 and does not self-start Phase 4.

## 33. Phase 3 Return-Journey Remediation (2026-08-14)

- Status: `CLOSED / PO RUNTIME PASS`
- Authority: Product Owner runtime finding — forward navigation confirmed working, return journey incomplete (`return_to` carried but not consumed).

`ShipmentPerformancePage.jsx` now reads `return_to`, validates it via a new `isValidReturnTo()` (rejects external/protocol-shaped values, requires a recognized Route Ranking key), and renders "← Quay lại Tuyến Ranking" via the pre-existing `buildBackToRouteRankingLink()`, never `navigate(-1)`. Restores date, BCVH, search, route_type, and only_failed (all already URL-backed on `RoutePerformancePage.jsx`); selected-row highlight and page number remain component-only state on `RoutePerformancePage.jsx` and are not restorable without a URL-contract expansion, disclosed rather than silently omitted. 7 new/updated tests; targeted sweep 77/77 pass; full frontend sweep 331/343 (12 pre-existing failures, unchanged by name — zero new regressions); `oxlint` clean; `vite build` succeeds. `RoutePerformancePage.jsx`/`App.jsx`/`RouteViolationEvidencePage.jsx` untouched; no backend touched. Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 24.

### Closure (2026-08-14)

Product Owner performed the runtime recheck at authoritative HEAD `29373803` (implementation commits `c99ac789`, `29373803`) and confirmed all 8 checked items: back-link shown only with a valid `return_to`; clicking it restores `from_date`/`to_date`/`bcvh_id`/`bcvh_name`/`search`/`route_type`/`only_failed` without requiring the filters to be re-chosen; the back action survives an Evidence refresh; a direct-opened Evidence screen shows no back action; loading/error/empty/success states all preserve the back action; an invalid/external `return_to` falls back safely to `/f13/ranking/route`; the round trip loses no supported context. "PHASE 3: PO RUNTIME PASS."

Product Owner explicitly accepted the disclosed residual — `selectedRouteId`/`currentPage` remain `RoutePerformancePage.jsx` component state, not URL-backed — as **non-blocking** for Phase 3 and not requiring a new ticket; expanding the URL contract for `route_id`/`page` is deferred, not authorized, and not a Phase 3 blocker.

This closes the Phase 3 return-journey remediation only. Governance-only round: no product code touched at closure. Phase 3 as a whole (forward navigation, Section 32, + this remediation, Section 33) is now `CLOSED / PO RUNTIME PASS`. Phase 4 (retire `RouteViolationEvidencePage.jsx`) remains `PLANNED / NOT ACTIVE`, not self-activated by this closure and requiring its own separate, explicit Product Owner authorization. `F13-SHIPMENT-001` not opened; `.claude/`, `Data QLML/`, both stashes confirmed untouched.

Governance state: `PHASE 3 CLOSED / PO RUNTIME PASS`. Claude Code does not self-start Phase 4.

## 34. Phase 4 — Retire RouteViolationEvidencePage.jsx (2026-08-15)

- Status: `PHASE 4 IMPLEMENTED / READY FOR PO RECHECK`
- Authority: "PO AUTHORIZATION — BEGIN F13-STANDARDIZATION-001 PHASE 4" (2026-08-15), baseline `f312fa36` confirmed matching before any edit.

### Dependency discovery performed before deletion

Every source reference to `RouteViolationEvidencePage` was inventoried (`grep -r` across `frontend/` and `backend/`, 13 matches). Categorized:

- **Safe to delete:** `frontend/src/features/route/RouteViolationEvidencePage.jsx` (the component itself) and `RouteViolationEvidencePage.smoke.test.js` (its only test file — only one existed, not the two originally estimated during planning). No other source file imports either; `App.jsx` had already dropped the import in Phase 3.
- **Shared helper, kept:** `routeViolationEvidenceData.js` — `buildBackToRouteRankingLink`, `mapViolationRows`, `buildViolationGroupTabs` are exported from this shared module and consumed by `ShipmentPerformancePage.jsx`/`RoutePerformancePage.jsx` independently of the retired component; untouched.
- **Confirmed independent — the legacy redirect:** `App.jsx`'s `LegacyRouteViolationsRedirect` (governing `/f13/ranking/route/violations`) is implemented purely via `translateLegacyViolationsSearch` and never referenced the retired component, before or after this round.
- **Tests replaced:** the old smoke test (asserted properties of the deleted file's own source text) was replaced by a new `RouteViolationEvidencePage.retired.test.js` — asserts both files no longer exist on disk, `App.jsx` no longer references the retired component, and the legacy redirect route still targets `LegacyRouteViolationsRedirect`.
- **Historical documentation left unchanged:** `PROJECT_PROGRESS.md`, `F13-EVIDENCE-PRODUCT-VALUE-AUDIT_CHECKPOINT_001.md`, and prior sections of this manifest/checkpoint that narrate the retired component's history are untouched, per append-only/frozen-history convention.
- **Comment-only mentions:** `ShipmentPerformancePage.jsx` (explains why a default value matches the old screen) and `backend/src/repositories/FactBuuGuiRepository.js` (names a historical caller in a comment) are prose only, not dependencies — left unchanged; the backend file additionally falls outside this round's authorized scope. `App.jsx`'s own explanatory comment above `LegacyRouteViolationsRedirect` was reworded (no longer describes the retirement as a future event) since Phase 4 is this round.
- **Stash overlap check:** `git stash show --stat` on both stashes confirmed neither touches `RouteViolationEvidencePage.jsx`/its test file (stash@{0}: `F13DashboardService.js`/`.evidenceList.test.js`/`ShipmentEvidenceSummary.jsx`/`ShipmentPerformancePage.jsx`; stash@{1}: a single deleted root-level HTML map file). Neither stash inspected further, applied, or popped.

No ambiguity was found; deletion proceeded without a PO-direction stop.

### What changed

- Deleted: `frontend/src/features/route/RouteViolationEvidencePage.jsx`, `frontend/src/features/route/RouteViolationEvidencePage.smoke.test.js`.
- Added: `frontend/src/features/route/RouteViolationEvidencePage.retired.test.js` (4 tests, see above).
- Modified: `frontend/src/App.jsx` (one comment reworded above `LegacyRouteViolationsRedirect`; no route/import/behavior change).

### Validation

- Full frontend sweep: **331/343 pass** — the same 12 pre-existing failures, confirmed unchanged by name; zero new regressions (343 = 337 baseline − 4 deleted smoke tests + 4 new retirement tests).
- `oxlint`: clean; the repo-wide warning list is byte-identical to before this round (the deleted file's own warnings simply disappear with it; nothing new).
- `vite build`: succeeds — **679 modules transformed, identical to the pre-deletion build**, and the built bundle contains zero occurrences of the string `RouteViolationEvidencePage` (`grep -c` on `dist/assets/*.js` = 0). This confirms the retired file was already unreachable from the build graph since Phase 3's rewire — this deletion is provably zero-impact on the shipped bundle, not just source-tree cleanup.
- Live logic-level verification (Node, real functions, not mocked, post-deletion): the Tuyến Ranking → Evidence link builder, the "Quay lại Tuyến Ranking" back-link builder, and the legacy `/f13/ranking/route/violations` redirect translator were all re-traced end-to-end and still resolve identically to before deletion.
- Runtime access: `admin`+`viewer` roles were never gated by the deleted component — the surviving `/f13/evidence` route and the `LegacyRouteViolationsRedirect` route are both already `admin`+`viewer` (Phase 3), unchanged by this round; no role-gating logic touched.

### Scope discipline

Exactly the 2 files deleted and 2 files touched above. No backend file touched (`git diff --name-only -- backend/` empty). No metric, schema, data, or URL contract changed. Phase 2/3 not reopened; `F13-SHIPMENT-001`/`F13-SURFACE-CLEANUP-PLAN` not opened; `.claude/`, `Data QLML/`, both stashes confirmed untouched (stash contents re-verified identical via `git stash list` before and after).

Governance state: `PHASE 4 IMPLEMENTED / READY FOR PO RECHECK`. Claude Code does not self-close Phase 4 and does not activate another ticket.

### Closure (2026-08-15)

Product Owner performed the runtime recheck at authoritative HEAD `f3dbe1b9` and confirmed: Tuyến Ranking → Evidence navigation works correctly; "Quay lại Tuyến Ranking" works correctly from Tuyến Ranking; the legacy `/f13/ranking/route/violations` URL auto-redirects to Evidence; direct Evidence access and its existing functionality remain normal; deleting `RouteViolationEvidencePage.jsx` caused no runtime regression. `PHASE 4 RUNTIME RECHECK PASS`.

Product Owner authorized governance-only closure: no product code, test, route, or schema change this round. This closes Phase 4 in full. `RouteViolationEvidencePage.jsx` remains permanently retired (deleted in the Phase 4 implementation round, commit `ede4684c`); the `/f13/ranking/route/violations` translating redirect and the Phase 3 forward/return Evidence navigation are confirmed unaffected. `F13-SHIPMENT-001` and `F13-SURFACE-CLEANUP-PLAN` remain unauthorized, not opened by this closure; `.claude/`, `Data QLML/`, both stashes confirmed untouched.

With Phase 4 closed, the Evidence-consolidation delta this manifest has tracked since Section 20 (Sections 20-34: audit → consolidation plan → Phase 1 → Phase 2 → Phase 3 → Phase 4) is now fully complete and closed end-to-end. No phase of this delta remains open. Separately, the original 5-phase `F13-STANDARDIZATION-001` program plan (Section 6: Phase 0 Khóa nền số liệu partially implemented, Phases 1-4 Chuẩn hóa/Điều hành/Pareto/Regression) remains `PLANNED / NOT ACTIVE` and is not authorized or closed by this — it is a distinct, larger scope from the Evidence-consolidation delta's own Phase 1-4 numbering.

**Authoritative state after closure:** no phase of `F13-STANDARDIZATION-001` is currently Product-Owner-authorized for further work. `NO ACTIVE TICKET / AWAITING PO DIRECTION`. `F13-SHIPMENT-001` (`stash@{0}`) and `F13-SURFACE-CLEANUP-PLAN` remain unauthorized and are not self-activated by this closure.

Governance state: `PHASE 4 CLOSED / PO RUNTIME PASS`. Claude Code does not self-activate any further phase or ticket.

## 35. F13-BCVH-RANKING-OVERVIEW-01 — BCVH Ranking Overview Delta, Design of Record (2026-08-28)

Append-only delta. Sections 1-34 are unchanged. This section activates a **new, separately scoped
delta** on the F1.3 BCVH Ranking module. It does **not** reopen `F13-BCVH-RANKING-REDESIGN-IMPL`
(`COMPLETED / PO PASS / CLOSED`, 2026-07-29), and it does **not** activate any phase of the original
five-phase program in Section 6, which remains `PLANNED / NOT ACTIVE`.

### Ticket

- Ticket ID: `F13-BCVH-RANKING-OVERVIEW-01`
- Ticket Name: BCVH Ranking Overview (T01 → hiện tại)
- Phase: `F1.3 Operational Module` — additive overview delta
- Current state: `DESIGN OF RECORD APPROVED / READY FOR IMPLEMENTATION`
- Activation authority: Product Owner approved the full recommendation package on `2026-08-28`
- Owner: Claude Code (backend, integration, tests, documentation, Git per `DEC-020`);
  Antigravity (frontend/UI/responsive and Windows runtime evidence)
- PO UI Check Required: `Yes`
- Branch: `codex/da-impl-006` · Baseline HEAD at authoring: `d1179155`

### Design of record

`docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-RANKING-OVERVIEW-01_DESIGN.md` is the single design of
record for this delta: objective, the five blocks, time rules, the overview API contract, measured
performance, file scope, the three-phase split, test plan, acceptance criteria and real-data risks.

### Problem

Operation Dashboard F1.3 forces the Product Owner to select one BCVH at a time before any history is
visible, so no surface answers the operational question "from T01/2026 to now, which of the 6 BCVH
are trending down". This delta adds four overview blocks above the existing daily ranking table,
inside the BCVH Ranking module.

### PO decisions approved (2026-08-28)

1. Months with missing data are still displayed, with a day-coverage badge.
2. Anchor date = `min(N-1, max_date having data)`.
3. The route block is computed on MTD and labelled `Tuyến có phát sinh trong kỳ`.
4. Route bands keep the existing `70/60/50` thresholds.
5. Exactly the 6 canonical BCVH.
6. Rate is the primary figure; volume is secondary.
7. Fix the TỔNG CỘNG row, which can currently sum three non-canonical codes — before or with the
   backend phase.
8. `D-1`/`D-7` are comparisons only, never called alerts.
9. The existing daily ranking table is kept unchanged.

### Verification performed before design (read-only, real code and real database)

- MTD fields already exist in `/f13/ranking/bcvh` (`F13DashboardService.js:881-891`); only
  `month_to_date_rank` is missing.
- `route_distribution` already aggregates over a **date range** with per-route de-duplication
  (`getFactBetween` → `_buildRouteDistributionMap` → `_buildRouteDistributionSummary`), so an MTD
  route period costs nothing in formula terms.
- `D-1`/`D-7` carry no thresholds and no severity anywhere in backend or frontend — decision 8
  confirms the current state and forbids regression.
- No existing chart supports 6 series: `TrendChart.jsx` is hardcoded single-series and
  `QualityDeliveryTrendlineAdapter.jsx` self-fetches and hardcodes `TARGET_RATE = 90`, while real
  monthly rates run 61.26% (T01) → 50.47% (T08). A new component is required; `recharts ^3.9.0` is
  already present, so no new library is.
- `getFactBetween` for one month measured **96,305 rows / 3,679 ms / 431 MB heap** — the reason the
  existing endpoint is not extended to a month range.
- `/f13/dashboard/quality-timeline` already produces `monthlyYtd` but accepts one `ma_bcvh` per call
  and always runs an extra 90-day daily query — the N+1 source that the new contract avoids.
- Real database holds 9 `ma_bcvh` values: the 6 canonical plus `531600` (738 rows), `531110` (16),
  `531120` (2). Frontend filters canonical in its mapper, so the 6 BCVH rows are correct and only the
  TỔNG CỘNG row is wrong — decision 7.
- February 2026 is missing days 17 and 18, and per-BCVH day coverage that month is uneven
  (21-24 of 26 available days), while August 2026 is a complete 27/27 for all six — so a PO UI check
  on the current month cannot detect the coverage defect. This is why decision 1's badge is a
  correctness requirement, not decoration.

### Contract

New read-only endpoint `GET /api/f13/ranking/bcvh/overview?anchor_date=YYYY-MM-DD`, behind
`allowViewerRead`, serving all four new blocks in one call via **exactly four fixed aggregate
queries** (`monthly` 48 rows, `daily` 162, `mtd` 6, `routes` 119 — measured), independent of the
number of BCVH. Canonical filtering happens in SQL; the denominator is `COUNT(ma_bg)` with
`danh_gia_2026 = 'Đạt'`, matching the existing ranking definition; `getBcvhRanking()` is not modified
beyond the decision-7 total-row fix; and no response key is named `alert`, `warning` or `risk`.

Measured total: **~2.96 s, 5 MB heap** cold, against 3.7 s / 431 MB for a single month on the rejected
path. `Q1` alone accounts for 2,250 ms because the existing covering index
`(ngay_do_kiem, ma_bcvh, ket_qua_f13)` does not cover `danh_gia_2026` or `ma_bg`
(`EXPLAIN QUERY PLAN` confirms a fallback to `idx_bcvh_ngay`). Closing that gap needs a new index,
which is a schema change **outside this ticket** and recorded as `RISK-PERF-01`; substituting
`ket_qua_f13` to exploit the existing index is forbidden because it changes the formula.

### Phasing

- `Phase B1` — Backend (Claude Code / Sonnet): decision-7 total-row fix, new route/handler,
  `bcvhOverviewService.js`, four repository aggregates. No schema, no migration, no database write.
- `Phase F1` — Frontend (Antigravity): one new chart component, four block components, one mapper,
  and a single insertion into `BcvhRankingPage.jsx` above the existing table.
- `Phase I1` — Integration (Claude Code / Sonnet): wiring, full regression against the known baselines
  (backend 256/260, frontend 7 pre-existing failures), re-measured performance, documentation sync,
  stopping at `READY FOR PO CHECK`.

Per `CLAUDE.md` §2, the Opus session that authored the design does not also self-review the
implementation.

### Governance state

`F13-BCVH-RANKING-OVERVIEW-01 DESIGN OF RECORD APPROVED / READY FOR IMPLEMENTATION`. This section is
documentation-only: no code, database, schema or API changed by it. `Phase B1` is authorized by the
Product Owner's approval of the recommendation package but is not executed here. Claude Code does not
self-award PO PASS and does not activate any other ticket.

## 36. F13-BCVH-RANKING-OVERVIEW-01 — Design-of-Record Remediation R1 (2026-08-28)

Append-only delta. Sections 1-35 are unchanged, Section 35 included. This section records a
documentation-only remediation of two internal contradictions Claude/CTO found in the design of
record as first published at commit `66f3b884`. No product decision changed: PO decisions 1-9 from
Section 35 stand exactly as approved, and no new PO approval was required.

### R1-A — One request vs lazy-fetch

The design specified in §5 that a single request to `/f13/ranking/bcvh/overview` returns all four
arrays (`monthly`, `daily`, `mtd`, `routes`), but three other places contradicted it: §3.2 described
the Daily block as lazy-fetching on first expand, §6 counted that as a performance mitigation, and
frontend test `F2` asserted that no request is issued while the block is collapsed.

**Binding rule after remediation:** one request loads all four arrays. The Daily block's collapsed
state is **UI-only**; expanding or collapsing it issues no additional request. Every mention of
lazy-fetch, and the test asserting no-fetch-while-closed, is removed.

No performance consequence: the measured ~2.96 s in §6 was always taken with `Q2` running, so
dropping lazy-fetch does not slow anything down — it removes a mitigation that was never counted
toward the `<= 3.2 s` acceptance bar.

Remediated in the design of record at: §3 (layout principle, now separating data loading from render
state), §3.2, §6, §8.3 `F2` (inverted to assert the single request and that toggling issues none),
and `AC-13`.

### R1-B — Does a month with missing days return a null rate?

PO decision 1 and §3.1/§4.4(c) required a month with missing data to still display its rate with a
day-coverage badge, but test `T4` required "month with missing days -> `rate` returns `null`", which
would have forced an implementation that violates the approved PO decision.

**Binding rule after remediation** — the null condition depends on the **denominator only**, never on
how many days are missing:

- Partial data with denominator `> 0`: the rate **is still computed**; `days_with_data` and
  `days_in_period` are returned and the coverage badge is shown.
- No records at all, or denominator `= 0`: `rate = null` and the UI shows an em dash.
- `days_with_data` / `days_in_period` are **always** returned, including when `rate` is `null`.

Remediated in the design of record at: §3.1, §4.4 (the three-state table rewritten around the
denominator, with explicit `rate` and `days_*` columns), §5.2 (response sample annotated), §8.1
(`T4` split into `T4a` denominator > 0 still computes, and `T4b` denominator = 0 returns null),
§8.3 `F4`, §9.1 (cross-reference retargeted to `T4a`), and `AC-12`.

This contradiction was easy to miss because August 2026 has a complete 27/27 day coverage for all six
BCVH, so a PO UI check on the current month never exercises the partial-coverage branch — `T4a` is
the only guard, as already recorded under `RISK-DATA-01`.

### Scope and state

Documentation-only: no code, database, schema or API change in this remediation round. The design of
record now carries `Revision: R1 (2026-08-28)` and a §12 remediation log holding the same two
records in full. Governance state is unchanged:
`F13-BCVH-RANKING-OVERVIEW-01 DESIGN OF RECORD APPROVED / READY FOR IMPLEMENTATION`, `Phase B1` not
executed, `PO UI Check Required = Yes`, and Claude Code does not self-award PO PASS.

## 37. F13-BCVH-RANKING-OVERVIEW-01 — Phase B1 Backend Implementation Candidate (2026-08-28, Codex authorized by PO)

Append-only delta. Sections 1-36 are unchanged. Product Owner explicitly authorized Codex to execute
Phase B1 after Claude Code quota became constrained.

### Implemented scope

- Added read-only `GET /api/f13/ranking/bcvh/overview` behind the existing admin/viewer read gate.
- Added exactly four aggregate repository calls for `monthly`, `daily`, `mtd`, and `routes`; every
  SQL query filters the six canonical BCVH codes before aggregation and never returns raw fact rows.
- Applied the R1 rules: `anchor_date = min(N-1, latest available data)`, monthly partial coverage
  keeps a computed rate when `COUNT(ma_bg) > 0`, zero denominator returns `null`, Daily is returned in
  the same response, MTD ranking uses rate then volume, and route bands retain `70/60/50`.
- Corrected the existing Ranking `TỔNG CỘNG` calculations so current, MTD, previous MTD, D-1, D-7,
  route distribution, and delayed-cash totals are derived only from canonical BCVH inputs. The
  existing single-day request contract and returned detail rows are unchanged.
- No frontend, schema, migration, formula, SSOT, import, Portal, queue, or business-data write.

### Validation completed in Codex environment

- New service and SQL tests: **7/7 PASS**; combined with the existing single-day contract:
  **10/10 PASS**. The SQL itself ran against Node's isolated in-memory SQLite, covering canonical
  filtering, four aggregates, partial coverage, zero denominator, route de-duplication, anchor rules,
  rank ties, route thresholds, and forbidden response keys.
- `node --check` clean on every touched backend source; `git diff --check` clean; zero NUL bytes in
  touched files. The pre-existing dirty reference HTML remains untouched and excluded.
- The repository carries a Windows `node_sqlite3.node` DLL. On this Linux Codex runner, Gate 5 and
  `DashboardController.dateFilterRemediation.test.js` stop at `ERR_DLOPEN_FAILED / invalid ELF
  header` before test collection; this is an environment incompatibility, not a test assertion.

### Required Windows validation before Phase F1

This commit is an **implementation candidate**, not final Phase B1 Technical PASS. On the canonical
PO Windows workspace, run Gate 5 11/11 unchanged, the date-filter regression, the new overview tests,
the full backend baseline comparison, and a read-only benchmark against a verified backup of the
real database. Confirm the endpoint is `<= 3.2 s` and heap `<= 50 MB`. Phase F1 must not begin until
that independent evidence passes. PO UI Check is not yet reachable and no PO PASS is claimed.

## 38. F13-BCVH-RANKING-OVERVIEW-01 — Phase B1 Technical PASS / READY FOR F1 (2026-08-28)

Append-only delta. Sections 1-37 are unchanged. The required canonical Windows validation has now
closed the one real B1 blocker: overview latency.

### Performance remediation and plan evidence

- Q1 monthly previously scanned `fact_f13` once for the monthly aggregate and again for
  `global_days`. It now materializes `day_bcvh` at `(ngay_do_kiem, ma_bcvh)` grain once, preserving
  `COUNT(ma_bg)` and the `danh_gia_2026` formula, then reuses that CTE for both month totals and
  `days_in_period` / `days_with_data` coverage. Q3 MTD uses the same bounded day-plus-BCVH approach
  across current and comparable prior-month dates, so current and prior MTD no longer scan the fact
  table separately.
- `EXPLAIN QUERY PLAN` on the verified B1 backup shows one fact access for Q1's materialized
  `day_bcvh`: `SEARCH fact_f13 USING INDEX idx_bcvh_ngay (ma_bcvh=? AND ngay_do_kiem>? AND
  ngay_do_kiem<?)`. The remaining scans are the small materialized CTE, not a second fact-table scan.
- The SQLite connection now applies `mmap_size = 268435456` and `threads = 4`. These are
  per-connection read-performance settings only; no schema, index, migration, or database data is
  changed.

### Required validation evidence

- Backup: `backend/src/db/backups/database.pre-bcvh-overview-B1.sqlite`, opened with
  `sqlite3.OPEN_READONLY`; `PRAGMA integrity_check = ok`.
- Three independent overview-service benchmark processes at `anchor_date=2026-08-27`:
  **2102.09 ms / 0.42 MB**, **2088.17 ms / 0.42 MB**, and **2191.90 ms / 0.42 MB** heap delta.
  Maximum is **2191.90 ms <= 3200 ms** and maximum heap delta is **0.42 MB <= 50 MB**.
- Response shape is unchanged: `monthly=48` (8 months x 6), `daily=162` (27 days x 6), `mtd=6`,
  `routes=6`. Every month, every day, MTD, and routes period has exactly six unique canonical
  `ma_bcvh` values.
- Overview SQL/service tests: **7/7 PASS** (run with Node's SQLite experimental flag required by
  this Node 22 runtime). Existing single-day/date-filter regression:
  `DashboardController.dateFilterRemediation.test.js` **9/9 PASS**. Gate 5:
  `test_autoBackfillSafety.js` **11/11 PASS**, file not modified.
- Full backend `node --experimental-sqlite --test`: **263/267 PASS**. The four failures match the
  recorded unrelated baseline: two pre-existing localhost/IPv6 fetch failures in
  `DashboardController.r6.integration.test.js`, the live-KPI recovery assertion in
  `DashboardController.recovery.test.js`, and the monthly-rank source assertion in
  `timelineService.recovery.test.js`. No new failure is introduced.

### State

`F13-BCVH-RANKING-OVERVIEW-01 PHASE B1 TECHNICAL PASS / READY FOR F1`. Phase F1 remains the
Antigravity-owned frontend phase; no frontend work, PO UI check, PO PASS, Portal action, import,
queue write, or business-data write occurred here. The backend process must be restarted before the
frontend phase or PO runtime checking so the per-connection SQLite settings and endpoint code load.

## 39. F13-BCVH-RANKING-OVERVIEW-01 — Phase F1 Frontend Implementation & Verification (2026-08-28)

Append-only delta. Sections 1-38 are unchanged. Antigravity executed and verified Phase F1 frontend.

### Implemented Scope (Phase F1)
- `frontend/src/features/ranking/bcvhOverviewData.js`: Grouping and mapper helper for flat `monthly` and `daily` API arrays into 6 canonical BCVH units.
- `frontend/src/features/ranking/BcvhMultiSeriesTrendChart.jsx`: Recharts 6-series line chart with dynamic Y-axis domain, custom legend toggle, and `connectNulls` config.
- `frontend/src/features/ranking/BcvhRankingOverviewBlocks.jsx`: 4 overview blocks (MTD Summary, Monthly Trend & Table, Operational Route Capacity, Daily Trend collapsed details).
- `frontend/src/features/ranking/BcvhRankingPage.jsx`: Mounted overview fetch (exactly 1 request per `anchor_date`), error/retry state, and vertical layout placement above single-day ranking.
- `frontend/src/features/ranking/bcvhOverviewData.test.js`: Automated unit test suite verifying overview contract and data transformation.
- No backend, API, SQL, schema, Operation Dashboard F1.3, or existing single-day ranking behavior modified.

### Technical & Automated Validation
- Overview unit tests (`bcvhOverviewData.test.js` and `BcvhRankingPage.singleDayContract.test.js`): **8/8 PASS**.
- Full frontend test suite run against baseline: 0 regressions introduced.
- `oxlint`: Clean (0 errors, 28 pre-existing warnings).
- `vite build`: SUCCESS (`dist/assets/index-CWI2wSen.js` built in 2.16s).
- Verified 0 NUL bytes in all touched files.

### State
`F13-BCVH-RANKING-OVERVIEW-01 PHASE F1 IMPLEMENTED / READY FOR PO UI CHECK`.

## 40. Phase F1 - Remediation R1 (2026-08-28)

- **Date**: 2026-08-28
- **Task**: F13-BCVH-RANKING-OVERVIEW-01 Frontend Remediation R1
- **Action**: Fix data mapping logic (meta layer extraction) and API request guard on empty toDate.
- **Changes**:
  - Created `frontend/src/features/ranking/bcvhOverviewFetcher.js` to manage Overview API calls, preventing fetch on empty `toDate` and deduping responses.
  - Created `frontend/src/features/ranking/bcvhOverviewFetcher.test.js` covering orchestration rules and race condition avoidance.
  - Corrected `meta` extraction to map from `response.data.data.meta` rather than `response.data.meta`.
  - Updated `BcvhRankingPage.jsx` to use `createOverviewFetcher`.
  - Updated `bcvhOverviewData.test.js` to assert the contract with the new fetcher.
- **Verification**:
  - Lint passed (0 errors, 30 warnings)
  - Production Vite build passed (1.45s)
  - Unit tests passed (12/12 overview tests, asserting true component contract and deduplication).

## 41. Phase F1 - Remediation R2 Verification Closure (2026-08-28)

- Removed the three remaining trailing-whitespace characters reported by the diff check in
  `bcvhOverviewFetcher.js:11`, `bcvhOverviewFetcher.test.js:105`, and
  `bcvhOverviewFetcher.test.js:135`; no formatting or functional change was made.
- The fetcher ignores stale responses and stale errors from older requests. This is response/error
  staleness handling, not request deduplication.
- The tests directly exercise the request-orchestration module and its stale-result behavior; they
  do not claim to be component-render tests.
- No files outside the two fetcher files and this manifest were touched. Existing out-of-scope data
  remains in history and awaits a separate Product Owner decision; no history rewrite or force-push
  was performed.

## 42. Phase F1 PO UI Remediation R3 — Scope Cleanup (2026-08-28)

Append-only delta. Sections 1-41 are unchanged.

### What R3 fixed in the UI

- Block order on `/f13/ranking/bcvh` is now: Daily trend → the existing KPI widgets/route-band
  summary → the D-1/D-7 daily ranking table (Khối 5, unchanged) → MTD summary → Monthly trend →
  Route capacity.
- The Daily block (`BcvhDailyTrendBlock` in `BcvhRankingOverviewBlocks.jsx`) renders as
  `<details open>` — expanded by default. Toggling it open/closed is a native `<details>`/`<summary>`
  interaction; it triggers no additional network request. Data for all overview blocks, including
  Daily, is still loaded by the single `createOverviewFetcher` request per `anchor_date`
  (`bcvhOverviewFetcher.js`, unchanged from baseline — see below), consistent with the
  `F13-BCVH-RANKING-OVERVIEW-01` design of record's one-request contract.
- The MTD table header is standardized to `Sản lượng MTD / Đạt MTD / Không đạt MTD / Tỷ lệ MTD`.
- The MTD, Monthly and Route tables received readability styling (row emphasis, right-aligned numeric
  columns, bold rate column) — presentation only, no change to the underlying values or their source
  fields.
- No API contract or data formula changed by R3: `bcvhOverviewFetcher.js`'s request shape, the
  `/f13/ranking/bcvh/overview` contract, and `bcvhOverviewData.js`'s field mapping are all unchanged
  from the `F13-BCVH-RANKING-OVERVIEW-01` design of record.

### What went wrong between R2 and this commit, and what this commit fixes

- Intermediate commit `c36a283` (style remediation) pulled in files outside the R3 UI scope alongside
  its legitimate `BcvhRankingOverviewBlocks.jsx` / `BcvhRankingPage.jsx` / `bcvhOverviewData.test.js`
  changes.
- The subsequent cleanup at commit `4437393` regressed two things while trying to correct that:
  - It dropped Section 41 (the R2 verification closure record) from this manifest instead of
    preserving it.
  - It reintroduced the trailing whitespace in `bcvhOverviewFetcher.js` and
    `bcvhOverviewFetcher.test.js` that Section 41 had already removed, so both files stopped being
    byte-identical with the pre-R3 baseline commit `6d2c0808`.
  - Net effect: the delta between baseline `6d2c0808` and `4437393` covered 6 files instead of the
    4 legitimate R3 files.
- This commit restores both fetcher files to be byte-identical with baseline `6d2c0808` again (no
  functional or formatting change beyond removing the whitespace regression), restores this manifest
  file to be byte-identical with `6d2c0808` for Sections 1-41, and appends only this Section 42. The
  final delta against `6d2c0808` is exactly the 4 files this section's title names:
  `F13-STANDARDIZATION-001_MANIFEST.md`, `BcvhRankingOverviewBlocks.jsx`, `BcvhRankingPage.jsx`, and
  `bcvhOverviewData.test.js`.

### Scope discipline

No backend file touched. No `networkMap`, `Data QLML/`, `.claude/`, HTML/Excel, patch, or export
script staged or committed by this round — any such files present in the working tree belong to
unrelated in-progress work and were left untouched. No history rewrite, no force-push, no reset,
rebase or amend was performed; this is a forward-only commit.

Governance state: `PHASE F1 PO UI REMEDIATION R3 SCOPE CLEANUP COMPLETE / READY FOR PO UI CHECK`.
Claude Code does not self-award PO PASS on this round; the Product Owner must restart the frontend
dev server and perform a fresh UI check before any acceptance is recorded.

## 43. BCVH Ranking Monthly Heatmap — Reuse Operation Dashboard's Absolute Band SSOT (2026-08-28)

Append-only delta. Sections 1-42 are unchanged. This supersedes any earlier, cancelled proposal to
classify the BCVH Ranking monthly heatmap by delta-from-monthly-average — the Product Owner
explicitly cancelled that approach; it is not implemented anywhere in this delta.

### What was verified before touching any file

- Operation Dashboard's absolute classification lives in
  `frontend/src/features/dashboard/components/operatingPatternTabsData.js`:
  `APPROVED_WEEKDAY_BANDS` (green `>=70` / pink `60-70` / yellow `50-60` / red `<50`) and
  `getApprovedWeekdayBand(rate)` (returns `{ id, label, tone }`, with `tone: 'unavailable'` for a
  `null`/`undefined` rate). This is a separate classification from `HEATMAP_RELATIVE_BANDS`
  (delta-from-monthly-average — used only by Operation Dashboard's day-level Heatmap tab and left
  untouched by this delta).
- The border/background/text CSS classes for `band-green`/`band-pink`/`band-yellow`/`band-red`/
  `unavailable` were declared locally inside
  `frontend/src/features/dashboard/components/OperatingPatternTabsCard.jsx`'s `TONE_CLASS`/
  `TONE_BAR` objects (alongside unrelated `on-target`/`below-target`/`relative-*` tones used by that
  card's other tabs), not exported anywhere reusable.
- `timelineService.js` (backend) was read only to confirm the `/f13/dashboard/quality-timeline`
  contract that feeds `APPROVED_WEEKDAY_BANDS`'s consumer; no backend file was modified.

### What changed

- `operatingPatternTabsData.js`: added two new exports, `HEATMAP_BAND_TONE_CLASS` and
  `HEATMAP_BAND_DOT_CLASS`, holding exactly the five `band-green`/`band-pink`/`band-yellow`/
  `band-red`/`unavailable` class strings that were previously inline in the card component. This
  file is now the single source of truth for both the absolute band thresholds
  (`APPROVED_WEEKDAY_BANDS`/`getApprovedWeekdayBand`) and their colors.
- `OperatingPatternTabsCard.jsx`: its local `TONE_CLASS`/`TONE_BAR` objects now spread in
  `HEATMAP_BAND_TONE_CLASS`/`HEATMAP_BAND_DOT_CLASS` instead of repeating the five key/value pairs
  inline; the `on-target`/`below-target`/`relative-*` entries (unrelated to this SSOT) stay local.
  Verified byte-for-byte before and after: for every one of the 12 tone keys in both objects, the
  resulting string is identical to what rendered before this change — Operation Dashboard's UI is
  provably unaffected.
- `frontend/src/features/ranking/BcvhRankingOverviewBlocks.jsx` (`BcvhMonthlyTrendBlock`'s "Chi tiết
  số liệu theo tháng" table): replaced the locally re-declared `if (m.rate >= 70) ... else if
  (m.rate >= 60) ... else if (m.rate >= 50) ... else ...` threshold block and its own
  `bg-emerald-50/60`/`bg-fuchsia-50/60`/`bg-amber-50/60`/`bg-rose-50/60` colors with
  `getApprovedWeekdayBand(m.rate)` + a `HEATMAP_BAND_TONE_CLASS[band.tone]` lookup — the cell now
  carries the exact same border/background/text classes Operation Dashboard uses for the same band.
  The table's legend row (previously "Tỷ lệ tháng / Sản lượng / Độ phủ") is replaced with the 5
  Product Owner-specified band descriptions (Xanh/Hồng/Vàng/Đỏ/Xám), using
  `HEATMAP_BAND_DOT_CLASS` for the legend swatches.
- Per cell, unchanged and still present: the month's rate, its volume, the day-coverage badge when
  a month is only partially covered, and the "Lũy kế" label on the current month's column header.
- Not touched by this delta: `rate` values, the daily ranking table's route/threshold classification,
  the 6-BCVH trend-line color palette (`BCVH_COLORS` in `bcvhOverviewData.js`, a distinct concern
  from heatmap band colors per the Product Owner's explicit instruction), any backend file, any API
  contract, and Operation Dashboard's day-level Heatmap tab (still on `HEATMAP_RELATIVE_BANDS`).
- New test file `frontend/src/features/ranking/BcvhRankingOverviewBlocks.heatmapBand.test.js` (16
  tests): the required boundary cases (`70`→`band-green`, `69.99`→`band-pink`, `60`→`band-pink`,
  `59.99`→`band-yellow`, `50`→`band-yellow`, `49.99`→`band-red`, `null`→`unavailable`), that both
  components import the one shared helper/catalog, that `HEATMAP_RELATIVE_BANDS` never appears in
  Ranking, that the old inline thresholds are gone, that a `null` rate still renders `—`, that the
  legend text matches the Product Owner's exact wording, that rate/volume/coverage/"Lũy kế" survive
  in each cell, that the BCVH trend-line palette is untouched, and that Operation Dashboard's
  `TONE_CLASS`/`TONE_BAR` values are unchanged after the extraction.

### Validation

- New Heatmap SSOT suite: 16/16 pass.
- The 12 pre-existing BCVH Overview tests (`bcvhOverviewData.test.js`,
  `bcvhOverviewFetcher.test.js`, `BcvhRankingPage.singleDayContract.test.js`): 12/12 pass, unchanged.
- Operation Dashboard-related suite (all `frontend/src/features/dashboard/**/*.test.js`, 112 tests):
  109/112 pass — the same 3 pre-existing failures confirmed unchanged by name via `git stash` against
  this delta's two dashboard-file changes (`only canonical values remain selectable...`,
  `operation dashboard hides status filter...`, `dashboard page removes shell...`); zero regressions.
- Full frontend sweep (370 tests): 358/370 pass — the same 12 pre-existing failures by name (the 3
  above plus 8 pre-existing Route Ranking/Route Performance failures and 1 pre-existing
  `dataImportBackfillQueue.test.js` failure), zero new regressions; net +16 tests from this delta.
- `oxlint`: 0 errors (pre-existing warnings only, none newly introduced by the touched files).
- `vite build`: succeeds, 700 modules.
- No backend, database, schema, or API file touched; no networkMap/`Data QLML`/`.claude`/patch/export
  file staged or committed; the Product Owner's other unrelated dirty/untracked files were left alone
  throughout (verified via `git stash`/`git stash pop` producing no diff outside the touched files).

### Scope

`frontend/src/features/dashboard/components/operatingPatternTabsData.js`,
`frontend/src/features/dashboard/components/OperatingPatternTabsCard.jsx`,
`frontend/src/features/ranking/BcvhRankingOverviewBlocks.jsx`,
`frontend/src/features/ranking/BcvhRankingOverviewBlocks.heatmapBand.test.js`, and this manifest.

Governance state: `BCVH RANKING MONTHLY HEATMAP SSOT REUSE COMPLETE / READY FOR PO UI CHECK`. Claude
Code does not self-award PO PASS on this round; the Product Owner must restart the frontend dev
server and perform a fresh UI check on both `/f13/ranking/bcvh` and Operation Dashboard before any
acceptance is recorded.

## 44. F1.3 Heatmap Absolute Color SSOT - Single Catalog Across BCVH Ranking and Operation Dashboard (2026-08-28)

Append-only delta. Sections 1-43 are unchanged. This supersedes Section 43's scope description
in one respect: it was Operation Dashboard's weekday tab whose colors BCVH Ranking reused
there; this round makes the absolute band the only color rule anywhere in F1.3 Heatmap
surfaces, and moves the real threshold/color definitions into one new, neutral catalog module
that both features import - no relative-to-average classification decides color anywhere any
more.

### Product Owner decision

Every F1.3 Heatmap - BCVH Ranking's monthly heatmap and Operation Dashboard's Heatmap tab and
weekday ("Theo thu") tab - classifies color from the rate itself, using one absolute band set
(green >=70 / pink 60-70 / yellow 50-60 / red <50 / gray for no data). Color is never derived
from a delta against a monthly (or any other) average. Average-comparison data may still be
shown as numbers, arrows, tooltips, or secondary stats - it must never select color.

### New shared catalog

`frontend/src/components/f13/f13HeatmapBandCatalog.js` - a pure module (no React, no fetch, no
`localStorage`) exporting:

- `F13_HEATMAP_BANDS` - the 4 ordered bands, `min`/`max` exclusive-upper except the top band
  (`max: Infinity`, so a rate of exactly 100 is provably green rather than relying on a
  fallback).
- `F13_HEATMAP_UNAVAILABLE_BAND` - `{ id: 'unavailable', label: 'Xam', tone: 'unavailable' }`.
- `classifyF13HeatmapRate(rate, bands = F13_HEATMAP_BANDS)` - the classifier; accepts a `bands`
  override so a future Admin screen can plug in a different set without this module or its
  callers changing. No Admin UI, API, or persisted config is added by this ticket - the
  parameter only prepares for one, and there is no `localStorage` anywhere in the module.
- `F13_HEATMAP_TONE_CLASS` / `F13_HEATMAP_DOT_CLASS` - cell and legend-dot Tailwind classes,
  keyed by tone.
- `F13_HEATMAP_HEX_COLOR` - raw hex equivalents, for contexts that render raw SVG (a recharts
  `<Line>` per-point dot `fill`) where a Tailwind `bg-*` utility class has no effect (`fill` is
  a different CSS property than `background-color`).
- `F13_HEATMAP_LEGEND` - the 5 legend entries (4 bands + unavailable) with the Product
  Owner-approved Vietnamese wording.
- Deprecated aliases `APPROVED_WEEKDAY_BANDS` / `getApprovedWeekdayBand(rate, backendColor)` -
  kept only so existing imports keep resolving; both are built from the real
  `F13_HEATMAP_BANDS`/`classifyF13HeatmapRate`, so there is exactly one real threshold/color
  source, not two. New code must not pass `backendColor` - see the backend-trust decision
  below.

### `operatingPatternTabsData.js` - no longer a second real source

Its own local `APPROVED_WEEKDAY_BANDS`, `HEATMAP_BAND_TONE_CLASS`, `HEATMAP_BAND_DOT_CLASS`,
and `getApprovedWeekdayBand()` (added in Section 43) are removed; the file now imports from and
re-exports the catalog's names (plus the legacy `HEATMAP_BAND_TONE_CLASS`/
`HEATMAP_BAND_DOT_CLASS` aliases) so `OperatingPatternTabsCard.jsx` and BCVH Ranking's
`BcvhRankingOverviewBlocks.jsx` (Section 43, untouched this round - its import path and
16-test regression suite still pass because the re-exported names behave identically) keep
working unmodified.

- `mapWeeklyPattern()`: now calls `classifyF13HeatmapRate(rate)` instead of
  `getApprovedWeekdayBand(rate, item?.color)` - a backend-supplied `color` is never trusted to
  override the frontend classification (Section 5 of the ticket).
- `mapHeatmapPattern()` (the day-level Heatmap tab data): `targetTone`/`bandLabel` now come
  from `classifyF13HeatmapRate(rate)`, not `getHeatmapRelativeBand(deltaFromMonthAverage)`.
  `deltaFromMonthAverage`, `monthAverage`, and `dod` are still computed and returned on every
  day - nothing analytical was deleted, only its role in choosing color.
  `HEATMAP_RELATIVE_BANDS`/`getHeatmapRelativeBand()` remain exported and fully functional as
  standalone analytical helpers (still exercised directly by their own regression test); they
  are simply no longer wired into cell color.

### `OperatingPatternTabsCard.jsx`

- Heatmap tab: day cells already read color from `day.targetTone` (unchanged JSX), which is
  now absolute after the mapper change above - two days with the same rate render the same
  color regardless of their month's average (regression-tested). Legend heading changed from
  "So sanh voi KPI trung binh thang" to "Mau Heatmap theo nguong chat luong", and its body
  changed from `HEATMAP_RELATIVE_BANDS` to the same absolute band list the weekday tab uses,
  via a new shared `AbsoluteBandLegendBody` component with the Product Owner's exact wording
  (Xanh: KPI tu 70% tro len, Hong: KPI tu 60% den duoi 70%, Vang: KPI tu 50% den duoi 60%, Do:
  KPI duoi 50%, Xam: Chua co du lieu). Tooltip/detail text is untouched - it already showed
  date, rate, delta-from-average, and rank (`buildHeatmapDayDetailText`).
- "Theo thu" (weekday) tab: legend heading changed to "Mau diem KPI theo nguong chat luong"
  (same `AbsoluteBandLegendBody`). The volume bar keeps its fixed blue fill unconditionally
  (never recolored by KPI quality - verified by a regression test counting exactly one `<Bar>`
  element). The rate line's stroke is now neutral slate (`#64748B`) instead of a fixed
  emerald - it no longer defaults to reading as "good" - and each point's dot is a new
  `KpiQualityDot` component whose `fill` comes from
  `F13_HEATMAP_HEX_COLOR[classifyF13HeatmapRate(payload?.rate).tone]`, sized `r=6` (`r=9`
  active) to be clearly visible. The month tab's line/dot are byte-for-byte unchanged (still
  the fixed emerald stroke) - this delta is scoped to the weekday tab only. `ComboTooltip` now
  shows an additional "Nhom mau/chat luong" line when the point carries a `bandLabel` (weekday
  rows only; month rows never set it, so their tooltip is unaffected).
- `HeatmapManagementSummary`'s `>TB`/`<TB` stat cards: recolored from `emerald-200/emerald-50`
  and `amber-200/amber-50` (which read as band-green/band-yellow) to neutral slate, per the
  Product Owner's explicit instruction not to let these counts imply a quality classification
  they are not. `TB thang`/`Tot nhat`/`Thap nhat` stat cards are unchanged (not named in the
  ticket's neutral-color requirement).

### Section 5 audit - other F1.3 Heatmap components (read-only, no code changed)

Traced from `App.jsx`'s actual routes, not assumption:

- `frontend/src/features/dashboard/DashboardPage.jsx` (routed at `/f13/dashboard`, Operation
  Dashboard) renders exactly one Heatmap-capable component: `OperatingPatternTabsCard.jsx`
  (edited above). No other live component renders a Heatmap.
- `frontend/src/pages/F13Dashboard.jsx` is not referenced anywhere in `App.jsx` or
  `frontend/src/navigation/appNavigation.jsx` (`grep` confirms zero route/import references) -
  it is retired/unreachable.
- `frontend/src/features/dashboard/components/QualityTimelineAdapter.jsx` is imported by
  nothing except its own test file - also unreachable from any route.
- `frontend/src/components/f13/QualityTimelinePanel.jsx` is imported only by the two retired
  files above - unreachable from any route. It does have the exact defect the ticket warns
  about: its local `getStatusColor()` maps `pink` and `yellow` to the same color
  (`DASHBOARD_SEMANTIC_COLORS.warning`) and trusts a backend `color`/`entry.color` field
  directly for cell fill. Per the ticket's explicit instruction ("Neu component da
  retired/khong duoc render: khong tu sua rong; ghi bang chung"), this file was not modified -
  this paragraph is the evidence record. If `QualityTimelinePanel.jsx` is ever reactivated,
  migrating it to `classifyF13HeatmapRate()`/`F13_HEATMAP_TONE_CLASS` is required before it
  renders again.

### Test plan

- New `frontend/src/components/f13/f13HeatmapBandCatalog.test.js` (20 tests): the required
  boundary cases including `100`->green and `0`->red, `null`/`undefined`/`NaN`->unavailable, a
  numeric-string rate, pink/yellow never sharing a tone or color, every tone having a tone
  class/dot class/hex color, the exact PO legend wording, a custom-`bands` override leaving the
  default catalog untouched (Admin-readiness), a custom bands array that doesn't cover a rate
  falling back to unavailable, frozen/non-persisted data (no `localStorage` in this module),
  and the deprecated-alias/new-catalog consistency check.
- `frontend/src/features/dashboard/components/operatingPatternTabsData.test.js`: 3 pre-existing
  tests updated to match the PO-mandated behavior change (day-cell color now absolute, not
  relative; both legend headings changed) plus 6 new tests - two days with the same rate get
  the same Heatmap color despite different monthly averages; a backend `color` disagreeing with
  a low rate is ignored (rate wins); the weekday tab's per-point classifier, neutral line
  stroke, and single shared `<Bar>` (volume never recolored); the tooltip's quality-group line
  appears for weekday rows only, never fabricated for month rows; and the `>TB`/`<TB` cards use
  neutral slate, not a band color. Full file: 26/26 pass.
- `frontend/src/features/ranking/BcvhRankingOverviewBlocks.heatmapBand.test.js` (Section 43's
  suite): one assertion updated to check the real definition's new location
  (`f13HeatmapBandCatalog.js`) instead of asserting it lives inline in
  `operatingPatternTabsData.js`; all other 15 assertions unchanged. 16/16 pass - confirms BCVH
  Ranking's monthly heatmap needed zero code changes this round, since it already consumed the
  shared catalog through names that still resolve identically.

### Validation

- Catalog suite: 20/20 pass. Dashboard data/component suite: 26/26 pass. BCVH heatmap-band
  suite: 16/16 pass. 12 BCVH Overview tests + single-day contract: 28/28 pass (all four
  required regression files run together).
- Full frontend sweep (395 tests): 383/395 pass - the same 12 pre-existing failures by name (3
  dashboard/canonical-value tests, 8 Route Ranking/Route Performance tests, 1
  `dataImportBackfillQueue.test.js`), zero new regressions; net +25 tests from this delta.
- `oxlint`: 0 errors; no new warning in any file touched this round.
- `vite build`: succeeds, 701 modules.
- No backend, database, schema, or API file touched; no `networkMap`/`Data QLML/`/`.claude/`/
  patch/export file staged or committed; the Product Owner's other unrelated dirty/untracked
  files were left alone throughout.

### Scope

New: `frontend/src/components/f13/f13HeatmapBandCatalog.js`,
`frontend/src/components/f13/f13HeatmapBandCatalog.test.js`. Modified:
`frontend/src/features/dashboard/components/operatingPatternTabsData.js`,
`frontend/src/features/dashboard/components/operatingPatternTabsData.test.js`,
`frontend/src/features/dashboard/components/OperatingPatternTabsCard.jsx`,
`frontend/src/features/ranking/BcvhRankingOverviewBlocks.heatmapBand.test.js`, and this
manifest. `BcvhRankingOverviewBlocks.jsx` itself needed no change.

Governance state: `F1.3 HEATMAP ABSOLUTE COLOR SSOT COMPLETE / READY FOR PO UI CHECK`. Claude
Code does not self-award PO PASS on this round; the Product Owner must restart the frontend dev
server and perform a fresh UI check on `/f13/ranking/bcvh` and Operation Dashboard's Heatmap and
"Theo thu" tabs before any acceptance is recorded.

## 45. F13-BCVH-RANKING-OVERVIEW-01 - Formal Closure, PO UI CHECK PASS (2026-08-28)

Append-only delta. Sections 1-44 are unchanged. This section formally closes the ticket that
Section 35 activated. It supersedes every earlier "READY FOR PO UI CHECK" / "READY FOR
IMPLEMENTATION" / "TECHNICAL PASS" governance-state line recorded in Sections 35-44 for live
onboarding purposes; those sections remain the historical record of how the ticket got here and
are not edited or deleted.

### Product Owner acceptance

Product Owner performed the UI Check across the full ticket scope and explicitly granted
`PO PASS` on 2026-08-28. Final technical commit accepted as the basis of this PASS:
`f34e898c8fb7ec294d5fcd42dfe3b2777c11dc53` (`refactor(f13): unify absolute heatmap color SSOT`,
Section 44).

### What is closed

- **BCVH Ranking Overview** (the ticket's original scope, Section 35): the four overview blocks
  (monthly trend, daily detail, MTD summary, route capacity) on `/f13/ranking/bcvh` above the
  unchanged existing daily ranking table, backed by the single-request
  `/f13/ranking/bcvh/overview` contract, R1's one-request/absolute-null-on-zero-denominator
  rules (Section 36), Phase B1/F1/I1 delivery (Sections 37-41), and the R2/R3 UI remediations
  (Sections 41-42) — all PO-accepted as delivered.
- **F1.3 Heatmap Absolute Color SSOT** (Sections 43-44, folded into this same ticket's closure
  since it is the color rule for BCVH Ranking's own monthly heatmap): one shared catalog,
  `frontend/src/components/f13/f13HeatmapBandCatalog.js`, is now the single source for the
  absolute band classification used by both BCVH Ranking's monthly heatmap and Operation
  Dashboard (Heatmap tab and "Theo thứ" tab):
  - Xanh: `rate >= 70%`
  - Hồng: `60% <= rate < 70%`
  - Vàng: `50% <= rate < 60%`
  - Đỏ: `rate < 50%`
  - Xám: no data available
  Operation Dashboard and BCVH Ranking consume this one catalog — there is exactly one real
  threshold/color source, not two. Comparison against a monthly (or any other) average is
  informational only (numbers, arrows, tooltips, secondary stats) and never selects color,
  anywhere in F1.3 Heatmap surfaces.

### Final state

`F13-BCVH-RANKING-OVERVIEW-01 = COMPLETED / PO PASS / CLOSED` (2026-08-28).

This ticket is not reopened by this closure. Any further BCVH Ranking Overview or F1.3 Heatmap
change — including a future Admin-configurable band-threshold screen, which
`classifyF13HeatmapRate(rate, bands)`'s override parameter was deliberately shaped to support
but which this ticket does not implement — requires its own new delta or ticket with its own
Product Owner authorization.

### Next live item

`F13 Route Ranking enhancement` is recorded as the next live item for a future session, not
activated by this closure. It has not started. Per Product Owner instruction: it must begin
with its own read-only audit of Route Ranking's real data, API, and current UI — the BCVH
Ranking Overview UI/blocks/contract must not be copied over verbatim — and follow the same
design-of-record → PO-approval → phased-implementation process this ticket used. See
`PROJECT_SNAPSHOT.md` for the live-state pointer.

---

## 46. F13-ROUTE-RANKING-PERIOD-01 — Route Ranking Period Delta, Design of Record (2026-08-28)

Append-only delta. Sections 1-45 are unchanged. This section activates the ticket that Section 45
recorded as the next live item (`F13 Route Ranking enhancement`), now formally scoped and named
`F13-ROUTE-RANKING-PERIOD-01`. It does **not** reopen `F13-BCVH-RANKING-OVERVIEW-01`
(`COMPLETED / PO PASS / CLOSED`, Section 45), does **not** reopen
`F13-ROUTE-RANKING-REDESIGN-IMPL` (`CLOSED / PO PASS`), and does **not** activate Phases 1-4 of the
original five-phase program (Section 6), which stay `PLANNED / NOT ACTIVE`.

### Ticket header

| Field | Value |
| --- | --- |
| Ticket | `F13-ROUTE-RANKING-PERIOD-01` |
| Type | Delta on the running Tuyến Ranking module (`/f13/ranking/route`) |
| Branch / baseline | `codex/da-impl-006` @ `35290ad105eb716ab8c1d7d65056992cd773ed2a` (local = remote, verified) |
| Current state | `DESIGN OF RECORD WRITTEN / AWAITING PO APPROVAL` |
| PO UI Check Required | `Yes` (end of Phase F1 and Phase I1) |
| Executors | B1/I1 `Claude Code` / `Sonnet`; F1 `Antigravity` (per `DEC-020`) |

### Design of record

`docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-RANKING-PERIOD-01_DESIGN.md` is the single design of
record. No implementation may start from this manifest section alone.

### Origin

A read-only audit of Route Ranking's real data, API and current UI was completed on 2026-08-28 as
Section 45 required. The Product Owner then selected **Phương án B** (period panel built on top of a
mandatory Phase 1 that fixes the two defects the audit found) and locked seven decisions:

1. Rank valid delivery routes only; the out-of-scope remainder must be displayed separately so it
   reconciles against the BCVH total.
2. Rates use the measurement-instance count (`COUNT(ma_bg)`), consistent with BCVH Ranking.
3. Support daily rate, month-to-anchor cumulative rate, previous-month rate, difference, and route
   ranking. **The term "MTD" must not appear in the UI or in any PO-facing communication.**
4. Per-route detail shows the daily rate movement within the month, the cumulative month rate and
   the previous-period comparison — without copying BCVH Ranking's blocks/UI/contract.
5. Reuse the existing F1.3 colour bands.
6. Low-data routes stay visible and ranked, but must carry days-with-data and volume.
7. The Đạt/Lỗi drill-down into Evidence stays on the roadmap but is split into its own
   phase/ticket; Evidence stays single-day to avoid overload.

### Two defects the design must close

- `DEF-01` — the date-range filter silently collapses to the last day. `RoutePerformancePage.jsx`
  computes `fromDate`/`toDate` and renders an `interval` badge (`Một ngày / Theo tuần / Lũy kế`),
  but the single API call always passes one date (`analysisDate = to_date || from_date`). Resolution:
  replace the pair with one explicit `Ngày phân tích` anchor input, delete the `interval` badge, keep
  reading `from_date`/`to_date` for URL compatibility but disclose the resolved anchor date instead of
  truncating silently. No free date-range engine is built — the PO's own metric list is an anchor-date
  model.
- `DEF-02` — route figures do not reconcile with BCVH. Route Ranking filters `ma_tuyen LIKE '53%'`
  and excludes the 7 `CONFIRMED_NON_POSTMAN_ROUTES`; BCVH Ranking, `/f13/evidence-list` and the BCVH
  overview route block filter neither. Measured on `2026-08-27 / 533140`: BCVH 1,980 BG / 716 failed
  vs. route rows 1,911 BG / 714 failed; Evidence "Tất cả tuyến" returns 716. Full-year for 533140:
  376,079 vs 360,476 (4.1%). Resolution per PO decision 1: keep both scopes, publish the difference
  as a first-class reconciliation strip with a checkable identity
  (`bcvh_total = ranked + pickup_at_office + non_hue + no_route`), verified true on real data for both
  the anchor day (1,980 = 1,911 + 69 + 0 + 0) and the month (49,264 = 46,818 + 2,446 + 0 + 0).

### Contract

New endpoint `GET /f13/ranking/route/periods` (`admin` + `viewer`), one request serving the whole
screen including per-route daily series, four fixed queries, no N+1. The month roll-up is computed
in Node from the very daily array returned, making "month total disagrees with the days shown"
structurally impossible rather than merely tested. `rate = null` if and only if `volume = 0`,
inheriting `R1-B` from `F13-BCVH-RANKING-OVERVIEW-01` so the two screens do not diverge
semantically. Existing endpoints — `/f13/ranking/route`, `/f13/ranking/bcvh`, `/f13/evidence-list`,
`/f13/ranking/bcvh/overview` — are not modified.

### Phasing

`Phase B1` (backend, additive-only) → `Phase F1` (frontend, Antigravity) → `Phase I1` (integration
and real-data reconciliation proof). Per `DEC-021` the same model must not both implement and
self-approve the reconciliation identity — the highest-risk item in this ticket.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 DESIGN OF RECORD WRITTEN / AWAITING PO APPROVAL`. This section is
documentation only. No product code, database, schema or API was changed. `AUTO-BACKFILL-RUNTIME`
remains separately open and untouched per `PROJECT_SNAPSHOT.md`.

---

## 47. F13-ROUTE-RANKING-PERIOD-01 — Đóng `D-OPEN-01` / PO Approval (2026-08-28)

Append-only delta. Sections 1-46 are unchanged. Section 46 stays the historical record of the
ticket's activation and its design-of-record write-up at Revision R0; this section records what
happened next, not a rewrite of it.

### Quyết định PO bổ sung

Product Owner chốt: **"Cùng kỳ tháng trước" phải tính giống BCVH Ranking** — nếu ngày phân tích là
`20/8` thì so sánh `01–20/8` với `01–20/7` (cùng số ngày đã trôi trong tháng, không phải trọn tháng
liền trước). Nhãn giao diện: **`Cùng kỳ tháng trước`**, ngắn gọn; thuật ngữ `MTD` bị cấm dưới mọi
hình thức trên UI và trong trao đổi với PO — không đổi so với Section 46.

Quyết định này đóng `D-OPEN-01`, câu hỏi duy nhất còn để ngỏ ở Revision R0 của design of record.
Phương án được chọn trùng với phương án "cùng số ngày đã trôi" đã đo sẵn ở R0 (chênh `0.26` điểm
phần trăm so với phương án trọn-tháng ở cấp BCVH), nhưng PO minh định thêm yêu cầu bắt buộc: công
thức phải **tái dùng nguyên văn** cách BCVH Ranking đã tính, không phát minh công thức riêng cho
Tuyến Ranking.

### Xác minh kỹ thuật (read-only, trước khi duyệt R1)

Công thức tái dùng là `_getBcvhOverviewAggregate('mtd', ...)` hiện có
(`backend/src/repositories/FactBuuGuiRepository.js:283-313`):
`previous_end = MIN(previous_start + (ngày_của_anchor − 1), ngày cuối tháng trước)`. Đã xác minh lại
bằng truy vấn `sqlite3.OPEN_READONLY` trên CSDL thật, gồm cả trường hợp biên tháng trước ngắn hơn
(anchor `2026-03-31` → `previous_end` bị giới hạn đúng về `2026-02-28`, không tràn sang
`2026-03-03`) — chứng minh công thức giới hạn hoạt động đúng khi tái dùng cho phạm vi tuyến. Đo lại
chi phí truy vấn với khoảng hẹp hơn (`01→27/07` thay vì `01→31/07`, BCVH lớn nhất): **93 ms**, thấp
hơn mốc `272 ms` đã đo ở Section 46 cho khoảng trọn tháng — không phát sinh rủi ro hiệu năng mới.

### Design of record — Revision R1

`docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-RANKING-PERIOD-01_DESIGN.md` cập nhật lên
**Revision R1**. Toàn bộ vị trí tham chiếu công thức tháng trước được đồng bộ trong cùng một lượt:
§3.1 từ vựng bắt buộc, §3.3 công thức Chênh lệch, §4.2/§4.2.1 (thêm mới) định nghĩa kỳ và công thức
tái dùng, §4.3 hệ quả khi ngày neo là ngày 01 (nay `Cùng kỳ tháng trước` cũng thu hẹp về đúng một
ngày, nhất quán với việc dùng chung công thức — không còn là trường hợp đặc biệt), §6.3 payload mẫu
(số liệu tuyến `533140129` đo lại thật: `previous_month` khoảng `07-01→07-27`, `volume 607`,
`passed 237`, `rate 39.05`), §6.5 mô tả `Q3`, §7.3/§7.5 nhãn giao diện, §8 hiệu năng, §10.1 `T12`.
§14 được viết lại thành nhật ký đóng `D-OPEN-01`, giữ nguyên bảng so sánh trọn-tháng-vs-cùng-số-ngày
của R0 làm hồ sơ lịch sử. Trường JSON `previous_month` giữ nguyên tên, chỉ ngữ nghĩa khoảng ngày đổi
— không có breaking rename không cần thiết.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = PO APPROVED / READY FOR IMPLEMENTATION` (Revision R1, 2026-08-28).
`D-OPEN-01` = `RESOLVED`. Không còn quyết định PO nào để ngỏ trong ticket này. Phase B1 (backend,
additive-only, Claude Code / Sonnet) được phép bắt đầu theo đúng file scope, test plan và tiêu chí
nghiệm thu đã ghi trong design of record. PO UI Check vẫn bắt buộc ở cuối Phase F1 và Phase I1 —
Claude Code không tự trao PO PASS. Không dòng product code, database, schema hay API nào bị thay
đổi bởi việc duyệt thiết kế này. `F13-BCVH-RANKING-OVERVIEW-01` giữ nguyên
`COMPLETED / PO PASS / CLOSED`, không bị mở lại. `AUTO-BACKFILL-RUNTIME` vẫn mở độc lập theo
`PROJECT_SNAPSHOT.md`.


---

## 48. F13-ROUTE-RANKING-PERIOD-01 — Phase B1 Implementation (2026-08-28)

Append-only delta. Sections 1-47 are unchanged. Section 47 recorded PO approval of the design of
record (Revision R1) and authorized Phase B1 to start; this section records that Phase B1's
completion. Phase F1 (frontend, Antigravity) and Phase I1 (integration) are not started by this
section.

### What was implemented

Additive-only backend delta, exactly per file scope §9.1 of the design of record:

- `backend/src/repositories/FactBuuGuiRepository.js`: three new methods —
  `getRoutePeriodDailyFacts()` (Q2, per-day/per-route facts for the month-to-anchor window, same
  Hue/postman scope as `getRouteRanking()`), `getRoutePeriodPreviousMonth()` (Q3, aggregates the
  "cùng kỳ tháng trước" window using the exact `date()`/`strftime()` capping formula
  `_getBcvhOverviewAggregate('mtd', ...)` already uses, LEFT-JOINed so `previous_start`/
  `previous_end` resolve even with zero matching routes), `getRouteScopeReconciliation()` (Q4,
  the four-group reconciliation for both periods in one scan, always using the postman-exclusion
  scope regardless of the caller's own `route_type`). `getRouteRanking`, `getRouteRankingFacts`,
  `getBcvhRanking`, `getEvidenceList*` are byte-for-byte unchanged.
- `backend/src/services/routePeriodService.js` (new): orchestrates Q1 (anchor-date resolution,
  issued directly via `config/db`'s `all()` promise wrapper rather than a fourth repository
  method, keeping the repository file scope to exactly 3 additions) plus the three repository
  calls; Node-side month roll-up from the Q2 daily facts (`C-02` — structurally cannot disagree
  with the days shown, since there is no separate month query); `rate = null` iff `volume = 0`
  throughout (`C-04`); RANK()-style ranking that assigns every route a rank including
  `rate = null` ones, tied last (`AC-08`); `delta`/`rank_delta` null exactly when a route has no
  real previous-window data. `repository` and `queryAnchor` are constructor-injectable, enabling
  the service's full logic to be unit-tested against canned data with zero real-database
  dependency.
- `backend/src/controllers/DashboardController.js`: one new handler, `getRoutePeriods` —
  `bcvh` required (`400 MISSING_PARAM`), `INVALID_DATE` from the service maps to `400`. Every
  existing handler byte-for-byte unchanged.
- `backend/src/routes/f13Routes.js`: one new route, `GET /ranking/route/periods`, same
  `admin`+`viewer` role gate as the existing `/ranking/route`. The existing route line is
  unmodified.

### Test plan coverage

- `backend/src/repositories/FactBuuGuiRepository.routePeriod.test.js` (new, 5 tests, real SQL
  against an in-memory `node:sqlite` database — same harness `FactBuuGuiRepository.overview.test.js`
  already uses): per-day/per-route aggregation and month-window scoping; the exact MTD-capping
  formula reused verbatim, including the shorter-previous-month edge case (anchor `2026-03-31`
  correctly caps to `2026-02-28`, not `2026-03-03`) and the zero-route case (`previousStart`/
  `previousEnd` still resolve); the `AC-05` four-group identity on synthetic data covering
  `ranked`/`pickup_at_office`/`non_hue`/`no_route`/different-BCVH isolation.
- `backend/src/services/routePeriodService.test.js` (new, 12 tests, fake repository + fake
  `queryAnchor`, zero real-database dependency): `T1`/`T2` empty-state with no fallback; `T13`
  exactly 4 fixed DB touches (1 anchor + 3 repository calls) regardless of route count (asserted
  with 40 synthetic routes); `T3`/`T-01`/`AC-07` a route absent on anchor day still appears with
  `day.rate = null`, never `0`; `T4a`/`T4b`/`C-04`; `T5`/`C-02` exact roll-up; `T9`/`AC-08` every
  route ranked, `rate = null` tied last, never omitted; `T10` `delta`/`rank_delta` null without a
  previous window, while `rank_previous_month` is still a real tied-last number; `T11`/`M-01`
  volume passthrough; `T12`/§4.3 anchor day 01 collapses both the current and the previous window
  to a single day; `AC-05` reconciliation identity, including a deliberately broken-identity case
  proving `identity_ok: false` surfaces rather than being silently swallowed.
- `backend/src/controllers/DashboardController.routePeriods.test.js` (new, 4 tests): `MISSING_PARAM`
  wiring, parameter passthrough and `200` response shape, `INVALID_DATE` to `400` / other error to
  `500` mapping, and route registration (`/ranking/route/periods` registered, `/ranking/route`
  confirmed still registered unmodified).

### Regression (`R1`-`R4`, §10.2)

All four required suites pass with **zero lines changed**:
`FactBuuGuiRepository.routeRanking.test.js`, `F13DashboardService.routeRanking.test.js`,
`FactBuuGuiRepository.evidenceListFacts.test.js` + `F13DashboardService.evidenceList.test.js`,
`bcvhOverviewService.test.js` + `FactBuuGuiRepository.overview.test.js` — 35/35 plus 1/1
(`node --test --experimental-sqlite`), confirming Evidence, BCVH Ranking, and the existing
one-day Route Ranking contract are untouched.

### Real-data read-only validation (LEVEL 2)

A temporary, scratchpad-only script (not committed; not part of the file scope) loaded the real
`FactBuuGuiRepository`/`RoutePeriodService` code bound via `require.cache` substitution to a
`sqlite3.OPEN_READONLY` connection to the real operational `database.sqlite`, then called
`RoutePeriodService.getRoutePeriods()` — the actual production code path, not ad-hoc SQL — against
all 9 real BCVH codes for anchor `2026-08-27`:

- **`AC-05` reconciliation identity**: `identity_ok: true` for both the day and month periods,
  for all 9 BCVH. `bcvh_total` cross-checked directly against `getBcvhRanking()` and matched
  exactly for every BCVH, e.g. `533140`: day `1,980 = 1,911 + 69 + 0 + 0`; month
  `49,264 = 46,818 + 2,446 + 0 + 0` — identical to the figures the read-only audit and the
  design of record already recorded.
- **`AC-03`/`C-02`**: for route `533140129`, `month.volume` (668) equals the sum of its own
  `daily_series.volume` values exactly.
- **`T-01`/`AC-07`**: BCVH `533140` returns 35 routes (the month-union set) vs. 30 with data on
  the anchor day — the same 35/30 split the audit measured. The 5 anchor-day-absent routes each
  render `day = { volume: 0, passed: 0, failed: 0, rate: null }`, never `0%`.
- **`AC-08`**: 0 routes without a `rank`, out of 35, for `533140`.
- **§8 performance gate**: `533140` (the largest BCVH, 48 routes) — three consecutive
  `getRoutePeriods()` calls measured `921ms`, `840ms`, `839ms`, all comfortably under the `< 1.5s`
  target.
- **§4.2.1**: `previous_month` for `533140`/anchor `2026-08-27` resolved to
  `{ start: "2026-07-01", end: "2026-07-27", days_in_period: 27 }`, matching the design's
  worked example exactly.
- **§4.3**: anchor `2026-08-01` collapsed both `month_to_anchor` and `previous_month` to
  single-day windows (`days_in_period: 1` for both), as the design requires.
- **`route_type=all`**: the confirmed pickup route `53314018` is visible only under `all`, absent
  under the default `postman` scope — matching `getRouteRanking()`'s existing behavior.

Zero writes: every query used `sqlite3.OPEN_READONLY`; `fact_f13` row counts confirmed unchanged
before/after via the identical `1,980`/`49,264` figures reproducing exactly across repeated runs.

### File scope discipline

`git diff --name-only` confirms only the four files above were modified/added under
`backend/src`, plus their three test files. `BcvhRankingPage.jsx`, `BcvhRankingOverviewBlocks.jsx`,
`bcvhOverviewService.js`, `bcvhOverviewData.js`, `bcvhOverviewFetcher.js`,
`f13HeatmapBandCatalog.js`, `getEvidenceListFacts`, `f13RouteClassificationCatalog.js`,
`RuleF13302`, schema, migrations — all confirmed untouched. No frontend file touched (Phase F1 is
not this phase's scope). Pre-existing dirty files at session start
(`backend/test_dkclSessionPreflightService.js`, `frontend/src/features/networkMap/*`, `.claude/`,
`Data QLML/`, `export_*.js`) were not staged, not modified, not committed.

### Validation summary

- Targeted new suites: **21/21 pass** (5 repository + 12 service + 4 controller).
- Regression `R1`-`R4`: **36/36 pass**, zero lines changed.
- Full backend sweep: **454/468 pass** — the same 14 failures by name also present in the
  447/431/16-failure baseline measured with this delta stashed away; the baseline's 2 additional
  failures (`FactF41Repository.test.js`'s two F4.1 KPI tests) are pre-existing sweep-order
  flakiness, confirmed by running that file in isolation 3 times consecutively (3/3 pass,
  independent of whether this delta is present). Zero regressions attributable to this delta.
- `oxlint`: 0 errors on every touched file; the 6 pre-existing warnings on
  `FactBuuGuiRepository.js` (unused `safeSort`/`safeOrder` in `getBcvhRanking`, four unused
  catch-parameter `e` in `getFactByDate`/`getFactBetween`) are confirmed identical before/after
  this delta (same warning text, only shifted line numbers from the additive insertions above
  them) via a direct baseline oxlint comparison with this delta stashed away.
- `node -c` syntax check: clean on all four touched/new source files.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = PHASE B1 IMPLEMENTED / TECHNICAL PASS`. Phase B1 requires no
Product Owner UI Check (design of record §12.2 — PO UI Check is required only at the end of
Phase F1 and Phase I1); Claude Code confirms Phase B1's own technical validation, not a PO
acceptance. Phase F1 (frontend, executor `Antigravity`) is next, per the design of record's file
scope §9.2 — not started by this section. No database, schema, or migration changed; no frontend
file changed; `F13-BCVH-RANKING-OVERVIEW-01` remains `COMPLETED / PO PASS / CLOSED`, not reopened.
`AUTO-BACKFILL-RUNTIME` remains separately open and untouched per `PROJECT_SNAPSHOT.md`.


---

## 49. F13-ROUTE-RANKING-PERIOD-01 — Phase I1 Integration Validation — BLOCKED (2026-08-29)

Append-only delta. Sections 1-48 are unchanged. Section 48 recorded Phase B1 (backend)
IMPLEMENTED / TECHNICAL PASS. Between Section 48 and this section, Phase F1 (frontend) landed
as a separate commit (`8d39a5f9`, author `tntTan2292`, executor role per `DEC-020` is
`Antigravity`) with its own self-written checkpoint
(`docs/06_REVIEWS/Shared/F13-ROUTE-RANKING-PERIOD-01-PHASE-F1_CHECKPOINT_001.md`, self-stating
`COMPLETED / AWAITING PO CHECK`) — that commit registered no manifest section, no
`DOCUMENT_INDEX.md` entry, and no `PROJECT_SNAPSHOT.md` update. This section is Phase I1
(integration, executor `Claude Code`/`Sonnet` per the design of record's own phase assignment),
run against baseline `8d39a5f97ef7eb60dcb2963e6b2b768ee62a8dc5` (local = remote, verified before
starting).

### What Phase I1 did

Per §9.3 of the design of record ("Nối hai phase, chứng minh trên dữ liệu thật: đẳng thức §5.2
đúng cho cả 9 BCVH; C-02 đúng; đo hiệu năng thực tế; sweep hồi quy đầy đủ") and no additional
feature work: started the real backend (`node server.js`, real `database.sqlite`, zero writes —
GET-only) and the already-running frontend dev server; logged in with the project's known admin
fixture; drove the real Route Ranking screen end-to-end in a real browser (desktop and mobile
viewports); cross-checked every on-screen field against the live `GET /f13/ranking/route/periods`
JSON response and against the Design of Record's exact contract text; ran the full backend and
frontend automated test sweeps; built a temporary `git worktree` at the Phase B1 baseline
(`bfa1d515`) to distinguish genuinely new regressions from pre-existing test staleness, without
disturbing the working tree.

### Result: integration defects found — NOT a pass

The backend contract itself is unchanged and correct (re-verified against all findings from
Section 48: `AC-05` reconciliation identity true for BCVH `533140` on both periods, `C-02` month
roll-up exact, performance `783-1086ms` measured through the real browser, comfortably under the
`<1.5s` gate). The defects are entirely in Phase F1's frontend wiring, all traced to one root
cause: `RoutePerformancePage.jsx` fully replaced its call to `getRouteRanking()` with a call to
`getRoutePeriods()` instead of calling both and merging by `ma_tuyen`, as the design of record's
§7.3 explicitly requires ("Giữ nguyên không đổi: ... toàn bộ nhóm 'Kết quả ngày đánh giá' còn lại
(Tổng BG, Đạt, Không đạt, Chuyển hoàn), toàn bộ nhóm 'Vi phạm chậm nộp tiền', ... và nút
drill-down"). The new endpoint was never designed to carry those fields, so every reference to
them in the rewritten component now reads `undefined`.

Confirmed live, with screenshots, network captures, and API cross-checks (full detail and file:line
references in the checkpoint below):

- The entire "Đối soát dữ liệu" (scope reconciliation) UI — the feature that closes `DEF-02`, the
  core deliverable of this whole ticket — **never renders in any scenario tested**, because its
  render condition checks a field name (`reconciliation.total_routes`) that does not exist
  anywhere in the real contract (`reconciliation.day`/`reconciliation.month` only).
- The "Tỷ lệ đạt toàn BCVH" and "Tổng BG không đạt" executive KPI cards show a fabricated `0.0%`
  and `0` for every BCVH, because `computeRouteKpiStats()` reads `item.total_bg`/`item.passed`,
  fields absent from the new route objects.
- The "Chỉ hiện tuyến phát sinh lỗi" filter is completely non-functional — it always returns zero
  rows, even against BCVH `533140` where real failing routes exist (e.g. route `533140137` has a
  `0.0%` day rate), because it reads `item.failed ?? item.total_failed`, both absent.
- Every route is mislabeled "Nhận tại bưu cục" regardless of its true classification, because
  `row.is_postman_delivery_route` is absent from the new contract — confirmed across all 10
  visible rows on the live page.
- The `XH` column (row position) was kept alongside a new, real `Hạng` column — exactly the
  anti-pattern the design of record's §7.3 explicitly named and forbade ("hai cột số cạnh nhau,
  một thật một giả, là kết cục tệ hơn hiện trạng"). Confirmed on both desktop and mobile
  screenshots.
- The default sort key (`passed_rate`) no longer exists on route objects, so the PO-confirmed
  "worst day-rate first" default silently degrades to API insertion order (`ma_tuyen` ascending) —
  confirmed on first page load.
- The `RouteSelectedPanel` shows `0` for "Sản lượng phát" for a route whose own table row
  simultaneously shows the real, non-zero volume (`261`) — a direct, on-screen contradiction for
  the same route at the same moment.
- The term "MTD" appears in a code comment in `routePeriodData.js:26`, violating `AC-14`'s literal
  zero-tolerance grep requirement.

### Test evidence

Backend: 454/468, identical 14 pre-existing failures by name to the Section 48 baseline — zero
backend regression (expected; Phase F1 touched no backend file). Frontend: 383/395, 12 failures.
Comparison against a `git worktree` at `bfa1d515` shows 9 of these 12 were **already failing
before Phase F1**, but on different, unrelated stale-wording assertions that predate this ticket
(e.g. baseline failed on `/được ghi nhận BLACK trong Đánh giá KPI 2026/`, a caption string that
had already drifted). Checking the *specific* assertions the design of record's `R1`-`R4`/`F13`
regression list actually cares about (`/Chuyển hoàn/`, `/label: 'Tổng BG'/`, etc.) confirms they
are genuinely absent from the current source and genuinely present in the `bfa1d515` source —
i.e. Phase F1 did not turn a passing test red, but it did break the underlying behavior those
already-red tests were meant to guard, in a new and more severe way that the already-stale tests
can no longer detect. `RoutePerformancePage.dateResolution.test.js` was directly modified by
Phase F1 (not "pass không sửa" literally) — judged a defensible, disclosed consequence of the
intentional endpoint swap, not an arbitrary edit. `routeViolationEvidenceData.test.js`, the fourth
named regression file, passes 19/19 unmodified. `oxlint`: 0 errors, +5 new unused-var/import
warnings versus the 4 pre-existing ones (incomplete cleanup). `vite build` succeeds (702 modules).

### Acceptance criteria (§12.1) disposition

`AC-01`/`AC-03`/`AC-04`/`AC-06`/`AC-08`/`AC-09b`/`AC-10`/`AC-13` confirmed met. `AC-05` met at the
API layer only, not at the UI layer — not self-approved at the ticket level. `AC-09`, `AC-11`,
`AC-14` not met. `AC-02`/`AC-12` partially met (see checkpoint §7 for the exact reasoning on each).
`AC-07` (absent-on-anchor-day route renders "—") is correct by source-code inspection
(`routePeriodData.js`'s null-mapping and `formatPeriodRate`'s null-guard are both correct) but was
not positively confirmed by directly clicking one of the 5 known absent-on-anchor routes in the
live browser this round — disclosed as the one item not fully verified, not assumed passing.

### Full evidence

`docs/06_REVIEWS/Route/F13-ROUTE-RANKING-PERIOD-01-PHASE-I1_CHECKPOINT_001.md` — every finding
with exact file:line references, live screenshots described, network/API JSON captured, and the
`bfa1d515` worktree comparison in full. Written for independent Opus review per `DEC-021` (the
same model must not both implement and self-approve `AC-05` — Phase I1 explicitly does not
self-approve it here).

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = PHASE I1 VALIDATION COMPLETE / INTEGRATION DEFECTS FOUND / BLOCKED
— NOT READY FOR PO CHECK`. Claude Code does not self-award PO PASS and does not self-approve
`AC-05` at the ticket level. Recommended next step (CTO/PO decision, not self-activated): Phase F1
remediation — `RoutePerformancePage.jsx` must call both `getRouteRanking()` (existing fields) and
`getRoutePeriods()` (new period fields) and merge by `ma_tuyen`, per §7.3's explicit "giữ nguyên
không đổi" instruction, rather than replacing the data source outright. No product code was
changed by this Phase I1 round — validation and evidence-gathering only, per the explicit scope
given. No database, schema, Evidence, or business rule was touched. `F13-BCVH-RANKING-OVERVIEW-01`
remains `COMPLETED / PO PASS / CLOSED`, not reopened. `AUTO-BACKFILL-RUNTIME` remains separately
open per `PROJECT_SNAPSHOT.md`.
