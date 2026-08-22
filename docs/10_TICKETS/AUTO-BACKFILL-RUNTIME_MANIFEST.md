# AUTO-BACKFILL-RUNTIME Manifest

Status: `ACTIVATED / READY FOR PO CHECK` (2026-08-20; governance activation completed by Codex continuation).
Ticket Name: `AUTO-BACKFILL-RUNTIME` (Ticket 7 of `AUTO-BACKFILL-PLAN_MANIFEST.md` Section 6).
Baseline: `a135f799`.
Branch: `codex/da-impl-006`.

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-RUNTIME`
- Phase: `Shared Auto Backfill - Controlled real run and end-to-end acceptance`
- Executor: `Claude Code` initiated the readiness audit; `Codex` is explicitly authorized by the Product Owner to complete this continuation's governance activation and handoff.
- Activation authority: `PO confirmed agreement to begin real runs (2026-08-20)`, reaffirmed by the Product Owner's direct continuation instruction for `AUTO-BACKFILL-RUNTIME`.
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Activate the final Auto Backfill ticket: permit real execution (`POST /api/import/auto-backfill/runs`) against lanes whose `automationMode = AUTOMATED`, and confirm the `WAITING_AUTH` flow behaves correctly under real conditions.

This ticket itself performs **no** real run. It verifies and records readiness, then stops at `READY FOR PO CHECK` so the Product Owner reviews the findings below **before** pressing the button. The real run and its acceptance follow as `PO Gate 7 / READY FOR PO RUNTIME ACCEPTANCE` per the plan.

## Required Reading & Authority Chain

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-BACKFILL-PLAN_MANIFEST.md` Section 6 (Ticket 7 / Gate 7 boundary)
5. `docs/10_TICKETS/AUTO-BACKFILL-SAFETY_MANIFEST.md` (accepted safety contract)
6. `docs/06_REVIEWS/Import/AUTO-BACKFILL-UI-REMEDIATION_CHECKPOINT_001.md` Section 6 (the two accepted backend deltas, including `5d425d72`)

This manifest and `docs/06_REVIEWS/Import/AUTO-BACKFILL-RUNTIME_CHECKPOINT_001.md` are the current ticket records. `PROJECT_SNAPSHOT.md` owns the live state pointer.

## 3. Gate Verification (Verified This Ticket, Not Assumed)

| Gate | Ticket | Recorded Outcome | Evidence |
| --- | --- | --- | --- |
| 1 | `AUTO-BACKFILL-COVERAGE` | `PO GATE 1 PASS` | `PROJECT_PROGRESS.md` "AUTO-BACKFILL-COVERAGE Gate 1 PASS / AUTO-BACKFILL-QUEUE Activated" |
| 2 | `AUTO-BACKFILL-QUEUE` | `PO GATE 2 PASS` | `PROJECT_PROGRESS.md` "AUTO-BACKFILL-QUEUE Gate 2 PASS / AUTO-BACKFILL-F13 Activated" |
| 3 | `AUTO-BACKFILL-F13` | `PO GATE 3 PASS` | `PROJECT_PROGRESS.md` "AUTO-BACKFILL-F13 Gate 3 PASS / AUTO-BACKFILL-F41 Activated" |
| 4 | `AUTO-BACKFILL-F41` | `PO GATE 4 PASS` | Manifest status line + `PROJECT_PROGRESS.md` |
| 5 | `AUTO-BACKFILL-SAFETY` | `PO GATE 5 PASS` | Manifest status line + `PROJECT_PROGRESS.md` |
| - | `AUTO-BACKFILL-COVERAGE-EXCEPTION` | `CLOSED / PO BACKEND GATE PASS` | Manifest Section 12 |
| 6 | `AUTO-BACKFILL-UI-REMEDIATION` | `CLOSED / PO UI CHECK PASS` + 2 backend deltas `PO BACKEND GATE PASS` | Manifest Section 7 |

All gates are PASSED. One documentation residual found and reported, not fixed here (see Section 9, R-1).

## 4. Safety Verification -- Circuit Breaker / Retry / WAITING_AUTH Not Weakened

The Product Owner specifically required confirmation that recent changes, especially commit `5d425d72` (loosened `SUCCESS`), did not reduce circuit-breaker or `safety_state` safety.

### 4.1 Structural Proof

`git diff --stat ef7cbe85..HEAD` (Gate 5 PO-accepted baseline to current HEAD) over the three safety-critical files returns **empty** -- `autoBackfillSafetyCoordinator.js`, `autoBackfillQueueStore.js`, and `autoBackfillWorkerCoordinator.js` are **byte-identical** to the state the Product Owner accepted at Gate 5. Circuit breaker, retry scheduling, lease handling, and the `safety_state` machine were not modified.

