# AUTO-BACKFILL-COVERAGE-EXCEPTION Manifest

Status: `IMPLEMENTED / READY FOR PO BACKEND GATE` (2026-08-19).

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-COVERAGE-EXCEPTION`
- Phase: `AUTO-BACKFILL-UI Remediation Plan, Phase A (Backend First)`
- Executor: `Claude Code`, explicitly authorized by the Product Owner for backend implementation (in-domain per `CLAUDE.md` executor role split: Claude Code owns implementation/backend/data/tests)
- Branch: `codex/da-impl-006`
- Baseline: `3fce810f`
- Activation authority: `PO ARCHITECTURE APPROVAL PASS on AUTO-BACKFILL-UI_PLAN.md; PO explicitly authorizes Phase A (AUTO-BACKFILL-COVERAGE-EXCEPTION) for Claude Code`
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Implement the backend half of the Product Owner-approved 5-point architectural remediation (`docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md`) as the required first step of the inverted Phase A -> Phase B sequence: the registry-driven 6-state coverage model, controlled Legacy Baseline Reconciliation, strict 5-point adapter-proven `VERIFIED_NO_DATA`, reasoned/audited/reversible `PO_EXEMPTED`, and confirmation that single-date retry and system-signature-only circuit breaking remain unaffected and that exception items are never queued, retried, or counted toward a circuit. Phase B (`AUTO-BACKFILL-UI-REMEDIATION`, frontend, Antigravity) depends on this ticket's verified APIs and is out of scope here.

## 3. Required Reading

- [PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [AUTO-BACKFILL-UI_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md) Sections 1-5
- [AUTO-BACKFILL-UI_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-BACKFILL-UI_MANIFEST.md)
- [AUTO-BACKFILL-SAFETY_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-BACKFILL-SAFETY_MANIFEST.md)
- [AUTO-BACKFILL-SAFETY_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-BACKFILL-SAFETY_CHECKPOINT_001.md)
- `backend/src/services/importIndicatorRegistry.js`
- `backend/src/services/autoBackfillCoverageService.js`
- `backend/src/services/autoBackfillCompletionPolicies.js`
- `backend/src/services/autoBackfillSafetyCoordinator.js`
- `backend/src/db/schema.sql` (`AUTO-BACKFILL-QUEUE`/`AUTO-BACKFILL-SAFETY` sections)

## 4. Locked Contracts (From `AUTO-BACKFILL-UI_PLAN.md`)

- 6 canonical coverage states, registry-driven, never hardcoded per indicator: `DATA_COMPLETE_WITH_EVIDENCE`, `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE`, `TRUE_MISSING`, `VERIFIED_NO_DATA`, `PO_EXEMPTED`, `MANUAL_REVIEW_REQUIRED`.
- `VERIFIED_NO_DATA` requires explicit adapter proof of exactly 5 criteria (report identity, indicator x lane x date tuple, filter applied, response readiness, export/table structure confirming 0 rows). Any missing criterion is rejected, never silently downgraded or auto-exempted.
- `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` is a controlled, admin-recorded reconciliation, only accepted when the underlying raw completion evidence already proves committed rows without complete import evidence -- never a bare label with no underlying data.
- `PO_EXEMPTED` requires a reason, is append-only audited, and is reversible (`revoke` / "hoàn tác") without ever hard-deleting the record.
- Completion policy stays registry-driven per `indicator x lane`; shared logic contains no `F1.3`/`F4.1`/table branch.
- A single date's transient error retries per registry policy up to its bound, then the run continues to the next date; a circuit opens only on consecutive matching-signature system failures in the declared scope.
- `VERIFIED_NO_DATA` and `PO_EXEMPTED` (and `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE`) items are excluded from queue eligibility and therefore never counted as a retry or a circuit-breaker failure.

## 5. In Scope

- Additive/idempotent SQLite schema and startup migration for coverage exceptions and their append-only audit trail.
- Coverage exception service: create (`PO_EXEMPTED`, `LEGACY_BASELINE`, `VERIFIED_NO_DATA`), revoke, list, with registry-role-gated access.
- `AutoBackfillCoverageService` overlay: raw 4-state completion mapped to the 6 canonical display states, exception-aware, queue-eligibility updated so excepted items are never queue-eligible.
- Admin-only REST endpoints under `/api/import/auto-backfill/coverage/exceptions`.
- Unit/integration tests proving all 5 plan points using temporary SQLite fixtures and fake adapters/registrations only.
- Regression proof that existing Coverage/Queue/Safety/F1.3/F4.1 suites remain PASS.

## 6. Out Of Scope

- Frontend/UI (`AUTO-BACKFILL-UI-REMEDIATION`, Antigravity, Phase B).
- Opening a real browser, running a real Portal session, Queue worker, or Import.
- Any business data mutation (`fact_*`, `import_log`, `Data QLML/`).
- `AUTO-BACKFILL-RUNTIME` or any successor activation.

## 7. Required Validation

- `VERIFIED_NO_DATA` creation is accepted only with all 5 adapter-proof criteria true and matching report identity/tuple/zero-row count; any single missing criterion is rejected (never silently downgraded).
- `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` creation is accepted only when raw completion evidence already shows committed rows without complete import evidence; rejected otherwise.
- `PO_EXEMPTED` requires a non-empty reason, is queryable via an append-only audit trail, and is revocable without deleting history.
- Coverage scan returns exactly the 6 canonical status codes, registry-driven, with no `F1.3`/`F4.1` branch in shared scanner/exception code (`F9.TEST` extensibility proof).
- Items carrying an active exception are never `queue_eligible`.
- Existing single-date retry-then-continue and same-signature-only circuit-open behavior are unaffected; excepted items never appear as retries or circuit failures.
- Coverage/Queue/Safety/F1.3/F4.1/migration/startup regression suites remain PASS.

## 8. Implemented Contract

- New pure `autoBackfillBusinessCalendar.js` module carries the ISO-date/timezone/window helpers previously private to the coverage scanner, shared without a circular require between the coverage scanner and the new exception service.
- New `autoBackfillCoverageExceptionService.js` implements `create`/`revoke`/`list`/`loadActiveExceptionMap`, all registry-driven (indicator/lane resolved from `importIndicatorRegistry.js`, no hardcoded indicator branch -- proved by an `AB-EXT`-style source-regex test and by successfully exercising a synthetic `F5.TEST` registration).
- `VERIFIED_NO_DATA` requires an `AUTOMATED` lane with a registered Portal adapter and all 5 proof criteria (`reportIdentityVerified`, `tupleMatchVerified`, `filterAppliedVerified`, `responseReadyVerified`, `structureValidZeroRows`) plus a matching `reportIdentity` and `confirmedRowCount === 0`; any gap is rejected `422` (`VERIFIED_NO_DATA_PROOF_INCOMPLETE`/`_REPORT_IDENTITY_MISMATCH`/`_ROW_COUNT_NOT_ZERO`), never silently downgraded. It is further rejected unless the raw registry completion policy currently reports no committed data.
- `LEGACY_BASELINE` (display: `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE`) is accepted only when the raw completion policy already reports committed rows without complete import evidence (`MANUAL_REVIEW_REQUIRED` with `evidence.row_count > 0`) -- a controlled reconciliation, never a bare label.
- `PO_EXEMPTED` requires a non-empty reason, is rejected over already-complete evidence, and is append-only audited (`auto_backfill_coverage_exception_event`, `CREATED`/`REVOKED`) and reversible via `revoke` ("hoàn tác") without ever hard-deleting the record -- enforced at the SQLite layer by `RAISE(ABORT)` triggers blocking both delete and post-revoke mutation.
- Only one `ACTIVE` exception may exist per `indicator x source_lane x business_date` (partial unique index); a second attempt is rejected `409`.
- `AutoBackfillCoverageService.scan()` now maps the raw 4-state completion policy plus the exception overlay onto the 6 canonical states (`DATA_COMPLETE_WITH_EVIDENCE`, `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE`, `TRUE_MISSING`, `VERIFIED_NO_DATA`, `PO_EXEMPTED`, `MANUAL_REVIEW_REQUIRED`); real committed complete data always wins over a stale exception. Items carrying an active exception are always `queue_eligible: false`, so `VERIFIED_NO_DATA`/`PO_EXEMPTED`/`LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` items never reach the Queue/Safety layer and are therefore structurally excluded from single-date retry counts and circuit-breaker signatures -- Safety's existing 3-attempt bounded retry and 5-consecutive-same-signature circuit code was not modified and remains proven by the unchanged Safety suite.
- Admin-only REST surface: `GET/POST /api/import/auto-backfill/coverage/exceptions`, `POST /api/import/auto-backfill/coverage/exceptions/:exceptionId/revoke`, mirroring the existing Queue controller pattern (admin-only mutation, registry-role-gated read).
- Additive SQLite migration (`migrate_auto_backfill_coverage_exception_schema.js`, wired into `server.js` startup alongside Queue/Safety) plus the matching `schema.sql` section for fresh databases.

## 9. Validation Result

- New suites: exception service `20/20`, exception controller `4/4`, migration `4/4` -- all against OS-temporary SQLite; no real Portal/Queue/Import ran and no browser opened.
- Updated Coverage service/controller suite (6-state rename): `16/16` PASS.
- Combined regression sweep (Coverage, Coverage Exception, Queue, Safety, F1.3/F4.1 executors, F1.3 HUE/TCT backfill and sync, Import pipeline race/processor, F4.1 Import pipeline/parsers, e2e Import engine, Queue/Safety/F4.1/Coverage-Exception migrations, server startup migrations): `124/124` PASS.
- All touched/added backend files pass `node -c` syntax checks; no lint script exists for the backend (oxlint is frontend-only and untouched this ticket).
- A self-inflicted defect was found and fixed during implementation: initial drafts of `autoBackfillCoverageService.js`/`autoBackfillCoverageExceptionService.js` contained literal NUL control-byte characters inside internal Map keys (an editing-tool escaping artifact), silently breaking the exception-overlay lookup. Found via the new tests, fixed by using plain pipe-joined string keys, and confirmed zero NUL bytes remain in every touched file.

## 10. Backend Gate Remediation -- Atomic Create/Revoke (2026-08-19)

A CTO-reviewed defect against commit `2c633f0c` was confirmed: `AutoBackfillCoverageExceptionService.create()` wrote the exception row and its mandatory `CREATED` audit event as two separate, unguarded statements; `revoke()` likewise wrote the status update and the `REVOKED` event separately. A failure between the two statements (disk/DB error, process interruption) could leave an exception's effective state persisted without its append-only audit event, or vice versa for `revoke()`.

Fix: a new `withTransaction(fn)` helper wraps each write pair in `BEGIN TRANSACTION` / `COMMIT`, rolling back on any failure -- matching the repository's already-established transaction pattern in `backend/src/services/importProcessor.js` (`BEGIN TRANSACTION` / `COMMIT` / try-caught `ROLLBACK` that preserves the original error). `create()`'s state INSERT + `CREATED` event INSERT, and `revoke()`'s status UPDATE + `REVOKED` event INSERT, each now run inside one such transaction. Everything else -- validation, the active-exception-exists check, the raw-completion evaluation, admin-role authorization (`assertPermitted`), the append-only/no-hard-delete SQLite triggers, the one-`ACTIVE`-per-tuple unique index, and every public API contract (request/response shapes, error codes) -- is unchanged.

4 new fault-injection tests (`test_autoBackfillCoverageExceptionService.js`) inject a failure into the second write of each operation (and, for completeness, the first write too) via a thin proxy around the real SQLite connection that lets `BEGIN`/`COMMIT`/`ROLLBACK` and every other statement pass through untouched. Each test asserts the operation rejects and that **no** exception row, status change, or event row survives -- and that the tuple remains cleanly usable afterwards (a fresh `create()`/`revoke()` succeeds with no dangling lock or stuck status). Sanity-checked by reverting the fix alone (`git stash` on the service file only) and confirming exactly the two event-write-failure tests fail while the other 22 stay green -- proving the tests actually exercise the defect, not just pass vacuously.

Validation: exception service suite `24/24` (20 existing + 4 new), exception controller `4/4`, migration `4/4`, Coverage service/controller `16/16`, and the full combined regression sweep (adds Queue service/controller, Safety, F1.3/F4.1 executors, Queue/Safety migrations, server startup migrations) `103/103` -- all PASS. `node -c` syntax-checked; no backend lint script exists. Scope confirmed backend-only via `git diff --name-only` (exactly the service file and its test file); no UI, Queue/Safety behavior, Portal, Import, or business data touched.

State: `AUTO-BACKFILL-COVERAGE-EXCEPTION IMPLEMENTED / READY FOR PO BACKEND GATE` (remediated). Not self-passed; Phase B and Runtime remain inactive.

## 11. Stop Condition

`AUTO-BACKFILL-COVERAGE-EXCEPTION IMPLEMENTED / READY FOR PO BACKEND GATE`.

The Product Owner backend gate remains Product Owner-owned. Implementation completion does not self-pass this gate and does not activate Phase B, UI, or Runtime.
