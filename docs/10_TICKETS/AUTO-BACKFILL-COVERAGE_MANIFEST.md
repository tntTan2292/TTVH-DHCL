# AUTO-BACKFILL-COVERAGE Manifest

Status: `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1` (2026-08-18).

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-COVERAGE`
- Phase: `Shared Auto Backfill - Coverage Foundation`
- Owner / executor: `Codex`, explicitly authorized by the Product Owner
- Branch: `codex/da-impl-006`
- Expected and observed baseline: `f376391adfe9546c6c257f8f7bb1230e21d1ef8e`
- Activation authority: `PO APPROVES AUTO-BACKFILL-PLAN` and `PO authorizes AUTO-BACKFILL-COVERAGE only`
- Initial worktree: no tracked changes; only excluded untracked `.claude/` and `Data QLML/`

## 2. Authorized Scope

Implemented:

- validated shared indicator/lane registration contract;
- `indicator x source lane x business date` coverage scan from each registration's start date through `N-1`;
- `Asia/Ho_Chi_Minh` date boundary and newest-date-first ordering;
- registry-owned exact completion policies over target facts, exact Import evidence and Processed artifact;
- `MANUAL_REVIEW_REQUIRED` for committed `FILE_MOVE_FAILED` or missing Processed artifact;
- visible `MANUAL_ONLY` coverage with no runnable Portal job;
- read-only `GET /api/import/auto-backfill/coverage` governed by registry read roles;
- required extensibility and isolation acceptance tests.

Not implemented or activated:

- persistent queue, worker, pause/resume/restart execution, Portal adapter wrapping, retry runtime, circuit-breaker runtime, audit persistence, UI, or live Runtime;
- any frontend, schema, database, watcher, Portal behavior, Import behavior, or business-data change;
- `AUTO-BACKFILL-QUEUE` or any later ticket.

## 3. Approved Decisions

The implementation records Product Owner decisions Q-01..Q-10 from the activation directive. Coverage-relevant effects are:

- F1.3 and F4.1 start at `2026-01-01` in `Asia/Ho_Chi_Minh`.
- Completion never crosses indicator, lane, or business date.
- A fully proven SUCCESS is never queue-eligible.
- Committed facts with `FILE_MOVE_FAILED`, a missing Processed artifact, or another integrity mismatch require manual review.
- Results order by business date descending, then registry priority, then lane priority.
- Run-control and retry declarations are admin-only; coverage access is declared per lane.
- F4.1 HUE/TCT remain `MANUAL_ONLY`; no Portal identity or behavior was inferred.
- F1.3 remains on its unchanged legacy automation. Its future shared-engine adapter is deliberately not claimed before `AUTO-BACKFILL-F13`, so shared coverage marks those lanes manual-only pending that gate.

## 4. Contract And API

Registry version: `AUTO-BACKFILL-COVERAGE-1`.

Each enabled registration declares identity, lifecycle state, priority, tracking start, timezone, filename date parser/formatter, explicit HUE/TCT lanes, parser, safe target table, completion policy, automation mode, Portal adapter identity or manual-only reason, permissions, approved retry metadata, and approved circuit scope metadata. Validation fails closed for contradictory or incomplete declarations.

Coverage endpoint:

`GET /api/import/auto-backfill/coverage?indicator=...&lane=...`

The response exposes the registry version, business timezone, effective `N-1`, deterministic ordering, lane summaries/counts and flat ordered items. Production always derives `N-1` from the backend clock in `Asia/Ho_Chi_Minh`; a supplied `as_of` is rejected. This endpoint plans or executes no work.

## 5. Acceptance And Regression

- `AB-EXT-01..04`: PASS with synthetic `F9.TEST`; a fixture-only registration appears automatically, start-date changes alter its window, and manual-only gaps produce zero runnable jobs.
- `AB-ISO-01..02`: PASS with isolated in-memory SQLite tables and temporary artifacts; HUE evidence cannot complete TCT and F1.3 evidence cannot complete F4.1.
- Committed `FILE_MOVE_FAILED` and committed SUCCESS with missing Processed artifact: PASS as `MANUAL_REVIEW_REQUIRED` and not queue-eligible.
- Timezone/N-1/order and registry permission fail-closed tests: PASS.
- Existing F1.3/F4.1 Import and backfill regression suites: PASS in isolated test sandboxes.

Full commands and counts are recorded in `docs/06_REVIEWS/Import/AUTO-BACKFILL-COVERAGE_CHECKPOINT_001.md`.

## 6. Files In Scope

Product code and tests:

- `backend/src/services/importIndicatorRegistry.js`
- `backend/src/services/autoBackfillCompletionPolicies.js`
- `backend/src/services/autoBackfillCoverageService.js`
- `backend/src/controllers/autoBackfillCoverageController.js`
- `backend/src/routes/importRoutes.js`
- `backend/test_autoBackfillCoverageService.js`

Governance:

- this manifest;
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-COVERAGE_CHECKPOINT_001.md`;
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`;
- append-only additions to `PROJECT_PROGRESS.md` and `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`;
- approval handoff additions to the prior plan manifest/checkpoint.

## 7. PO Gate 1

Product Owner review is requested for:

- F1.3/F4.1 lane visibility from `2026-01-01..N-1`;
- exact SUCCESS/manual-review classifications and no-reload disposition;
- F4.1 `MANUAL_ONLY` labels and zero runnable Portal jobs;
- F1.3 shared-adapter pending label while legacy flows remain unchanged;
- `F9.TEST` extensibility and isolation proof;
- newest-date-first ordering and registry permissions.

No implementation blocker remains. Legacy Import logs without an exact `indicator` and `source_lane` intentionally do not satisfy shared completion and may surface for manual review/missing coverage rather than cross-match.

## 8. Handoff

- Current state: `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`
- Next ticket: none activated
- `AUTO-BACKFILL-QUEUE`: planned only; requires explicit Product Owner approval after Gate 1
- No real Import, live Portal operation, or business-data mutation was performed

## 9. Gate 1 Remediation - Production Clock Boundary

Review finding: the initial controller forwarded caller-controlled `as_of` to the service, allowing a production request to redefine `N-1` and generate false future coverage.

Remediation from baseline `d63da43517cb0611853377f29243db8fdad12117`:

- production rejects any supplied `as_of`, including an empty value, with HTTP 400 and code `AUTO_BACKFILL_AS_OF_NOT_ALLOWED`;
- normal production requests omit `asOf` when invoking the scanner, so the scanner uses only its backend clock and `Asia/Ho_Chi_Minh`;
- service-level injected `asOf`/clock support remains available only for deterministic service tests;
- rejection occurs before lazy service/database initialization and before any scanner, Import, queue or database-write operation;
- controller/API contract tests prove backend HCM `N-1`, future-override rejection, and zero downstream calls on rejection.

Validation: combined controller/coverage tests `16/16 PASS`; F4.1 pipeline `1/1`, Import race `41/41`, Import processor `59/59`, HUE backfill `39/39`, and all TCT backfill checks PASS in isolated sandboxes.

State remains `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`. No successor ticket is activated.

## 10. PO Gate 1 PASS And Queue Activation

On `2026-08-18`, the Product Owner granted `AUTO-BACKFILL-COVERAGE GATE 1 PASS` and explicitly authorized `AUTO-BACKFILL-QUEUE` only from baseline `1d51a693b7f48f104d4dbf694185c06745321d28`.

Coverage is closed as `COMPLETED / PO GATE 1 PASS`. The active successor manifest is `docs/10_TICKETS/AUTO-BACKFILL-QUEUE_MANIFEST.md`. No F13/F41/Safety/UI/Runtime ticket is activated.