`autoBackfillQueueService.js` changed only `+23/-2` since Gate 5, and the full diff is exactly the additive `from_date`/`to_date` enqueue filter in `createRun()`. `processNext()`, failure recording, circuit accounting, `WAITING_AUTH` handling, and `resumeRun()` are untouched.

Commit `5d425d72` itself touched exactly one production file (`autoBackfillCompletionPolicies.js`) and **no** safety/queue/circuit file.

### 4.2 Behavioral Proof

Full Safety suite `11/11 PASS`, including: three-attempt bounded retry with persisted backoff; no retry on data/permission failures; five same-signature system failures open only the exact adapter/source/resource circuit; open circuit survives restart until Admin reset; mixed signatures do not accumulate and success resets the scope; `WAITING_AUTH` persists, stops drain, and requires explicit Resume; integrity fatal stops immediately; external SUCCESS during retry wait never re-executes; audit redaction.

### 4.3 One Real Nuance The Product Owner Should Know

The post-execution integrity gate in `processNext()` is `after.status !== SUCCESS -> INTEGRITY_FATAL`. Because `5d425d72` loosened `SUCCESS` to `integrityValid` alone, that gate is now **narrower**. Verified empirically against the real completion policy (F1.3 TCT, `expectedRowCount = 34`):

| Post-execution state | Result | Gate |
| --- | --- | --- |
| 34 rows, 34 distinct, no import_log, no artifact | `SUCCESS` | passes (previously would have been INTEGRITY_FATAL) |
| 34 rows, 34 distinct, FAILED import_log, no artifact | `SUCCESS` | passes (previously would have been INTEGRITY_FATAL) |
| 33 rows (short of 34) | `MANUAL_REVIEW_REQUIRED` | **INTEGRITY_FATAL** |
| 34 rows but 30 distinct (duplicates) | `MANUAL_REVIEW_REQUIRED` | **INTEGRITY_FATAL** |
| 0 rows | `MISSING` | **INTEGRITY_FATAL** |

Data-correctness protection (exact row count, no duplicates, data present) is **fully intact**. What was relaxed is the *provenance* requirement: during a real run, an executor that imports correct data but silently fails to write its Processed artifact or its `SUCCESS` `import_log` row will now be accepted as `SUCCESS` instead of halting the run with `INTEGRITY_FATAL`. This is the direct, intended consequence of the Product Owner's own `5d425d72` decision ("có dữ liệu là đủ, không cần quan tâm nguồn nhập") and is reported here only so the Product Owner knows it applies to real runs too. **No change is proposed and none was made.**

## 5. Registry State -- CORRECTION To The Stale 18/08 Note

The Product Owner flagged that the old note claiming F4.1 is `MANUAL_ONLY` may be stale. **Confirmed stale.** Verified by direct file read and by runtime evaluation of `listIndicatorConfigs()`:

| Indicator | Lane | `automationMode` | Portal adapter | `verified` | Production executor |
| --- | --- | --- | --- | --- | --- |
| F1.3 | HUE | `AUTOMATED` | `DKCL_F13_HUE_SINGLE_DATE_V1` | `true` | AVAILABLE |
| F1.3 | TCT | `AUTOMATED` | `DKCL_F13_TCT_SINGLE_DATE_V1` | `true` | AVAILABLE |
| F4.1 | HUE | `AUTOMATED` | `DKCL_F41_HUE_SINGLE_DATE_V1` | `true` | AVAILABLE |
| F4.1 | TCT | `AUTOMATED` | `DKCL_F41_TCT_SINGLE_DATE_V1` | `true` | AVAILABLE |

**All 4 lanes are `AUTOMATED`**, not 2. F4.1 became `AUTOMATED` when Gate 4 passed, exactly as the Product Owner suspected. All 4 production executors are registered in the real (non-test) runtime and expose `validateSession()`, which the `WAITING_AUTH` Resume path requires.

Consequence: a run created with no indicator/lane filter targets **all four** lanes, not two.

## 6. Circuit Scope And Threshold (Reported, NOT Changed)

Identical on all 4 lanes; reported for Product Owner review only. This ticket changed nothing.

- Circuit scope dimensions: `adapter` x `source` x `resource`
- Threshold: `5` consecutive failures
- `sameSignatureConsecutive`: `true` (mixed signatures reset the counter to 1)
- `integrityFailureStopsImmediately`: `true`
- Retry: `maxAttempts = 3`, `BOUNDED_EXPONENTIAL`, `initialDelayMs = 2000`, `maxDelayMs = 30000`
- Retryable classes only: `PORTAL_TRANSIENT`, `LOCAL_SYSTEM`
- Terminal classes: `DATE_DATA`, `AUTH`, `PORTAL_SYSTEMIC`, `INTEGRITY_FATAL`
- Permissions: `admin` only for `coverageRead`, `runControl`, `retry`, `auditRead`

## 7. CRITICAL -- Current Operational Queue State (Pre-Existing, Blast Radius)

