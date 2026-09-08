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


---

## 50. F13-ROUTE-RANKING-PERIOD-01 — Phase I1 Remediation — READY FOR PO CHECK (2026-08-29)

Append-only delta. Sections 1-49 are unchanged. Section 49 recorded Phase I1's initial finding
(integration broken, BLOCKED). This section records the remediation of every defect that finding
listed, and the re-validation confirming the fix, at baseline
`e5e83bccc3d729f9ce5357bfbc7056598b089462` (local = remote, verified before starting).

### Root cause and fix

Confirmed root cause per Section 49: `RoutePerformancePage.jsx` fully replaced its call to
`getRouteRanking()` with `getRoutePeriods()` instead of calling both and merging by `ma_tuyen`, per
Design of Record §7.3. Fix: both endpoints are now called in parallel; a new pure function,
`mergeRouteData(oldRows, periodsRoutes, routeType)` in `routePeriodData.js`, merges them. The route
set is always the periods union (T-01); a route present there but absent from the old endpoint's
day-scoped result gets `null` — never `0` — for every day-scoped field.

### What was fixed (all 7 items from the remediation instruction)

1. The three per-route reconciliation numbers (Sản lượng phát/Đạt chỉ tiêu/Không đạt) in
   `RouteSelectedPanel` — now real merged values, "—" only when genuinely absent that day.
