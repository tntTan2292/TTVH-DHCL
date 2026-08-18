# AUTO-BACKFILL-QUEUE - Checkpoint 001

## 1. Activation

- State: `ACTIVE / IMPLEMENTATION AUTHORIZED`
- Date: `2026-08-18`
- Branch: `codex/da-impl-006`
- Expected and observed baseline: `1d51a693b7f48f104d4dbf694185c06745321d28`
- Product Owner authority: `PO AUTO-BACKFILL-COVERAGE GATE 1 PASS and authorizes AUTO-BACKFILL-QUEUE only`
- Executor: `Codex`, explicitly authorized for this ticket
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

Coverage Gate 1 is accepted and closed. This checkpoint activates only the persistent queue foundation in plan Section 11.2. No F13/F41 Portal adapter, Safety runtime, UI or real Runtime is active.

## 2. Locked Delivery Boundary

The implementation must add durable run/job/attempt/lease/event persistence, queue only coverage-eligible keys, preserve exact identity and approved priority, enforce one database-backed global lease, implement graceful pause/resume and restart recovery, and expose the four approved queue APIs.

Every executor boundary is injected and fail-closed. Production currently has no verified shared Portal executor, so production may persist no executable work for manual-only lanes and may not simulate automation.

## 3. Required Acceptance

- `AB-QUE-01`: global one-running invariant and newest-first deterministic order.
- `AB-QUE-02`: pause during atomic work, no next lease, persisted resume.
- `AB-QUE-03`: restart recheck and PAUSED preservation.
- `AB-SUC-01`: external SUCCESS before lease skips execution.
- `AB-SUC-02`: post-commit crash recovery skips second execution.
- Competing database workers cannot both lease work.
- Duplicate planning is idempotent by exact active identity.
- Mutations are admin-only; read follows registry roles and remains read-only.
- Startup migration creates the queue schema and is idempotent.

## 4. Initial Safety State

- No product code had been changed when this activation record was created.
- No schema or migration had been run against the operational database.
- No Import, Portal, queue or Data DKCL operation had been run.
- `.claude/` and `Data QLML/` were not opened, modified or staged.

Implementation evidence, final schema/API contract, tests, risks and commit proof will be appended to this checkpoint before Gate 2 handoff.

## 5. Technical Execution Report

### 5.1 Persistence And State Machine

The additive migration and canonical schema now define:

| Component | Contract |
| --- | --- |
| `auto_backfill_run` | Persisted request key, backend business date, registry version, scope, actor and RUNNING/PAUSING/PAUSED/terminal state |
| `auto_backfill_job` | Exact `indicator x source_lane x business_date`, deterministic priorities, policy/executor identity, lease fields and terminal evidence |
| `auto_backfill_attempt` | Immutable attempt number/lease identity plus RUNNING, interrupted and terminal outcome evidence |
| `auto_backfill_worker_lease` | Singleton `GLOBAL_DKCL` row shared by every process |
| `auto_backfill_event` | Ordered append-only transition record; UPDATE and DELETE are rejected by database triggers |

Migration runs after existing Network/F41 startup migrations, is idempotent, and inserts zero queue/business rows. Acquisition uses `BEGIN IMMEDIATE`; the singleton lease and unique partial index where job state is RUNNING provide independent database enforcement of the one-global-job invariant.

### 5.2 Planning, Execution Boundary And Recovery

- Planning calls the approved Coverage service using its backend clock and persists only items marked `queue_eligible`.
- Request hashing and exact-active-identity indexes prevent duplicate active runs/jobs across repeated or overlapping requests.
- Job selection is database ordered by newest date, indicator priority and lane priority.
- Before every fake/test executor invocation, the registered completion policy is re-evaluated. SUCCESS becomes `SKIPPED_ALREADY_SUCCESS`; incomplete/manual-review evidence fails closed and is not executed.
- Graceful pause lets an already-leased atomic job finish, then blocks the next lease. Resume changes only the persisted run state and continues queued work.
- Startup recovery and each subsequent pre-lease sweep inspect expired/interrupted RUNNING work. Completion is checked first; committed success is skipped, otherwise the same persisted identity returns to eligible work. PAUSED is never auto-resumed.
- Production has an intentionally empty executor registry. Only isolated tests construct a registry that accepts `testOnly` executors. F1.3/F4.1 stay manual-only and create no production work.