Read-only inspection of the operational database found substantial pre-existing queue state from earlier sessions. This is the single most important item for the Product Owner to review before pressing anything.

### 7.1 What Is Sitting There

| Item | Count |
| --- | --- |
| `auto_backfill_job` state `QUEUED` | **472** |
| -- F4.1 / HUE | 230 |
| -- F4.1 / TCT | 230 |
| -- F1.3 / TCT | 8 |
| -- F1.3 / HUE | 4 |
| `auto_backfill_job` state `FAILED_TERMINAL` | 2 (both `AUTHENTICATION_REQUIRED`) |
| `auto_backfill_run` status `RUNNING` | 4 (1 of them `safety_state = WAITING_AUTH`) |
| Open circuits | 0 |
| Active coverage exceptions | 4 |

Target-table coverage explains the 460 F4.1 jobs: `fact_f13` holds 227 distinct dates and `fact_f13_national` 223, but `fact_f41` and `fact_f41_national` hold **1 date each**, against a tracking window starting `2026-01-01`.

### 7.2 Is It Safe At Rest? Yes -- Verified

Run `9769766f` is `RUNNING` with `safety_state = WAITING_AUTH` and `action_required: "Product Owner must complete supported manual login, then Admin must explicitly Resume."`

`acquireNextJob()` applies a **global** guard: any run that is `RUNNING` with `safety_state IN ('WAITING_AUTH','BLOCKED_INTEGRITY')` blocks lease acquisition for **every** job, not just that run's. Replaying the exact production guards read-only confirms: `existingLease` none, `runningJob` none, `globalBlock` **PRESENT (WAITING_AUTH)**.

**Effective result on the next backend restart: `acquireNextJob()` returns `null` -- no real execution occurs.** The `WAITING_AUTH` guard is doing exactly its job.

### 7.3 The Risk To Understand Before Pressing Anything

The same guard that protects the system is also the only thing holding back the backlog. The moment that `WAITING_AUTH` run is Resumed (or otherwise cleared), all **472** queued jobs become drainable in one continuous automatic drain -- the coordinator auto-starts on backend startup (`startAutoBackfillQueueRuntime()` -> `coordinator.start()` -> `wake()` -> `drain()`), so there is no separate "start" button. The next job it would pick is `F1.3 / HUE / 2026-08-19`.

That is **not** the controlled 1-day test the Product Owner intends. Pressing Resume on the existing `WAITING_AUTH` run would release the whole backlog, including ~460 real F4.1 Portal downloads and Imports.

## 8. Recommended Runtime Plan (Product Owner Decision Required)

### 8.1 Product Owner's Own Recommendation, Recorded

Start with **one date, one source**, using the per-row **"Nhập lại"** button, before any bulk run. Verified this button is correctly scoped: `handleConfirmReimport` posts `indicator`, `lane`, and `from_date = to_date = business_date`, producing exactly 1 indicator x 1 lane x 1 date.

### 8.2 Blocking Prerequisite Found During Verification

A correctly-scoped 1-day run **still will not execute** while the stale `WAITING_AUTH` run globally blocks lease acquisition. The pre-existing queue state must therefore be resolved **before** the first controlled test is meaningful. Options for the Product Owner to decide (none performed by this ticket):

1. Resolve the stale queue first -- decide the disposition of the 4 `RUNNING` runs and their 472 `QUEUED` jobs (for example, cancel/close them so the backlog cannot drain), **then** run the single-date test cleanly.
2. Complete the supported manual DKCL HUE login and Resume, accepting that this releases the full 472-job backlog immediately.

Option 1 matches the Product Owner's stated intent of a controlled first test. Option 2 does not.

This is a business/operational decision about real data and real Portal load, so it is escalated rather than decided technically.

### 8.3 Suggested Controlled Sequence Once Unblocked

1. One date, one lane via "Nhập lại"; confirm valid DKCL session for that lane first.
2. Observe: job reaches `SUCCESS`, target facts and `import_log` land for exactly that date, audit events append, no circuit opens.
3. Deliberately verify `WAITING_AUTH`: with the session invalid, confirm the job parks in `WAITING_AUTH`, the drain halts, and explicit Resume after a valid login continues the exact job without duplicate execution.
4. Only then widen scope, one month and one lane at a time, using `from_date`/`to_date`.

## 9. Risks And Residuals

- **R-1 (documentation, found this ticket, not fixed):** the `AUTO-BACKFILL-COVERAGE`, `AUTO-BACKFILL-QUEUE`, and `AUTO-BACKFILL-F13` manifests still carry stale status headers reading `READY FOR PO GATE 1/2/3`, although `PROJECT_PROGRESS.md` records all three as `COMPLETED / PO GATE n PASS`. Gates are genuinely passed; only the manifest headers are stale. Not corrected here because they belong to other, already-closed tickets -- recommended as a small separate documentation follow-up.
- **R-2:** F4.1 has effectively no historical data (1 date per lane). A full unscoped run is a ~460-job real Portal/Import load. Scope every run explicitly.
- **R-3:** Post-execution provenance checking is relaxed per Section 4.3; a silently missing Processed artifact will no longer halt a real run.
- **R-4:** 2 pre-existing `FAILED_TERMINAL` jobs (`AUTHENTICATION_REQUIRED`) remain recorded; they do not block, but they indicate sessions were not valid during earlier attempts.

