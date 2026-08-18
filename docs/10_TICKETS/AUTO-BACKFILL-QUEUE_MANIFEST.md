# AUTO-BACKFILL-QUEUE Manifest

Status: `IMPLEMENTED / READY FOR PO GATE 2` (2026-08-18).

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-QUEUE`
- Phase: `Shared Auto Backfill - Persistent Queue Foundation`
- Executor: `Codex`, explicitly authorized by the Product Owner for this ticket only
- Branch: `codex/da-impl-006`
- Baseline: `1d51a693b7f48f104d4dbf694185c06745321d28`
- Activation authority: `PO AUTO-BACKFILL-COVERAGE GATE 1 PASS and authorizes AUTO-BACKFILL-QUEUE only`
- Initial worktree: no tracked changes; only excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Implement the indicator-neutral persistent planning and sequential execution shell approved in `AUTO-BACKFILL-PLAN` Section 11.2. The ticket must persist exact `indicator x source_lane x business_date` jobs, enforce one globally leased DKCL job across backend processes, support graceful pause/resume and restart recovery, and never execute a date already proven complete.

## 3. Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/README_AI.md)
- [PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [AUTO-BACKFILL-PLAN_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md), especially Sections 7, 10, 11.2 and 12
- [AUTO-BACKFILL-COVERAGE_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-BACKFILL-COVERAGE_MANIFEST.md)
- [AUTO-BACKFILL-COVERAGE_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-BACKFILL-COVERAGE_CHECKPOINT_001.md)
- [importIndicatorRegistry.js](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/importIndicatorRegistry.js)
- [autoBackfillCoverageService.js](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/autoBackfillCoverageService.js)
- [schema.sql](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/db/schema.sql)
- [server.js](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/server.js)

## 4. In Scope

- Additive SQLite migration/schema for runs, jobs, attempts/leases and append-only state-transition events.
- Idempotent planning from coverage items whose `queue_eligible` value is true only.
- Persist exact identity, registry/completion snapshot and deterministic priority.
- One globally RUNNING/leased job across indicators, lanes, runs and backend processes.
- Graceful PAUSE, persisted RESUME and startup/restart recovery.
- Mandatory completion-policy recheck before executor invocation and during recovery.
- Injected executor interface; fake executors only in isolated tests.
- Admin-only create/pause/resume; registry-governed read APIs.
- Required AB-QUE/AB-SUC, competing-worker, idempotency, permission and migration tests.
- Manifest, checkpoint and Governance V2 synchronization.

## 5. Out Of Scope

- F1.3/F4.1 Portal adapters, browser/login/report/download behavior or credentials.
- Any real executor registration, DKCL run, Import, force refresh or business-data mutation.
- Retry/backoff and circuit-breaker runtime beyond persisted states/interfaces strictly needed by this queue.
- Frontend/UI, watcher changes, F13/F41/Safety/UI/Runtime ticket activation.
- Executable production jobs for `MANUAL_ONLY` or unverified lanes.

## 6. Locked Contracts

- Priority: newest business date first, then registry priority, then lane priority.
- Active work identity: exact indicator, source lane and business date; repeated planning cannot duplicate active work.
- Global lease: at most one leased/RUNNING job; acquisition must be database-atomic and safe across processes.
- Pause is graceful: current atomic work may finish, no next lease starts, queued work remains persisted.
- Resume continues persisted work; explicit PAUSED survives restart.
- Interrupted RUNNING recovery first rechecks completion. Complete work becomes `SKIPPED_ALREADY_SUCCESS`; incomplete work safely returns to eligible persisted state.
- Before every executor call, completion is rechecked; externally completed work never executes.
- Production executor lookup fails closed when no verified executor is registered.
- State-transition evidence is append-only and sanitized. Full Safety audit/reporting is deferred.
- Production coverage clock remains backend-owned; caller `as_of` remains rejected.

## 7. API Contract

- `POST /api/import/auto-backfill/runs` - admin-only idempotent plan creation from current backend-clock coverage.
- `GET /api/import/auto-backfill/runs/:runId` - registry-governed read.
- `POST /api/import/auto-backfill/runs/:runId/pause` - admin-only graceful pause.
- `POST /api/import/auto-backfill/runs/:runId/resume` - admin-only persisted resume.

No endpoint in this ticket accepts a Portal credential, executes a real Import, retries a failed adapter, or overrides the business clock.

## 8. Mandatory Validation

- `AB-QUE-01`, `AB-QUE-02`, `AB-QUE-03`.
- `AB-SUC-01`, `AB-SUC-02`.
- Competing-worker/two-process lease proof.
- Idempotent duplicate run/job creation.
- Permissions and read-only API contracts.
- Startup migration creation/idempotency.
- Existing Coverage, F1.3/F4.1 Import and legacy backfill regressions.
- Scope, worktree, staged-file and operational-data safety checks.

## 9. PO Gate 2 And Handoff

Required stop: `AUTO-BACKFILL-QUEUE IMPLEMENTED / READY FOR PO GATE 2`.

Gate 2 must review persisted progress, deterministic ordering, one-global-lease proof, pause/resume behavior, restart simulation and evidence that SUCCESS is never executed twice. No next ticket is activated by implementation completion.

## 10. Implemented Contract

- Additive startup migration creates `auto_backfill_run`, `auto_backfill_job`, `auto_backfill_attempt`, singleton `auto_backfill_worker_lease`, and append-only `auto_backfill_event` without inserting business or queue data.
- Run planning consumes only `queue_eligible=true` coverage items. Every job persists exact indicator, source lane, business date, registry version, completion-policy identity, executor identity and registry/lane priorities.
- `BEGIN IMMEDIATE`, a singleton `GLOBAL_DKCL` lease row and a partial unique one-RUNNING-job index enforce one global atomic job across independent SQLite connections/backend processes.
- Active request and exact active-job indexes make repeated planning idempotent. Ordering remains business date descending, indicator priority ascending, lane priority ascending.
- Pause transitions to `PAUSING` while an atomic job is active and then to `PAUSED`; otherwise it pauses immediately. Resume retains and continues queued state.
- Every execution boundary re-evaluates completion. Startup and pre-lease recovery recheck expired/interrupted RUNNING work; confirmed completion becomes `SKIPPED_ALREADY_SUCCESS`, otherwise the persisted job returns to `QUEUED`. Explicit `PAUSED` runs remain paused.
- Production executor registration is empty by design. An automated registration without a runtime-verified executor fails before persistence; all current F1.3/F4.1 lanes remain `MANUAL_ONLY`, so no executable production job can be created.
- Four approved APIs are mounted under `/api/import/auto-backfill`; create/pause/resume are Admin-only and reads are filtered by registry coverage-read roles. No API accepts `as_of`.

## 11. Acceptance And Regression Result

- Queue/migration/API/Coverage focused suite: `32/32 PASS`, including `AB-QUE-01..03`, `AB-SUC-01..02`, two-connection lease competition, duplicate planning, registry permissions/read-only GET, append-only events, migration startup/idempotency and `AB-EXT/AB-ISO` preservation.
- F4.1 Import pipeline: `1/1 PASS`; HUE parser `5/5 PASS`; TCT parser `6/6 PASS`.
- F1.3 Import race: `41/41 PASS`; Import processor: `59/59 PASS`; HUE legacy backfill: `39/39 PASS`; TCT legacy backfill: all checks PASS.
- All mutation-capable tests used OS-temp SQLite/filesystem sandboxes and injected test-only executors. No operational migration, real queue, Portal session, Import or business-data write was run.

## 12. Gate 2 State

Technical implementation is complete with no known blocker. Product Owner Gate 2 remains required and is not self-awarded. `AUTO-BACKFILL-F13` and every later ticket remain inactive.

`AUTO-BACKFILL-QUEUE IMPLEMENTED / READY FOR PO GATE 2`