### 5.3 API Contract

| Method/path | Permission | Behavior |
| --- | --- | --- |
| `POST /api/import/auto-backfill/runs` | Admin | Idempotently plans current backend-clock queue-eligible coverage |
| `GET /api/import/auto-backfill/runs/:runId` | Authenticated + registry read role | Returns only permitted jobs/attempts/events and performs no mutation |
| `POST /api/import/auto-backfill/runs/:runId/pause` | Admin | Requests graceful persisted pause |
| `POST /api/import/auto-backfill/runs/:runId/resume` | Admin | Resumes persisted PAUSED work |

Caller-controlled `as_of` is rejected before planning. No endpoint exposes worker execution, credentials, Portal navigation, retry, force Import or business-data mutation.

## 6. Acceptance Evidence

The synthetic `F9.TEST` registrations and fake executors exist only inside tests. Adding those registrations required no branch, table list or indicator-specific change in scanner/store/queue orchestration.

| Acceptance | Result |
| --- | --- |
| `AB-QUE-01` | PASS: six jobs across indicators/lanes/dates selected newest-first; only one RUNNING globally |
| `AB-QUE-02` | PASS: active atomic job finished after pause; no second lease; resume continued persisted work |
| `AB-QUE-03` | PASS: expired RUNNING job rechecked and requeued; an explicit PAUSED run stayed PAUSED |
| `AB-SUC-01` | PASS: external SUCCESS before execution produced `SKIPPED_ALREADY_SUCCESS`; executor calls = 0 |
| `AB-SUC-02` | PASS: simulated crash after commit recovered as `SKIPPED_ALREADY_SUCCESS`; executor calls remained exactly 1 |
| Competing workers | PASS: simultaneous acquisition over two SQLite connections yielded one lease and one RUNNING job |
| Idempotency | PASS: duplicate plan returned the same active run; run/job counts did not increase |
| Permissions/read-only | PASS: viewer read followed registry role, GET added no event/write, viewer control failed 403 |
| Migration | PASS: all five tables created empty twice; append-only triggers enforced |

## 7. Validation Evidence

All writes below targeted OS-temp test databases/filesystems. F4.1 parser reconciliation was read-only. No real Import or operational queue was run.

| Command / suite | Result |
| --- | --- |
| Queue + API + migration + startup + Coverage combined | `32/32 PASS` |
| `node --test test_f41ImportPipeline.js` | `1/1 PASS` |
| `node test_f41HueExcelParser.js` | `5/5 PASS` |
| `node test_f41TctExcelParser.js` | `6/6 PASS` |
| `node test_importPipelineRace.js` | `41/41 PASS` |
| `node test_importProcessor.js` | `59/59 PASS` |
| `node test_dkclHueF13BackfillService.js` | `39/39 PASS` |
| `node test_tctF13BackfillService.js` | all checks PASS |
| Changed-module `node --check` and `git diff --check` | PASS |

## 8. Scope And Safety Proof

- Shared queue modules contain no F1.3/F4.1 branch, target-table list or Portal behavior.
- No frontend, parser, Import processor/pipeline, watcher, Portal/login/download implementation or business-data schema was changed.
- No retry/backoff or circuit-breaker runtime was implemented.
- No production executor was registered and no worker loop was started.
- `.claude/` and `Data QLML/` were not opened, modified or staged. No operational Data DKCL queue or Import was run.

## 9. Residual Risks And PO Gate 2 Notes

- Lease recovery intentionally waits for expiry when another process still owns a live lease; completion is then rechecked before requeue/skip. This avoids stealing legitimate work from a second backend process.
- Adapter/session-specific atomicity and real executor installation remain blocked behind later F13/F41 tickets. Retry and circuit behavior remains blocked behind Safety.
- Full audit reporting/retention remains deferred; this ticket stores only append-only transition evidence sufficient for queue and recovery proof.