## 10. In Scope

- Governance activation of `AUTO-BACKFILL-RUNTIME` and the readiness verification recorded above.
- Reporting current circuit scope/threshold to the Product Owner without changing them.

## 11. Out Of Scope

- Any business-logic code change (explicitly excluded by the activation instruction). No product code was modified by this ticket.
- Performing a real run, real Portal session, real download, or real Import.
- Changing circuit scope, threshold, retry policy, or any registry `automationMode`.
- Cleaning up or cancelling the pre-existing runs/jobs described in Section 7 -- reported for Product Owner decision only.
- `PO Gate 7` runtime acceptance itself.

## 12. Stop Condition

`AUTO-BACKFILL-RUNTIME ACTIVATED / READY FOR PO CHECK`.

The executor stops here, before any real run. The Product Owner reviews Sections 4.3, 5, 7, and 8 -- in particular the 472-job backlog and the Section 8.2 blocking prerequisite -- and then decides how to proceed. The real run and `PO Gate 7 / READY FOR PO RUNTIME ACCEPTANCE` follow separately. Not self-passed.

## 13. Next Ticket / PO Runtime Gate (Not Activated)

After the Product Owner decides the disposition of the existing four `RUNNING` runs and 472 queued jobs, the only authorized first runtime experiment is **one date, one source**, initiated with the per-row **"Nhập lại"** button. The Product Owner must verify that one-day result, including the intentional `WAITING_AUTH` path, before any wider range, second source, monthly run, or backlog release is considered. This is a PO-controlled Gate 7 sequence, not a self-awarded PASS and not an authorization to Resume the stale run.

## 14. Backlog Investigation -- Read-Only Findings (2026-08-20, Claude Code)

Product Owner instructed a **read-only investigation** of the 472 `QUEUED` jobs and the `WAITING_AUTH` run before deciding any cleanup. Nothing was cancelled, deleted, or modified: the operational database was opened with `sqlite3.OPEN_READONLY`, so writes were impossible at the driver level. No business logic changed; `fact_f13`, `fact_f41`, `fact_f41_national` untouched.

### 14.1 Where The 472 Jobs Came From

All four runs were created by `admin` through the real `POST /api/import/auto-backfill/runs` API -- **none are test fixtures** (test suites use isolated temp databases under the OS temp directory). They are real enqueue requests, but three of the four were issued **unfiltered**.

| Run | Created | requested_indicator / lane | Registry version | `QUEUED` | Date span | Reading |
| --- | --- | --- | --- | --- | --- | --- |
| `fa694495` | 2026-08-18T10:12:59Z | null / null (fully unfiltered) | `AUTO-BACKFILL-F41-1` (stale) | **463** | 2026-01-01 to 2026-08-17 | Full historical sweep -- the accidental mass enqueue |
| `9769766f` | 2026-08-19T08:18:42Z | null / `HUE` | `AUTO-BACKFILL-F41-1` (stale) | 2 | 2026-08-17 to 2026-08-18 | Lane-scoped attempt; now `WAITING_AUTH` |
| `7356faa4` | 2026-08-19T10:26:05Z | null / null | `AUTO-BACKFILL-SAFETY-1` | 3 | 2026-08-18 | Looks like a daily catch-up |
| `e28f81fe` | 2026-08-20T02:02:24Z | null / null | `AUTO-BACKFILL-SAFETY-1` | 4 | 2026-08-19 | Looks like a daily catch-up |

Totals reconcile: 463 + 2 + 3 + 4 = 472. Per-lane: F4.1/HUE 230, F4.1/TCT 230, F1.3/TCT 8, F1.3/HUE 4.

Runs `fa694495` and `9769766f` carry registry version `AUTO-BACKFILL-F41-1`, which predates the current `AUTO-BACKFILL-SAFETY-1` -- an independent staleness signal.

### 14.2 Are They Garbage Or Real Work? -- Neither Label Is Accurate

Each of the 472 jobs was checked against the **current** contents of its target table using that lane's real completion rule (`expectedRowCount` 34 for both TCT lanes, row count greater than zero for both HUE lanes, plus the no-duplicates check):

| Verdict | Count |
| --- | --- |
| Points at a date that is **genuinely still missing** (real pending work) | **472** |
| Already satisfied / obsolete (data since imported) | 0 |
| Data present but integrity mismatch | 0 |

So the jobs are **not stale garbage pointing at completed work** -- every one targets a date that really is absent. What is wrong is not the *target* but the *origin and scale*: 463 of them came from a single unfiltered sweep the Product Owner did not intend as a controlled run.

