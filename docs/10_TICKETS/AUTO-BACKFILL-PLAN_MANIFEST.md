# AUTO-BACKFILL-PLAN Manifest

Status: `PLAN COMPLETE / AWAITING PO APPROVAL (2026-08-18)`. Planning and documentation only. No frontend, backend, database, Import, watcher, Portal automation, or operational data was changed, and no real Import was run.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Authority And Scope](#3-authority-and-scope)
- [4. Required Reading](#4-required-reading)
- [5. Planning Outcome](#5-planning-outcome)
- [6. Delivery Tickets](#6-delivery-tickets)
- [7. Validation](#7-validation)
- [8. Documents Updated](#8-documents-updated)
- [9. Product Owner Gates](#9-product-owner-gates)
- [10. Handoff](#10-handoff)

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-PLAN`
- Ticket Name: `Shared Auto Backfill Platform - Discovery And Delivery Plan`
- Phase: `Auto Backfill - Planning`
- Owner / executor: `Codex`, explicitly authorized by the Product Owner for this ticket
- Governance Version: `V2 Active`
- Activation authority: Product Owner directive `PO authorizes activation of AUTO-BACKFILL-PLAN`
- Workspace: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`
- Branch: `codex/da-impl-006`
- Baseline commit: `f702cddb47286a006072d5aef8b84501ec051bad`
- Activation date: `2026-08-18`
- Initial worktree: no tracked changes; only the known untracked exclusions `.claude/` and `Data QLML/`

## 2. Objective

Design Auto Backfill as an indicator-neutral platform. Correctly registering an indicator must make it participate in coverage scanning, persistent sequential work, pause/resume/restart recovery, retry and failure isolation, session-expiry handling, circuit breaking, audit, and Product Owner reporting without adding indicator branches to the shared scanner, queue, or circuit-breaker engine.

`F1.3` and `F4.1` are the first two configurations proving the platform. They are not special cases in the core engine.

## 3. Authority And Scope

In scope:

- Delta-only read-only survey of current F1.3 Import/backfill, F41-PHASE-2 multi-indicator Import, completion evidence, manual HUE/TCT sessions, queue/retry/restart behavior, and Import logs.
- Shared registry, coverage, queue, adapter, safety, audit, API, test, risk, and PO-gate design.
- Seven-ticket delivery plan and an extensibility acceptance suite.
- Documentation and Governance V2 synchronization only.

Out of scope:

- Any frontend, backend, database, Import, watcher, Portal automation, or data change.
- Any real Import or live Portal execution.
- UI Remediation or Antigravity UI work.
- Guessing an F4.1 Portal export identity, selector, filter, filename, or download workflow.
- Activating `AUTO-BACKFILL-COVERAGE` or any later ticket.

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md` - substantive plan and evidence
- `docs/10_TICKETS/F41-PHASE-2_MANIFEST.md`
- `docs/06_REVIEWS/Shared/F41-PHASE-2_CHECKPOINT_001.md`
- `docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md`
- `docs/10_TICKETS/AUTO-IMPORT-005_MANIFEST.md`
- `docs/10_TICKETS/AUTO-IMPORT-014_MANIFEST.md`
- `backend/src/services/importIndicatorRegistry.js`
- `backend/src/services/importPipeline.js`
- `backend/src/services/importProcessor.js`
- `backend/src/services/dkclHueF13BackfillService.js`
- `backend/src/services/tctF13BackfillService.js`
- `backend/src/services/dkclSessionPreflightService.js`

## 5. Planning Outcome

The checkpoint locks the proposed platform boundary:

- The registry owns indicator and lane-specific declarations: identity, lifecycle status, tracking start, parser, target table, filename date rule, completion policy, Portal adapter identity or `MANUAL_ONLY`, permissions, retry policy, and circuit scope.
- The coverage scanner, persistent queue, worker, restart recovery, retry coordinator, circuit breaker, and audit reporter consume only that contract and contain no `F1.3`/`F4.1` branch.
- Coverage is keyed by `indicator x HUE/TCT x business_date`, defaults to `2026-01-01..N-1`, and never treats another indicator/lane/date's log as success.
- A declared completion policy must prove committed target facts and matching Import evidence. Existing `SUCCESS` work is never downloaded or imported again.
- Work is globally sequential for DKCL. One failed date is isolated; authentication loss pauses immediately; five consecutive same-signature systemic failures is the proposed circuit threshold, subject to PO Gate 5.
- Queue/run/job/attempt/event state is persistent. Startup recovery rechecks completion before requeuing an interrupted item.
- F4.1 is `MANUAL_ONLY` for Portal acquisition until its real Portal workflow and export identity are verified in `AUTO-BACKFILL-F41`.

## 6. Delivery Tickets

| Order | Ticket | Purpose | Dependency | Required stop |
| --- | --- | --- | --- | --- |
| 1 | `AUTO-BACKFILL-COVERAGE` | Extend the registry contract and implement generic missing-date coverage | PO approval of this plan and start-date decisions | `READY FOR PO GATE 1` |
| 2 | `AUTO-BACKFILL-QUEUE` | Persistent run/job queue, single worker, pause/resume/restart recovery | Coverage contract approved | `READY FOR PO GATE 2` |
| 3 | `AUTO-BACKFILL-F13` | Wrap verified F1.3 HUE/TCT acquisition as registry adapters | Queue contract approved; valid manual sessions available for later runtime only | `READY FOR PO GATE 3` |
| 4 | `AUTO-BACKFILL-F41` | Verify then implement F4.1 HUE/TCT Portal adapters | Queue approved; real Portal workflow/export identities verified | `READY FOR PO GATE 4`; discovery may end `BLOCKED` without verified identity |
| 5 | `AUTO-BACKFILL-SAFETY` | Retry taxonomy, circuit breaker, alerts, audit and PO report | Queue and adapter error contracts available | `READY FOR PO GATE 5` |
| 6 | `AUTO-BACKFILL-UI` | Operator UI by Antigravity after backend contracts freeze | Gates 1-5 approved; UI Remediation resumed by PO | `READY FOR PO UI CHECK` |
| 7 | `AUTO-BACKFILL-RUNTIME` | Controlled real run and end-to-end acceptance | All prior gates approved; explicit runtime authorization | `READY FOR PO RUNTIME ACCEPTANCE` |

Each ticket's scope, dependencies, data/API contract, tests, risks, and PO gate are defined in checkpoint Section 11.

## 7. Validation

Planning validation performed:

- Repository baseline, branch, HEAD, and worktree verified before edits.
- Static survey of current code and governed ticket evidence; no Portal or Import execution.
- Registry extensibility acceptance suite designed, including a synthetic indicator that appears in coverage without changing the shared engine.
- Documentation-only diff and exclusion check required before commit.
- Runtime, build, lint, database, and Import tests are not applicable to this planning-only ticket.

## 8. Documents Updated

- `docs/10_TICKETS/AUTO-BACKFILL-PLAN_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `PROJECT_PROGRESS.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`

No other file is authorized for this ticket.

## 9. Product Owner Gates

The Product Owner is asked to approve the shared contract and answer or disposition checkpoint Section 14 before implementation. In particular: indicator start dates, business timezone, completion treatment of committed-but-file-move-failed imports, retry defaults, circuit scope/threshold, queue ordering, restart auto-resume, permissions, and audit retention.

An approval of this plan does not itself activate Ticket 1. `AUTO-BACKFILL-COVERAGE` still requires an explicit Product Owner activation directive and baseline.

## 10. Handoff

- Current state: `PLAN COMPLETE / AWAITING PO APPROVAL`
- Next ticket: none activated
- Candidate next ticket after explicit approval: `AUTO-BACKFILL-COVERAGE`
- F41-PHASE-2 remains `IMPLEMENTED / READY FOR PO CHECK`; this plan does not approve or activate F41 Phase 3.
- UI Remediation remains deferred.
