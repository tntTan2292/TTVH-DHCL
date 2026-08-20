# AUTO-BACKFILL-UI-REMEDIATION Manifest

Ticket Name: `AUTO-BACKFILL-UI-REMEDIATION` (Phase B, Frontend; Sections 5-6 below are PO-instructed backend deltas).
Status: `Frontend READY FOR PO UI CHECK; Backend deltas (Sections 5-6) IMPLEMENTED / READY FOR PO BACKEND GATE` (2026-08-19).
Baseline: `29346c92` (Phase A `AUTO-BACKFILL-COVERAGE-EXCEPTION` CLOSED / PO BACKEND GATE PASS).
Branch: `codex/da-impl-006`.

## 1. Ticket Objective

Implement the complete No-code frontend operator UI for the Auto Backfill V2 Platform in `DataImportCenter.jsx` & `AutoBackfillOperatorPanel.jsx` per the PO-approved plan (`docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md`).

This ticket integrates the real, verified backend REST APIs created in Phase A (`AUTO-BACKFILL-COVERAGE-EXCEPTION`), rendering the 6 canonical coverage statuses, smart monthly grouping accordions, interactive PO exception confirmation modal (`PO_EXEMPTED`), exception revocation (`Hoàn tác`), slide-out audit drawers, and VNPost Light Dashboard design system tokens (`#0054A6`, white cards, slate-100 surfaces).

## 2. Required Reading & Authority Chain

