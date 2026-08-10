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