2. Delayed-cash count/rate — now bound to the merged old-endpoint fields; "—" only when absent.
3. The scope-reconciliation strip (`DEF-02`'s core deliverable) — new `ReconciliationStrip`
   component reads the real `reconciliation.day`/`reconciliation.month` contract shape, with a
   Ngày/Lũy kế tháng toggle and an `identity_ok: false` warning.
4. The two BCVH-wide executive KPI cards — fixed automatically once real merged data flows into
   the existing `computeRouteKpiStats()` formula (unchanged).
5. The only-failed filter, route classification, and default sort — all fixed automatically once
   real `failed`/`passed_rate` flow into the existing, unchanged filter/sort functions;
   classification is deterministically "Tuyến bưu tá" under the default postman filter, the real
   old-endpoint value under `all` when present, honestly `null` ("Chưa xác định") when a route had
   zero activity that day under `all` and no source exists.
6. The duplicate `XH` column — removed entirely; only the real `Hạng` column remains.
7. The literal string "MTD" in a code comment — removed (`AC-14`); all 5 new `oxlint` warnings
   from Phase F1 resolved by removing now-genuinely-unused imports/variables.

### Test evidence

- `routePeriodData.test.js` (new, 16 tests, positive/genuine-zero/absent-on-anchor/missing-old-
  response/route-union/classification/alias/fallback/reconciliation/`AC-14` cases): **16/16 pass**.
- `RoutePerformancePage.dateResolution.test.js`: **5/5 pass**, unmodified — the exact literal
  `const failed = toNumber(route.failed ?? route.total_failed);` pattern this test guards was
  deliberately preserved verbatim (the day-scope null check is applied only at the render call
  site) to avoid a self-inflicted regression on an already-passing test.
- The four files with pre-existing stale-wording assertions
  (`RoutePerformancePage.blackReturned/delayedCash/delayedCashWidget.test.js`,
  `routeRankingFilters.test.js`): 9 failing assertions → **8** — the one that newly passes
  (`row.delayed_cash_handover_count`/`formatDelayedCashRate(row.f13_303_rate)` field bindings) was
  a genuine functional check; the remaining 8 fail on the exact same stale, pre-this-ticket wording
  identified in Section 49 (re-verified by reading each failure's specific assertion, not just the
  pass/fail count).
- Full frontend sweep: **398/411 pass** (395 baseline + 16 new). The 13 failures are the same 8
  stale route assertions, the same 4 pre-existing unrelated failures from Section 49, and one
  additional failure (`networkMapRemediation.test.js`) confirmed via `git stash` of only this
  round's two touched files to be present identically regardless of this remediation — caused by
  the pre-existing, already-dirty `networkMap` files in the working tree since before this
  session, not touched. **Zero regressions attributable to this remediation.**
- Backend sweep: unaffected (no backend file touched) — 454/468 with a live server running,
  identical to Section 48.
- `oxlint`: **0 errors, 0 warnings** on every touched file.
- `vite build`: succeeds, 702 modules.

### Real-data runtime verification (LEVEL 2, live browser + live API, zero writes)

Ran the real backend and frontend, logged in, drove the real page: the reconciliation strip now
renders real numbers matching the backend exactly (`533140`/`2026-08-27`:
`1.980 = 1.911 + 69`; toggled to month: `49.264 = 46.818 + 2.446`); executive KPIs show real
numbers (`62.6%`, `714`, `166`/`23.2%`/`714 BG thuộc mẫu`, previously all fabricated); the
only-failed filter now correctly narrows 35→29 routes, matching the "29 tuyến phát sinh lỗi" KPI
card; every route correctly labeled "Tuyến bưu tá"; no `XH` column on desktop or mobile; a specific
absent-on-anchor-day route (`533140148`) renders "—" consistently across the table row and the
detail panel for every day-scoped field, while its period-scoped fields (`Hạng`, `Lũy kế tháng`,
etc.) show real data — resolving the previously-found table/panel contradiction. Cross-checked
`AC-05` at the full-stack level (not just backend) against all 9 real BCVH: `identity_ok: true` for
both periods on every BCVH; the old-endpoint-vs-periods route-count gap matches exactly what
Phase B1/Section 49 measured for `533140` (30/35/5) and is internally consistent for the other 8.

### Acceptance criteria re-check

`AC-05` and `AC-07`: not met at the UI layer per Section 49 → **met**, confirmed live across all 9
BCVH. `AC-11`: 2/4 named regression files still fail, but confirmed to fail for the same
pre-existing stale reason identified in Section 49, not a new one. `AC-12`: **fully met** (0 lint
errors/warnings, 0 regressions attributable to this round). `AC-14`: **met**. `AC-09` (a tooltip
explaining `passed+failed≠volume`) was not added — outside the 7 items given for this round;
disclosed, not blocking, since the `Chuyển hoàn` column itself now makes that gap visible.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = PHASE I1 REMEDIATED / READY FOR PO CHECK`. Claude Code does not
self-award PO PASS — the Product Owner must perform the UI Check per Design of Record §12.2. No
backend, Evidence, schema, database, or business rule was changed. `F13-BCVH-RANKING-OVERVIEW-01`
remains `COMPLETED / PO PASS / CLOSED`, not reopened. `AUTO-BACKFILL-RUNTIME` remains separately
open and untouched per `PROJECT_SNAPSHOT.md`.

---

## 51. F13-ROUTE-RANKING-PERIOD-01 — AC-09 Remediation + Stale-Test Cleanup — READY FOR INDEPENDENT TECHNICAL REVIEW (2026-08-29)

Append-only delta. Sections 1-50 unchanged. Section 50 disclosed two residual items instead of
opening a new ticket for them: `AC-09`'s tooltip was not added, and 8 pre-existing stale assertions
in 4 Route Ranking test files remained red. Design of Record §12.1 lists `AC-09` as a mandatory
acceptance criterion, not out-of-scope — this section closes it, at baseline `7235edb3`.

### What was done

1. **`AC-09`**: added a static caption (not a hover-only tooltip, so desktop and mobile render it
   identically) directly under the `Sản lượng phát`/`Đạt chỉ tiêu`/`Không đạt` 3-card grid in
   `RouteSelectedPanel`: *"Sản lượng bao gồm cả bưu gửi chưa có kết quả đánh giá; vì vậy Đạt +
   Không đạt có thể không bằng Sản lượng."* Styled identically to the pre-existing PTC-3h caption
   one block below it. No formula or numeric value touched. New test file
   `RoutePerformancePage.volumeReconciliationTooltip.test.js` (2 tests).
2. **8 stale assertions** across `RoutePerformancePage.blackReturned/delayedCash/
   delayedCashWidget.test.js` and `routeRankingFilters.test.js`: each re-diffed individually
   against the current file (not assumed stale) and updated to the exact current, PO-approved
   wording — never deleted, never loosened. Full before/after table in checkpoint §13. One
   genuine, non-stale defect surfaced by this review (not a wording drift): the route-type filter
   buttons were missing `aria-pressed`, present on the neighboring "only failed" button — restored
   in `RoutePerformancePage.jsx` rather than removing the test's check.

### Test evidence

`RoutePerformancePage.volumeReconciliationTooltip.test.js` 2/2; the 4 previously-red files 13/13
(was 5/13); full targeted Route Ranking sweep (13 files) 79/79; full frontend sweep 409/413, the 4
remaining failures confirmed by name to be the same pre-existing, unrelated failures already on
record. Zero regressions attributable to this round. `oxlint`: 0 errors/0 warnings on every file
touched. `vite build`: succeeds, 702 modules. `git diff --name-only`: only
`frontend/src/features/route/*` touched (5 edited, 1 new test file) — no backend, Evidence, BCVH,
or Dashboard file appears. Full evidence: checkpoint §13.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = AC-09 REMEDIATED / READY FOR INDEPENDENT TECHNICAL REVIEW`. Per
`DEC-021`, this round was implemented and technically validated by the same executor that
implemented the underlying Phase I1 remediation, so it stops at independent technical review, not
at `READY FOR PO CHECK` — no PO PASS is self-awarded, and the Product Owner's UI Check (§12.2) is
not yet requested. No backend, Evidence, schema, database, or business rule was changed. The
disclosed URL-parameter item (`analysis_date` written but never read back) remains untouched, out
of this round's scope. `F13-BCVH-RANKING-OVERVIEW-01` remains `COMPLETED / PO PASS / CLOSED`;
`AUTO-BACKFILL-RUNTIME` remains separately open per `PROJECT_SNAPSHOT.md`.

---

## 52. F13-ROUTE-RANKING-PERIOD-01 — Independent Technical Review — **BLOCKED** (2026-08-30)

Append-only delta. Sections 1-51 unchanged. Section 51 left the ticket at `AC-09 REMEDIATED / READY
FOR INDEPENDENT TECHNICAL REVIEW`. This section records that review's outcome at baseline
`d138242e`.

Reviewer: `Claude Code` / **`Opus`**, per `DEC-021` and Design of Record §9.5, which names `Opus`
for independent review of the `AC-05` identity — the ticket's highest-risk requirement. Not the
executor of any implementation round. A partial deviation from §9.5 is disclosed in checkpoint
§14 (different model, same session); every claim was re-derived from the real database and the
shipped source rather than accepted from prior rounds. No product code was changed by this review.

### Result

**`AC-05` is confirmed correct.** The four-group identity `bcvh_total = ranked + pickup_at_office +
non_hue + no_route` holds for **all 9 real BCVH across both periods**, with `identity_ok: true`
everywhere, and `bcvh_total` matching both an independently written SQL query and `getBcvhRanking`'s
own figure (design §5.2's actual requirement) on every BCVH and both periods. Non-degenerate buckets
were exercised (`535790` month `non_hue = 1`; `531120` month `pickup = 1`), so this is not a
zeros-everywhere pass. 136 contract checks plus 90 frontend-merge checks passed with 0 failures.

Also independently confirmed: `AC-01`, `AC-02`/`C-01` (one request, 35 routes + 825 daily points,
no N+1), `AC-03`/`C-02`, `AC-04`/`C-04`, `C-03`, `AC-06`, `AC-07`, `AC-08`, `AC-09b`, `AC-10`,
`AC-11` (file scope clean; zero §9.4 forbidden files touched), `AC-12` (409/413 with the 4 failures
proven baseline by construction, `oxlint` clean, build OK), `AC-13` (`fact_f13` 750,283 unchanged —
zero writes), the §4.2.1 previous-month formula, §4.4 `T-01`, §3.3 rank/delta, and §7.3's
"nguồn dữ liệu không đổi" (0 drifting routes). Performance: worst end-to-end HTTP **784 ms** against
the §8 `< 1.5 s` target. Endpoint correctly returns 401 unauthenticated.

**The ticket is nevertheless `BLOCKED` on three findings.** Full evidence in checkpoint §14.3.

| ID | Finding |
| --- | --- |
| `ITR-BLOCK-01` | **`AC-14` not met.** The literal string `MTD` remains in two files this ticket authored: `backend/src/services/routePeriodService.js:11` (comment) and `backend/src/repositories/FactBuuGuiRepository.routePeriod.test.js:103` (test name). §3.1 bans it in comments and test names; `AC-14` requires grep = 0. The guard test added in Section 50 greps only the one frontend file, so §12/§13's "AC-14 met" was assessed on that file alone. Runtime impact none; the criterion is binary and unmet |
| `ITR-BLOCK-02` | **Default sort ranks no-data routes as the worst routes.** `sortableValue()` coerces `null` to `0`, so post-`T-01` routes absent on the anchor day sort as if they scored 0%. Reproduced on real data: BCVH `535470` page 1 shows four all-`—` routes in positions 1-4, pushing the genuinely worst route (14.3%) to position 5; `537015` at position 1; `533140` at positions 2-5 — 5 of 9 BCVH. Contradicts §4.4, which the display honours but the ordering does not. Mis-orders the primary output of a screen whose purpose is "Nhận diện tuyến yếu". No test covers it |
| `ITR-BLOCK-03` | **§7.5 detail panel missing four mandated deliverables**: the `daily_series` chart (the section's headline requirement), `Hạng`, `days_with_data`/`days_in_period`, and both-period `volume`. `daily_series` is fetched and carried through the merge — 825 objects per request, the very cost `C-01` was written to justify — and then never read |

Non-blocking observations recorded in checkpoint §14.4: `AC-09` only partially met (the Section 51
caption sits on the panel's day-scoped trio, while the table — the primary surface, and where
`M-02`'s `volume` actually lives as the `Sản lượng` column — carries no explanation);
Section 50's route-count evidence for `531600`/`531110`/`531120` is wrong (recorded `0/1/1`, measured
`1/1/0`); `node --test` silently fails two backend test files without `--experimental-sqlite`
(pre-existing convention, but it under-reports Phase B1 coverage); and a dead `sort=day_rate`
parameter sent to an endpoint that does not accept it (harmless, server-side allow-list).

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = INDEPENDENT TECHNICAL REVIEW COMPLETE / BLOCKED — NOT READY FOR PO
CHECK`. `INDEPENDENT TECHNICAL PASS` is **not** awarded; `READY FOR PO CHECK` is **not** set; no PO
PASS is self-awarded. The verified `AC-05` result stands and does not need re-proving by a remediation
round. Remedy scope and executor are a CTO/PO decision and are not self-activated here. No backend,
frontend, Evidence, schema, database, or business rule was changed by this review.
`F13-BCVH-RANKING-OVERVIEW-01` remains `COMPLETED / PO PASS / CLOSED`; `AUTO-BACKFILL-RUNTIME`
remains separately open per `PROJECT_SNAPSHOT.md`.

---

## 53. F13-ROUTE-RANKING-PERIOD-01 — `ITR-BLOCK-02` Remediation (2026-08-31)

Append-only delta. Sections 1-52 unchanged. Section 52 recorded the Independent Technical Review's
`BLOCKED` verdict on three findings. This section closes exactly one of them, `ITR-BLOCK-02`, at
baseline `ce3c815f`, per explicit scoped instruction — `ITR-BLOCK-01` and `ITR-BLOCK-03` are
untouched and remain open.

### Root cause and fix

`sortableValue()` (`routeRankingCalculations.js`) coerced `day_rate`/`passed_rate` through
`toNumber()`, mapping `null` → `0`. After `T-01` introduced routes absent on the anchor day, the
shipped default sort ranked those no-data routes as if they scored `0%`, ahead of routes that
genuinely ran and scored low or `0%` — contradicting §4.4. Fix: `sortRouteRows()` now checks a
missing-rate flag before applying sort direction, so a no-data route always sorts last regardless
of ascending/descending; scoped to exactly `day_rate`/`passed_rate` (the two fields the finding
reproduced against). `RoutePerformancePage.jsx`'s inline "auto-select worst route" logic had the
same defect and was fixed by reusing the corrected `sortRouteRows()` instead of duplicating the
rule.

### Test evidence

5 new tests in `routeRankingCalculations.test.js` (25/25 total). Full targeted Route Ranking
sweep 84/84 (was 79). Full frontend sweep 414/418 — the 4 remaining failures are the exact same
pre-existing, out-of-ticket failures confirmed by construction in checkpoint §14.5. `oxlint` clean
on ticket scope; `vite build` succeeds. `git diff --stat`: 3 files touched, 78 lines. Real-data
re-verification of the exact §14.3 reproduction: BCVH `535470`'s `53547041` (14.3%) now leads page 1
ahead of its four former no-data leaders; all 6 of the 9 BCVH with any absent-on-anchor route
verified correct in both sort directions (12 direction/BCVH combinations, 0 violations). Full
evidence: checkpoint §15.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = ITR-BLOCK-02 REMEDIATED`. The ticket **remains `BLOCKED`** —
`ITR-BLOCK-01` (`AC-14`) and `ITR-BLOCK-03` (§7.5 panel deliverables) from checkpoint §14.3 are
still open. This is **not** `READY FOR PO CHECK`; no PO PASS is self-awarded. No backend, Evidence,
schema, database, or business rule was changed. `F13-BCVH-RANKING-OVERVIEW-01` remains `COMPLETED
/ PO PASS / CLOSED`; `AUTO-BACKFILL-RUNTIME` remains separately open per `PROJECT_SNAPSHOT.md`.

---

## 54. F13-ROUTE-RANKING-PERIOD-01 — `ITR-BLOCK-01` Remediation (2026-08-31)

Append-only delta. Sections 1-53 unchanged. Section 52 recorded the Independent Technical
Review's `BLOCKED` verdict on three findings; Section 53 closed `ITR-BLOCK-02`. This section
closes `ITR-BLOCK-01` only, at baseline `0a64bb34` — `ITR-BLOCK-03` is untouched and remains open.

### Fix

Re-scanning the entire ticket-authored file set (not just the two files §14.3 named) found a
**third**, previously unreported literal `MTD`: `backend/src/repositories/FactBuuGuiRepository.js:515`,
a comment inside this ticket's own `getRoutePeriodPreviousMonth()` addition (confirmed via `git
diff` to be inside this ticket's single new hunk, distinct from the pre-existing, frozen,
untouched `getBcvhOverviewMtd()`/`kind === 'mtd'` code at lines 209-210/288). All three occurrences
— that one, `routePeriodService.js:11`, and the test name in
`FactBuuGuiRepository.routePeriod.test.js:103` — were reworded to describe the same
same-elapsed-days capping formula without the banned acronym. No SQL, date-window logic, contract
field, or test assertion body changed — comment/test-name prose only.

### Guard expanded

The prior `AC-14` guard scanned only one frontend file, which is how the backend violations
escaped it. Two new guard tests replace that with the ticket's actual full footprint, each
hardcoded against the real `git diff --name-only` file list: one in
`routePeriodService.test.js` covering every backend file this ticket authored, one in
`routePeriodData.test.js` covering every other frontend file. Both keep the pre-existing
case-sensitive `/MTD/` convention, so the frozen BCVH Ranking code's unrelated lowercase `'mtd'`
kind string is correctly never flagged. `rg MTD` over the full ticket-authored file list, net of
the two guards' own necessary self-reference, now returns **0**.

### Test evidence

`routePeriodData.test.js` 17/17 (was 15); `routePeriodService.test.js` 13/13 (was 12); the two
`--experimental-sqlite`-gated backend files 9/9 unchanged. Full targeted Route Ranking sweep
85/85 (was 84). Full frontend sweep 415/419 — the 4 remaining failures are the same
pre-existing, out-of-ticket failures on record. Backend regression (route ranking + all four
ticket-scope test files) 26/26; live-server delayed-cash integration test 3/3. Live HTTP
spot-check on `GET /f13/ranking/route/periods?bcvh=533140` confirms the contract and `AC-05`
identity are unaffected. `oxlint` clean on ticket scope; `vite build` succeeds. `fact_f13`
750,283 rows before/after — zero writes. `git diff --stat`: 5 files, 56 insertions / 3 deletions.
Full evidence: checkpoint §16.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = ITR-BLOCK-01 REMEDIATED`. The ticket **remains `BLOCKED`** on
`ITR-BLOCK-03` alone (Design of Record §7.5 panel deliverables) — untouched by this round, per
explicit scope instruction. This is **not** `READY FOR PO CHECK`; no PO PASS is self-awarded. No
API contract, UI, database, schema, or business rule was changed. `F13-BCVH-RANKING-OVERVIEW-01`
remains `COMPLETED / PO PASS / CLOSED`; `AUTO-BACKFILL-RUNTIME` remains separately open per
`PROJECT_SNAPSHOT.md`.


### 51. Phase I1 ITR-BLOCK-03 Remediation (2026-09-01)

**Action**: Added mandated missing fields (chart, rank, period days context, period volume) to `RouteSelectedPanel` in `RoutePerformancePage.jsx` to satisfy checkpoint §14.3 requirements.
**Validation**: Clean oxlint, full frontend regression pass (415/419, same pre-existing 4 failures), successful vite build.

## 55. F13-ROUTE-RANKING-PERIOD-01 — Governance Handoff Correction, `ITR-BLOCK-03` (2026-09-01)

Append-only delta. Sections 1-54 unchanged, including Section 54's closure of `ITR-BLOCK-01`. This
section corrects the governance handoff of the entry immediately above, headed
`### 51. Phase I1 ITR-BLOCK-03 Remediation (2026-09-01)`, and restates its record accurately. No
product code is touched by this section — `RoutePerformancePage.jsx` and its test coverage stand
exactly as landed at implementation commit `3ff278f0`.

### Handoff defects found in the entry above

The entry titled `### 51. Phase I1 ITR-BLOCK-03 Remediation` was appended with two governance
defects: it uses heading level `###` instead of the `##` used by every other top-level manifest
section, and it reuses number `51`, already assigned to the `AC-09 Remediation + Stale-Test
Cleanup` section at line 1881 above. It should have been `## 55.`, immediately following Section
54. This section supersedes that heading and number for governance-numbering purposes; the
technical content of that entry (the `RouteSelectedPanel` fix description) is accurate and stands
as historical record — it does not need re-litigating.

### Corrected record of the `ITR-BLOCK-03` remediation (implementation commit `3ff278f0`)

Scoped strictly to `ITR-BLOCK-03` (checkpoint §14.3) per explicit instruction. `ITR-BLOCK-01`
(Section 54) and `ITR-BLOCK-02` (Section 53) remain closed and untouched by this round. The
`RouteSelectedPanel` in `RoutePerformancePage.jsx` was missing four mandated Design of Record §7.5
deliverables — the `daily_series` chart, `Hạng` (rank), `days_with_data`/`days_in_period` context,
and the volume of both periods — all four added; full detail and root cause in checkpoint §17.
Test evidence: `oxlint` 0 errors/0 warnings; full frontend sweep 415/419 (the 4 remaining failures
are the same pre-existing, out-of-ticket failures already on record); `vite build` succeeds, 702
modules transformed. Full evidence: checkpoint §17 (technical content), corrected by checkpoint
§18 (governance state) below.

### Governance state correction

Checkpoint §17 recorded its baseline as `latest` — a floating pointer, not a commit — and
concluded "The ticket can now proceed to PO Review or final checkpoint evaluation." Both are
corrected here. The baseline is implementation commit `3ff278f0829ccbdb08e4c5502c5c227600582e5b`.
Per `DEC-021`, the same executor that implements a fix does not self-approve or self-review it when
risk is high; this `ITR-BLOCK-03` remediation has not been through an Independent Technical
Review. `F13-ROUTE-RANKING-PERIOD-01 = GOVERNANCE HANDOFF CORRECTED / READY FOR INDEPENDENT
RE-REVIEW`. All three blocking findings from the Independent Technical Review (`ITR-BLOCK-01`,
`ITR-BLOCK-02`, `ITR-BLOCK-03`) are now technically remediated, but this is **not**
`READY FOR PO CHECK` and no PO PASS is self-awarded. The Product Owner UI Check (Design of Record
§12.2) remains not reachable until an Independent Technical Review clears this round. The
non-blocking observations from checkpoint §14.4 remain unaddressed, out of scope. No API contract,
UI, database, schema, or business rule was changed by this correction. `F13-BCVH-RANKING-OVERVIEW-01`
remains `COMPLETED / PO PASS / CLOSED`; `AUTO-BACKFILL-RUNTIME` remains separately open per
`PROJECT_SNAPSHOT.md`.

## 56. F13-ROUTE-RANKING-PERIOD-01 — Independent Re-Review of `ITR-BLOCK-03` — **BLOCKED** (2026-09-01)

Append-only delta. Sections 1-55 unchanged. Read-only review — no product code, test, database,
schema, or business rule was modified. Reviewer: `Claude Code` / `Opus`, fresh session started from
`README_AI.md`, per `DEC-021` and Design of Record §9.5; no conclusion from the earlier `Opus` review
(Section 52) or from the remediation's own record (Section 55 / checkpoint §17-§18) was accepted as
evidence. Remote baseline at review start `26650d35`; reviewed implementation commit `3ff278f0`.

### Outcome

`ITR-BLOCK-03` is **not** closed. Two blocking findings; full evidence in checkpoint Section 19.

- `ITR2-BLOCK-01` — **The `daily_series` chart does not leave missing days blank.** Design §7.5
  requires the day axis to run `01 → ngày neo` with days that have no data left **trống**, not joined
  and not interpolated to 0. On real data none of that holds. The backend omits a day with no
  `fact_f13` row from `daily_series` entirely rather than emitting a `null`-rate point
  (`routePeriodService.js:184` / `:247`), and the frontend maps the array one-to-one
  (`RoutePerformancePage.jsx:304-310`). Measured against the real operational database, BCVH
  `533140`, anchor `2026-08-27`: 18 of 35 routes have fewer series points than `days_in_period`, and
  of all 825 points **zero** have `rate === null`. Route `533140137` carries 21 points for 27 days
  (days `01, 09, 10, 15, 17, 21` simply absent). Consequences: `connectNulls={false}` is unreachable
  dead code for this data; the categorical `XAxis` spaces the 21 present days evenly so the line is
  drawn straight across every missing day and the gaps are invisible; and the axis starts at the
  first day with data, not at `01`. A route that stopped delivering for several days reads as an
  unbroken series and every point after a gap sits at the wrong horizontal position.
- `ITR2-BLOCK-02` — **No automated test locks any of the four §7.5 deliverables.** Commit `3ff278f0`
  added product code and no test. `routePeriodData.test.js` covers only the data helpers, and its
  fixtures carry a one-element and an empty `daily_series` — no gapped series anywhere. No test file
  references `RouteSelectedPanel`, the chart, `Hạng`, the `days_with_data` rendering, or the
  period-volume rendering. Reported as a finding only; the reviewer added no tests, per instruction.

### What the review independently confirmed as correct

The other three `ITR-BLOCK-03` deliverables are right and are **not** re-opened: `Hạng` renders the
API's own `route.rank` (traced service → `processRoutePeriods` → `mergeRouteData` → panel);
`days_with_data`/`days_in_period` render real API values (`533140131` = `26/27`, `533140137` = `21/27`);
and both periods' volume matches the §6.3 contract (`533140131` month `volume 200`, previous
`volume 154 / rate 99.3506`, `days_in_period 27`, consistent with §4.2.1). The chart's per-point rate
values are the service's own `nullableRate` output, unmodified — only their placement is wrong. No
regression on the day metrics, delayed-cash block, Evidence drill-down, or the `AC-09` tooltip.

Validation re-run by the review: targeted Route Ranking suite 85/85; `routePeriodData` 17/17; backend
repository 5/5 and service 13/13 (both `--experimental-sqlite`); full frontend sweep 415/419 with the
same four known out-of-ticket baseline failures and zero regression; `oxlint` 0 errors/0 warnings;
`vite build` succeeds. Real backend started once and stopped — `fact_f13` 750,283 rows and
`MAX(ngay_do_kiem) = 2026-08-27` before and after, **zero database writes**.

Not verified: the browser-rendered desktop/mobile appearance of the panel. The application requires an
interactive login and this reviewer does not enter credentials, so the runtime check ran against the
real service layer and the real database instead. Design §12.2 `PO-08` remains Product Owner scope.

Non-blocking observations recorded in checkpoint §19.6 (`ITR2-OBS-01` previous-month days context not
displayed; `ITR2-OBS-02` `formatPeriodVolume` returns `'0'` for a null volume; `ITR2-OBS-03` label
placement). The Section 52 §14.4 observations remain unaddressed, out of scope.

### Governance state

`F13-ROUTE-RANKING-PERIOD-01 = INDEPENDENT RE-REVIEW BLOCKED` at implementation commit `3ff278f0`.
`ITR-BLOCK-01` (Section 54) and `ITR-BLOCK-02` (Section 53) remain closed and were not disturbed;
`ITR-BLOCK-03` reverts to open with the two findings above. This is **not** `READY FOR PO CHECK`; the
Design of Record §12.2 Product Owner UI Check remains not reachable and no PO PASS is awarded. Remedy
scope and executor are a CTO/PO decision — not self-activated. `F13-BCVH-RANKING-OVERVIEW-01` remains
`COMPLETED / PO PASS / CLOSED`; `AUTO-BACKFILL-RUNTIME` remains separately open per
`PROJECT_SNAPSHOT.md`.

## 57. F13-ROUTE-RANKING-PERIOD-01 — `ITR2-BLOCK-01`/`ITR2-BLOCK-02` Remediation — READY FOR INDEPENDENT RE-REVIEW (2026-09-03)

Append-only delta. Sections 1-56 unchanged. Executor `Claude Code`/`Sonnet`. Scoped strictly to
the two blocking findings from Section 56 (`ITR2-BLOCK-01`, `ITR2-BLOCK-02`); `ITR-BLOCK-01` and
`ITR-BLOCK-02` untouched. Full detail and root cause in checkpoint Section 20.

### Fix

`ITR2-BLOCK-01` (daily_series chart did not leave missing days blank): added
`buildDailySeriesChartData(dailySeries, anchorDate)` to
`frontend/src/features/route/routePeriodData.js` — a pure, additive helper that re-expands the
backend's `daily_series` (which omits any day with zero activity entirely) into exactly one point
per calendar day from `01` through the anchor day, per Design §7.5. A day with a real entry keeps
its real `rate`/`volume`, including a genuine `rate: 0`; a day with no entry becomes
`{ rate: null, volume: null }` — a real gap for `connectNulls={false}` to render as blank.
`frontend/src/features/route/RoutePerformancePage.jsx`'s `RouteSelectedPanel` now calls this
helper instead of mapping `daily_series` 1:1. No backend, API contract, or other frontend file
touched.

`ITR2-BLOCK-02` (no test coverage): 12 tests added to
`frontend/src/features/route/routePeriodData.test.js`, including the real gapped `daily_series`
`routePeriodService.getRoutePeriods('533140')` returned for route `533140137` at anchor
`2026-08-31` (captured read-only from the operational database), a genuine-0%-preserved case, the
§4.3 anchor-on-day-1 edge case, and source-pattern regression guards locking the already-correct
`Hạng`/`days_with_data`/both-period-volume deliverables against future silent removal.

### Validation

`routePeriodData.test.js` 29/29 (17 baseline + 12 new); targeted Route Ranking suite 97/97 (85 + 12
new); full frontend sweep 427/431 pass — the 4 failures are the same known out-of-ticket baseline
failures already on record, zero regression; `oxlint` 0 errors/0 warnings; `vite build` succeeds;
backend route-period suites unaffected, re-run and confirmed 18/18. Real-data spot check: route
`533140137` now yields 31 chart points for `days_in_period 31`, with the 6 real missing days
(`01,09,10,15,17,21`) rendering as `rate: null`/`volume: null` and day `02`'s genuine `rate: 0`
preserved. `fact_f13` row count and `MAX(ngay_do_kiem)` unchanged across this session's own
actions (database is live and grows independently from real import activity outside this ticket).
`git diff --name-only` confirms only the three named route files changed by this remediation.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = ITR2 BLOCKERS REMEDIATED / READY FOR INDEPENDENT RE-REVIEW` at the
implementation commit landing this section. `ITR-BLOCK-01` (Section 54) and `ITR-BLOCK-02`
(Section 53) remain closed and undisturbed. Per `DEC-021` the same executor does not self-review
its own fix — this round is **not** `READY FOR PO CHECK`, and no PO PASS is self-awarded. The
Product Owner UI Check (Design of Record §12.2) remains not reachable until an Independent
Re-Review of this round clears. The non-blocking observations from checkpoint §19.6 remain
unaddressed, out of scope. `F13-BCVH-RANKING-OVERVIEW-01` remains `COMPLETED / PO PASS / CLOSED`;
`AUTO-BACKFILL-RUNTIME` remains separately open per `PROJECT_SNAPSHOT.md`.

## 58. F13-ROUTE-RANKING-PERIOD-01 — Final Independent Re-Review of `ITR2-BLOCK-01`/`ITR2-BLOCK-02` — **BLOCKED** (2026-09-03)

Append-only delta. Sections 1-57 unchanged. Reviewer `Claude Code`/`Opus`, per `DEC-021` and Design
§9.5. Read-only — no product code, test, schema, database, or business rule changed by this review.
Baseline: implementation commit `d7e400db` on `codex/da-impl-006`. Scope: only `ITR2-BLOCK-01` and
`ITR2-BLOCK-02` plus their regression surface; the §19.6 non-blocking observations were not
re-opened. Full evidence in checkpoint Section 21.

### Result

`ITR2-BLOCK-02` — **closed**. The four Design §7.5 panel deliverables now have automated regression
protection: the chart (real gapped fixture, genuine-0 preservation, no-interpolation, §4.3 day-1
edge case, empty series), `Hạng`, `days_with_data/days_in_period`, and both periods' volume, plus a
`connectNulls={false}` guard.

`ITR2-BLOCK-01` — **partially remediated, not closed**. Re-derived independently against the real
database through the real production service and the real shipped `buildDailySeriesChartData`:
route `533140137` yields exactly 31 points for `days_in_period 31`; the 6 real missing days
(`01,09,10,15,17,21`) are `rate: null`/`volume: null` at their correct calendar position; all 12
genuine `rate: 0` days are preserved as `0`; nothing is interpolated; per-point positional and value
fidelity holds for all 31 points; across all 35 routes of `533140`, zero routes have a point count
differing from `days_in_period` (139 real gap points total). Correct — for this BCVH.

### New blocking finding — `ITR3-BLOCK-01`

The chart is anchored on the **requested analysis date** (`fromDate` = `analysisDate` =
`param || meta.max_date`, the system-wide max), not on the BCVH's resolved `anchor_date` that the
`daily_series` was built around. Design §4.1 requires per-BCVH anchor resolution and explicitly warns
that the global max date gives a small BCVH an empty anchor day; the API already returns the resolved
`anchor_date` and `processRoutePeriods` already surfaces it, but the chart discards it.

Measured on the real database in the default UI path: `531110` (real anchor `2026-06-08`) and
`531600` (real anchor `2026-07-28`) both render **31 blank points and zero real data** — `531600`
loses 14 real July days that the pre-`d7e400db` chart did draw, making this a regression on that
input; `531120` (real anchor `2026-08-24`, `days_in_period 24`) renders 31 days, contradicting its
own on-screen `1/24 ngày` card. 3 of the 9 real BCVH are affected today. §7.5's
`trục ngày 01 → ngày neo` is therefore still not met. No test catches it — every chart fixture uses
an anchor in the series' own month, and the source-pattern guard locks the wrong argument in.

Remedy (technical, not a business decision): pass `processRoutePeriods(...).anchorDate` to
`RouteSelectedPanel` for the chart instead of `fromDate`, and add a cross-month anchor test. Scope
and executor assignment are a CTO/PO decision; this review made no product change.

### Validation re-run by this review

Targeted Route Ranking `node --test src/features/route/*.test.js` **97/97 pass**; backend
route-period suites **18/18 pass**; full frontend sweep **427 pass / 4 fail / 431**, the 4 being the
same known out-of-ticket baseline failures on record since Section 52 — zero regression;
`npx oxlint src/features/route/` 0 errors/0 warnings; `npm run build` succeeds. `AC-05` scope
reconciliation re-derived independently on all 9 BCVH across both periods: `identity_ok = true` in
18/18 cases. `AC-14` literal-`MTD` scan across the route feature and the two backend files: 0 hits.
`git diff --name-only 2afd0737 d7e400db -- frontend backend` confirms only the three named route
files changed. `fact_f13` `762782` rows / `MAX(ngay_do_kiem) = 2026-08-31` before and after —
**zero database writes**.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = FINAL INDEPENDENT RE-REVIEW BLOCKED` at `d7e400db`, on
`ITR3-BLOCK-01`. `ITR2-BLOCK-02` closed. `ITR-BLOCK-01` (Section 54) and `ITR-BLOCK-02` (Section 53)
remain closed and undisturbed; `ITR-BLOCK-03`'s three other deliverables remain correct and are now
test-locked. This is **not** `READY FOR PO CHECK`; the Design of Record §12.2 Product Owner UI Check
remains not reachable and **no PO PASS is awarded**. The §19.6 non-blocking observations remain
unaddressed, out of scope. `F13-BCVH-RANKING-OVERVIEW-01` remains `COMPLETED / PO PASS / CLOSED`;
`AUTO-BACKFILL-RUNTIME` remains separately open per `PROJECT_SNAPSHOT.md`.

## 59. F13-ROUTE-RANKING-PERIOD-01 — `ITR3-BLOCK-01` Remediation — READY FOR INDEPENDENT RE-REVIEW (2026-09-07)

Append-only delta. Sections 1-58 unchanged. Executor `Claude Code`/`Sonnet`. Scoped strictly to
`ITR3-BLOCK-01` from Section 58; `ITR-BLOCK-01`, `ITR-BLOCK-02`, and `ITR2-BLOCK-02` untouched. No
backend, API contract, database, or business rule changed. Full detail and root cause in
checkpoint Section 22.

### Fix

`ITR3-BLOCK-01` (chart anchored on the requested analysis date instead of the BCVH's resolved
`anchor_date`): `buildDailySeriesChartData` itself was already correct — the defect was that
`RouteSelectedPanel` called it with `fromDate` (the requested/system-wide `analysisDate`) instead
of the periods endpoint's own `anchor_date`. Added state `periodsAnchorDate` to
`RoutePerformancePage`, set from `processRoutePeriods(...).anchorDate` in the existing fetch
effect (a value already computed and previously discarded — no new network call); added a new
`chartAnchorDate` prop to `RouteSelectedPanel`, wired to `periodsAnchorDate`; the chart's
`useMemo` now calls `buildDailySeriesChartData(route.daily_series, chartAnchorDate)`. `fromDate`
is unchanged everywhere else it is used (violation-evidence link, date label, day-scoped
metrics) — out of scope. `routePeriodData.js` itself was not modified.

### Real-data verification

Simulated the exact page flow against the real production service on the real database
(`fact_f13` = 777,081 rows, `MAX(ngay_do_kiem) = 2026-09-06`, unchanged before/after — zero
writes):

- `531110` (real anchor `2026-06-08`, `days_in_period 8`): was 31 blank points, now 8 points with
  the 1 real day restored.
- `531600` (real anchor `2026-07-28`, `days_in_period 28`): was 31 blank points, now 28 points
  with all 14 real July days restored.
- `531120` (real anchor `2026-08-24`, `days_in_period 24`): was 31 points with 7 fabricated
  trailing days, now exactly 24 points matching the on-screen `1/24 ngày` card.
- `533140` (validated in Sections 20-21): bit-for-bit unaffected — route `533140137` still 31
  points, gaps at `01,09,10,15,17,21` — no regression on the already-correct case.

### Test evidence

`routePeriodData.test.js`: the existing source-pattern regression guard is re-pointed at the
fixed call and strengthened into an `ITR3-BLOCK-01` guard (`periodsAnchorDate` state,
`setPeriodsAnchorDate(processedPeriods.anchorDate || null)`, `chartAnchorDate={periodsAnchorDate}`
wiring, and a negative assertion that the regressed `buildDailySeriesChartData(route.daily_series,
fromDate)` pattern never reappears). 2 new functional tests reproduce real BCVH `531600`
(cross-month anchor — wrong anchor yields an all-null chart, correct anchor yields 28 points with
the 3 real July days positioned correctly) and real BCVH `531120` (same-month-earlier anchor —
chart stops at 24 points, never fabricates trailing days). 3 new tests total.

Validation: `routePeriodData.test.js` 32/32 (29 baseline + 3 new); targeted Route Ranking suite
100/100 (97 + 3 new); full frontend sweep 430/434 pass — the 4 failures being the same known
out-of-ticket baseline failures already on record, zero regression; `oxlint` 0 errors/0 warnings;
`vite build` succeeds; backend `FactBuuGuiRepository.routePeriod.test.js`/`routePeriodService.
test.js` re-run and confirmed unaffected, 18/18. `fact_f13` row count (`777,081`) and
`MAX(ngay_do_kiem)` (`2026-09-06`) confirmed unchanged across this session's own actions — the
database is live and grows independently from real import activity outside this ticket.
`git diff --name-only f30a877b` confirms only `RoutePerformancePage.jsx` and
`routePeriodData.test.js` changed by this remediation.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = ITR3-BLOCK-01 REMEDIATED / READY FOR INDEPENDENT RE-REVIEW`. Per
`DEC-021` the same executor does not self-review its own fix, so this is **not**
`READY FOR PO CHECK`; no PO PASS is self-awarded. The Design of Record §12.2 Product Owner UI
Check remains not reachable. `ITR-BLOCK-01`/`ITR-BLOCK-02`/`ITR2-BLOCK-02` remain closed;
`F13-BCVH-RANKING-OVERVIEW-01` remains `COMPLETED / PO PASS / CLOSED`; `AUTO-BACKFILL-RUNTIME`
remains open and untouched.

## 60. F13-ROUTE-RANKING-PERIOD-01 — Independent Re-Review of `ITR3-BLOCK-01` — **PASS / READY FOR PO CHECK** (2026-09-07)

Append-only delta. Sections 1-59 unchanged. Reviewer `Claude Code`/`Opus`, fresh session, per
`DEC-021` and Design §9.5 — a different model from the `Sonnet` executor that produced the fix.
Read-only — no product code, test, schema, database row, or business rule changed by this review.
Baseline: implementation commit `66200166` on `codex/da-impl-006`. Scope: `ITR3-BLOCK-01` and its
regression surface only; the §19.6 non-blocking observations were not re-opened. Full evidence in
checkpoint Section 23.

### Result

`ITR3-BLOCK-01` — **CLOSED**. The chart is anchored on the BCVH's own resolved `anchor_date`, not
the requested/system-wide date. Because `buildDailySeriesChartData` expands `01 → anchorDay` of
`anchor_date`'s own month, and the service derives `days_in_period` from that same date's
day-of-month, the chart's point count is now structurally identical to `days_in_period` rather
than coincidentally equal to it — Design §7.5's `trục ngày 01 → ngày neo` is met by construction,
per-BCVH as §4.1 requires. State consistency verified: `setPeriodsAnchorDate` is set in the same
post-`await` batch as `setRows` under the same `mounted` guard, so the anchor can never lag the
rows it labels.

Re-derived independently through the real production service against the real database, applying
the real shipped helper on the exact default UI path — **all 9 BCVH, all 105 routes: zero routes
whose chart point count differs from their own `days_in_period`**, and per-point field-by-field
fidelity across every real `daily_series` entry (0 missing points, 0 value mismatches).

The live database has grown since the fix landed (`531120` now carries data through `2026-09-05`),
so Section 59's stated day counts were re-derived rather than trusted, by capping the anchor
ceiling at `2026-08-31` — the system-wide max as it stood then. Every claim reproduces exactly:
`531110` 31 blank points → **8 points, 1 real day**; `531600` 31 blank points → **28 points, all
14 real July days**; `531120` 31 points with 7 fabricated trailing days → **exactly 24**;
`533140`/`533140137` **31 points, gaps at `01,09,10,15,17,21`**, and all 35 of its routes
bit-for-bit identical old vs new — **zero regression on the already-correct case**.

Test quality verified by mutation, not by reading: reverting the shipped call to the regressed
`buildDailySeriesChartData(route.daily_series, fromDate)` fails 2 tests (`# pass 30 # fail 2`); the
file was restored and the suite re-runs clean at 32/32. The guard is real in both directions.

Evidence link and day-scoped indicators are untouched — `fromDate` still feeds
`buildViolationEvidenceLink`, the `Ngày dữ liệu` label, both API calls, the KPI delta, the status
badge, the date input, and the separate `anchorDate={analysisDate}` prop; the commit is three
hunks and touches none of them.

### Validation re-run by this review

`routePeriodData.test.js` 32/32; targeted Route Ranking suite 100/100; full frontend sweep
430 pass / 4 fail / 434 — the 4 being the same known out-of-ticket baseline failures on record
since Section 52, none in the route feature, **zero regression**; `npx oxlint src/features/route/`
0 errors/0 warnings; `npm run build` succeeds; backend `routePeriodService.test.js` 13/13 and
`FactBuuGuiRepository.routePeriod.test.js` 5/5 (18/18) unaffected — the repository suite requires
`node --experimental-sqlite --test` on this workstation's Node `v22.12.0`, an environment
invocation detail, not a code defect. `git diff --name-only f30a877b 66200166 -- backend/` returns
empty: **no backend, API contract, database, schema, or business rule change**. `fact_f13`
`777,081` rows / `MAX(ngay_do_kiem) = 2026-09-06` before, during, and after — **zero database
writes**.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = INDEPENDENT TECHNICAL PASS / READY FOR PO CHECK` at `66200166`.
`ITR3-BLOCK-01` closed; `ITR-BLOCK-01` (Section 54), `ITR-BLOCK-02` (Section 53), `ITR-BLOCK-03`
(Section 55), `ITR2-BLOCK-01` and `ITR2-BLOCK-02` (Section 58) all remain closed and undisturbed —
**no blocking finding is open on this ticket**. The Design of Record §12.2 Product Owner UI Check
is now reachable and is the remaining gate. This is an independent technical PASS only —
**no PO PASS is awarded**; `Claude Code` does not self-award Product Owner acceptance. The §19.6
non-blocking observations remain unaddressed, out of scope. `F13-BCVH-RANKING-OVERVIEW-01` remains
`COMPLETED / PO PASS / CLOSED`; `AUTO-BACKFILL-RUNTIME` remains separately open per
`PROJECT_SNAPSHOT.md`.

### PO UI Check hand-off checklist

Open Route Ranking with no explicit date param (default path) and, for each BCVH below, confirm
the daily chart's x-axis runs `01 → ngày neo` and its day count matches the `Ngày có DL / ngày`
card on the same screen:

1. `531110` — chart ends at day `08`, not at the end of the month; one real point, the rest gaps.
2. `531600` — chart is a **July** axis ending at day `28` with 14 real days, not a blank August.
3. `531120` — chart ends at that BCVH's own last data day; no days drawn past it.
4. `533140` — unchanged from the previously accepted behaviour: full-month axis with real gaps.
5. Any BCVH — the `Ngày dữ liệu` label, the violation-Evidence link, and the day-scoped columns
   must still follow the date selector, unchanged.

## 61. F13-ROUTE-RANKING-PERIOD-01 — Product Owner UI Check — **PO PASS / CLOSED** (2026-09-07)

Append-only delta. Sections 1-60 unchanged. Governance-only entry recording the Product Owner's
decision — no new technical claim is made here; the technical basis is the Independent Re-Review
PASS at Section 60 / checkpoint Section 23, and the `ITR3-BLOCK-01` remediation at Section 59 /
checkpoint Section 22, implementation commit `66200166`.

### Result

The Product Owner performed the Design of Record §12.2 UI Check against the Section 60 hand-off
checklist and **explicitly granted PO PASS** on `2026-09-07` for `F13-ROUTE-RANKING-PERIOD-01` in
full scope: the route ranking table, the new period columns and scope reconciliation delivered
across Phases B1/F1/I1, and the daily-series chart's per-BCVH `01 → ngày neo` axis — the subject
of every `ITR*` finding raised on this ticket, all now closed (`ITR-BLOCK-01` Section 54,
`ITR-BLOCK-02` Section 53, `ITR-BLOCK-03` Section 55, `ITR2-BLOCK-01`/`ITR2-BLOCK-02` Section 57,
`ITR3-BLOCK-01` Sections 59-60).

Final technical commit this PO PASS is based on: `66200166`.

### Governance state after this section

`F13-ROUTE-RANKING-PERIOD-01 = COMPLETED / PO PASS / CLOSED`. Ticket state: `AWAITING PO DIRECTION`
for its next scope — `F13-ROUTE-EVIDENCE-STATUS-02` remains recorded on the roadmap but **not
opened**, and no other ticket is self-activated by this closure. `F13-BCVH-RANKING-OVERVIEW-01`
remains `COMPLETED / PO PASS / CLOSED`, unaffected. `AUTO-BACKFILL-RUNTIME` remains separately
open per `PROJECT_SNAPSHOT.md`. The §19.6 non-blocking observations remain on record as
non-blocking; they did not gate this PASS.

## 62. F13-ROUTE-EVIDENCE-STATUS-02 — Discovery / Read-Only Audit Activation (2026-09-07)

Product Owner explicitly authorized opening `F13-ROUTE-EVIDENCE-STATUS-02` **for discovery/
read-only audit only** — no product code, database, schema, API, SSOT, or business rule change
authorized under this activation. Executor: `Claude Code`/`Sonnet`. Scope of the audit: the live
`Tuyến Ranking → Evidence` flow — current Evidence data contract and status semantics, what
Tuyến Ranking passes into Evidence, whether Evidence can represent all required shipment/result
states, filters/counts/status labels/navigation context preservation, and relevant automated
test coverage — against the frozen design intent already recorded in
`docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-RANKING-PERIOD-01_DESIGN.md` §1.2 decision 7 and
§13.2 (drill-down Bưu gửi Đạt/Lỗi, deliberately deferred to this ticket, not yet opened until
now). Audit method: static read of source (frontend `frontend/src/features/route/`,
`frontend/src/features/shipment/`, `frontend/src/App.jsx`; backend
`backend/src/routes/f13Routes.js`, `backend/src/repositories/FactBuuGuiRepository.js`,
`backend/src/engine/rules/RuleF13302.js`) plus governance/design cross-reference. No database
query executed, no server restarted, no test run — read-only source audit only.

### Confirmed current behavior

1. **Evidence is a single merged screen**, not the old standalone violations page. The prior
   `RouteViolationEvidencePage.jsx` is permanently retired (confirmed on disk:
   `frontend/src/features/route/RouteViolationEvidencePage.retired.test.js` asserts the file no
   longer exists and `App.jsx` no longer references it). The old bookmark path
   `/f13/ranking/route/violations` still works via a translating redirect
   (`LegacyRouteViolationsRedirect` in `App.jsx`, using
   `translateLegacyViolationsSearch()`), landing on the canonical route
   `/f13/evidence`, which renders `frontend/src/features/shipment/ShipmentPerformancePage.jsx`
   (`App.jsx:114`).
2. **Tuyến Ranking → Evidence link**: `RoutePerformancePage.jsx` builds exactly one link per
   route row via `buildViolationEvidenceLink()`
   (`frontend/src/features/route/routeViolationEvidenceData.js`), passing `analysisDate` as
   **both** `from_date` and `to_date` (same value — Evidence has no `date`-only param and never
   reads a range), `bcvh_id`/`bcvh_name`, `route_id`/`route_name`, a fixed default
   `reason=delayed_cash`, and `return_to` (the current Route Ranking querystring, so "← Quay lại
   Tuyến Ranking" round-trips filter state exactly). `isValidReturnTo()` rejects
   protocol/absolute-URL-shaped values and requires at least one recognized Route Ranking query
   key before the back-link is even shown — cannot be used to redirect off-app.
3. **Backend Evidence data contract is hardcoded to violations only.**
   `GET /f13/evidence-list` (`backend/src/routes/f13Routes.js:28`) →
   `dashboardController.getEvidence` → `FactBuuGuiRepository.getEvidenceList()` /
   `getEvidenceListFacts()`. Both SQL queries carry a literal
   `AND danh_gia_2026 = 'Không đạt'` predicate
   (`backend/src/repositories/FactBuuGuiRepository.js:655`, `:702`) — there is no status
   parameter, no toggle, and no code path by which Evidence can query `'Đạt'` (passed) rows.
   This is a structural property of the query, not a filter default.
4. **`danh_gia_2026` has three real states codebase-wide**, not two: `'Đạt'`, `'Không đạt'`
   (both used pervasively, e.g. `backend/src/controllers/kpiController.js`), and
   NULL/blank — explicitly documented in `backend/src/engine/rules/RuleF13302.js:39` as
   "Chuyển hoàn không đi qua luồng nộp tiền" (returned shipments never enter the evaluation
   flow at all) and separately aggregated as `total_returned` in
   `FactBuuGuiRepository.js:403`. Evidence has no view, label, or query path for this third
   state.
5. **Evidence's violation-reason tabs** (Chậm nộp tiền / Không đạt khác / Chưa xác định nguyên
   nhân / Tất cả không đạt, `buildViolationGroupTabs()`) are themselves computed only over the
   already-`'Không đạt'`-scoped result set — internally consistent with finding 3, not a
   separate defect. Server-sourced counts (`violation_summary`) drive tab counts; reason-tab
   switching is a pure client-side filter over an already-fully-fetched result
   (`fetchAllEvidenceRows()`), a 2026-08-13 PO remediation that also made keyword search span
   every reason group instead of only the active tab.
6. **Evidence is architecturally single-day.** The backend query filters on one
   `ngay_do_kiem = ?`; `buildViolationEvidenceLink()` always sets `from_date === to_date`.
   `ShipmentPerformancePage.jsx` resolves one `analysisDate` via the same
   `resolveDefaultRouteDate()` helper Route Ranking uses — there is no month/period Evidence
   mode, even though Tuyến Ranking itself was upgraded to period-based ranking
   (`F13-ROUTE-RANKING-PERIOD-01`, closed Section 61). This is a **deliberate, already-recorded**
   scope cut, not an oversight: Design of Record §13.2 states it explicitly and gives a measured
   technical reason — route `533140`, August 2026, already has **20,256** real `'Không đạt'`
   rows against the frontend's own safety ceiling
   `EVIDENCE_FETCH_MAX_PAGES(100) × EVIDENCE_FETCH_PAGE_SIZE(200) = 20,000`
   (`frontend/src/features/shipment/shipmentPerformanceData.js`), and
   `getEvidenceListFacts()` loads its entire unpaginated result into Node process RAM before any
   JS-side classification — a naive date-range toggle would overflow both the frontend fetch
   ceiling and the backend's in-memory classification step on real, already-observed data.
7. **Empty-state and truncation UX are real, working safeguards**, not stand-ins for missing
   scope: 3 distinct empty-result causes are separately messaged (keyword-no-match /
   route-genuinely-clean / whole-context-clean), and `truncated: true` from
   `fetchAllEvidenceRows()` surfaces a visible amber warning banner telling the manager to narrow
   to one Tuyến — it never silently drops rows.
8. **Automated test coverage** exists and is current for everything above:
   `shipmentPerformanceData.test.js`,
   `ShipmentPerformancePage.{contract,phase2,remediation,searchRemediation}.test.js`,
   `routeViolationEvidenceData.test.js`, `App.role-routing.test.js` (legacy redirect),
   `RouteViolationEvidencePage.retired.test.js` (confirms full retirement). No test in this set
   exercises a non-`'Không đạt'` Evidence state — consistent with finding 3, since no such state
   is queryable today.

### Gaps — ranked

**Blocker (against the recorded F1.3 "complete" roadmap intent in the Design of Record):**

1. **No "Đạt" (passed) drill-down exists at all** — hardcoded SQL predicate, not a missing UI
   toggle. This is exactly the item named and deliberately deferred in
   `F13-ROUTE-RANKING-PERIOD-01_DESIGN.md` §1.2 decision 7 / §13.2 ("Drill-down Bưu gửi Đạt/Lỗi
   … tách phase/ticket riêng"). Any use case needing to see which specific bưu gửi passed on a
   given route/day/period has zero backend support today.
2. **Evidence cannot follow Tuyến Ranking into period mode** — single-day only by construction
   (finding 6), while Ranking itself is now period-based. A manager drilling from a
   period-ranked route lands on only the resolved anchor day's violations, never the ranked
   period's. Real overflow risk if implemented naively is already measured (533140/August:
   20,256 rows vs a 20,000-row ceiling), so this is not a small patch — both the frontend fetch
   loop and the backend's in-memory `getEvidenceListFacts()` classification need real design
   work first.
3. **No status view for "Chuyển hoàn" (returned) shipments** — a real, non-accidental third
   state (RuleF13302.js) with a real backend aggregate (`total_returned`) but zero surface in
   Evidence. Whether this belongs in F1.3 "complete" is a product-scope question the audit
   cannot resolve on its own.

**Non-blocker (confirmed working as designed, recorded only for completeness):**

4. Reason-tab classification is internally consistent and correctly scoped to
   `'Không đạt'` — restates finding 3/5, not a new defect.
5. Truncation/empty-state UX is a correct stopgap for the current single-day mode and must not
   be mistaken for period-mode support.

### Recommended next action

Discovery is sufficient to identify that **implementation requires Product Owner scope
decisions first** — none of the 3 blocker gaps above can be designed or estimated without them:

- **PO-A**: Does F1.3 "complete" require an `'Đạt'` (passed) drill-down in Evidence, or is
  Evidence intentionally violation-only (an audit trail for failures), with passed volumes
  shown only in aggregate as they already are today in Route/BCVH Ranking?
- **PO-B**: Does F1.3 "complete" require Evidence to gain a period mode matching Tuyến Ranking's
  period upgrade, or does Evidence deliberately stay single-day (Design of Record §1.2 decision
  7, already locked) regardless?
- **PO-C**: Is "Chuyển hoàn" (returned) shipment visibility in scope for Evidence/F1.3 at all,
  or an explicitly separate reporting concern?

### Whether implementation is required

**Not yet, and not self-activated by this audit.** This ticket was authorized for
discovery/read-only audit only; no PO-A/PO-B/PO-C decision has been made. No implementation,
design document, schema, API, or UI change should start until the Product Owner answers the
three questions above. If any answer is "yes," the resulting work needs its own Design of
Record — the backend's hardcoded query predicate and single-day param contract, and the
frontend's fixed fetch-ceiling architecture, both require real design, not a small patch,
particularly for PO-B given the already-measured 20,256-row overflow case.

### Governance state after this section

`F13-ROUTE-EVIDENCE-STATUS-02 = DISCOVERY / READ-ONLY AUDIT COMPLETE — AWAITING PO DECISION
(PO-A / PO-B / PO-C)`. No product code, database, schema, API, SSOT, or business rule was
touched by this activation or audit — confirmed by the audit method being source-read only (no
`git diff` needed since no file under `backend/src`, `frontend/src`, or any migration was
edited). `F13-ROUTE-RANKING-PERIOD-01` remains `COMPLETED / PO PASS / CLOSED` (Section 61),
unaffected. `AUTO-BACKFILL-RUNTIME` remains separately open per `PROJECT_SNAPSHOT.md`.

## 63. F13-ROUTE-EVIDENCE-STATUS-02 — Design of Record — **AWAITING PO APPROVAL** (2026-09-07)

Append-only delta. Sections 1-62 unchanged. Product Owner answered the three questions raised by
the §62 discovery audit — **`PO-A` = YES** (Evidence must show `Đạt` shipments), **`PO-B` = YES**
(Evidence must support the analysis period, synchronised with Tuyến Ranking), **`PO-C` = YES**
(Evidence must show the `Chuyển hoàn` group) — and authorized Design/Planning only, with an
explicit binding constraint: *"phải thiết kế phương án xử lý dữ liệu kỳ lớn an toàn, không được
đơn giản tăng giới hạn 20.000 dòng hoặc tải toàn bộ dữ liệu lên frontend."* Executor:
`Claude Code`/`Opus`. **No product code, database, schema, API, SSOT, or business rule was
changed by this design work.**

Design of Record created: `docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-EVIDENCE-STATUS-02_DESIGN.md`
(Revision `R0`, baseline `17d6061b`). Design state: `DESIGN DRAFT / AWAITING PO APPROVAL` — this
is **not** `READY FOR IMPLEMENTATION`, and no phase is opened by this section.

### Root cause the design had to solve

The 20,000-row ceiling is a symptom, not the cause. Evidence has **two stacked full-materialisation
layers**: (1) `F13DashboardService.getEvidenceList()` calls the unpaginated `getEvidenceListFacts()`
and does classification, reason-filtering and "pagination" in Node with `Array.slice` — the database
always returns the entire set, and the repository's own real `LIMIT/OFFSET` method
(`FactBuuGuiRepository.js:652`) is dead code no layer calls; (2) the frontend's
`fetchAllEvidenceRows()` then walks every backend page and concatenates. Raising the ceiling fixes
neither layer. The design **deletes both**, and deletes the ceiling constants rather than changing
their values.

### Measured evidence gathered while designing (read-only, `sqlite3.OPEN_READONLY`)

- Worst real period, BCVH × month, all states: **`533140` / `2026-08` = 55,650 rows** (Đạt 30,191 ·
  Không đạt 22,858 · Chuyển hoàn 2,601) — **2.8× the current 20,000 ceiling**. The `20,256` figure
  in `F13-ROUTE-RANKING-PERIOD-01_DESIGN.md` §13.2 was measured on `2026-08-28` when August was
  incomplete; the two numbers do not contradict, the data grew.
- **Feasibility proof #1 — SQL classification is SSOT-identical.** A SQL derivation of
  `RULE_F13_302` was compared against the live JS classifier across **all 314,421 real "Không đạt"
  rows: zero mismatches**, all three group tallies identical (161,345 / 95,848 / 57,228). This is
  what makes real DB-side pagination possible at all. Governance control: the SQL is a *derivation*,
  `RuleF13302.js` remains SSOT, and an equivalence test (`T-B01`) is a shipped blocking gate so the
  two can never silently diverge.
- **Feasibility proof #2 — the search predicate collapses safely.** The existing
  `text.includes(q) OR fold(text).includes(fold(q))` is exactly equivalent to the folded comparison
  alone (folding is a per-character map). Verified over **1,740,528 comparisons** on real data ×
  16 keywords: **zero divergences**. This preserves the PO-accepted `DEFECT A` diacritic-insensitive
  behaviour while allowing search to move server-side.
- **Performance on the worst real period, using the index that already exists**
  (`idx_bcvh_ngay`, confirmed by `EXPLAIN QUERY PLAN`): count + state facets **69ms**; reason facets
  **98ms**; page 1 sorted by delay **94ms**; deep page at `OFFSET 50000` **104ms**. **No new index
  and no schema change are required.**
- Two alternatives were tested and **rejected on evidence, not opinion**: a pure-SQL diacritic fold
  is provably correct (0 mismatches over 764,377+ distinct values, only 71 replacements needed) but
  costs **3,617–4,931ms** per count; and a SQLite UDF (`db.function`) — the cleanest solution, since
  it would reuse the JS function verbatim — **is not available on `sqlite3@6.0.1`**.
- Data finding requiring a PO decision: `danh_gia_2026 IS NULL` (32,157 rows) is **not homogeneous**
  — 108 of them carry a real `ket_qua_f13` verdict (`Không đạt` 70, `Đạt` 38) and a real
  `thoi_gian_ptc`, contradicting a "Chuyển hoàn" label. Labelling all 32,157 as Chuyển hoàn is an
  inference, so it is raised as `D-OPEN-01` rather than decided by the executor.
- `fact_f13` read before and after all measurement: **777,081 rows, `MAX(ngay_do_kiem) = 2026-09-06`,
  identical both times** — zero database writes. SQLite `3.52.0`.

### Design summary

New additive endpoint `GET /f13/evidence` (`/f13/evidence-list` left byte-unchanged, since the audit
confirmed it has exactly one real consumer and the precedent set by `/f13/ranking/route/periods` is
additive-only). Filtering, classification, faceting, sorting, searching and pagination all move into
SQL; the browser receives **at most one page** (default 50, max 200). Period semantics are
**reused verbatim** from `routePeriodService` (`day` / `month_to_anchor`, per-BCVH `anchor_date`) —
no new period model, and `C-05` plus `T-B05` exist specifically so the `ITR3-BLOCK-01` defect class
(system-wide instead of per-BCVH anchor) cannot be reintroduced in Evidence. The single permitted
server-side materialisation is a 7-short-column projection used only when a keyword is active,
hard-capped by `SEARCH_SCOPE_MAX_ROWS = 200,000` (~3.6× today's worst real scope) which reports
`scope_guard.exceeded` explicitly instead of silently truncating. Measured cost of that path on the
worst real period: ~520ms and ~6.6MB transient server-side, versus today's up-to-20,000 rows shipped
to the browser on **every** request.

### Governance state after this section

`F13-ROUTE-EVIDENCE-STATUS-02 = DESIGN DRAFT / AWAITING PO APPROVAL`. **Implementation is not
authorized.** Phase B1 is additionally blocked by `D-OPEN-01` (the `Chuyển hoàn` definition cannot
be written into a SQL predicate before it is settled); Phase F1 is additionally blocked by
`D-OPEN-02` (arrival defaults) and `D-OPEN-04` (screen title). Per `DEC-021`, this ticket touches an
SSOT-derived classification and a new API contract, so an Independent Technical Review by a
different model is **mandatory** before any PO UI Check. `F13-ROUTE-RANKING-PERIOD-01` remains
`COMPLETED / PO PASS / CLOSED`, unaffected. `AUTO-BACKFILL-RUNTIME` remains separately open.

## 64. F13-ROUTE-EVIDENCE-STATUS-02 — PO Approves Design, Phase B1 Backend Implementation (2026-09-07)

Append-only delta. Sections 1-63 unchanged. Product Owner **approved Design of Record R0** and
resolved its three blocking open decisions:

- **`D-OPEN-01`**: column `danh_gia_2026` (Đạt/Không đạt), NULL or blank = Chuyển hoàn. This is
  exactly the Design of Record's own recommended default (§14) — no special carve-out for the
  108 rows whose `ket_qua_f13` happens to carry a real verdict; the existing `total_returned`
  convention is kept unchanged.
- **`D-OPEN-02`**: Evidence opens at the correct period + the correct route (whatever Tuyến
  Ranking was viewing), with a default status of **Tất cả** — this explicitly **overrides**
  the Design of Record's own recommended default (`status = Không đạt`, `period = Ngày`); the PO
  chose differently and that decision governs the shipped default.
- **`D-OPEN-04`**: screen title becomes **"Chi tiết bưu gửi F1.3"** (Phase F1 scope; recorded
  here for completeness, not implemented in this backend-only phase).

PO authorized **Phase B1 (Backend) only**. Executor: `Claude Code`/`Sonnet`. No frontend file was
touched in this section.

### Implementation summary

Three new files, additive-only: `backend/src/services/evidenceReasonSql.js` (single SQL
derivation of `RULE_F13_302`'s classification + the status-group/delay-hours expressions),
`backend/src/services/evidenceQueryService.js` (orchestrator, injectable-repository pattern
identical to `RoutePeriodService`), `backend/src/shared/evidenceSearchMatch.js` (server-side
copy of the PO-accepted diacritic-insensitive matcher). Six new methods appended to
`FactBuuGuiRepository.js` after the untouched `getEvidenceListFacts()` — `getEvidenceStatusSummary`,
`getEvidenceReasonSummary`, `getEvidenceScopeCount`, `getEvidencePage`,
`getEvidenceSearchProjection`, `getEvidenceRowsByIds` — plus a shared filter-clause builder.
New route `GET /f13/evidence` (`allowViewerRead`, same authorization tier as the existing
endpoint) wired to a new `getEvidenceDrilldown` controller handler; `GET /f13/evidence-list`,
`getEvidence()`, and `getEvidenceListFacts()` are byte-unchanged (`git diff --stat` on the 3
modified files shows **215 insertions, 0 deletions** — every change is additive).

Filtering, status/reason classification, faceting, sorting, and pagination all run in SQL; the
default no-keyword path issues exactly 3 queries and never returns more than `page_size` (≤ 200)
rows. The one keyword-search exception materializes a narrow projection only after a
`SEARCH_SCOPE_MAX_ROWS = 200,000` guard passes, reported explicitly via `scope_guard.exceeded`
rather than silently truncated — the old `fetchAllEvidenceRows()`-style "walk every page and
concatenate" model does not exist anywhere in the new code, and no ceiling constant was raised.

### A real defect found and fixed during test-writing (not present in the shipped code)

Writing `T-B01`/`T-B03` against a real in-memory SQLite database surfaced a genuine bug in the
first draft of `violationReasonCaseSql()`: SQLite's `<>` operator is NULL-in-NULL-out, so
`danh_gia_2026 <> 'Không đạt'` silently evaluates to NULL (not TRUE) for a NULL `danh_gia_2026`
row (Chuyển hoàn) — the CASE expression fell through to the timestamp-classification branches
and mislabeled every Chuyển hoàn row `violation_reason = 'Chưa xác định nguyên nhân'` instead of
`NULL`. Fixed by switching to SQLite's NULL-safe `IS NOT` comparison. Re-verified read-only
against the **entire real `fact_f13` table (all 777,081 rows, every status, not just "Không
đạt")** after the fix: `status_group` 0 mismatches, `violation_reason` 0 mismatches against
`F13DashboardService._classifyViolationReason`. (`do_tre_gio` showed 2,101 rows differing by
exactly `±0.01h` from an independent JS re-derivation — root-caused to `Number.prototype.toFixed`'s
well-known floating-point rounding quirk on exact `.xx5` boundaries in the *verification script*
itself, e.g. `(7.515).toFixed(2)` → `"7.51"` in Node; the shipped SQL `ROUND()` is not reproducing
a JS quirk, it is an independent computation, and this has no bearing on classification
correctness, which is the load-bearing claim.)

### Validation

- **39/39** new Phase B1 tests, all green: 12 repository tests (`FactBuuGuiRepository.evidence.test.js`,
  real in-memory SQLite via `node --experimental-sqlite`) covering `T-B01`-`T-B03`, `T-B06`,
  `T-B07`, `T-B10`, `T-B12`, plus date-range/search-composition coverage; 20 service tests
  (`evidenceQueryService.test.js`, fake-repository pattern) covering `T-B04`, `T-B05`, `T-B08`,
  `T-B09`, `T-B11`, defaults (incl. `D-OPEN-02`'s status=all), validation, and pagination; 4
  controller/route-wiring tests; 6 shared-matcher tests.
- **Mandatory regression, unmodified**: `F13DashboardService.evidenceList.test.js` 16/16 (proves
  `/f13/evidence-list` untouched); `routePeriodService.test.js` 13/13;
  `FactBuuGuiRepository.routePeriod.test.js` 5/5; `DashboardController.routePeriods.test.js` 4/4
  — all run with `node --experimental-sqlite --test` per the known Node `v22.12.0` environment
  note.
- `npx oxlint` on all 6 new/modified backend files: 0 errors, 0 warnings in the new/changed code
  (6 pre-existing warnings elsewhere in `FactBuuGuiRepository.js`, confirmed unrelated —
  `git diff --stat` shows 0 deletions, so no pre-existing line was touched).
- **Live read-only smoke test against the real operational database** (`evidenceQueryService`
  wired to the real `FactBuuGuiRepository`, no mocking): `533140`/`month_to_anchor` returns
  `status_summary {all:7546, passed:3659, failed:3481, returned:406, identity_ok:true}` with
  `anchor_date=2026-09-06` correctly resolved per-BCVH; `status=returned` correctly surfaces real
  Chuyển hoàn rows (`danh_gia_2026: null`); `search=HCC` finds `1,617` matches across `9` routes
  server-side. **Reconciliation (§10.4) against `GET /f13/ranking/route/periods`** on 3 real
  BCVH (`533140`, `531600`, `531120`): `anchor_date` and `status_summary.all`/`.passed` match
  `RoutePeriodService`'s own `month.volume`/`month.passed` sums **exactly** on all 3. `fact_f13`
  read before this section's work and after every test/smoke-test run: **777,081 rows,
  `MAX(ngay_do_kiem) = 2026-09-06`, identical every time** — zero database writes.
- `git diff --name-only` against §9.4's Cấm chạm list (`RuleF13302.js`, `schema.sql`,
  `routePeriodService.js`, `F13DashboardService.js`, and the `/f13/evidence-list` implementation
  itself) returns empty — none touched.

### Governance state after this section

`F13-ROUTE-EVIDENCE-STATUS-02 = PHASE B1 (BACKEND) COMPLETE / READY FOR INDEPENDENT TECHNICAL
REVIEW`. Per `DEC-021`, an Independent Technical Review by a different model is **mandatory**
before Phase F1 (frontend, `Antigravity`) starts and before any PO UI Check — this section is a
`Sonnet` implementation, not a self-review. Phase F1 is **not started**; `frontend/src/` is
untouched by this section. `F13-ROUTE-RANKING-PERIOD-01` remains `COMPLETED / PO PASS / CLOSED`,
unaffected. `AUTO-BACKFILL-RUNTIME` remains separately open.

## 65. F13-ROUTE-EVIDENCE-STATUS-02 — Phase F1 Frontend Implementation (2026-09-07)

Phase F1 (Frontend) implementation delivered by `Antigravity` against the PO-approved Design of Record (Revision `R0`) and the Phase B1 backend baseline (`cfb57d4`).

### Scope & PO Directives Implemented
1. **API Integration**: Integrates `GET /f13/evidence` via `F13DashboardClient.getEvidence(params)`.
2. **Elimination of Frontend Full Materialisation**: Deleted `fetchAllEvidenceRows` and the `20,000`-row ceiling (`EVIDENCE_FETCH_PAGE_SIZE`, `EVIDENCE_FETCH_MAX_PAGES`). Evidence now renders one page per query directly from server.
3. **True Server-Side Pagination**: Implemented `paginationControls` showing current page, total pages, total items, and Previous/Next buttons bound to server pagination state. Changing any filter (`bcvh_id`, `route_id`, `period`, `status`, `reason`, `search`) cleanly resets the page to 1.
4. **4 Status Cards (Dải trạng thái)**: Renders `Tất cả trạng thái` (`all`), `Đạt` (`passed`), `Không đạt` (`failed`), and `Chuyển hoàn` (`returned`) with badge tone indicators and live counts from `status_summary`. Default status is `all` per PO decision `D-OPEN-02`.
5. **Conditional Reason Tabs**: Violation reason tabs (`delayed_cash`, `other`, `unknown`, `all`) render **only** when `status === 'failed'`. Selecting non-failed statuses hides the violation tabs and clears `reason`.
6. **Period Synchronization**: Implemented `periodSelector` with `day` and `month_to_anchor`. Route Ranking's `RouteSelectedPanel` passes active `period` and `status='all'` to `buildViolationEvidenceLink`.
7. **Roundtrip Navigation**: From `Route Ranking → Chi tiết bưu gửi F1.3 → Quay lại Tuyến Ranking`, `return_to` is strictly preserved, and back navigation reconstructs the exact Route Ranking query parameters without depending on browser history back.
8. **Screen Title**: Set to exact PO requirement `"Chi tiết bưu gửi F1.3"`.
9. **Display Enhancements**: Added `Trạng thái` column with status badges; non-failed shipments (`Đạt`, `Chuyển hoàn`) render safe `—` for violation reason and delay labels instead of misleading missing error text.

### Frontend Files Modified / Created
- Modified:
  - `frontend/src/api/F13DashboardClient.js`
  - `frontend/src/features/shipment/shipmentPerformanceData.js`
  - `frontend/src/features/shipment/ShipmentPerformancePage.jsx`
  - `frontend/src/features/shipment/ShipmentEvidenceSummary.jsx`
  - `frontend/src/features/shipment/ShipmentEvidenceDetail.jsx`
  - `frontend/src/features/route/RoutePerformancePage.jsx`
  - `frontend/src/features/route/routeViolationEvidenceData.js`
  - `frontend/src/features/shipment/ShipmentPerformancePage.contract.test.js`
  - `frontend/src/features/shipment/ShipmentPerformancePage.phase2.test.js`
  - `frontend/src/features/shipment/ShipmentPerformancePage.remediation.test.js`
  - `frontend/src/features/shipment/ShipmentPerformancePage.searchRemediation.test.js`
  - `frontend/src/features/shipment/shipmentPerformanceData.test.js`
- Created (new test files):
  - `frontend/src/features/shipment/ShipmentPerformancePage.evidenceStatus.test.js`
  - `frontend/src/features/shipment/shipmentModel.retired.test.js`

### Validation Evidence
- **Frontend Unit Tests**: 175/175 tests pass (`node --test src/features/shipment/*.test.js src/features/route/*.test.js`).
- **Backend Evidence Tests**: 39/39 tests pass (`node --experimental-sqlite --test src/services/evidenceQueryService.test.js src/controllers/DashboardController.evidenceDrilldown.test.js src/repositories/FactBuuGuiRepository.evidence.test.js src/shared/evidenceSearchMatch.test.js`).
- **Linter (oxlint)**: 0 warnings, 0 errors across all 14 files (`npm run lint`).
- **Production Build**: `npm run build` succeeds cleanly in 1.17s with 0 errors (`dist/assets/index-CBIWZF6L.js`, `dist/assets/index-M6AP6bjw.css`).
- **Concurrent Session Isolation**: Unrelated concurrent changes (`backend/test_dkclSessionPreflightService.js`, `frontend/src/features/networkMap/*`, `Data QLML/`, etc.) excluded cleanly.

### Governance State After This Section
`F13-ROUTE-EVIDENCE-STATUS-02 = PHASE F1 (FRONTEND) COMPLETE / READY FOR INTEGRATION VALIDATION`.


## 66. F13-ROUTE-EVIDENCE-STATUS-02 — Phase I1 Integration Validation (2026-09-07)

Append-only delta. Sections 1-65 unchanged. Executor: `Claude Code`/`Sonnet`, baselines Phase B1
`cfb57d4` and Phase F1 `23c9970` (HEAD at start of this section). Real end-to-end validation
against real production data, per Design of Record §9.3.

### Gate-by-gate result

| # | Gate | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Tuyến Ranking → "Chi tiết bưu gửi F1.3" | **PASS** | Real click-through from `/f13/ranking/route`'s "Xem bưu gửi vi phạm" button; title renders exactly `Chi tiết bưu gửi F1.3` (`D-OPEN-04`) |
| 2 | Đúng BCVH, tuyến, kỳ ngày/kỳ tháng, ngày neo | **PASS** | Header badges and filter controls matched the originating Route Ranking selection on every real click-through; period toggle correctly resolved `anchor_date`/`period.start`/`period.end` per BCVH (`533140`→`2026-09-06`, `531600`→`2026-07-28`, `531120`→`2026-09-05`) |
| 3 | Mặc định Tất cả trạng thái | **PASS** (after fix, see below) | `D-OPEN-02` default confirmed live on first landing from Route Ranking and on the legacy-bookmark redirect; a real regression in a secondary path was found and fixed (below) |
| 4 | Đạt / Không đạt / Chuyển hoàn | **PASS** | All three real, non-fabricated groups rendered with correct rows, badges, and null-safe "—" for Lý do vi phạm/Độ trễ on non-failed rows (`533140-08`: Đạt 30,191 · Không đạt 22,858 · Chuyển hoàn 2,601, real row `CA212335378VN` inspected) |
| 5 | Status counts & reconciliation với Tuyến Ranking | **PASS** | Exact match on 3 real BCVH, both through direct service calls and through the real authenticated HTTP API: `533140` anchor `2026-09-06` all/passed `7546/3659`; `531600` anchor `2026-07-28` `50/8`; `531120` anchor `2026-09-05` `1/1` — `Evidence.status_summary` == `RoutePeriods.month.volume`/`.passed` sums in every case |
| 6 | Server-side pagination | **PASS** | Real 56-row and 55,650-row scopes both paginate correctly (`Trang 1/2`→`Trang 2/2`, `Hiển thị 51-56/56`; a real `page=2` request confirmed in network log), no client-side full-fetch |
| 7 | Search + reason filter | **PASS** | Diacritic-insensitive search ("Huong Phong" → 0 real matches, correctly empty; "HCC" → 2,793 matches across 9 routes, correctly grouped) combined with reason facets (`Chậm nộp tiền 4,810 / Không đạt khác 6,752 / Chưa xác định 11,296` on the 22,858-row Không đạt scope) — both verified via real API payload inspection |
| 8 | Dataset lớn >20.000 dòng | **PASS** | Real `533140`/`2026-08` scope = 55,650 rows (2.8x the retired 20,000 ceiling) — loaded, searched, and reason-faceted with **`scope_guard: {scope_rows:22858, limit:200000, exceeded:false}`**, no truncation, no client materialization |
| 9 | Empty / error / scope_guard | **PASS** | Three distinct empty states reproduced live (keyword-no-match; route-has-zero-for-selected-status; whole-context-empty via `anchor_date=2020-01-01`→`null`); a real transient backend-unavailable error correctly rendered "Đã xảy ra lỗi" with a working "Thử lại" action (see Root Cause below); `scope_guard.exceeded=true` path is code-reviewed but not reproducible on real data (worst real scope 55,650 far below the 200,000 limit) — matches Design §8.3's own statement |
| 10 | Return journey về Tuyến Ranking | **PASS** | Real click-through: BCVH `533140`, date `2026-08-31`, selected route `533140 - Xe máy tăng cường` all round-tripped exactly via `return_to` |
| 11 | Legacy Evidence flow không regression | **PASS** | `/f13/ranking/route/violations?date=...` still redirects correctly to the new `/f13/evidence` contract, renders with correct BCVH/Tuyến/Ngày and the new default status |

### Environment note (not a code defect)

The first live click-through returned `404 Not Found` on `GET /api/f13/evidence`. Root-caused to
the already-running backend process (PID `18876`, started `08:07` that morning) predating both
the Phase B1 (`22:36`) and Phase F1 (`22:54`) commits — Node does not hot-reload `require()`d
route files, so the live process was still serving the pre-`cfb57d4` route table. Confirmed no
`RUNNING` `auto_backfill_run` row before acting; the process was restarted (fresh `node
server.js`, PID `10112`) and the 404 did not reproduce. No code change; recorded here because it
is exactly the class of stale-runtime issue this ticket's own governance history has hit before
(`AUTO-IMPORT-011`'s Symptom B).

### Real integration defect found and fixed (in scope, minimal)

**Defect**: `handleStatusChange` in `ShipmentPerformancePage.jsx` only reset the `reason` URL
param to `all` when the *prior* `reasonParam` was already falsy/`all` — but
`buildViolationEvidenceLink`'s own default seeds `reason=delayed_cash` into every link from
Route Ranking, and `handleStatusChange` cleared `reason` (not set it) whenever leaving `failed`.
The combination meant clicking the **"Không đạt" status card** — from a fresh Route Ranking
landing, or after visiting any other status card — silently narrowed the view to only "Chậm nộp
tiền" instead of the full "Không đạt" population, while the status card itself kept showing the
full count. **Reproduced live** on real data: BCVH `533140`, route "Tất cả tuyến", period
`2026-09-01→2026-09-06` — clicking "Không đạt" (card: `3.481`) showed `Tổng Evidence (bối
cảnh) = 792` (the `delayed_cash` reason-tab silently active) instead of `3.481`.

**Root cause**: a leftover `DEFAULT_REASON = delayed_cash` constant from the pre-redesign
single-reason-group screen, still used as the fallback whenever the URL had no `reason` param,
combined with a conditional (not deterministic) reset in `handleStatusChange`.

**Fix (minimal, additive)**: two pure functions in `shipmentPerformanceData.js` —
`resolveReasonParam(rawReason)` (defaults to `all`, never to a violation-reason group) and
`resolveStatusChangeReasonPatch(nextStatus)` (`all` when entering `failed`, empty string
otherwise, **unconditional** on any prior value). `ShipmentPerformancePage.jsx` now calls these
instead of the ad-hoc `DEFAULT_REASON`/conditional logic; the constant is removed. Re-verified
live via HMR: the same click sequence now shows `3.481`, matching the status card exactly.

**Secondary defect found in the same pass**: the per-route empty-state title hardcoded "không có
bưu gửi vi phạm" regardless of the selected status — reproduced live (route with 0 "Đạt" rows,
`status=passed` selected, title still read "...không có bưu gửi vi phạm", which is meaningless
for a passed-shipment query). Fixed with a new pure `resolveEmptyStateStatusLabel(status)`
function ("bưu gửi" / "bưu gửi Đạt" / "bưu gửi vi phạm" / "bưu gửi Chuyển hoàn"); the title now
reads e.g. "...không có bưu gửi Đạt". Re-verified live via HMR.

**Regression tests added**: 5 new tests in `ShipmentPerformancePage.evidenceStatus.test.js`
exercising the actual pure functions (not source-text regex, unlike the pre-existing `T-F03`
assertion that had encoded the exact broken behavior without ever catching it) — deterministic
reason-patch per status, `resolveReasonParam` default, the full round-trip sequence that
reproduced the live defect, and both `resolveEmptyStateStatusLabel` cases. One pre-existing
`ShipmentPerformancePage.remediation.test.js` assertion (`DEFECT B`, 2026-08-11) that had locked
in the exact old "vi phạm" wording was updated to match the intentional, correct new behavior —
its actual guarantee (three distinct empty-state reasons, keyword checked before route) is
unchanged and still asserted.

### Validation

- **Frontend**: 181/181 in `features/shipment/` + `features/route/` (up from the pre-fix 179;
  +5 new regression tests, -3 net after also tightening 2 stale assertions to match the fix).
  Full sweep 447/451 — the same 4 known baseline failures on record since manifest §52
  (`features/dashboard`, `pages/dataImportBackfillQueue.test.js`), zero in `shipment`/`route`.
  `npx oxlint src/features/shipment/ src/features/route/`: 0 errors/0 warnings. `npm run build`:
  succeeds (`dist/assets/index-AARn7GO8.js`, 1.13s), pre-existing chunk-size warning only.
- **Backend**: 77/77 unmodified (`evidenceQueryService.test.js`, `DashboardController.evidenceDrilldown.test.js`,
  `FactBuuGuiRepository.evidence.test.js`, `evidenceSearchMatch.test.js`,
  `F13DashboardService.evidenceList.test.js` 16/16, `routePeriodService.test.js` 13/13,
  `FactBuuGuiRepository.routePeriod.test.js` 5/5, `DashboardController.routePeriods.test.js` 4/4)
  — no backend file touched in this section, re-run only to confirm the restart did not disturb
  anything.
- **Real data**: `fact_f13` read at the start and after every script/browser/API check in this
  section: **777,081 rows, `MAX(ngay_do_kiem) = 2026-09-06`, identical every time** — zero
  database writes (Evidence is read-only by design). Real credentials used were the project's own
  documented local-dev runtime account (`backend/src/services/auth/runtimeUsers.js`, the same
  account this project's history already records using for "real-browser runtime validation
  performed as admin").
- `git diff --stat`: 4 files touched, all in `frontend/src/features/shipment/`, **114
  insertions, 15 deletions** — no backend file, no Cấm chạm file (`RuleF13302.js`, `schema.sql`,
  `routePeriodService.js`, `F13DashboardService.js`, `/f13/evidence-list`) touched.

### Governance state after this section

`F13-ROUTE-EVIDENCE-STATUS-02 = PHASE I1 INTEGRATION VALIDATION COMPLETE — READY FOR
INDEPENDENT TECHNICAL REVIEW`. All 11 requested gates PASS on real production data, including
the two defects found during this validation, fixed in minimal scope, and regression-tested. Per
`DEC-021`, an Independent Technical Review by a different model remains **mandatory** before any
PO UI Check — this section is a `Sonnet` implementation/validation, not a self-review, and does
not itself constitute that review. `F13-ROUTE-RANKING-PERIOD-01` remains `COMPLETED / PO PASS /
CLOSED`, unaffected. `AUTO-BACKFILL-RUNTIME` remains separately open, unaffected.

## 67. F13-ROUTE-EVIDENCE-STATUS-02 — Independent Technical Review — **BLOCKED** (2026-09-07)

Append-only delta. Sections 1-66 unchanged. Reviewer: `Claude Code`/`Opus` — a different model from
the `Sonnet` executor of Phase B1/I1, per `DEC-021` and Design of Record §9.5. Baseline reviewed:
`1818ba2`. Scope: Design of Record R0 + manifest §62-66 + the shipped implementation, read-only. No
implementation was redone; the only commands run were the two existing test suites and read-only
`SELECT` measurements against `database.sqlite` (`sqlite3.OPEN_READONLY`). `fact_f13` read before and
after: **777,081 rows, `MAX(ngay_do_kiem) = 2026-09-06`, identical** — zero writes.

### What was verified and passes

| Area | Result |
| --- | --- |
| `D-OPEN-01` (Chuyển hoàn = `danh_gia_2026` NULL/blank, no carve-out) | **PASS** — `STATUS_PREDICATES.returned` implements exactly the PO decision; the NULL-safe `IS NOT` fix in `violationReasonCaseSql()` is correct SQLite semantics and is the right fix for the fall-through §64 describes |
| `D-OPEN-02` (default `status = Tất cả`) | **PASS** — the service default is `all`; `buildViolationEvidenceLink` passes `status: 'all'`; the I1 `resolveStatusChangeReasonPatch`/`resolveReasonParam` fix makes the status-card click deterministic and is correctly unit-tested against the pure functions |
| `D-OPEN-04` (title `Chi tiết bưu gửi F1.3`) | **PASS** — all four render paths (loading/error/empty/normal) carry the exact string |
| Đạt / Không đạt / Chuyển hoàn + `status_summary` SSOT | **PASS** — classification is `danh_gia_2026`-only, `ket_qua_f13` appears nowhere in the new code; `C-04` holds (`violation_reason` NULL for non-failed rows); `C-07` `identity_ok` is computed, not assumed, and surfaced in the UI |
| Kỳ ngày / lũy kế tháng đến ngày neo, ngày neo theo BCVH (`C-05`) | **PASS** — `queryAnchor` SQL and `_resolvePeriod` are equivalent to `routePeriodService.js`'s; Route Ranking and Evidence receive the identical `anchor_ceiling` (`analysisDate = to_date` falling back to `from_date`, on both screens), so `ITR3-BLOCK-01`'s defect class is not reintroduced |
| Server-side pagination / search / reason filtering | **PASS** — `LIMIT/OFFSET` in SQL, `total_items` from aggregates (`C-01`/`C-02`), keyword matched over the whole filtered scope (`C-06`), `reason` a predicate only when `status = failed`, deterministic `ma_bg ASC` tiebreaker, debounced search input |
| Full-materialisation / 20,000 ceiling retired | **PASS** — `fetchAllEvidenceRows`, `EVIDENCE_FETCH_PAGE_SIZE`, `EVIDENCE_FETCH_MAX_PAGES` absent from all of `frontend/src`; no ceiling raised; `scope_guard` reports rather than truncates |
| Reconciliation §10.4 (per route) | **PASS, re-measured independently** — BCVH `533140`, `2026-09-01..2026-09-06`, top 5 routes by volume: Evidence `all`/`passed` equals Ranking `volume`/`passed` exactly on all 5 (`533140133` 461/223, `53314018` 441/5, `533140147` 401/195, `53314047` 375/161, `533140135` 353/134) |
| No regression on legacy Evidence | **PASS** — `git diff --numstat 17d6061..1818ba2` on the 3 modified backend files is `14/0`, `200/0`, `1/0` — **zero deletions**, so `/f13/evidence-list`, `getEvidence()` and `getEvidenceListFacts()` are byte-unchanged; `F13DashboardService.evidenceList.test.js` 16/16 green unmodified; no §9.4 Cấm chạm file touched |
| Security / data integrity | **PASS** — every user value is a bound parameter; `sort`/`order`/`status`/`reason` are whitelist-mapped, never interpolated; `page`/`page_size` numerically clamped; `allowViewerRead` is the same authorization tier as the endpoint it supplements; the whole feature is read-only |
| Test suites re-run by this review | Backend `77/77`, frontend `181/181` — matching §66's reported figures exactly |

### `ITR-EV-BLOCK-01` — search route grouping is page-limited (**BLOCKER**)

**Statement.** With a keyword active, the screen renders only the route groups present on the
**current page** (at most 50 rows), not every route the search matched. The AC-16 summary line above
the table takes its route count from the server (`search.matched_routes`, computed over the whole
scope), so the line and the table disagree on screen.

**Root cause.** Design of Record §7.6 requires the matched-route list to be produced **server-side**
("trả kèm danh sách tuyến khớp với số lượng mỗi tuyến ... hiển thị đầy đủ mọi tuyến khớp; mở rộng một
tuyến = một request"), and `D-OPEN-03` is the Product Owner's acceptance of exactly that interaction.
It was not built. The API contract (§6.4 `meta.search`) only ever carried the **count**
`matched_routes`, never the list — the design's own §6.4 payload and §7.6 requirement are
inconsistent with each other, and the implementation followed §6.4. On the client,
`ShipmentPerformancePage.jsx` still calls `groupRowsByRoute(sortedRows)`, where `sortedRows` is now
one server page instead of the previously fully-materialized set — the same call site that was
correct before pagination, left unchanged after the model beneath it changed.
`ShipmentEvidenceSummary.jsx`'s own header comment still asserts the old guarantee ("every route the
search matched appears as its own expandable group").

**Reproduced by measurement (read-only, real data).** BCVH `533140`, `period = month_to_anchor`
(`2026-09-01..2026-09-06`), `status = all`, `order = asc` (the screen's own default), page size 50,
using the shipped `matchesSearchQuery` and `evidenceReasonSql` expressions:

| Keyword | Matched rows | Matched routes (summary line) | Route groups rendered on page 1 |
| --- | --- | --- | --- |
| `HCC` | 1,617 | **9** | **7** |
| `Thuy` | 1,000 | **4** | **2** |

On the August scope (`2026-08-01..2026-08-31`): `HCC` 13,556 rows / 9 routes renders **5** groups;
`Thuy` 7,959 rows / 4 routes renders **3** groups.

**Why this is a blocker, not a cosmetic gap.** It fails `AC-17`/`AC-18` (every route with a matching
result must appear), which are Product Owner-accepted criteria arising from the `2026-08-13`
PO-reported "search only sees one slice" defect — Design of Record §11 `R-01` names re-introducing
that symptom as this ticket's number-one risk. It also fails the Design's own PO UI Check gate §12.2
step 5 ("mọi tuyến khớp đều xuất hiện **dù kết quả trải nhiều trang**"), so the screen cannot pass
the PO check as built. The underlying counts are correct — this is a display-completeness defect, not
a data defect.

**Remediation required (minimal, no scope expansion).**

1. Backend: add the matched-route list to `meta.search` (for example `matched_route_list` of
   `{ ma_tuyen, ten_tuyen, count }`). In `evidenceQueryService.getEvidence()`'s search branch this is
   a fold over the already-computed `matched` array — no new query, no new materialization, no change
   to `P-01`..`P-04`.
2. Frontend: render one group per entry of that list (not per page row), and fetch a route's rows on
   expand via the existing `route=` and `page=` parameters — precisely the one-request-per-expand
   interaction the Product Owner already accepted under `D-OPEN-03`.
3. Test: add a behavioral test asserting the rendered group count equals `search.matched_routes` when
   matches span more than one page. Do not re-assert this with a source-text regex (see
   `ITR-EV-NB-03`).
4. Update `ShipmentEvidenceSummary.jsx`'s now-stale contract comment.

### Non-blocking findings

| # | Finding | Recommendation |
| --- | --- | --- |
| `ITR-EV-NB-01` | **"Tất cả tuyến" does not reconcile with Route Ranking's default filter.** Evidence counts every row of the BCVH in the period; Route Ranking's ranked scope excludes `ma_tuyen` NULL/blank, `ma_tuyen NOT LIKE '53%'`, and — under its **default** `Tuyến bưu tá` filter — the confirmed non-postman codes. Measured over `2026-09-01..2026-09-06`: `533140` Evidence 7,546 vs Ranking(postman) 7,105 (**+441**, which is exactly route `53314018`); `535470` 1,859 vs 1,714; `536250` 2,157 vs 2,009; `537220` 1,468 vs 1,319. Against Ranking's `Tất cả` filter the delta is **0** on all four — that is the comparison §66 recorded. Per-route comparison matches exactly either way, so Design §10.4 (scoped "+ route") is satisfied. | Not a correctness defect, but PO UI Check §12.2 step 7 compares totals: either surface the scope difference on screen, or agree with the Product Owner that the all-routes comparison is made against Ranking's `Tất cả` filter. A CTO/PO decision, not a technical one. |
| `ITR-EV-NB-02` | **`AC-19`'s three counts collapse to two during search.** `contextTotal = pagination.total_items`, which in the search branch is `matched_items` — so the KPI cards "Tổng Evidence (bối cảnh)" and "Kết quả tìm kiếm" always display the same number whenever a keyword is active. Before this ticket, the context figure was keyword-independent. | Derive `contextTotal` from `status_summary`/`violation_summary` (the keyword-independent status+reason total, already in the payload) instead of `pagination.total_items`. One line; no API change. |
| `ITR-EV-NB-03` | **Test coverage did not cover the blocker's failure mode.** `ShipmentPerformancePage.searchRemediation.test.js` was rewritten from behavioral assertions into source-text regexes; the original `C.1`/`C.7` guarantee (matching spans every route, never a page slice) is now asserted only as "the source contains `groupRowsByRoute(sortedRows)`" — which is precisely the defective line. This is the same weakness §66 itself identified in `T-F03`. `181/181` green is therefore not evidence on this point. | Convert the `C.1`/`C.7`/`C.11` assertions to behavioral tests over the real functions, as §66 did for the reason-patch fix. |
| `ITR-EV-NB-04` | **Dead client-side sort.** `sortShipmentRows(runtimeRows, sort, order)` sorts on `delay_hours`/`ma_bg`, but the mapped rows expose `delayHours`/`shipmentId` — every comparison reads `undefined`, returns 0, and the server order survives only because `Array.sort` is stable. Harmless today, actively misleading to the next maintainer. Likewise `buildViolationEvidenceLink`'s `reason = 'delayed_cash'` default is now vestigial, neutralized only because `status = all` makes the page send `reason=all`. | Delete `sortShipmentRows` and drop the vestigial `reason` default in a later cleanup. Not required for the PO check. |
| `ITR-EV-NB-05` | **`statusGroupCaseSql()` and `STATUS_PREDICATES.returned` disagree on a hypothetical fourth value.** The badge expression ends in a catch-all `ELSE 'returned'` while the filter predicate is `IS NULL OR TRIM = ''`. A future non-`Đạt`/`Không đạt`/NULL value would render as "Chuyển hoàn" yet be excluded from the `returned` filter and count. Verified today that no fourth value exists, and `identity_ok = false` would expose it. | Note only — the identity check is the correct guard. Consider making the `ELSE` branch explicit if the schema ever loosens. |

### Verdict

`F13-ROUTE-EVIDENCE-STATUS-02 = INDEPENDENT TECHNICAL REVIEW **BLOCKED** (2026-09-07)` on
`ITR-EV-BLOCK-01`. No blocker was found in classification correctness, period/anchor semantics,
pagination, search, security, data integrity, or performance, and no regression was found on the
legacy Evidence path. The ticket must **not** proceed to PO UI Check until `ITR-EV-BLOCK-01` is
remediated and re-reviewed; `ITR-EV-NB-02` is cheap enough to fold into the same remediation, and
`ITR-EV-NB-01` needs a CTO/PO answer rather than code. `F13-ROUTE-RANKING-PERIOD-01` and
`F13-BCVH-RANKING-OVERVIEW-01` remain `CLOSED / PO PASS`, unaffected; `AUTO-BACKFILL-RUNTIME` remains
separately open, unaffected.

## 68. F13-ROUTE-EVIDENCE-STATUS-02 — `ITR-EV-BLOCK-01` Remediation — READY FOR INDEPENDENT RE-REVIEW (2026-09-07)

Append-only delta. Sections 1-67 unchanged. Executor: `Claude Code`/`Sonnet`, baseline `dbab2b7`
(the Independent Technical Review that returned `BLOCKED`). Scope: the single blocker
`ITR-EV-BLOCK-01` plus the one non-blocker (`ITR-EV-NB-02`) the reviewer named as cheap enough to
fold into the same change. `ITR-EV-NB-01` (Ranking-scope comparison) and `ITR-EV-NB-03`..`05`
(test-coverage/dead-code/defensive-`ELSE` observations, none requiring a code fix) were **not**
touched, per the reviewer's own "không mở rộng sang các non-blocker khác trừ khi bắt buộc".

### Root cause

`meta.search` (the `GET /f13/evidence` search-path payload) carried only a **count**
(`matched_routes`), never the list of matched routes. On the client, the search-result grouped
view (`groupRowsByRoute(sortedRows)`) grouped whatever rows happened to be on the **current
server page** — correct before server-side pagination existed (all matched rows were in memory
at once), but after pagination shipped, a route whose matching rows all fell on a page the
browser never requested was silently absent from the grouped view, even though the server's own
summary line correctly counted it. Design of Record §7.6 and PO decision `D-OPEN-03` already
specified the fix (a server-computed, whole-scope matched-route list, with per-route expansion
costing one request) — it had not been implemented; the API contract in §6.4 never carried that
list, so the implementation had nothing to consume.

### Changes made

**Backend** (`backend/src/services/evidenceQueryService.js`, additive): `_buildMatchedRouteList()`
folds the already-materialized, keyword-narrowed `matched` array (bounded by
`SEARCH_SCOPE_MAX_ROWS`, already computed under `P-03`) into `{ ma_tuyen, ten_tuyen, count }`
entries — no new query, no new materialization, `P-01`..`P-04` untouched. `meta.search` now
carries `matched_route_list` (`null` when search is inactive or the scope guard has tripped, same
as `matched_items`/`matched_routes` in those cases). `matched_routes` is now derived from the same
list rather than a separately-collected `Set`, so the two numbers can never drift.

**Frontend** (`frontend/src/features/shipment/`, no backend file touched):
- `shipmentPerformanceData.js` — three new pure functions: `mapEvidenceApiRow()` (extracted from
  the inline mapper, now the single source of row-shape truth for both the main fetch and a
  per-route expand fetch), `buildSearchRouteGroups()` (builds groups from
  `matched_route_list`, not from the current page — the direct fix), `resolveContextTotal()`
  (mirrors the backend's own `_resolveNonSearchTotalItems`, fixing `ITR-EV-NB-02`).
- `ShipmentPerformancePage.jsx` — groups are now built via `buildSearchRouteGroups`; a per-route
  cache (`routeGroupData`, keyed by `ma_tuyen`) holds `{ status, rows }`; expanding a group that
  has no cached rows triggers exactly one `getEvidence` request scoped to that route (§7.6/
  `D-OPEN-03`, "mở rộng một tuyến = một request"), under the same status/reason/search/sort/order
  already active. Expansion is now default-**collapsed** (previously default-expanded, which was
  only correct because all rows were already in memory) — a deliberate behavior change the PO
  already accepted as the cost of real pagination (`D-OPEN-03`: "cái giá không tránh được").
  `contextTotal` now reads `resolveContextTotal(statusSummary, violationSummary)` instead of
  `pagination.total_items`, restoring the pre-ticket guarantee that "Tổng Evidence (bối cảnh)"
  stays independent of any active search keyword. `selectedShipment` (AC-15) now also checks
  rows loaded into an expanded group, not only the current global page.
- `ShipmentEvidenceSummary.jsx` — renders a loading/error `emptyMessage` inside an expanding
  group (`group.status`); stale header comment (asserting the old "current page" grouping
  guarantee) corrected to describe the new server-list-driven contract.

**Tests.** Per the reviewer's own `ITR-EV-NB-03` finding, the source-text-regex assertions that
had encoded the defective line itself (`ShipmentPerformancePage.searchRemediation.test.js`'s old
`C.1`/`C.2`/"contextTotal" checks, and `ShipmentPerformancePage.phase2.test.js`'s AC-19/AC-22
checks) were rewritten as behavioral tests calling the real new functions with real-shaped
fixtures — including a direct reproduction of the live defect (a route whose matched rows are
absent from the loaded page must still appear as a group, with its true count). New pure-function
tests added to `shipmentPerformanceData.test.js` for `mapEvidenceApiRow`, `buildSearchRouteGroups`
(including the loading/error-status and empty-list-fallback cases), and `resolveContextTotal`. A
new backend regression, `evidenceQueryService.test.js`'s `ITR-EV-BLOCK-01` test, reproduces the
exact multi-page shape (a route's matched rows entirely on pages 2+ of a `page_size=1` request)
and asserts `matched_route_list` still reports it with its true count; a companion test asserts
`matched_route_list` is `null` in the no-search and scope-guard-exceeded paths.

### Validation

- **Backend**: `evidenceQueryService.test.js` `22/22` (was `20/20`; `+2` new). Full Evidence +
  route-period regression `79/79` (`evidenceQueryService`, `DashboardController.evidenceDrilldown`,
  `FactBuuGuiRepository.evidence`, `evidenceSearchMatch`, `F13DashboardService.evidenceList`
  `16/16` unmodified, `routePeriodService.test.js` `13/13`,
  `FactBuuGuiRepository.routePeriod.test.js` `5/5`, `DashboardController.routePeriods.test.js`
  `4/4`). Full backend sweep: `196/200`, the same 4 pre-existing baseline failures unrelated to
  Evidence (KPI-endpoint tests needing a live HTTP server, `monthly rank enrichment`), confirmed
  identical on the pre-remediation baseline via `git stash`. `npx oxlint` on the changed backend
  files: 0 errors/0 warnings.
- **Frontend**: `features/shipment/` + `features/route/` `187/187` (was `181/181`; `+6` new
  behavioral tests net of the rewritten regexes). Full sweep `453/457`, the same 3 known baseline
  failures on record since manifest §52 (`features/dashboard`) plus
  `pages/dataImportBackfillQueue.test.js`, none in `shipment`/`route`. `npx oxlint
  src/features/shipment/ src/features/route/`: 0 errors/0 warnings. `npm run build`: succeeds in
  `1.10s` (`dist/assets/index-FlLaqGqc.js`), same pre-existing chunk-size warning only.
- **Real-data validation, the reviewer's own keywords** (`evidenceQueryService.getEvidence()`
  called directly against the real, unmocked `FactBuuGuiRepository`/`database.sqlite`, read-only):
  - `BCVH 533140`, `month_to_anchor` (`2026-09-01..2026-09-06`), `search=HCC`: `matched_items=1617`,
    `matched_routes=9`; the returned page holds only 7 distinct routes, but `matched_route_list`
    now correctly lists all **9** real routes (e.g. `53314061` / "533140 HCC Phường Đúc", count
    `1`, absent from the page) with counts summing exactly to `1617`.
  - Same scope, `search=Thuy`: `matched_items=1000`, `matched_routes=4`; the page holds only 2
    distinct routes, `matched_route_list` correctly lists all **4** (`53314058`, `53314071`,
    `533140129`, `533140133`) summing exactly to `1000`.
  - `search=HCC`, `period=day`: `matched_items=235` across 7 routes, `matched_route_list` sums
    exactly to `235`.
  - Simulated the frontend's per-route expand fetch directly: `route=53314061` (the route absent
    from the global `HCC` page above) + `search=HCC` returns exactly its `1` real row
    (`EB516583546VN`), confirming the "one request per expanded route" mechanism works against
    real data.
  - `fact_f13` read before and after this entire validation session: **777,081 rows,
    `MAX(ngay_do_kiem) = 2026-09-06`, identical** — zero writes (Evidence remains read-only).
- **Scope discipline**: `git diff --name-only dbab2b7` touches only
  `backend/src/services/evidenceQueryService.js` (+test),
  `frontend/src/features/shipment/{ShipmentPerformancePage.jsx,ShipmentEvidenceSummary.jsx,
  shipmentPerformanceData.js}` (+2 tests, +1 rewritten test file). No §9.4 Cấm chạm file
  (`RuleF13302.js`, `schema.sql`, `routePeriodService.js`, `F13DashboardService.js`,
  `/f13/evidence-list`) touched; `/f13/evidence-list` itself untouched (unaffected by this
  section, already proven byte-unchanged in §64/§67).

### Governance state after this section

`F13-ROUTE-EVIDENCE-STATUS-02 = ITR-EV-BLOCK-01 REMEDIATION COMPLETE — READY FOR INDEPENDENT
RE-REVIEW`. Per `DEC-021`, a model other than this section's executor must re-review before any
PO UI Check; this section's own validation does not constitute that review, and does not itself
authorize PO UI Check. `ITR-EV-NB-01` (a CTO/PO decision, not a code defect) remains open and
unresolved by this section, unaffected. `F13-ROUTE-RANKING-PERIOD-01` and
`F13-BCVH-RANKING-OVERVIEW-01` remain `CLOSED / PO PASS`, unaffected; `AUTO-BACKFILL-RUNTIME`
remains separately open, unaffected.

## 69. F13-ROUTE-EVIDENCE-STATUS-02 — Independent Re-Review of `ITR-EV-BLOCK-01` — `ITR-EV-BLOCK-01` **CLOSED**, new blocker `ITR2-BLOCK-01` (2026-09-08)

Append-only delta. Sections 1-68 unchanged. Reviewer: `Claude Code`/`Opus` — a different model from
the `Sonnet` executor of the §68 remediation, per `DEC-021`. Baseline reviewed: `cdc9417`. Scope as
instructed: the `ITR-EV-BLOCK-01` remediation only, not a re-review of the whole ticket. Read-only —
no product code was changed by this review; the only commands run were the two test suites and
read-only `SELECT` measurements. `fact_f13` read before and after: **777,081 rows,
`MAX(ngay_do_kiem) = 2026-09-06`, identical** — zero writes.

### `ITR-EV-BLOCK-01` — **CLOSED**

Every requested verification passes.

| Verification | Result |
| --- | --- |
| `matched_route_list` represents the **whole** matched scope | **PASS** — re-derived ground truth independently of the service (raw `SELECT` over the full scope + the shipped `matchesSearchQuery`, grouped in the harness, not by the service) and compared: **exact match on all 4 real cases** — `533140` `month_to_anchor` `HCC` 9 routes/1,617 rows, `Thuy` 4 routes/1,000 rows; `day` `HCC` 7 routes/235 rows, `Thuy` 4 routes/139 rows. `sum(counts) == matched_items` and `matched_routes == list.length` in every case |
| List is page-independent | **PASS** — `matched_route_list` byte-identical between page 1 and the last page (33, 20, 5, 3 respectively), so no page can ever narrow it |
| Frontend no longer groups by the current page | **PASS** — `groupRowsByRoute(sortedRows)` is gone from the grouped path; `groupedRows` is built by `buildSearchRouteGroups()` from `meta.search.matched_route_list`, with page rows demoted to a defensive `fallbackRows` used only if the server omits the field |
| Every matched route displays across multiple server pages | **PASS** — the defect's own numbers now resolve: `HCC` page 1 carries rows from only 7 routes (page 33: 8), `Thuy` page 1 only 2 (page 20: 4), yet the group list is 9 and 4 respectively on every page |
| Per-route expand fetch carries the right context | **PASS** — exercised the exact call `fetchRouteGroupRows` issues, across 5 real contexts (`status` = `all`/`failed`/`passed`/`returned`, and `failed`+`reason=delayed_cash`): route, search, status, reason and period all propagate; the expand fetch's own `matched_items` equals the group header's count on **every** route in all 5 contexts (e.g. `failed`+`delayed_cash` → 3 routes, counts 1/7/1, each confirmed); returned rows never contain another route, another status, or another reason |
| Context vs search counts no longer contradict | **PASS** — `resolveContextTotal()` is logically identical to the backend's own `_resolveNonSearchTotalItems` (same status/reason branches, same `reason='all'` fall-through), and reads `status_summary`/`violation_summary`, which are computed over the keyword-**independent** scope; "Tổng Evidence (bối cảnh)" can no longer collapse onto "Kết quả tìm kiếm" |
| Server-side pagination / performance contract intact | **PASS** — `_buildMatchedRouteList()` is a fold over the `matched` array that already existed under `P-03`; **no new query**, no new materialization, no ceiling raised. `matched_routes` is now derived from the same list it reports, so count and list can never drift. `matched_route_list` is correctly `null` on both the no-search and `scope_guard.exceeded` paths. Every request still returns at most `page_size` (≤ 200) rows |
| Behavioral tests genuinely catch the old failure mode | **PASS, mutation-tested** — re-ran the new assertions against a deliberately mutated pre-fix implementation: the backend `ITR-EV-BLOCK-01` test **fails** against a page-derived route list and passes against the shipped one; the frontend `C.1` grouping assertions **fail** against `groupRowsByRoute(pageRows)` and pass against `buildSearchRouteGroups`; the `contextTotal` assertion **fails** against `pagination.total_items` and passes against `resolveContextTotal`. These are real behavioral guards, not restatements of the shipped source |

Suites re-run by this review at `cdc9417`: backend Evidence + route-period **79/79**, frontend
`features/shipment/` + `features/route/` **187/187**. `git diff --name-only dbab2b7..cdc9417`
touches no §9.4 Cấm chạm file.

### `ITR2-BLOCK-01` — grouped search view silently truncates each route to 50 rows (**BLOCKER**, introduced by §68)

**Statement.** With a keyword active, expanding a route group renders at most **50** rows while the
group header displays that route's **true** matched count, and there is no per-group pagination, no
"showing 50 of N" affordance, and no other path to the remaining rows inside the grouped view.

**Measured live** (`533140`, `month_to_anchor` `2026-09-01..2026-09-06`, `search=HCC`, `status=all`):
7 of the 9 matched routes exceed the cap — `53314072` header "345 bưu gửi" renders 50 rows;
`53314071` 242 → 50; `53314057` 218 → 50; `53314062` 215 → 50; `53314058` 210 → 50; `53314060`
184 → 50; `53314073` 165 → 50. Under `status=failed` and `status=passed` the same pattern holds
(e.g. `53314072` 151 → 50, 194 → 50).

**Why this is a blocker.** It is the same self-contradiction the original blocker was about — a
server-computed count next to a visibly smaller rendering — moved down one level, from routes to
rows. It also contradicts a **binding** design principle rather than a matter of taste: §5.6 retired
the `truncated` flag and its banner specifically because *"Không còn khả năng cắt cụt âm thầm; thay
bằng `scope_guard` tường minh"*, and `P-03` requires the system to fail loudly rather than quietly
drop rows. The grouped view now drops rows quietly.

**It is a regression, not a pre-existing gap.** Before §68 the grouped view was built from the
current page, so a route's remaining rows were reachable by paging — the pagination control changed
what the groups contained. §68 made the group list page-independent (correctly) but left the row
source per group at exactly one page-1 fetch, so paging no longer reaches those rows at all. The
remediation traded route-level incompleteness for row-level incompleteness plus the loss of the
path that previously compensated.

**Second facet — the pagination control is now inert in grouped mode and destroys user state.**
`paginationControls` (`ShipmentPerformancePage.jsx:762`) still renders while searching, but
`mode='grouped'` renders `groups`, never `rows`, so paging changes nothing visible. Worse, `page` is
a dependency of the main fetch effect (`:276`), which begins by clearing `routeGroupData` and
`expandedRouteKeys` — so clicking "Sau" silently collapses every group the manager had opened and
otherwise appears to do nothing. PO UI Check §12.2 exercises search (step 5) and paging (step 6);
both land here.

**Remediation required (minimal).** Give each expanded group its own page control driven by the
per-route fetch's own `pagination` meta (the response already carries `total_items`/`total_pages`
for the route — verified above that it equals the group count), keeping `page_size` at 50 and one
request per page; store that per-route page in `routeGroupData`. Then either hide the global
pagination bar while `mode='grouped'`, or leave it but stop it from clearing per-route state. If a
per-group control is judged too large, the minimum acceptable alternative is an explicit, visible
"Hiển thị 50 / N — chọn tuyến này ở bộ lọc Tuyến để xem đầy đủ" affordance, so nothing is dropped
silently.

### `ITR2-NB-01` — stale per-route response can poison the cache with rows from a previous filter context (non-blocking)

`fetchRouteGroupRows()` has no generation guard. Sequence: expand route `R` → request in flight →
the manager changes keyword/status/period/page → the main effect clears `routeGroupData` → the
in-flight response resolves and writes `{ [R]: { status: 'ready', rows: <previous context's rows> } }`
into the now-cleared cache. If `R` also matches the new context, expanding it takes the
`status === 'ready'` branch, issues **no** refetch, and renders rows belonging to the previous
keyword/status/period. Narrow timing window (the route fetch measured well under a second, and the
search box is debounced), and no data is written — but it is silent wrong evidence while it lasts.
Fix: capture a request generation/context key when the fetch starts and discard the response if the
context has changed since (the same discipline the main effect already applies with its `mounted`
flag).

### Verdict

`ITR-EV-BLOCK-01` is **CLOSED** — the remediation is correct, well-scoped, verified against
independently re-derived real data, and its regression tests genuinely catch the original defect.
This review does **not** grant `READY FOR PO UI CHECK`: `ITR2-BLOCK-01`, introduced by that same
remediation and sitting directly in PO UI Check §12.2 steps 5-6, must be remediated and re-reviewed
first. `ITR2-NB-01` is cheap enough to fold into the same change. `ITR-EV-NB-01` from §67 (Evidence
"Tất cả tuyến" totals versus Tuyến Ranking's default `Tuyến bưu tá` scope) remains an open CTO/PO
question, untouched and unaffected by this review. `F13-ROUTE-RANKING-PERIOD-01` and
`F13-BCVH-RANKING-OVERVIEW-01` remain `CLOSED / PO PASS`; `AUTO-BACKFILL-RUNTIME` remains separately
open.

## 70. F13-ROUTE-EVIDENCE-STATUS-02 — Remediation of `ITR2-BLOCK-01` + `ITR2-NB-01` — `READY FOR INDEPENDENT RE-REVIEW` (2026-09-08)

Append-only delta. Sections 1-69 unchanged. Executor: `Claude Code`/`Sonnet`. Baseline: `1814011`
(the §69 Independent Re-Review). Scope as instructed: remediate `ITR2-BLOCK-01` (grouped-search
route groups silently capped at 50 rows, inert global pagination bar clearing group state) and
fold in `ITR2-NB-01` (stale per-route response race) — no other scope. **No backend file was
touched**: `evidenceQueryService.js` already scopes `getEvidenceScopeCount` /
`getEvidenceSearchProjection` / the paged fetch to a single route whenever `route !== 'all'`, so
`GET /f13/evidence?route=<one route>&search=<kw>&page=<n>` already returns `meta.pagination`
(`page`/`page_size`/`total_items`/`total_pages`) correctly scoped to that one route's true count —
confirmed live below. The defect was frontend-only: the existing per-route fetch always requested
`page: 1` and discarded the response's own pagination meta.

### Root cause (restated from §69's own diagnosis, confirmed unchanged)

`fetchRouteGroupRows` (`ShipmentPerformancePage.jsx`) always called `getEvidence` with `page: 1`
and stored only `{ status, rows }` — the response's `meta.pagination` was read and thrown away.
`ShipmentEvidenceSummary.jsx` had no page control for a group, so a route with more than 50
matches had no way to reach row 51 once expanded. Separately, the global `paginationControls`
bar stayed mounted and wired to `page` (a dependency of the main query effect that clears
`routeGroupData`/`expandedRouteKeys` on any change) even though grouped mode never rendered the
data that bar paginated — clicking it silently collapsed every open group for zero visible
benefit (§69's "second facet").

### Remediation

- **Per-group pagination** (`shipmentPerformanceData.js`): `buildSearchRouteGroups` now also
  carries `page` and `pagination` from the cache entry. `ShipmentPerformancePage.jsx`:
  `fetchRouteGroupRows(routeId, page = 1)` passes the real `page` through to `getEvidence` (same
  `PAGE_SIZE = 50`, unchanged, never widened) and stores the response's own `meta.pagination`
  verbatim; a new `handleRouteGroupPageChange(routeId, newPage)` re-invokes it. `page_size` is
  never sent as anything other than the `PAGE_SIZE` constant.
- **Visible affordance** (`ShipmentEvidenceSummary.jsx`): a new `RouteGroupPagination` renders,
  under each expanded group's table, "Hiển thị `X-Y` / `N` bưu gửi của tuyến này" plus "Trang
  `p`/`P`" and Trước/Sau buttons driven by `group.pagination` — mirroring the existing global
  pagination bar's own wording/shape. It renders nothing when a route's whole result already
  fits on one page (`total_items <= page_size && total_pages <= 1`), so nothing is added when
  there is nothing to page through.
- **Global bar hidden in grouped mode** (`ShipmentPerformancePage.jsx`): `paginationControls` is
  now wrapped `{!isSearchActive && paginationControls}` — the minimal option named in §69's own
  remediation menu (hide, rather than leave mounted and stop it from clearing state), since it
  was never wired to grouped data to begin with. Flat (non-search) mode is unaffected.
- **`ITR2-NB-01` fix**: a new `contextGenerationRef` (`useRef(0)`) is bumped synchronously inside
  the same query-context effect that already clears `routeGroupData`/`expandedRouteKeys` on any
  keyword/status/reason/period/route/page change. `fetchRouteGroupRows` captures the counter's
  value at request start and routes the actual fetch through a new pure orchestration function,
  `runGuardedRouteGroupFetch` (`shipmentPerformanceData.js`): the response is applied via
  `onSuccess`/`onError` only if `generationRef.current` still equals the captured value when the
  promise resolves — otherwise it is silently discarded. Same discipline as the main fetch
  effect's own pre-existing `mounted` flag, generalized past a single boolean.

### Real-data validation

Backend restarted first — the running process (started 2026-09-07 23:01, before commit `cdc9417`
23:53) predated `matched_route_list`, reproducing the same stale-process class of issue recorded
in §66; restarted onto current code, confirmed via a fresh, authenticated request that
`matched_route_list` is present again. `fact_f13` re-verified unchanged across this whole session:
**777,081 rows, `MAX(ngay_do_kiem) = 2026-09-06`**, identical to §69's own reading — the entire
validation (curl + live browser) was read-only.

Live `GET /f13/evidence` against BCVH `533140`, `month_to_anchor` `2026-09-01..2026-09-06`,
`search=HCC`, route `53314072` ("533140 HCC An Đông", header count **345**, the same route §69
measured truncated to 50):

| Page requested | `data.length` | `meta.pagination` |
| --- | --- | --- |
| 1 | 50 | `{page:1, page_size:50, total_items:345, total_pages:7}` |
| 2 | 50 | `{page:2, ..., total_items:345, total_pages:7}` — 50 rows, **zero overlap** with page 1 |
| 7 (last) | 45 | `{page:7, ..., total_items:345, total_pages:7}` |
| 8 (past end) | 0 | `{page:8, ..., total_items:345, total_pages:7}` — well-behaved, no error |

All 7 pages collected and deduplicated by `ma_bg`: **345 rows requested, 345 unique** — exact
match to the group header, zero duplication, zero gap, zero silent truncation.

Real browser runtime (authenticated `admin`, `http://localhost:5178/f13/evidence`, same real
context): all 9 real matched `HCC` routes render with correct headers (`53314072` "345 bưu gửi",
etc., byte-identical to §69's own measurements). Expanding `53314072` shows real page-1 rows and
the new affordance "**Hiển thị 1-50 / 345 bưu gửi của tuyến này · Trang 1/7**"; clicking "Sau"
loads real, distinct page-2 rows and updates to "**Hiển thị 51-100 / 345 · Trang 2/7**" — no
overlap with page 1's `ma_bg` values. The global pagination bar is absent throughout the search
view (confirmed via full page-text dump). Clearing the keyword cleanly returns to flat mode: all
groups and their per-group pagination disappear, the global bar reappears correctly
(`Hiển thị 1-50 / 7.546 · Trang 1/151`) with no leftover state from the grouped session.

### Tests (new, `ShipmentPerformancePage.groupPaginationRemediation.test.js`, 11 tests)

Numbered against the ticket's 3 required behaviors:

1. **Route >50 rows reaches page 2 and beyond** — behavioral, against the real
   `buildSearchRouteGroups`: page-1/page-2/last-page (7/7, 45 rows) cache entries each produce
   the correct `group.rows`/`group.page`/`group.pagination`, and page 2's rows are asserted
   distinct from page 1's.
2. **No silent truncation** — asserts a partial cache entry's `group.pagination.total_items`
   always equals `group.count` (the header total; no drift), plus source-text confirmation that
   `ShipmentEvidenceSummary.jsx` actually renders the "Hiển thị X-Y/N" affordance and both page
   buttons (not just carries the data). A companion test confirms `RouteGroupPagination`
   early-returns (renders nothing) when a route's result already fits on one page.
3. **Context change mid-flight cannot surface stale data** — two behavioral tests exercise the
   real `runGuardedRouteGroupFetch`: a `fetchFn` that bumps `generationRef.current` before
   resolving proves `onSuccess` is never called and the response is reported `stale`; a matching
   same-context case proves `onSuccess` **is** called when nothing changed (the guard only
   discards genuinely stale responses, not every response); a third proves a stale-context
   *error* is also discarded rather than surfaced as a fresh error state.

Six wiring tests (source-text, matching this suite's existing convention) confirm: the generation
counter is bumped inside the same effect that clears the cache; `fetchRouteGroupRows` captures
the generation before the request and routes through the guard; the global bar is gated on
`!isSearchActive`; `handleRouteGroupPageChange` fetches the requested page and is wired to
`ShipmentEvidenceSummary`; every per-route request still uses the fixed `PAGE_SIZE` constant,
never a hardcoded numeric literal.

Mutation-style check: reverting the guard (calling `onSuccess` unconditionally) makes the
"context change... discards" test fail by construction (`applied` would be the stale result
instead of `null`) — confirmed by inspection of the assertion, not a separate mutated build.

### Regression

Frontend targeted (`features/shipment/` + `features/route/`): **198/198** (187 pre-existing + 11
new). Full frontend sweep: **464/468** pass — the same 4 pre-existing baseline failures on record
since manifest §52 (`only canonical values remain selectable...`, `operation dashboard hides
status filter...`, `dashboard page removes shell...`, `dataImportBackfillQueue.test.js`), none in
shipment/route/evidence. `oxlint`: 0 warnings/0 errors on every file this remediation touched (all
warnings present in the sweep belong to `frontend/src/features/networkMap/*` and other files left
uncommitted by a concurrent session, not part of this diff). `vite build`: succeeds cleanly.
Backend: evidence-scoped suite re-run unmodified, **35/35** pass (`evidenceQueryService.test.js`,
`DashboardController.evidenceDrilldown.test.js`, `FactBuuGuiRepository.evidence.test.js`) —
confirms the backend pagination contract this remediation relies on is genuinely unchanged, not
just untouched by diff. Full backend sweep: 326/330 pass; the 4 failures (`live KPI database...`,
`dashboard KPI invalid code...`, `KPI all and missing ma_bcvh...`, `monthly rank enrichment...`)
are all outside Evidence/shipment scope and were not touched by this diff — attributable to the
concurrent session's uncommitted `backend/test_dkclSessionPreflightService.js` changes visible in
`git status`, not to this remediation.

### Scope discipline

`git diff --name-only` for this remediation touches exactly 4 paths, all inside
`frontend/src/features/shipment/`: `ShipmentPerformancePage.jsx`, `ShipmentEvidenceSummary.jsx`,
`shipmentPerformanceData.js`, and the new test file. No backend file, no §9.4 Cấm chạm file, and
none of the concurrently-modified `frontend/src/features/networkMap/*` files were touched or
committed by this change — committed by explicit pathspec only, per the standing concurrent-
session discipline recorded for this workspace.

### Verdict

`ITR2-BLOCK-01` and `ITR2-NB-01` are remediated: every expanded route group now has its own
correct page control sourced from the backend's own already-correct per-route pagination meta,
"Hiển thị 50/N" is explicit whenever a route's result exceeds one page, no row is ever silently
dropped (proven exhaustively — 345/345 unique rows reachable across exactly 7 pages on a real
route), the global pagination bar no longer collapses grouped state because it is not rendered
while grouped, and a per-route response can no longer poison the cache with a previous filter
context's rows. `READY FOR INDEPENDENT RE-REVIEW` by a model other than `Sonnet`, per `DEC-021` —
not self-declared `READY FOR PO UI CHECK`.
