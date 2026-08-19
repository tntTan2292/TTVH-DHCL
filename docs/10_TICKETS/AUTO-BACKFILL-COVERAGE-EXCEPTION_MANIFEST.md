# AUTO-BACKFILL-COVERAGE-EXCEPTION Manifest

Status: `ACTIVATED / IMPLEMENTATION IN PROGRESS` (2026-08-19).

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

## 8. Stop Condition

`AUTO-BACKFILL-COVERAGE-EXCEPTION IMPLEMENTED / READY FOR PO BACKEND GATE`.

The Product Owner backend gate remains Product Owner-owned. Implementation completion does not self-pass this gate and does not activate Phase B, UI, or Runtime.
