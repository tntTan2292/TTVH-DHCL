# AUTO-BACKFILL-COVERAGE-EXCEPTION Checkpoint 001

## 1. Activation

Product Owner granted `ARCHITECTURE APPROVAL PASS` on `docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md` (the 5-point remediation plan) and explicitly authorized starting Phase A, `AUTO-BACKFILL-COVERAGE-EXCEPTION`, for `Claude Code` -- backend work, in-domain per `CLAUDE.md`'s executor role split (Claude Code: implementation/backend/data/tests; Antigravity: UI/UX, reserved separately for Phase B `AUTO-BACKFILL-UI-REMEDIATION`). Activation recorded in governance (this checkpoint, the manifest, `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`) before any code was written, per the Product Owner's explicit instruction.

Baseline: `3fce810f`, branch `codex/da-impl-006`. Initial worktree: tracked files clean; only untracked `.claude/` and `Data QLML/` excluded, consistent with every prior ticket.

## 2. Locked Scope

See manifest Sections 4-6. Backend only: 6-state coverage model, controlled Legacy Baseline Reconciliation, 5-point-proof `VERIFIED_NO_DATA`, reasoned/audited/reversible `PO_EXEMPTED`, registry-driven completion policy, single-date retry isolation, and system-signature-only circuit breaking. No frontend, no real Portal/Queue/Import, no business-data mutation.

## 3. Technical Execution Report

- New pure `backend/src/services/autoBackfillBusinessCalendar.js` extracts the ISO-date/timezone/window helpers that were previously private to the coverage scanner, so the new exception service can share them without a circular require back into the scanner.
- New `backend/src/services/autoBackfillCoverageExceptionService.js`: registry-driven `create`/`revoke`/`list`/`loadActiveExceptionMap`. No indicator/table branch (proved by a source-regex test and by a synthetic `F5.TEST` registration passing unmodified).
  - `VERIFIED_NO_DATA`: requires an `AUTOMATED` lane with a registered Portal adapter, all 5 adapter-proof criteria `true`, a `reportIdentity` match, and `confirmedRowCount === 0`; any gap is rejected `422`, never silently downgraded. Also rejected unless the raw registry completion policy currently reports no committed data for the tuple.
  - `LEGACY_BASELINE` (display `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE`): accepted only when the raw completion policy already reports committed rows without complete import evidence -- a controlled reconciliation, never a bare label.
  - `PO_EXEMPTED`: requires a non-empty reason, rejected over already-complete evidence, append-only audited, reversible via `revoke` ("hoan tac") without ever hard-deleting the record.
  - Exactly one `ACTIVE` exception per `indicator x source_lane x business_date` (partial unique index); a second attempt is rejected `409`.
  - SQLite-level guarantees: `RAISE(ABORT)` triggers block hard-delete of any exception row and block mutation of an already-`REVOKED` row; the event ledger is fully append-only (no update/delete).
- `backend/src/services/autoBackfillCoverageService.js`: `scan()` now maps the raw 4-state completion result plus the exception overlay onto the 6 canonical states (`DATA_COMPLETE_WITH_EVIDENCE`, `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE`, `TRUE_MISSING`, `VERIFIED_NO_DATA`, `PO_EXEMPTED`, `MANUAL_REVIEW_REQUIRED`). Real, currently-committed complete data always wins over a stale exception. Any item carrying an active exception is always `queue_eligible: false` -- so `VERIFIED_NO_DATA`/`PO_EXEMPTED`/`LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` items never reach the Queue/Safety layer at all, and are therefore structurally excluded from single-date retry counts and circuit-breaker signatures without any change to `autoBackfillSafetyCoordinator.js` or the Queue.
- New admin-only controller `backend/src/controllers/autoBackfillCoverageExceptionController.js` and routes: `GET/POST /api/import/auto-backfill/coverage/exceptions`, `POST /api/import/auto-backfill/coverage/exceptions/:exceptionId/revoke` -- mirrors the existing Queue controller's admin-only-mutation / registry-role-gated-read pattern.
- Additive SQLite migration `backend/migrate_auto_backfill_coverage_exception_schema.js`, wired into `server.js` startup alongside the Queue/Safety migrations, plus the matching section appended to `backend/src/db/schema.sql` for fresh databases.
- Existing `test_autoBackfillCoverageService.js` updated for the 6-state rename (`SUCCESS` -> `DATA_COMPLETE_WITH_EVIDENCE`, `MANUAL_ONLY_MISSING` -> `TRUE_MISSING` with `automation_mode` carrying the manual-only distinction); behavior (ordering, isolation, permissions, N-1 window) unchanged.
- Self-found defect: initial drafts of the two coverage service files contained literal NUL control-byte characters inside internal Map keys (an editing-tool escaping artifact), which silently broke the exception-overlay lookup (coverage always showed the raw status, never the exception). Caught by the new tests, fixed by switching to plain pipe-joined string keys, and confirmed zero NUL bytes remain in every touched file before commit.

## 4. Validation Result

- New suites: coverage-exception service `20/20`, coverage-exception controller `4/4`, coverage-exception migration `4/4` -- OS-temporary SQLite only, no real Portal/Queue/Import, no browser.
- Updated coverage service/controller suite: `16/16` PASS.
- Combined regression sweep (Coverage, Coverage Exception service/controller/migration, Queue service/controller, Safety, F1.3/F4.1 executors, F1.3 HUE/TCT backfill and sync, Import pipeline race/processor, F4.1 Import pipeline/parsers, e2e Import engine, Queue/Safety/F4.1 migrations, server startup migrations): `124/124` PASS.
- `node -c` syntax-checked on every new/modified backend file. No backend lint script exists (oxlint is a frontend-only devDependency and was not touched).

