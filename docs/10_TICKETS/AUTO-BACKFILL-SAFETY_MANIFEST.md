# AUTO-BACKFILL-SAFETY Manifest

Status: `IMPLEMENTED / READY FOR PO GATE 5` (2026-08-18).

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-SAFETY`
- Phase: `Shared Auto Backfill - Safety, Audit And PO Reporting`
- Executor: `Codex`, explicitly authorized by the Product Owner for this ticket only
- Branch: `codex/da-impl-006`
- Baseline: `0f363187283846a8456804419900f36ca40ef679`
- Activation authority: `PO AUTO-BACKFILL-F41 GATE 4 PASS and authorizes AUTO-BACKFILL-SAFETY`
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Implement the indicator-neutral Safety Coordinator approved in `AUTO-BACKFILL-PLAN` Section 11.5: normalized error classification, persistent bounded retry, authentication wait/resume, scoped circuit breaker, immediate integrity stop, append-only audit and actionable Product Owner reporting, while preserving exact completion recheck and the database global lease.

## 3. Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/README_AI.md)
- [PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [AUTO-BACKFILL-PLAN_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md), Sections 7, 8, 10 and 11.5
- [AUTO-BACKFILL-QUEUE_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-BACKFILL-QUEUE_MANIFEST.md)
- [AUTO-BACKFILL-QUEUE_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-BACKFILL-QUEUE_CHECKPOINT_001.md)
- [AUTO-BACKFILL-F13_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-BACKFILL-F13_MANIFEST.md)
- [AUTO-BACKFILL-F13_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-BACKFILL-F13_CHECKPOINT_001.md)
- [AUTO-BACKFILL-F41_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-BACKFILL-F41_MANIFEST.md)
- [AUTO-BACKFILL-F41_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-BACKFILL-F41_CHECKPOINT_001.md)
- [Shared Portal Adapter Standard](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/07_REFERENCE/Shared_Business/portal_adapter_standard.md)
- [importIndicatorRegistry.js](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/importIndicatorRegistry.js)
- Existing Auto Backfill store, service, coordinator, runtime, routes, migration and tests

## 4. Locked Contracts

- Maximum `3` attempts for explicitly classified transient failures, with bounded exponential backoff persisted across restart.
- Data, permission, validation and integrity failures are never retried. Integrity fatal stops immediately on the first failure.
- A circuit opens after `5` consecutive system failures with the same sanitized signature in the exact declared adapter/source/resource scope. Mixed signatures and other scopes do not share a counter; success resets the matching scope.
- Authentication loss does not become permanent job failure. The exact job and run enter `WAITING_AUTH`, coordinator draining stops safely, and work resumes only after a valid session plus explicit wake/resume.
- Completion policy is rechecked before every attempt and after recovery. Exact SUCCESS is never downloaded, imported or retried.
- Newest-date-first ordering and one globally RUNNING/leased job remain unchanged.
- Attempts and state transitions for retry, pause, auth wait, circuit open, resume, integrity stop and terminal failure are append-only and sanitized.
- Product Owner reports identify indicator, lane, business date, error signature, attempt count and required action without credentials, cookies, tokens, profile contents or sensitive payloads.
- Shared Safety code may use registry-declared policy/scope and normalized classifications only. It may not branch on F1.3, F4.1, indicator code or target table.

## 5. In Scope

- Additive/idempotent SQLite Safety persistence and migration updates.
- Generic error taxonomy and adapter-result normalization.
- Persistent retry scheduling, authentication wait/resume and circuit/integrity transitions integrated with Queue/coordinator lifecycle.
- Admin-only retry/reset/wake actions required by the approved contract, registry-governed audit/report reads, and sanitized actionable PO report.
- Fake indicator/adapter acceptance proving indicator-neutral behavior.
- Coverage, Queue, F1.3, F4.1 and startup/migration regressions.
- Governance synchronization and Gate 5 handoff.

## 6. Out Of Scope

- Real Queue, Portal session, download, Import or operational database/business-data mutation.
- Frontend/UI, notifications outside the persisted report/event contract, or credential/session storage.
- New or changed F1.3/F4.1 Portal identities, filters, parsers, completion policies or Import behavior.
- `AUTO-BACKFILL-UI`, `AUTO-BACKFILL-RUNTIME` or any successor activation.

## 7. Required Validation

- Retryable transient failure succeeds within three attempts with bounded exponential delays persisted.
- Non-retryable data/permission/integrity failures execute once; integrity blocks immediately.
- Five matching system signatures in one adapter/source/resource scope open only that circuit; mixed signatures and other scopes do not.
- Success resets the matching circuit counter; restart retains open circuit and retry/auth-wait state.
- Authentication loss retains the exact job, stops drain, and explicit valid-session wake/resume continues it without duplicate execution.
- SUCCESS-before-retry and externally completed work never invoke an executor.
- Append-only events/attempts and PO report contain required identity/action fields and redact sensitive material.
- Synthetic indicator/adapter proof requires no F1.3/F4.1 branch in shared Safety code.
- Existing ordering, global lease, pause/resume/recovery and Coverage/Queue/F1.3/F4.1 contracts remain PASS.

## 8. PO Gate 5 And Stop

Required stop: `AUTO-BACKFILL-SAFETY IMPLEMENTED / READY FOR PO GATE 5`.

Gate 5 remains Product Owner-owned. Implementation completion must not self-pass Gate 5 or activate UI, Runtime or another ticket.

## 9. Implemented Contract

- Added an indicator-neutral classifier that consumes registry retry/error/circuit declarations, hashes sanitized signatures and defaults unknown errors to non-retryable system failures.
- Added persistent Safety overlay fields to runs/jobs/attempts plus `auto_backfill_circuit`; the additive startup migration is idempotent and inserts no queue or business rows.
- Retryable transient attempts use persisted `2s / 4s` bounded exponential waits and stop after three total attempts. Data, permission and unknown system failures do not retry.
- Five consecutive matching system signatures open only the exact adapter/source/resource scope. Mixed signatures reset to one, non-system outcomes break the sequence, success resets it, and open state survives restart until Admin reset.
- Authentication enters durable `WAITING_AUTH`, releases the global lease and stops coordinator drain. Resume first uses the verified executor's supported session preflight; invalid sessions remain waiting, while a valid explicit Resume continues the exact job.
- Integrity fatal enters durable `BLOCKED_INTEGRITY` on the first attempt and globally prevents later leases. No automatic reset is exposed.
- Completion is rechecked after executor errors and before every reattempt. External or post-error SUCCESS becomes `SKIPPED_ALREADY_SUCCESS` without another executor call.
- Existing append-only events now cover attempts, retry, pause, auth wait/resume, circuit open/reset, integrity stop and terminal failure. Completed attempt rows are immutable and undeletable.
- Added registry-governed `GET .../events` and `GET .../report`, plus Admin-only circuit reset. Reports expose indicator/lane/date, sanitized signature, attempt count and required action.

## 10. Validation Result

- Shared Coverage/Queue/Safety/F1.3/F4.1/migration/startup suite: `72/72 PASS`.
- Safety acceptance proves three-attempt bounds, persisted backoff/restart, pause/resume, exact-scope circuit behavior, mixed-signature/success reset, explicit session-valid resume, immediate integrity stop, SUCCESS-before-retry, audit redaction and F9.TEST extensibility.
- Legacy F4.1 parsers `5/5` and `6/6`, F1.3 HUE backfill `39/39`, HUE sync `135/135`, TCT backfill, Import race `41/41` and Import processor `59/59` regressions PASS.
- All mutation-capable tests used OS-temporary SQLite/filesystem sandboxes and injected fake executors. No operational Queue, Portal, download, Import or business-data write ran.

## 11. Gate 5 State

Technical implementation is complete with no known blocker. Product Owner Gate 5 remains required and is not self-awarded. UI, Runtime and every successor remain inactive.

`AUTO-BACKFILL-SAFETY IMPLEMENTED / READY FOR PO GATE 5`