### 14.3 Effect On The `WAITING_AUTH` Run (`9769766f`)

- It holds exactly 3 jobs: 2 `QUEUED` (F4.1/HUE `2026-08-17`, `2026-08-18`) and 1 `FAILED_TERMINAL` (F1.3/HUE `2026-08-18`). It holds **no** worker lease -- `auto_backfill_worker_lease` is empty.
- `WAITING_AUTH` lives on the **run** row, not on its jobs. The global guard inside `acquireNextJob()` selects any run where `status = 'RUNNING'` and `safety_state` is `WAITING_AUTH` or `BLOCKED_INTEGRITY`.
- Therefore **cancelling `QUEUED` jobs in any run -- including this one -- does not clear the block**, because the block is keyed on the run's status and safety_state, not on job rows.
- Conversely, the block currently protects everything: while it stands, `acquireNextJob()` returns nothing for every job, so the backlog cannot drain.

### 14.4 The Blocker That Makes Cleanup Mandatory, Not Optional

`createRunWithJobs()` rejects a job whose `(indicator, source_lane, business_date)` identity is already active, matching on job state in `QUEUED`, `RUNNING`, or `RECOVERY_CHECK` -- **with no run-status filter**. Two consequences:

1. **Pausing a run does not free its identities.** A `PAUSED` run's jobs stop draining, because job selection additionally requires the parent run to be `RUNNING`, but the rows still occupy the unique identity.
2. **On a full conflict the API does not error.** It returns `created: false`, `duplicate: true`, `skippedConflicts: n` together with the **existing** run's full payload. The UI then sets its active run to that old run -- so pressing "Nhập lại" on an occupied date would silently display the 463-job backlog run while appearing to have started a one-day test.

Cross-checking the full coverage window (`2026-01-01` to `2026-08-19`, 231 dates) against occupied identities:

| Lane | Missing dates | Already occupied by a `QUEUED` job | Free and missing (testable now) |
| --- | --- | --- | --- |
| F1.3 / HUE | 4 | 4 | **NONE** |
| F1.3 / TCT | 8 | 8 | **NONE** |
| F4.1 / HUE | 230 | 230 | **NONE** |
| F4.1 / TCT | 230 | 230 | **NONE** |

**Every missing date on every lane is already occupied.** There is currently no date on which the Product Owner's one-day / one-source "Nhập lại" test can create a new run. A date that already has data is not queue-eligible and would be rejected with `AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE`. Cleanup is therefore a prerequisite, not a tidiness preference.

### 14.5 What Cleanup Is Mechanically Available

- **No cancel endpoint exists.** The auto-backfill routes expose only create-run, get-run, pause, resume, circuit reset, events, and report. `CANCELLED` exists as a declared terminal state for both runs and jobs, but no code path ever sets it.
- `auto_backfill_job` has **no triggers**, so a state transition to `CANCELLED` is mechanically possible. `auto_backfill_event` and `auto_backfill_attempt` are append-only guarded against update and delete, but inserts remain permitted, so an audit trail can still be written.

### 14.6 Proposed Options -- For Product Owner Decision, NOT Executed

**Option 1 -- Pause all four runs. API-only, reversible, no SQL, no code change.**

Call the existing admin pause endpoint once per run id:

- `fa694495-3953-4cc7-9ed8-f58f1a85b3bc`
- `9769766f-4416-45a3-9da9-014eb941d4cb`
- `7356faa4-ae2b-4525-95ff-4b137220260e`
- `e28f81fe-671e-474e-9fbe-4ffa5971124b`

using `POST /api/import/auto-backfill/runs/{runId}/pause`.

Effect: each run leaves `RUNNING`, so no job is selectable and the backlog can never drain. Pausing `9769766f` additionally clears the global `WAITING_AUTH` guard, because that guard matches only runs still in `RUNNING` -- this removes the "Resume releases everything" hazard. Fully reversible with the resume endpoint. **Limitation: this does not free the occupied identities, so the one-day "Nhập lại" test still cannot run.** Recommended as an immediate safety step, but not sufficient on its own.

**Option 2 -- Also release the identities by cancelling the `QUEUED` jobs.** Required before the one-day test. Two ways:

- **2a, admin SQL.** Fastest. Requires explicit Product Owner approval and a database backup first. Transition `auto_backfill_job` rows from `QUEUED` to `CANCELLED` with a terminal reason such as `PO_CLEANUP_BEFORE_RUNTIME_TEST`, close the four runs to `CANCELLED`, and insert matching `auto_backfill_event` rows so the audit trail stays intact. Exact statements will be prepared for review once the Product Owner picks this option; nothing is pre-executed.
- **2b, add a proper admin cancel endpoint** such as a run-level cancel route, in a separate ticket. Cleanest and auditable by construction, but it is a code change and therefore outside this ticket's no-business-logic-change scope.