## 5. Scope Proof And PO Backend Gate

- No frontend/UI file was touched; `AUTO-BACKFILL-UI-REMEDIATION` (Phase B) remains unactivated, reserved for Antigravity.
- No real Portal session, Queue worker, or Import ran; no browser was opened; `Data QLML/` and both pre-existing stashes are untouched.
- No business-data table (`fact_*`, `import_log`) was mutated; only the new, empty `auto_backfill_coverage_exception*` tables and the coverage-scanner overlay logic were added.
- Existing Queue/Safety single-date retry-then-continue and same-signature-only circuit-open behavior is unmodified and re-proven passing; exception-covered items never reach that layer.
- Product Owner backend gate is not self-passed; Phase B, UI, and Runtime remain inactive.

State: `AUTO-BACKFILL-COVERAGE-EXCEPTION IMPLEMENTED / READY FOR PO BACKEND GATE`.

## 6. Backend Gate Remediation -- Atomic Create/Revoke (2026-08-19)

A CTO-reviewed integrity defect was confirmed against commit `2c633f0c`: `AutoBackfillCoverageExceptionService.create()` wrote the exception row and its mandatory `CREATED` audit event as two separate, unguarded `db.run()` calls; `revoke()` likewise wrote the status update and the `REVOKED` event separately. A failure between the two statements could leave effective exception state persisted without its mandatory append-only audit event (or, for `revoke()`, a status change with no matching event).

**Fix**: `autoBackfillCoverageExceptionService.js` gains `withTransaction(fn)`, which runs `fn` between `BEGIN TRANSACTION` and `COMMIT` on the shared injected connection and rolls back (`ROLLBACK`, with the rollback failure itself caught so the original error is preserved) on any failure -- this mirrors the repository's already-established transaction pattern in `backend/src/services/importProcessor.js`. `create()`'s state INSERT + `CREATED` event INSERT now run inside one `withTransaction` call; `revoke()`'s status UPDATE + `REVOKED` event INSERT run inside another. Every other line -- validation, the active-exception-exists precheck, raw-completion evaluation, `assertPermitted` admin-role authorization, the SQLite append-only/no-hard-delete triggers, the one-`ACTIVE`-per-tuple partial unique index, and all request/response/error-code API contracts -- is unchanged.

**Fault-injection tests** (`test_autoBackfillCoverageExceptionService.js`, 4 new): a `createFlakyDb` proxy wraps the real SQLite fixture connection so one specific statement (matched by a SQL substring unique to it) rejects while `BEGIN`/`COMMIT`/`ROLLBACK` and every other statement pass through untouched.

- `create()`, event write fails (the exact original defect scenario): asserts the call rejects, zero rows exist in `auto_backfill_coverage_exception`, zero rows exist in `auto_backfill_coverage_exception_event`, and the same tuple can be cleanly created afterwards (no dangling `UNIQUE`-index lock from an uncommitted insert).
- `create()`, state write fails: asserts the same zero/zero outcome.
- `revoke()`, event write fails (the exact original defect scenario): asserts the call rejects, the exception row's `status` is still `ACTIVE` with `revoked_by`/`revoked_at` still `NULL`, no `REVOKED` event exists, and the exception can still be genuinely revoked afterwards.
- `revoke()`, status-update write fails: asserts the same still-`ACTIVE`/no-event outcome.

**Sanity check that the tests are real**: reverted the fix alone via `git stash push -- src/services/autoBackfillCoverageExceptionService.js` (test file untouched) and reran the suite -- exactly the 2 event-write-failure tests failed (`not ok 21`, `not ok 23`) while the other 22 passed, confirming the tests fail without the fix and pass with it, not vacuously.

**Validation**:

- `autoBackfillCoverageExceptionService.js`: `node -c` syntax-check PASS; zero NUL bytes (learned from the prior implementation round, re-verified explicitly).
- Exception service suite: `24/24` PASS (20 existing + 4 new fault-injection).
- Exception controller suite: `4/4` PASS (unaffected, mocks the service).
- Coverage-exception migration suite: `4/4` PASS (unaffected, schema unchanged).
- Coverage service/controller suite (6-state overlay, unaffected by the transaction change): `16/16` PASS.
- Combined regression sweep -- Coverage, Coverage Exception (service/controller/migration), Queue (service/controller), Safety, F1.3/F4.1 executors, Queue/Safety migrations, server startup migrations: `103/103` PASS.
- `git diff --name-only` confirms exactly 2 files changed: `backend/src/services/autoBackfillCoverageExceptionService.js` and its test file. No schema/migration file, no controller, no route, no frontend/UI file, no Queue/Safety file, and no business-data table were touched.
- No real Portal session, Queue worker, or Import ran; no browser was opened; `Data QLML/` and both pre-existing stashes untouched.

State: `AUTO-BACKFILL-COVERAGE-EXCEPTION IMPLEMENTED / READY FOR PO BACKEND GATE` (remediated). Product Owner backend gate is not self-passed; Phase B (`AUTO-BACKFILL-UI-REMEDIATION`, Antigravity) and Runtime remain inactive.