1. `README_AI.md` (L2 Authority)
2. `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` (L2 Index Authority)
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` (L2 Snapshot Authority)
4. `docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md` (L2 Ticket Plan Authority)
5. `docs/06_REVIEWS/Import/AUTO-BACKFILL-COVERAGE-EXCEPTION_CHECKPOINT_001.md` (Phase A Backend Reference)

## 3. Scope Boundaries & Constraints

- **STRICT FRONTEND ONLY**: Modify ONLY frontend files (`frontend/src/components/`, `frontend/src/pages/`, `frontend/src/components/AutoBackfillOperatorPanel.test.js`).
- **ZERO BACKEND / DATABASE MUTATIONS**: Do NOT modify backend code, database schema, or migrations.
- **REAL APIs ONLY**: Use real REST endpoints provided by Phase A (`GET /api/import/auto-backfill/coverage`, `GET/POST /api/import/auto-backfill/coverage/exceptions`, `POST /api/import/auto-backfill/coverage/exceptions/:id/revoke`). NO mock APIs.
- **NO BROWSER / PORTAL EXECUTION**: Do NOT open real browser, do NOT visit DKCL portal, do NOT run real Portal/Queue/Import operations.
- **NO SELF PO PASS**: Stop at `READY FOR PO UI CHECK`.

## 4. Verification Plan

- `node src/components/AutoBackfillOperatorPanel.test.js` (Frontend contract test suite PASS)
- `cmd /c "npm run lint"` (0 errors)
- `cmd /c "npm run build"` (PASS)
- Backend regression sweep (`test_autoBackfillCoverageService.js`, `test_autoBackfillCoverageExceptionService.js`).

## 5. Backend Remediation Delta -- Optional `from_date`/`to_date` Enqueue Scope (2026-08-19, Claude Code)

The Product Owner directly instructed one backend point for this ticket: add an optional date-range filter to `POST /api/import/auto-backfill/runs` so an operator can limit which missing dates get enqueued (e.g. to enqueue one specific month at a time from the Smart Monthly Grouping accordions built in Section 2). This widens Section 3's "STRICT FRONTEND ONLY" lock by explicit PO instruction, for this one backend delta only -- every other Section 3 constraint (real APIs only, no browser/Portal execution, no self PO PASS) still applies.

### 5.1 Locked Contract

- `POST /api/import/auto-backfill/runs` accepts optional `from_date`/`to_date` (`YYYY-MM-DD`) in the request body.
- Neither supplied: unchanged behavior -- the full coverage-eligible window is enqueued, exactly as before this delta.
- Only one bound supplied: an open-ended range on the other side (`from_date` alone keeps every eligible date `>= from_date`; `to_date` alone keeps every eligible date `<= to_date`).
- Both supplied: only dates within the inclusive `[from_date, to_date]` range are enqueued.
- `from_date > to_date`: rejected `400 AUTO_BACKFILL_DATE_RANGE_INVALID`, before any coverage scan or queue write.
- A malformed date (bad format or an invalid calendar date) is rejected `400 INVALID_DATE`, reusing the same shared business-date validator (`autoBackfillBusinessCalendar.js`) already used elsewhere in Auto Backfill.
- No schema, migration, or persisted-run-record change -- the filter narrows what `createRun()` enqueues; it is not stored on the run row.

### 5.2 In Scope

- `backend/src/controllers/autoBackfillQueueController.js`: forward `from_date`/`to_date` from the request body.
- `backend/src/services/autoBackfillQueueService.js`: `createRun()` validation and date-range filtering.
- Backend tests only.

### 5.3 Out Of Scope

- Frontend (`AutoBackfillOperatorPanel.jsx`, `DataImportCenter.jsx`) -- untouched; Section 2's `READY FOR PO UI CHECK` state is unaffected.
- Any schema/migration change, any change to Coverage/Safety/Portal/Import behavior.
- `AUTO-BACKFILL-RUNTIME` or any successor activation.

### 5.4 Required Validation

- With/without `from_date`/`to_date`; one specific calendar month; regression across Queue, Coverage, and Safety suites all PASS.

### 5.5 Stop Condition

`AUTO-BACKFILL-UI-REMEDIATION backend delta IMPLEMENTED / READY FOR PO BACKEND GATE`. Not self-passed. Does not affect Section 2's frontend `READY FOR PO UI CHECK` state, and does not activate `AUTO-BACKFILL-RUNTIME`.

## 6. Backend Remediation Delta -- "Đã hoàn tất" (SUCCESS) Policy Simplified To Data-Presence-Only (2026-08-19, Claude Code)

Product Owner instructed a policy change to `createSqliteImportCompletionPolicy().evaluate()` in `backend/src/services/autoBackfillCompletionPolicies.js`: committed target-table data alone is sufficient for `SUCCESS` ("Đã hoàn tất") -- the import source (a completed Import run producing an `import_log` `SUCCESS` row and a Processed artifact, vs. legacy/direct data) is no longer relevant to that status.

### 6.1 Locked Contract

- `SUCCESS` now requires only `integrityValid` (`rowCount > 0`, matching `expectedRowCount` when declared, and `distinctCount === rowCount`, i.e. no duplicates). `successLogCount > 0` and `artifactRequirementMet` are removed from the `SUCCESS` gate.
- `MANUAL_REVIEW_REQUIRED` (committed data present but integrity invalid), `INCOMPLETE` (import evidence without target data), and `MISSING` (no evidence at all) keep their exact prior trigger logic and reason cascade -- unchanged code, now reached under the narrower "not `SUCCESS`" condition.
- The `evidence` object returned to every caller is unchanged in shape and content (`processed_artifact_present`, `success_log_count`, etc. are still all present) -- only the condition that decides the displayed `status` changed; no internal information was removed.

### 6.2 In Scope

- `backend/src/services/autoBackfillCompletionPolicies.js`: the `SUCCESS` gate condition only.
- Backend tests only (`test_autoBackfillCoverageService.js`, `test_autoBackfillCoverageExceptionService.js`).

### 6.3 Out Of Scope

- Frontend -- untouched; Section 2's `READY FOR PO UI CHECK` state is unaffected.
- Any schema/migration change, `INCOMPLETE`/`MISSING`/`MANUAL_REVIEW_REQUIRED` branch logic (kept byte-for-byte), Queue/Safety/Portal/Import execution behavior.
- `AUTO-BACKFILL-RUNTIME` or any successor activation.

### 6.4 Downstream Ripple (Found And Fixed During Validation)

Loosening the `SUCCESS` gate changed the raw completion result for scenarios that previously fell to `MANUAL_REVIEW_REQUIRED` solely for lacking a `SUCCESS` import-log row or Processed artifact (with `rowCount > 0` and integrity otherwise valid) -- those now correctly resolve to `SUCCESS`. Two existing Coverage tests and one Coverage-Exception test asserted the old `MANUAL_REVIEW_REQUIRED` outcome for exactly that scenario and were updated to assert the new, correct `SUCCESS` outcome instead (`internal evidence fields are asserted directly to prove nothing was silently dropped`). The Coverage-Exception `LEGACY_BASELINE` acceptance test's setup (a single committed row, no log, no artifact) also relied on that now-superseded `MANUAL_REVIEW_REQUIRED` outcome as its precondition; its fixture was changed to a genuine integrity-invalid scenario (`rowCount` diverging from the lane's `expectedRowCount`) so it still exercises `LEGACY_BASELINE`'s real precondition. One new Coverage test was added proving `MANUAL_REVIEW_REQUIRED` still fires correctly for a genuine integrity violation, so that path remains covered.

### 6.5 Required Validation

- Updated the 2 old Coverage test cases that assumed all 4 conditions were required for `SUCCESS`.
- Added the explicitly requested case: `rowCount > 0` + integrity valid but **no** `import_log` row and **no** Processed artifact still resolves `SUCCESS`.
- Added a genuine-integrity-violation case proving `MANUAL_REVIEW_REQUIRED` is unaffected for real duplicate/mismatched data.
- Full regression across Coverage, Coverage Exception, Safety, Queue, F1.3/F4.1 executors, and migrations all PASS.

### 6.6 Stop Condition

`AUTO-BACKFILL-UI-REMEDIATION backend delta (Section 6) IMPLEMENTED / READY FOR PO BACKEND GATE`. Not self-passed. Does not affect Section 2's frontend `READY FOR PO UI CHECK` state, and does not activate `AUTO-BACKFILL-RUNTIME`.