**Scope choice within Option 2.** Cancelling only `fa694495` (463 jobs) would remove the mass sweep but still leave `2026-08-18` and `2026-08-19` occupied by the two smaller runs -- exactly the freshest dates a one-day test would target. To actually unblock the test, the jobs covering the chosen test date must be released too.

### 14.7 Stop

No job or run was cancelled, deleted, paused, resumed, reset, or modified. State: `READY FOR PO DECISION` -- awaiting the Product Owner's choice of cleanup option before any write to the job queue.

## 15. Option A Executed -- Backlog Cleanup Complete (2026-08-21, Claude Code)

Product Owner selected **Option A** from Section 14.6: pause all 4 runs, then cancel the 472 `QUEUED` jobs via direct SQL (no cancel endpoint exists), so a real one-day / one-source "Nhập lại" test can be created today. Executed in the mandated order; every step verified before proceeding to the next; no business-logic file was changed and no cancel endpoint was added.

### 15.1 Step 1 -- Backup (Before Any Write)

- Method: `VACUUM INTO`, taken on the live database, following the existing backup naming convention already present in `backend/src/db/backups/`.
- Path: `backend/src/db/backups/database.pre-runtime-queue-cleanup.2026-08-21T225400.sqlite`
- Size: 759,324,672 bytes (759 MB; smaller than the 801 MB source because `VACUUM INTO` compacts free pages -- this is expected and does not indicate missing data, confirmed by the row-count verification below).
- Verification performed, not skipped: the backup file was opened as an **independent SQLite connection** (not just copied) and read: `PRAGMA integrity_check` returned `ok`, and row counts for every business and Auto Backfill table (`fact_f13`, `fact_f13_national`, `fact_f41`, `fact_f41_national`, `import_log`, `auto_backfill_run`, `auto_backfill_job`, `auto_backfill_event`, `auto_backfill_attempt`, `auto_backfill_circuit`, `auto_backfill_coverage_exception`) matched the live database exactly (11/11 tables MATCH).

### 15.2 Step 2 -- Pause All 4 Runs (API/Store Mechanism, No Raw SQL)

Used the existing `AutoBackfillQueueStore.pauseRun()` method (the same code path the admin pause endpoint calls) for each of the 4 runs, so the transition emitted a proper `RUN_STATE_CHANGED` audit event through the normal mechanism rather than a hand-written one:

| Run | Before | After |
| --- | --- | --- |
| `fa694495-3953-4cc7-9ed8-f58f1a85b3bc` | `RUNNING` | `PAUSED` |
| `9769766f-4416-45a3-9da9-014eb941d4cb` | `RUNNING`, `safety_state=WAITING_AUTH` | `PAUSED`, `safety_state=WAITING_AUTH` (pause does not itself clear `safety_state`; Step 3 clears it explicitly when the run is closed) |
| `7356faa4-ae2b-4525-95ff-4b137220260e` | `RUNNING` | `PAUSED` |
| `e28f81fe-671e-474e-9fbe-4ffa5971124b` | `RUNNING` | `PAUSED` |

Verified before proceeding: `SELECT COUNT(*) FROM auto_backfill_run WHERE status='RUNNING'` returned `0`. The global `WAITING_AUTH`/`BLOCKED_INTEGRITY` lease guard in `acquireNextJob()` also cleared at this point, because that guard matches only `status='RUNNING'`.

### 15.3 Step 3 -- Cancel The 472 QUEUED Jobs + Close The 4 Runs (Single Transaction)

No cancel endpoint exists (confirmed in Section 14.5), so this step used direct SQL inside one `BEGIN IMMEDIATE` / `COMMIT` transaction, scoped by the **exact 472 job ids captured from a fresh read immediately before the transaction started** (not a bare `WHERE state='QUEUED'`, to guarantee only the investigated set was touched even if state had changed concurrently):