No technical blocker remains for Gate 2. Product Owner approval is still required, and no successor is activated.

Commit proof: this checkpoint is included in the implementation commit; its final pushed SHA is reported in the accompanying Technical Execution Report because a commit cannot contain its own final hash.

## 10. Final State

`AUTO-BACKFILL-QUEUE IMPLEMENTED / READY FOR PO GATE 2`

## 11. Gate 2 Remediation - Missing Worker Coordinator

- Review baseline: `20e70d80a8a88438591bbdd63f4f320fab2f3bde`.
- Finding: production persisted queue state and exposed `processNext()`, but had no lifecycle owner to wake/drain it after create, resume or restart. Startup performed one recovery call only.
- Authorized correction: add one indicator-neutral coordinator with explicit start/wake/drain/stop behavior, bounded dormant polling for lease expiry, API/startup integration and clean shutdown.
- Locked safety: database lease remains the sole global concurrency authority; PAUSED/PAUSING stays dormant; production registry remains executor-empty; no real Portal/Import/Data DKCL operation.
- Mandatory proof: create wake, resume wake, restart recovery after lease safety, PAUSED restart dormancy, two-coordinator global exclusion, empty-registry dormancy/no busy-loop, clean stop, and unchanged AB-QUE/AB-SUC.

This is an in-ticket Gate 2 remediation only. No successor ticket is activated.

## 12. Gate 2 Coordinator Remediation Evidence

### 12.1 Implementation

- Coordinator lifecycle owns only orchestration. SQLite `GLOBAL_DKCL` lease and one-RUNNING unique index remain the concurrency source of truth.
- `start()` performs an initial wake; `wake()` coalesces onto one in-process drain; `drain()` calls `processNext()` sequentially until no job is eligible; `stop()` clears pending timers and waits for an active atomic call to settle.
- Create and Resume emit in-process work notifications after successful persistence. Runtime startup awaits migration and recovery, starts the coordinator before `app.listen()`, and clean shutdown is wired for SIGINT/SIGTERM/startup failure.
- When another process owns a lease, one bounded timer rechecks no later than the configured maximum poll and at lease expiry plus grace. With no eligible/running work or lease, no timer remains.
- Runtime exposes verified executor registration plus wake for later adapter tickets. The production registry remains empty, so current MANUAL_ONLY lanes perform zero execution and the coordinator becomes dormant.

### 12.2 Focused Acceptance

| Proof | Result |
| --- | --- |
| Create wake/drain | PASS: injected verified test executor completed the persisted run automatically |
| Resume wake | PASS: active atomic job finished into PAUSED; Resume automatically completed remaining work |
| Restart/lease safety | PASS: new coordinator waited for expiry, recorded interrupted attempt, recovered and continued |
| PAUSED restart | PASS: no executor call, no poll timer and no repeated `processNext()` |
| Two coordinators | PASS: two connections/coordinators observed maximum executor concurrency of one |
| Empty production-style registry | PASS: zero execution, one initial probe, then no polling timer/busy-loop |
| Clean stop | PASS: pending lease timer cleared; started/draining/timer state all false |
| Existing acceptance | PASS: AB-QUE-01..03 and AB-SUC-01..02 unchanged |

### 12.3 Validation

| Suite | Result |
| --- | --- |
| Queue coordinator + Queue/API/migration/startup/Coverage | `39/39 PASS` |
| F4.1 Import pipeline | `1/1 PASS` |
| F4.1 HUE/TCT parsers | `5/5` and `6/6 PASS` |
| F1.3 Import race / processor | `41/41` and `59/59 PASS` |
| F1.3 HUE legacy backfill | `39/39 PASS` |
| F1.3 TCT legacy backfill | all checks PASS |

All mutation-capable validation used OS-temp SQLite/filesystem sandboxes and injected test executors. No production executor, live queue, Portal session, Import or Data DKCL write occurred.

### 12.4 Handoff

Finding `POF-AUTO-BACKFILL-QUEUE-01` is technically remediated and ready for PO Gate 2 recheck. No successor ticket is activated.

`AUTO-BACKFILL-QUEUE IMPLEMENTED / READY FOR PO GATE 2`
