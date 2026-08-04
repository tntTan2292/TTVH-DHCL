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

## 1. Ticket Information

- Ticket ID: `F13-STANDARDIZATION-001`
- Ticket Name: F1.3 Module Standardization Program
- Phase: Program activation (documentation-only). Execution phase: `PHASE 0 — AUTHORIZED / READY FOR IMPLEMENTATION`. Phases 1-4: `PLANNED / NOT ACTIVE`.
- Owner: Claude Code (implementation, backend, data, tests, documentation, Git per `DEC-020`)
- Governance Version: `V2 Active`
- Authorization: Product Owner, `2026-08-04` — approval of the rapid standardization plan for the F1.3 module group, this program

## 2. Objective

Activate a single five-phase standardization program for the F1.3 module group under one program ticket (not five independent tickets), authorizing only Phase 0 for implementation while Phases 1-4 remain planned and not active.

## 3. Current Status

- Current state: `ACTIVE / AUTHORIZED` (program). `PHASE 0 — AUTHORIZED / READY FOR IMPLEMENTATION`. Phases 1-4 `PLANNED / NOT ACTIVE`.
- PO UI Check Required: `No` for this activation step — no UI or product code changed.
- PO Product Status: Documentation-only activation package created; no Phase 0 work performed under this ticket.

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

- Next ticket ID: none opened. Phase 0 is authorized but its implementation is explicitly **not** part of this documentation-only ticket.
- Exact next action: `Begin bounded delta-only discovery for Phase 0. Do not implement until onboarding and Phase 0 scope confirmation are complete.`

## 14. PO Acceptance Checklist

`PO UI Check Required = No` for this activation step. No UI or product code changed. PO Gates 1-3 (Section 10) apply to later phases, not to this documentation activation.

## 15. Authority Escalation

No escalation required for this activation step — it is a direct execution of explicit Product Owner authorization limited to two documentation actions (activation package, five-phase manifest lock). Any attempt to implement Phase 0 content, run a broad audit, or activate a different ticket under this authorization would require stopping and reporting a boundary conflict; none occurred.
