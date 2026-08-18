# AUTO-BACKFILL-UI Manifest

Status: `AUTO-BACKFILL-UI UX REDESIGN PLAN REVISED / AWAITING PO APPROVAL` (2026-08-18).

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-UI`
- Phase: `Shared Auto Backfill - Operator UI`
- Executor: `Antigravity`, explicitly authorized by the Product Owner for this ticket
- Branch: `codex/da-impl-006`
- Baseline: `ef7cbe850aab62f157ecbfb6642e999e1fecab25`
- Activation authority: `PO confirms Gate 5 PASS and authorizes AUTO-BACKFILL-UI under Antigravity`
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Implement the locked No-code Operator UI for Auto Backfill V2 platform: missing dates scan (`01/01/2026` to `N-1`), newest-first ordering (`06/06` rule), per-indicator (F1.3, F4.1) and source lane (HUE, TCT) status visibility, run creation and Pause/Resume control, `WAITING_AUTH` guidance & login triggers, retry/circuit-open/integrity-stop handling and actions, append-only events audit timeline, and PO reconciliation reporting.

## 3. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/AUTO-BACKFILL-PLAN_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md`
- `docs/10_TICKETS/AUTO-BACKFILL-SAFETY_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-SAFETY_CHECKPOINT_001.md`
- `backend/src/routes/importRoutes.js`
- `frontend/src/pages/DataImportCenter.jsx`

## 4. Locked Scope

In scope:

- Multi-indicator (F1.3 & F4.1) and multi-lane (HUE & TCT) Operator UI component (`AutoBackfillOperatorPanel.jsx`).
- Choice cards / Segmented Controls for filtering Indicator, Source Lane, and Coverage Status.
- Stats KPI cards (Total scanned, Missing, Completed, Runnable Jobs, Manual/Review Required).
- Run lifecycle controls: Create Run (`POST /api/import/auto-backfill/runs`), Pause (`POST /api/import/auto-backfill/runs/:id/pause`), Resume (`POST /api/import/auto-backfill/runs/:id/resume`), Circuit Reset (`POST /api/import/auto-backfill/runs/:id/circuit/reset`).
- Guidance banners for `WAITING_AUTH` (with PO interactive auth buttons for HUE/TCT), `CIRCUIT_OPEN` (with reset trigger), and `BLOCKED_INTEGRITY` (with manual review instructions).
- Append-Only Audit Events timeline (`GET /api/import/auto-backfill/runs/:id/events`) and PO Reconciliation Report (`GET /api/import/auto-backfill/runs/:id/report`).
- Full integration into `DataImportCenter.jsx` as default tab.
- Automated UI unit and contract tests (`AutoBackfillOperatorPanel.test.js`).

Out of scope:

- Backend business logic, parsers, database schema, Queue/Safety core changes.
- Real Portal execution, real downloads, or real Import processing.
- `AUTO-BACKFILL-RUNTIME` or any successor activation.

## 5. Validation

- Frontend lint clean: 0 errors.
- Frontend build succeeds: 685 modules transformed.
- Automated UI test suite `AutoBackfillOperatorPanel.test.js` PASS.
- Backend Queue, Coverage, and Safety test suites (11/11, 16/16, 12/12) pass 100%.

## 6. Stop Condition

`AUTO-BACKFILL-UI IMPLEMENTED / READY FOR PO GATE 6`.

Gate 6 remains Product Owner-owned. Implementation completion does not self-pass Gate 6 or activate Runtime.