- `auto_backfill_job`: `state: QUEUED -> CANCELLED`, `terminal_reason = 'PO-approved bulk cleanup, AUTO-BACKFILL-RUNTIME ticket, Option A'`, `ended_at`/`updated_at` set -- for exactly those 472 rows, matched by `id`. In-transaction guard: the `UPDATE` was run once per captured id and the accumulated `changes` count was required to equal exactly `472` before commit, or the whole transaction rolls back.
- The 2 pre-existing `FAILED_TERMINAL` jobs were never referenced by id or by any `WHERE` clause in this transaction -- confirmed unchanged (still `FAILED_TERMINAL`, still 2).
- One append-only `auto_backfill_event` row per cancelled job: `event_type='JOB_CANCELLED'`, `from_state='QUEUED'`, `to_state='CANCELLED'`, `reason_code='PO_APPROVED_BULK_CLEANUP'`, payload includes the reason text, indicator, lane, date, option, and ticket id -- 472 rows.
- The 4 runs closed: `status: PAUSED -> CANCELLED`, `safety_state` explicitly set to `NULL` (this is what releases `9769766f`'s `WAITING_AUTH`), `action_required` cleared, `status_reason` set to the same PO-approved reason, `ended_at`/`updated_at` set. One `RUN_STATE_CHANGED` event per run (4), plus one additional `RUN_SAFETY_STATE_CHANGED` event recording the `WAITING_AUTH -> NULL` transition specifically for `9769766f` (1) -- 5 rows total.
- **No statement in this transaction referenced `fact_f13`, `fact_f13_national`, `fact_f41`, or `fact_f41_national`.** Only `auto_backfill_job`, `auto_backfill_run`, and `auto_backfill_event` were written.
- In-transaction guards checked immediately before `COMMIT`, any failure would have rolled back the whole transaction: `QUEUED` count `=0`; `FAILED_TERMINAL` count `=2` (unchanged); active (`RUNNING`/`PAUSING`/`PAUSED`) run count `=0`. All three held; the transaction committed.

### 15.4 Step 4 -- Post-Change Verification

| Check | Before | After | Result |
| --- | --- | --- | --- |
| `auto_backfill_job` state `QUEUED` | 472 | **0** | PASS |
| `auto_backfill_job` state `CANCELLED` | 0 | 472 | PASS (exactly the cancelled set) |
| `auto_backfill_job` state `FAILED_TERMINAL` | 2 | 2 | PASS (untouched) |
| Runs `RUNNING`/`PAUSING`/`PAUSED` | 4 | **0** | PASS |
| Runs with any non-null `safety_state` | 1 (`WAITING_AUTH`) | **0** | PASS |
| Open circuits (`state='OPEN'`) | 0 | 0 | PASS |
| `fact_f13` | 714,613 | 714,613 | PASS -- identical |
| `fact_f13_national` | 7,582 | 7,582 | PASS -- identical |
| `fact_f41` | 4,695 | 4,695 | PASS -- identical |
| `fact_f41_national` | 34 | 34 | PASS -- identical |
| `import_log` | 488 | 488 | PASS -- identical, confirming no Import ran |
| `auto_backfill_event` | 486 | 967 | +481 = 4 pause + 472 job-cancel + 4 run-close + 1 safety-clear, arithmetic confirmed |
| `auto_backfill_attempt` | 3 | 3 | PASS -- identical, confirming no executor ran |

Final `PRAGMA integrity_check` on the live database after the transaction: `ok`.

### 15.5 Confirmed: A Real Test Date Is Now Free -- Read-Only Query Only, No Run Created

Per instruction, this confirms availability by query only; **no `POST /runs` call was made and no run was created**.

- `F1.3/HUE` / `2026-08-19`: the exact active-identity conflict query used inside `createRunWithJobs()` (`state IN ('QUEUED','RUNNING','RECOVERY_CHECK')`) now returns **no row** -- the identity is free. `fact_f13` has 0 rows for that date, confirming it is genuinely missing, not already imported.
- Re-running the full Section 14.4 cross-check (231-date window, all 4 lanes) now shows **zero** still-occupied identities and **every** missing date free-and-testable: F1.3/HUE 4/4 free, F1.3/TCT 8/8 free, F4.1/HUE 230/230 free, F4.1/TCT 230/230 free.

The Product Owner's one-day / one-source "Nhập lại" test can now create a new run on any missing date on any lane.

### 15.6 Scope Confirmation

- No file under `backend/src/services/`, `backend/src/controllers/`, or `backend/src/routes/` was modified. No cancel endpoint was added (per explicit instruction, that remains a separate future ticket if needed).
- No product code, schema, or migration changed.
- `Data QLML/` and both pre-existing git stashes untouched (unrelated to this ticket; not touched by any step above).
- This was a governed, transactional, verified data operation against the live operational database, executed only after an independently-verified backup existed -- not a code change, and out of scope for `git diff` accordingly.

State: `AUTO-BACKFILL-RUNTIME READY -- queue path clear, awaiting the Product Owner's own one-day / one-source "Nhập lại" test.` No real run, Portal session, download, or Import was performed by this ticket. `PO Gate 7` is not self-awarded.

## 16. UI Fix -- run_id Field Shape Mismatch In AutoBackfillOperatorPanel.jsx (2026-08-22, Claude Code)

Root cause investigation (prior turn) found a deterministic, code-proven bug: `AutoBackfillCoverageService`/`AutoBackfillQueueStore.getRun()` returns `{ run: { id, status, safety_state, ... }, jobs, attempts, events, circuits, creation }` -- there is no top-level `run_id` field, only `run.id`. All 4 places in `AutoBackfillOperatorPanel.jsx` that create a run (manual create, per-row "Nhập lại", bulk reimport) read the non-existent `.run_id` off the response, which silently evaluated to `undefined` (optional chaining, no thrown exception). `activeRunId` was therefore never set for any run created through this UI, so the entire progress/`WAITING_AUTH` panel (gated on `activeRunId && runData`) never rendered -- exactly the symptom the Product Owner reported (no progress bar, no `WAITING_AUTH` banner, no error) for the 2026-08-18 F1.3 HUE+TCT bulk "Nhập lại" test.

### 16.1 Fix Applied -- Exactly 5 Lines, Nothing Else

| # | Location | Before | After |
| --- | --- | --- | --- |
| 1 | `handleCreateRun` | `setActiveRunId(newRun.run_id)` | `setActiveRunId(newRun.run.id)` |
| 2 | `handleCreateRun` (same block) | `` `...#${newRun.run_id}...` `` | `` `...#${newRun.run.id}...` `` |
| 3 | Per-row "Nhập lại" handler | `setActiveRunId(newRun.run_id)` | `setActiveRunId(newRun.run.id)` |
| 4 | `handleExecuteBulkReimport` | `run_id: res.data.data?.run_id` | `run_id: res.data.data?.run?.id` |
| 5 | Progress panel display | `Tiến trình #{runData.run.run_id}` | `Tiến trình #{runData.run.id}` |

`git diff --stat`: exactly `frontend/src/components/AutoBackfillOperatorPanel.jsx`, `5 insertions(+), 5 deletions(-)`. No backend, schema, database, or other frontend file touched. No real run was created to test this.

### 16.2 Re-Verification -- No Similar Mismatch Left

`grep -n "run_id" AutoBackfillOperatorPanel.jsx` after the fix returns exactly 2 lines, both correct and unrelated to the backend contract:

```
results.push({ item, success: true, run_id: res.data.data?.run?.id });   // our own pushed object's key -- correct
const lastSuccessfulRun = results.find((r) => r.success)?.run_id;         // reads our own array's key -- correct
```

No remaining reference reads a non-existent top-level `run_id` off a backend response. A broader `grep -n "\.run\."` pass confirms `resolveEffectiveRunState(runData?.run)` and `resolveWaitingAuthLanes(runData?.run, ...)` already used the raw row correctly (`run.safety_state`, `run.status`, `run.requested_lane` are real columns).

### 16.3 Validation

- `npm run build` (vite): PASS, 689 modules, no errors (pre-existing large-chunk advisory only, unrelated).
- `npx oxlint AutoBackfillOperatorPanel.jsx`: 0 errors; the 2 pre-existing `no-unused-vars` warnings (`coverageError`, `runError`) confirmed present before this fix too (`git stash` diff check) -- not introduced by this change.
- `node src/components/AutoBackfillOperatorPanel.test.js`: 14/14 PASSED (unchanged by this fix -- see Section 16.5 residual).
- Zero NUL bytes in the touched file.

### 16.4 Read-Only Check -- Can The Product Owner Still See The 2026-08-18 Runs?

Both runs (`69b9fff1` F1.3/HUE, `bad55114` F1.3/TCT) were confirmed still present and unmodified in the database: `RUNNING`, HUE still `WAITING_AUTH`. **Data is fully intact and safe.**

**But there is no way to reach them through the current UI, and this fix does not add one.** Confirmed by code inspection, not assumption:

- The backend exposes only `GET /runs/:runId` (exact ID required) and `POST /runs` (create). **There is no `GET /runs` listing endpoint anywhere in `importRoutes.js`.**
- The frontend has no run-history browser, no URL/query-param persistence, and no localStorage/sessionStorage for `activeRunId` -- it is pure in-memory React state (`useState(null)`), reset on every reload or navigation. Nothing in the codebase ever calls `GET /runs/:runId` for an ID the user did not just create in the same still-open browser tab.
- **Conclusion: only a run created after this fix, viewed in the same tab session without reloading, will display correctly.** The 2 pre-existing runs from 2026-08-18 are permanently unreachable through the Operator UI as it exists today -- not because of this bug, but because no run-listing/history feature exists at all. Building that capability is out of scope here, left for a separate ticket if the Product Owner wants it.

### 16.5 Residual Found, Not Fixed (Reported Only)

`AutoBackfillOperatorPanel.test.js` (lines ~93, 124, 503, 531, 547-548) mocks the create-run response with a **flat, non-existent shape** (`{ run_id: 'run_301', ... }` at the top level) and re-implements the bulk-reimport loop inline rather than calling the real component handler. This is why the "contract test" suite (14/14) did not catch the bug this fix addresses -- the test was never actually exercising the real API contract, only a self-consistent but incorrect mock. Not touched in this ticket per explicit scope ("KHÔNG SỬA GÌ KHÁC"); flagged here for a future test-suite correction.

State: fix applied and verified technically; **not self-passed**. `READY FOR PO UI CHECK` -- this changes what the Product Owner sees on screen and must be visually confirmed by the Product Owner, not by Claude Code.
