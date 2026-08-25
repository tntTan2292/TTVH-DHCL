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

## 17. UI Enhancement -- Manual Login Button Added To WAITING_AUTH Banner (2026-08-22, Claude Code)

### 17.1 Prior Investigation Recap (Not Repeated Here)

An earlier read-only investigation in this ticket (undocumented turn, superseded by this section) established that the WAITING_AUTH banner in `AutoBackfillOperatorPanel.jsx` (~line 782-787) was text-only -- it correctly reported which lane needed manual DKCL login, but had no button to trigger it. The real login-opening endpoint (`POST /import/dkcl/session/interactive-auth`, backed by `sessionPreflightService.interactiveAuthenticate()`) was proven to already work, but only via a different page, `DataImportCenter.jsx` (`handleInteractiveHueLogin` line ~253, `handleInteractiveTctLogin` line ~718) -- which the Auto Backfill Operator Panel had no navigation path to (`setImportMode('HUE'/'TCT')` is never called anywhere; only `'PLATFORM'/'REPORTS'/'MANUAL'` are reachable through the 3 existing tabs). This was dead code, not a regression from any prior fix.

### 17.2 Change Applied -- Reuses The Existing, Proven API Contract Only

No backend change, no new API, no change to `DataImportCenter.jsx`. Three additions to `AutoBackfillOperatorPanel.jsx`:

1. New state (next to the existing Active Run State block, ~line 70): `authLoginLoading`, `authLoginError`.
2. New handler `handleOpenManualLogin(lane)` -- calls `POST /import/dkcl/session/interactive-auth` with `{ source: lane }`, the identical endpoint and payload shape already proven in `DataImportCenter.jsx`. Trimmed relative to the original: this panel does not track `lifecycle_state` (no multi-step login-in-progress/stuck UI here, matching the ticket's explicit "gọn hơn" scope). On `status === 'SESSION_VALID'` it calls the existing `fetchRunStatus(activeRunId)` so the banner updates automatically without the Product Owner needing to press anything else. On any other status or a thrown error, it sets `authLoginError` for display.
3. The WAITING_AUTH banner (~line 782) now renders one button per lane in `waitingLanes` -- `Mở đăng nhập ${lane}` -- styled with `bg-vnpost-blue` (Tailwind v4 utility auto-generated from the `--color-vnpost-blue` token in `src/index.css:6`), the same class `DataImportCenter.jsx` uses for its own "Mở đăng nhập Huế/TCT" buttons, so the two pages look consistent. Button disables and its label switches to `Đang mở trình duyệt...` while `authLoginLoading` is true. A red error line renders below the banner when `authLoginError` is set, mirroring `DataImportCenter.jsx`'s `hueSessionError`/`tctSessionError` display pattern.

The existing "Resume" button (`handleResumeRun`, line ~318) is untouched -- it remains the Product Owner's fallback if the automatic `fetchRunStatus` refresh after login doesn't land in time.

`git diff --stat`: exactly `frontend/src/components/AutoBackfillOperatorPanel.jsx`, `46 insertions(+), 1 deletion(-)`. No other file touched.

### 17.3 Validation

- `npm run build` (vite): PASS, 689 modules, no errors (same module count as before this change -- no new files pulled in, matching the "no new API/dependency" constraint).
- `npx oxlint AutoBackfillOperatorPanel.jsx`: 0 errors; the same 2 pre-existing `no-unused-vars` warnings (`coverageError`, `runError`) as documented in Section 16.3 -- not introduced by this change.
- `node src/components/AutoBackfillOperatorPanel.test.js`: 14/14 PASSED, unchanged.
- Zero NUL bytes in the touched file.
- No real DKCL login was triggered and no run was created to test this -- verified by button behavior only through code reading, per the explicit "không tự tạo run/đăng nhập thật để test thay PO" instruction.

### 17.4 Residual, Unchanged From Section 16

`AutoBackfillOperatorPanel.test.js` still does not exercise the real component render tree (it tests pure helper functions and reimplements logic inline), so it does not and cannot cover this new button's wiring. This is the same residual already documented in Section 16.5, not a new one introduced here.

State: fix applied and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- the Product Owner must visually confirm the button appears in a real WAITING_AUTH state and that clicking it actually opens the DKCL manual login window as expected.

## 18. UI Fix -- False-Positive Error On LOGIN_IN_PROGRESS In handleOpenManualLogin (2026-08-22, Claude Code)

### 18.1 Root Cause (Investigated By Claude Opus 5, Fixed By Claude Sonnet 5, Same Ticket)

The Product Owner reported two symptoms while testing the Section 17 "Mở đăng nhập [LANE]" button against a real HUE login: (1) a generic error banner appeared 1-3 seconds after clicking, before login was even possible, and (2) a second click succeeded but left the browser window visible instead of auto-hiding it.

A read-only, log/DB/process-verified investigation (Windows process creation timestamps, `backend.log`/`backend_err.log`, direct SQLite reads of `auto_backfill_run`/`auto_backfill_job`/`fact_f13`) established:

- **Only one browser window was ever opened** (Chromium PID 25036, created 14:42:38). The Product Owner's first click succeeded end-to-end: login was detected (`wait_detected_authenticated` in `backend.log`), the window was hidden, and the pre-existing 2026-08-18 HUE run (`69b9fff1`) auto-drained to `COMPLETED` at 14:45:00 UTC with 3266 rows imported into `fact_f13`. The 4-minute `manualAuthWaitMs` timeout was never reached (full cycle: 2m19s).
- **Symptom 1 (false error) was a regression introduced by this ticket's own prior commit (`6501bef5`)**, not a backend defect. `interactiveAuthenticate()` is fire-and-forget: it returns `status: 'LOGIN_IN_PROGRESS'` (HTTP 202, `success: true`, no `error` field) immediately after opening the browser, before the Product Owner has logged in. The handler written in Section 17 treated any status other than `SESSION_VALID` as an error and read a non-existent `error.message`, producing the generic fallback string. `DataImportCenter.jsx`'s original `handleInteractiveHueLogin`/`handleInteractiveTctLogin` never had this bug -- they never set an error for `LOGIN_IN_PROGRESS`, relying instead on a 5-second `preflightHueSession`/`preflightTctSession` poll to detect completion.
- **Symptom 2 (window not re-hidden) is a separate, real backend behavior**, not something this ticket's frontend scope touches: a second `interactiveAuthenticate()` call while `entry.client` still exists from the first routes into `reuseInteractiveClient()`, which calls `restoreWindow()` and returns immediately -- no background task, so `hideWindow()` is never called again. Flagged for a future backend ticket; **not fixed here** (backend change, out of scope, requires its own PO/CTO decision per the investigation report already delivered in chat).

### 18.2 Fix Applied -- handleOpenManualLogin Only

`frontend/src/components/AutoBackfillOperatorPanel.jsx`, `85 insertions(+), 5 deletions(-)`, no other file touched:

- New constants `AUTH_LOGIN_ERROR_STATUSES` (`SESSION_CHECK_FAILED`, `LOGIN_TIMEOUT`, `AUTHENTICATION_REQUIRED`), `AUTH_LOGIN_POLL_INTERVAL_MS` (5000), `AUTH_LOGIN_POLL_MAX_ATTEMPTS` (60, i.e. 5 minutes -- a safety cap beyond the backend's ~4-minute `manualAuthWaitMs`, absent from `DataImportCenter.jsx` but added here as a defensive bound so a polling interval can never run forever if the PO abandons the login).
- New state `authLoginPending` and a `useRef`-held interval handle (`authLoginPollRef`).
- `handleOpenManualLogin(lane)` now only calls `setAuthLoginError(...)` when `status` is in `AUTH_LOGIN_ERROR_STATUSES` or a real exception is thrown. On `SESSION_VALID` it behaves as before. On any other status (in practice, `LOGIN_IN_PROGRESS`) it sets `authLoginPending(true)` and starts polling instead of reporting an error.
- New `startAuthLoginPolling(lane)`: polls `POST /import/dkcl/session/preflight` (the same endpoint `DataImportCenter.jsx` already uses for this exact purpose) every 5s. On `SESSION_VALID` it stops polling, clears pending, and calls the existing `fetchRunStatus(activeRunId)` so the WAITING_AUTH banner disappears without the Product Owner pressing anything else. On an error status it stops polling and surfaces `authLoginError`. On the attempt cap it stops and reports a timeout message.
- Cleanup: a `useEffect` clears the interval on unmount; a second `useEffect` keyed on `activeRunId` clears the interval and resets `authLoginPending` whenever the active run changes, preventing a stale poll for an abandoned run from continuing in the background.
- Banner: while `authLoginPending`, the button is disabled and reads "Đang chờ đăng nhập..."; a new neutral blue-styled line reads "Đang chờ bạn đăng nhập trong cửa sổ vừa mở… Banner này sẽ tự tắt khi đăng nhập xong." The existing red error line is unchanged and now only appears for genuine errors.

### 18.3 Validation

- `npm run build` (vite): PASS, 689 modules, no errors.
- `npx oxlint AutoBackfillOperatorPanel.jsx`: 0 errors; same 2 pre-existing `no-unused-vars` warnings as Sections 16-17, unchanged.
- `node src/components/AutoBackfillOperatorPanel.test.js`: 14/14 PASSED, unchanged (same residual as Section 16.5/17.4 -- the suite does not exercise the render tree or this polling logic).
- Zero NUL bytes. `git diff --stat`: exactly this one file.
- No real DKCL login was performed and no run was created to test this change, per the explicit "không tự đăng nhập, không tự tạo run" instruction; verified by code reading only.

### 18.4 Residual, Not Fixed Here (Backend, Separate Scope)

The "window does not re-hide on a second click" behavior in `reuseInteractiveClient()` (`backend/src/services/dkclSessionPreflightService.js`) is unchanged. With this fix, the Product Owner should no longer be misled into clicking a second time by a false error -- which removes the main trigger for hitting that behavior -- but the underlying backend gap still exists if a second click happens for any other reason (e.g. a stuck window, an unrelated retry). Left for a separate backend ticket per the investigation report already delivered in chat; CTO/PO scope decision pending.

State: fix applied and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- the Product Owner must re-test the real "Mở đăng nhập HUE/TCT" flow end-to-end and confirm the banner now shows the neutral waiting message (not a false error) and clears automatically once login completes.

## 19. UI Fix -- False-Positive "Cần đăng nhập thủ công" Banner On A Normally Running Run (2026-08-22, Claude Code)

### 19.1 Root Cause (Investigated By Claude Opus 5, Fixed By Claude Sonnet 5, Same Ticket)

The Product Owner reported the amber "Cần đăng nhập thủ công [HUE]" banner flashing on a run that was genuinely `RUNNING` with a real job actively executing (`activeExecutingJob` resolved correctly). Root cause, previously identified and left unfixed pending this delta: `resolveWaitingAuthLanes(run, jobs)` in `frontend/src/components/autoBackfillUiHelpers.js` fell back to `[run.requested_lane]` whenever `jobs` contained no `WAITING_AUTH` entry -- with no check that `run.safety_state` was actually `'WAITING_AUTH'`. Any timing window where the jobs array momentarily had no matching row (a normal `RUNNING` run, or a terminal `COMPLETED`/`COMPLETED_WITH_ERRORS`/`CANCELLED` run) produced a false-positive banner.

Two secondary defects in the same UI surface were fixed alongside it, all pre-identified and explicitly scoped by the Product Owner delta before implementation:

- `authLoginError`/`authLoginPending` (state left over from a prior WAITING_AUTH episode, e.g. Section 18's manual-login flow) had no cleanup tied to the run actually leaving `WAITING_AUTH` -- a stale error/pending banner could keep showing after the run had already resumed or completed.
- The idle line in the "GRANULAR JOB STATUS" row unconditionally read "Đang khởi tạo các luồng bù dữ liệu..." whenever `activeExecutingJob` was falsy, including on a terminal run (`COMPLETED`/`COMPLETED_WITH_ERRORS`/`CANCELLED`) -- misleadingly implying work was still starting up.

### 19.2 Fix Applied -- Exactly 3 Locations, No Other File Touched

- **`frontend/src/components/autoBackfillUiHelpers.js`**, `resolveWaitingAuthLanes()`: the `[run.requested_lane]` fallback now requires `run.safety_state === 'WAITING_AUTH'` in addition to the existing `requested_lane` check. Any other `safety_state` (`null`, or a terminal run) returns `[]`.
- **`frontend/src/components/AutoBackfillOperatorPanel.jsx`**: new `useEffect` keyed on `effectiveRunState`, placed next to the existing `waitingLanes` memo -- whenever `effectiveRunState !== 'WAITING_AUTH'`, it calls `setAuthLoginError(null)` and `setAuthLoginPending(false)`, so stale Section 18 banner state cannot outlive the WAITING_AUTH episode that produced it.
- **`frontend/src/components/AutoBackfillOperatorPanel.jsx`**: the idle-state branch (`activeExecutingJob` falsy) in the "GRANULAR JOB STATUS" row now branches on `effectiveRunState` -- `COMPLETED` -> "Đã hoàn tất", `COMPLETED_WITH_ERRORS` -> "Hoàn tất có lỗi", `CANCELLED` -> "Đã huỷ", any other state (unchanged) -> "Đang khởi tạo các luồng bù dữ liệu...".

Regression coverage: two new assertions added to `AutoBackfillOperatorPanel.test.js` (Test cases 2.5/2.6) directly reproducing the reported false-positive -- a `RUNNING`/`safety_state: null` run and a `COMPLETED`/`safety_state: null` run, each with an empty `jobs` array and a set `requested_lane`, both now assert `resolveWaitingAuthLanes` returns `[]`.

### 19.3 Validation

- `node src/components/AutoBackfillOperatorPanel.test.js`: 14/14 PASSED, including the 2 new regression cases.
- `npm run build` (vite): PASS, 689 modules, no errors.
- `npx oxlint` on the 3 changed files: 0 new findings; same 2 pre-existing `no-unused-vars` warnings (`coverageError`, `runError`) as Sections 16-18, unchanged, not introduced by this delta.
- No backend file touched, no database touched, no real DKCL login performed, no run created -- verified by `git diff --stat` (frontend-only, exactly the 3 files above) and by not invoking any backend/browser tool during this delta.

State: fix applied and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- the Product Owner must confirm in the live UI that the "Cần đăng nhập thủ công" banner no longer appears on a normally running or completed run, and that a genuine `WAITING_AUTH` run still shows it correctly (unchanged from Sections 17-18).

## 20. AB-AUTH-01 + AB-AUTH-02 -- First Two Redesign Tickets Executed (2026-08-24, Claude Code Opus 5)

Following Product Owner approval of `docs/10_TICKETS/AUTO-BACKFILL-AUTH-REDESIGN_DESIGN.md` (commit `1e19c5f3`) -- Plan A1 confirmed over A2, "Xoá phiên" feature confirmed, proposed ticket order confirmed, small-batch execution confirmed, and `AB-AUTH-04`'s `EXPORT_TIMEOUT` retry ceiling changed to a maximum 10-minute total wait (overriding the design's original ~65-minute estimate for that ticket only, not applicable here) -- the first two tickets in that sequence were executed in this delta.

### 20.1 AB-AUTH-01 -- Profile Lock Ownership Fix (commit `1d79d0c`)

Implements design Section 6.2 (D1) exactly as specified, no alternate approach substituted.

`backend/src/services/dkclHueF13PortalClient.js`, `acquireProfileLock()`: previously `this.lockDir` was assigned *before* `mkdirSync()` could throw `EEXIST`, so a client that lost the profile-lock race (rejected with `PROFILE_LOCKED`) still carried a `lockDir` into `close()`. `preflight()` calls `close()` unconditionally in a `finally` block, so a losing client would delete the winning client's live lock -- the exact bug identified in the design and in the prior investigation report, and the reason automated `WAITING_AUTH` release via a separate script was previously refused.

Fix: `this.lockDir` is now assigned only *after* `mkdirSync()` has actually created the directory, tracked by a new `this.ownsLock` flag; `close()` only removes the lock when `this.ownsLock` is true, and resets both fields (idempotent on a second `close()`). The success path is unchanged; only the `PROFILE_LOCKED` failure path stops causing harm.

Design's "safe orphan-lock cleanup" requirement was checked and found already satisfied: all three call sites of `processManager.cleanupStaleLocks()` (`dkclSessionPreflightService.js:282, 672, 932`) are already gated on `STALE_CONFIRMED` classification or a verified-and-terminated PID, so no new cleanup mechanism was built.

**Regression tests** -- 2 new cases in `backend/test_browserProfileLock.js` (TEST 11/12): a losing client must not delete the winner's lock (asserted on the actual side effect -- the deletion call -- not just an internal flag); the real lock owner must still release its own lock on `close()`. Both were run against the pre-fix code and confirmed to fail (TEST 11 fails on `close() must not remove a lock owned by another process`), then confirmed to pass with the fix restored.

**Validation:** `test_autoBackfillSafety.js` (Gate 5 suite) 11/11 PASS, suite itself not modified. `test_browserProfileLock.js` 12/12 PASS. `test_dkclSessionPreflightService.js`, `test_dkclHueF13SyncService.js`, `test_dkclHueF13BackfillService.js`, `test_dkclSessionCoordinator.js`, `test_dkclHueBrowserBroker.js` all PASS. `oxlint`: 1 pre-existing `no-dupe-class-members` warning (line shifted from 843 to 856 by the fix, confirmed present before this change too), no new findings. `git diff --stat`: exactly 2 files (`dkclHueF13PortalClient.js`, `test_browserProfileLock.js`). No database touched, no login performed, no run created.

State: `READY` -- backend-only, Gate 5 suite green, build/lint clean. Per CTO Self-Pass Criteria this is eligible for technical self-pass; flagged here for explicit CTO confirmation rather than self-declared.

### 20.2 AB-AUTH-02 -- Render `runError` (commit `07ef28f`)

Implements design Section 5.2 (C3).

`frontend/src/components/AutoBackfillOperatorPanel.jsx`: `runError` was set on every failed Pause/Resume/Reset-circuit/Create-run call (5 `setRunError` sites, dating back before this delta) but no JSX ever read it -- every one of those failures was silently swallowed, first flagged as `P1-E` in the original cross-cutting investigation and carried into the redesign design as Section 5.

Fix: a new dismissible red error block, placed *outside* both the run-creation-controls block and the active-run block -- deliberately, because `handleCreateRun` can fail while `activeRunId` is still `null`, so nesting the error display inside the active-run block would have kept the single most common failure case invisible. `handlePauseRun`/`handleResumeRun`/`handleResetCircuit` now call `setRunError(null)` at the start of the request, matching the pre-existing `handleCreateRun` pattern, so a stale error from a previous action does not linger across a new one.

Side effect: this also resolves the pre-existing `no-unused-vars(runError)` `oxlint` warning noted in Sections 16-19 -- `runError` is now referenced.

**Validation:** `npm run build` (vite) PASS, 689 modules. `oxlint`: 0 new findings; the `runError` warning is gone, only the unrelated pre-existing `coverageError` warning remains. `node AutoBackfillOperatorPanel.test.js`: 14/14 PASS (unchanged -- this project has no render-tree test harness for this component, same residual noted in Sections 16-19; no new assertions were added because there is nothing a pure-function contract test can assert about JSX visibility). `git diff --stat`: exactly this one file. No backend/database touched, no login performed, no run created.

State: fix applied and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- the Product Owner must confirm in the live UI that a genuine Pause/Resume/Reset-circuit/Create-run failure now shows a visible, dismissible red error message instead of failing silently.

### 20.3 Handoff

Both commits are on `codex/da-impl-006`, pushed to `origin`. `AB-AUTH-03` (lane-aware blocking, Plan A1) is next per the confirmed order; not started in this delta. The 10-minute `EXPORT_TIMEOUT` ceiling PO specified applies only to `AB-AUTH-04` and is recorded here for continuity, not acted on by this delta.

## 21. AB-AUTH-03 -- Lane-Aware Blocking (Plan A1) Executed (2026-08-24, Claude Code Opus 5)

### 21.1 Why This Was Prioritised

Third consecutive real-world occurrence of the same blockage. On 20/08, 21/08 and again on 22/08-23/08, a single run in `WAITING_AUTH` froze the entire Auto Backfill queue system-wide:

- 22/08 10:05Z: run `1505ace6` (F1.3/HUE) went `WAITING_AUTH` and blocked run `3e29bd2e` (F1.3/HUE 22/08).
- 23/08 11:17Z: run `bad55114` (F1.3/**TCT**, business date 18/08) went `WAITING_AUTH` and blocked run `2d817c59` (F1.3/**HUE**, business date 22/08) for roughly 16 hours. The HUE session was valid and the HUE work was unrelated to TCT; the Product Owner was nonetheless required to log into TCT purely to release a HUE import.

That last case is the clearest statement of the defect: the Product Owner had to authenticate a source they were not using in order to import a source they were.

### 21.2 What Changed -- Plan A1, No Schema Change

Implemented exactly per design document Section 3.3 (Plan A1) and Section 3.4. Serialised execution is untouched; only *blocking* became lane-scoped.

`backend/src/services/autoBackfillQueueStore.js`

- New module constant `BLOCKED_LANES_SUBQUERY`: the set of source lanes that cannot progress, derived from `auto_backfill_job.safety_state IN ('WAITING_AUTH','BLOCKED_INTEGRITY')` joined to a `RUNNING` run -- per Section 3.4, derived from the JOB, not from the nullable `auto_backfill_run.requested_lane`. Carries a defensive `source_lane IS NOT NULL` guard, because a NULL inside `NOT IN (...)` would make the predicate never match and silently starve the queue -- the exact risk the design flagged as A1's main hazard.
- `acquireNextJob()`: the former global guard (`SELECT id FROM auto_backfill_run WHERE status='RUNNING' AND safety_state IN ('WAITING_AUTH','BLOCKED_INTEGRITY')` -> `return null`) is removed and replaced by `AND j.source_lane NOT IN (<BLOCKED_LANES_SUBQUERY>)` inside the job-selection statement. The `GLOBAL_DKCL` lease check and the one-`RUNNING`-job check above it are byte-for-byte unchanged.
- `getCoordinatorState()`: three additive fields -- `blockedLanes`, `openLaneEligibleJobCount`, `openLaneRetryReadyAt`. Every pre-existing field keeps its original whole-system meaning so no existing caller changes behaviour, exactly as Section 3.3 item 2 required.

`backend/src/services/autoBackfillWorkerCoordinator.js`

- `authenticationBlocked` / `integrityBlocked` booleans became `authenticationBlockedLanes` / `integrityBlockedLanes` sets (Section 3.3 item 4). A blocking error that cannot name its lane is recorded under an `UNKNOWN_LANE` sentinel and still halts the drain outright, preserving the old conservative behaviour whenever lane-scoped reasoning is impossible.
- `runDrainLoop()`: on `AUTHENTICATION_REQUIRED` / `AUTO_BACKFILL_INTEGRITY_BLOCKED` the loop now records the lane and `break`s instead of hard-`return`ing, so the scheduling decision falls through to `nextPollDelay()` reading persisted state.
- `nextPollDelay()` (Section 3.3 item 3): `if (waitingAuthCount > 0 || integrityBlockedCount > 0) return null` became "return `null` only when nothing remains that a still-open lane could pick up". It consumes the open-lane variants, which also prevents a busy-poll loop that would otherwise arise from a `RETRY_WAIT` job sitting on a blocked lane.

`backend/src/services/autoBackfillQueueService.js`

- One additive line: `haltError.sourceLane = job.source_lane` so the coordinator can attribute the block to a lane instead of halting all of them.

**No schema migration, no database change, no change to circuit-breaker behaviour, thresholds, completion policies or the integrity stop.** Both schema constraints the design identified (`uq_auto_backfill_one_running_job`, `auto_backfill_worker_lease.lease_name CHECK (= 'GLOBAL_DKCL')`) remain in force.

### 21.3 Regression Tests -- Verified To Fail Without The Fix

Four new tests in `backend/test_autoBackfillQueueService.js` (24 -> 28), modelled on the production shape of the incident: two *separate* runs, one per lane, because the pre-existing run-level `r.safety_state` filter legitimately still blocks sibling jobs inside the same run.

1. `a WAITING_AUTH TCT run no longer blocks a separate HUE run` -- the incident itself. Asserts HUE executor calls continue after the TCT block, every HUE job reaches `SUCCESS`, and the HUE run never inherits the TCT safety state.
2. `a blocked lane still blocks its own lane` -- the other half of the guarantee: TCT is attempted exactly once and then stays closed; no TCT job reaches a terminal state.
3. `getCoordinatorState reports the blocked lane and open-lane work separately`.
4. `nextPollDelay keeps polling for an open lane but still sleeps when every lane is blocked` -- including the blocked-lane retry case and the nothing-blocked case.

Verification that the tests actually catch the bug (same method as AB-AUTH-01): the three source files were stashed to restore pre-fix code and the suite re-run. Test 1 failed with `calls=["F9.A|TCT|2026-01-03"]` -- precisely the production symptom, zero HUE executions after the TCT block -- and tests 3 and 4 also failed. Test 2 passed on both, confirming it guards behaviour that was already correct. The fix was then restored and re-verified.

### 21.4 Validation

- **Gate 5 `test_autoBackfillSafety.js`: 11/11 PASS**, and `git diff --stat` on that file is empty -- the suite was **not modified**. Its two blocking-sensitive tests (`authentication loss ... stops drain`, `integrity fatal stops immediately ... and blocks later jobs`) both use the single-lane HUE fixture, so lane-scoped blocking still closes the only lane present and the assertions hold unchanged.
- `test_autoBackfillQueueService.js`: 28/28 PASS.
- 15 related backend suites PASS: the 8 `autoBackfill*` suites, `browserProfileLock`, `dkclHueF13SyncService`, `dkclHueF13BackfillService`, `dkclSessionCoordinator`, `dkclHueBrowserBroker`, `tctF13BackfillService`, and `dkclSessionPreflightService` (which must be run from the repository root -- it calls `process.chdir('backend')`).
- `oxlint` on all four changed files: 0 findings.
- Frontend unaffected and confirmed: `AutoBackfillOperatorPanel.test.js` 14/14 PASS, `vite build` PASS.
- Read-only check against the production database confirmed the new `blockedLanes` query returns `[]` now that the Product Owner has cleared the backlog; no write was performed, no login, no run created.

### 21.5 Production State Observed During This Delta (Read-Only)

The Product Owner released the 23/08 TCT block during this work. Run `2d817c59` (F1.3/HUE, business date 22/08) reached `COMPLETED` at `2026-08-24T03:50:13Z`, and `fact_f13` for `2026-08-22` now holds **3,903 rows** (latest write `2026-08-24 03:50:07`). Run `3e29bd2e`, the earlier attempt at the same date, remains `COMPLETED_WITH_ERRORS` from the `EXPORT_TIMEOUT` failure that `AB-AUTH-04` will address.

### 21.6 Residual And Handoff

`AB-AUTH-04` (retry for `EXPORT_TIMEOUT`) is next in the confirmed order and is **not** touched here. The Product Owner's revised ceiling for it -- total wait for one job must not exceed **10 minutes**, not the 65 minutes the design proposed, because a healthy DKCL portal produces the export in 1-2 minutes -- supersedes design Section 7.2 for that ticket only and is recorded here for continuity. Design Section 12 question 2 is therefore answered.

Plan A2 (true per-lane parallelism, requiring two schema migrations) remains explicitly out of scope and not recommended.

State: implemented and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- per the design's own risk note this is the largest behavioural change in the programme, so the Product Owner must confirm on a real run that a `WAITING_AUTH` run on one source no longer stalls work on the other, and that a blocked source still refuses to execute until its own manual login and explicit Resume.

## 22. AB-AUTH-03 Live Verification -- Deferred By Product Owner Decision (2026-08-24)

### 22.1 Status Of Implementation

`AB-AUTH-03` (commit `966427f5`) is implemented and code-reviewed per Section 21: lane-aware blocking replaces the global `WAITING_AUTH`/`BLOCKED_INTEGRITY` guard, with a dedicated regression suite that reproduces the exact 20/08-22/08 incident (Section 21.3) and was verified to fail against the pre-fix code before the fix was restored. It has **not** been confirmed by the Product Owner on the live system.

### 22.2 Why A Deliberate Test Was Not Attempted

A read-only survey was performed to design a repeatable Product Owner checklist for exercising the fix on purpose (one source deliberately put into `WAITING_AUTH` while the other keeps working). The survey found:

- `F1.3` has **0** queue-eligible missing dates on either lane (fully backfilled). `F4.1` has **234** queue-eligible missing dates on each of HUE and TCT -- real, safe test material exists (re-importing an already-covered date is harmless and repeatable).
- No run was `RUNNING`/`PAUSED` at survey time; both HUE and TCT browser sessions were live (both `HUE.lock`/`TCT.lock` held, matching Chromium process groups present for each profile) -- there was no naturally-occurring `WAITING_AUTH` condition to observe.
- The only way to deliberately force one session invalid on demand today is to kill its Chromium process outside the application (e.g. Task Manager). This was evaluated against `dkclSessionPreflightService.js`'s `probeAndMaybeExpireClient()` and found **not safe/predictable**: a killed process leaves the backend still holding a reference to a dead browser context; the probe's own ambiguity handling (`if (!probe.hasLoginInput) ... "keep the session"`) means the outcome is not a clean `AUTHENTICATION_REQUIRED` but an indeterminate `LOGIN_IN_PROGRESS`-like state, and the profile lock is not guaranteed to be released cleanly (nothing calls `close()` on a killed process). It was therefore **not** included in any checklist and **not** performed.
- `AB-AUTH-10` ("Đăng xuất / Xoá phiên" -- Section 6.3 of the design), which would let the Product Owner cleanly and deterministically invalidate one lane's session on demand for exactly this purpose, was proposed for earlier prioritisation specifically to enable safe on-demand testing.

### 22.3 Product Owner Decision

The Product Owner declined to schedule a deliberate test at this time: `F4.1` backfill has been blocked by import-mechanism defects for over a week, and the Product Owner's priority is importing real data, not manufacturing a test condition. `AB-AUTH-10` is **deferred indefinitely, not cancelled** -- it remains in the design's ticket list (Section 10) and can be picked up whenever the Product Owner wants an on-demand way to invalidate a session, for testing or otherwise.

### 22.4 Standing Instruction

No further test of this ticket is to be proactively scheduled. If the Product Owner reports the original symptom again -- one source in `WAITING_AUTH` blocking backfill work on an unrelated source -- this is to be treated as a **regression** of `AB-AUTH-03` specifically, reopened under this section, and given immediate priority (ahead of whatever ticket is then in progress).

### 22.5 State

`AB-AUTH-03: DEPLOYED / LIVE VERIFICATION PENDING (deferred by Product Owner)`. This is distinct from both `READY FOR PO UI CHECK` (Section 21, superseded by this entry) and `PO PASS` -- it is not blocking any other ticket, and Section 21's technical validation (Gate 5 11/11, 28/28 queue-service suite, 15 related suites, oxlint clean) stands as the record of correctness in the absence of live confirmation. `AB-AUTH-10` status: `PROPOSED / DEFERRED INDEFINITELY`, not cancelled.

## 23. AB-AUTH-04 -- Bounded Retry For EXPORT_TIMEOUT (Plan E, 10-Minute Ceiling) Executed (2026-08-24, Claude Code Opus 5)

### 23.1 Root Cause, Confirmed Exactly As Previously Reported

`dkclHueF13SyncService.js`'s `pollGeneratedFile()` path throws `createTimeoutError('Timed out waiting for generated DKCL F1.3 detail export.', 'EXPORT_TIMEOUT')` when the DKCL portal fails to produce the export in time. The catch block in `start()` then persisted only `status: STATUSES.FAILED` and `safeErrorMessage` onto the run object -- **the original `error.code` was never saved**. `F13AutoBackfillExecutor.awaitHueResult()` read `run.status` ('FAILED') as the only available signal and rethrew `executorError(status, ...)`, so the queue's error classifier (`importIndicatorRegistry.js` `DEFAULT_ERROR_MAP`) received the code `'FAILED'`, which has no entry, defaults to `SYSTEM`, and `SYSTEM` is not in `DEFAULT_RETRY_POLICY.retryableClasses` -- so the job went straight to `FAILED_TERMINAL` after exactly one attempt. This was a lost error code, not a deliberate no-retry decision, exactly as reported in the prior investigation.

### 23.2 Product Owner's Revised Ceiling (Supersedes Design Section 7.2 For This Ticket Only)

Per the delta instruction, the design's original proposal (3 attempts, 5min/15min backoff, ~65 minutes worst case) is replaced: **total wait for one job, including every retry, must not exceed 10 minutes** -- a healthy DKCL portal produces the export in 1-2 minutes, so anything past 10 minutes is treated as a confirmed real failure, not something worth waiting longer for.

### 23.3 What Changed

`backend/src/services/dkclHueF13SyncService.js`

- `createRun()` initialises a new `errorCode: null` field on the run object.
- The failure catch block in `start()` now also persists `errorCode: error.code || null` alongside the existing `safeErrorMessage` -- purely additive, `updateRun()` is a plain `Object.assign`, so nothing that reads the run object today is affected by the new field's presence.

`backend/src/services/autoBackfillF13Executors.js`

- `awaitHueResult()`: `throw executorError(run?.errorCode || status || 'F13_HUE_EXECUTION_FAILED', ...)` -- prefers the preserved original code over `run.status`, falling back to the old behaviour when no `errorCode` was captured (e.g. an older/mocked adapter), so nothing that previously relied on the `status`-as-code fallback breaks.
- New module constant `HUE_BACKFILL_EXPORT_TIMEOUT_MS = 180000` (3 minutes), applied **only** to `createF13AutoBackfillExecutors()`'s own `DkclHueF13SyncService` instance via `config: { generationTimeoutMs: ... }`. This instance is private to the Auto Backfill queue path (confirmed by reading `f13Adapters.js`'s `HueF13Adapter`, which wraps exactly this `syncService`). The manual Import screen's controller (`dkclHueF13SyncController.js`) constructs its own separate `DkclHueF13SyncService` instance with no config override and therefore keeps the original 15-minute default (`DEFAULT_CONFIG.generationTimeoutMs`, env `DKCL_HUE_GENERATION_TIMEOUT_MS`) -- confirmed unchanged and covered by a dedicated regression test (Section 23.4).

`backend/src/services/importIndicatorRegistry.js`

- `DEFAULT_ERROR_MAP.EXPORT_TIMEOUT = 'TRANSIENT'` added. `DEFAULT_RETRY_POLICY.retryableClasses` (`['PORTAL_TRANSIENT', 'LOCAL_SYSTEM']`) already normalizes to the same `TRANSIENT` class via `CLASS_ALIASES`, so `EXPORT_TIMEOUT` is retryable under the existing lane retry policy with **no other retry-policy field changed** -- `maxAttempts` stays `3`, backoff stays `2000ms`/`30000ms` exponential.

### 23.4 The 10-Minute Budget, Worked Out Explicitly

With `maxAttempts` unchanged at `3` and `HUE_BACKFILL_EXPORT_TIMEOUT_MS = 180000`:

```
worst case = 3 x 180,000ms (export-wait per attempt)
           + retryDelayMs(attempt 1) = 2,000ms
           + retryDelayMs(attempt 2) = 4,000ms
           = 540,000ms + 6,000ms = 546,000ms = 9 minutes 6 seconds
```

9m06s stays under the Product Owner's 10-minute ceiling with roughly 54 seconds of margin for scheduling/timer jitter. `maxAttempts` and the generic backoff were deliberately left untouched (they were already small enough not to need adjusting); the only lever pulled was the per-attempt export-wait timeout, scoped to the Auto Backfill executor's own service instance. This is locked in by an explicit regression test (Section 23.5, test 4) rather than left as a comment-only guarantee.

On final exhaustion, the existing generic terminal message (`autoBackfillQueueStore.js`: `` `Automatic retry limit of ${maxAttempts} attempts was exhausted; Product Owner review is required.` ``) is unchanged and was not made `EXPORT_TIMEOUT`-specific -- that message is shared by every retryable-exhausted error code across every lane, and rewriting it was out of scope for the three items the delta instruction actually asked for (preserve the code, classify it `TRANSIENT`, bound the retry timing).

### 23.5 Regression Tests -- Verified To Fail Without The Fix

Five new tests in `backend/test_autoBackfillF13Executors.js` (12 -> 17):

1. `awaitHueResult preserves run.errorCode instead of falling back to run.status` -- the exact bug: a run with `status: 'FAILED', errorCode: 'EXPORT_TIMEOUT'` must produce a thrown error with `code === 'EXPORT_TIMEOUT'`.
2. `a run with no errorCode still falls back to run.status (backward compatible)` -- guards the fallback path explicitly.
3. `EXPORT_TIMEOUT is mapped to TRANSIENT and retryable, not SYSTEM/terminal` -- calls `AutoBackfillSafetyCoordinator.classify()` directly with the real `DEFAULT_ERROR_MAP`/`DEFAULT_RETRY_POLICY` and asserts `classification === 'TRANSIENT'` and `retryable === true`.
4. `the Auto Backfill HUE sync service instance uses a shortened export timeout so 3 attempts stay under the 10-minute ceiling` -- reads the actual configured `generationTimeoutMs` off `createF13AutoBackfillExecutors({ db: {} }).HUE.adapter.syncService.config`, computes the worst-case total using the real `AutoBackfillSafetyCoordinator.retryDelayMs()` and the real `DEFAULT_RETRY_POLICY.maxAttempts`, and asserts the total is `<= 10 * 60 * 1000`ms -- this test would fail on its own if a future change to `maxAttempts` or the backoff policy silently blew the Product Owner's ceiling.
5. `the manual Import screen keeps the original 15-minute export timeout (no cross-contamination)` -- constructs a plain `new DkclHueF13SyncService({ db: {} })` (the same construction pattern the manual Import controller uses) and asserts `config.generationTimeoutMs === 900000`.

Verified to fail without the fix (same method as AB-AUTH-01/03): all three changed source files were restored to their pre-fix `git checkout` state and the suite re-run. Tests 1, 3 and 4 failed exactly as expected -- test 1 with `actual: 'FAILED', expected: 'EXPORT_TIMEOUT'`; test 3 with `actual: undefined` (no `DEFAULT_ERROR_MAP.EXPORT_TIMEOUT` entry existed); test 4 with `must override the 15-minute default for the queue path` (the pre-fix executor factory has no config override at all, so both instances used the same 900000ms default -- a real illustration of why test 5 exists as a distinguishing guard). Tests 2 and 5 passed on both, confirming they guard behaviour that was already correct. The fix was then restored from a scratch backup and re-verified.

### 23.6 Validation

- **Gate 5 `test_autoBackfillSafety.js`: 11/11 PASS**, suite not modified (`git diff --stat` on that file is empty).
- `test_autoBackfillF13Executors.js`: 17/17 PASS.
- 11 related backend suites PASS: `autoBackfillQueueService` (28/28, unaffected by AB-AUTH-03's own additions), `autoBackfillQueueController`, `autoBackfillF41Executors`, `autoBackfillCoverageService`, `autoBackfillCoverageController`, `autoBackfillCoverageExceptionService`, `autoBackfillCoverageExceptionController`, `dkclHueF13SyncService` (the file that was directly changed -- confirms manual-Import-relevant behaviour is unaffected), `dkclHueF13BackfillService`, `dkclHueBrowserBroker`, `dkclSessionCoordinator`, `browserProfileLock`, and `dkclSessionPreflightService` (run from the repository root per its `process.chdir('backend')` requirement).
- `oxlint` on all four changed files: 0 new findings; one pre-existing `unicorn(no-useless-fallback-in-spread)` warning on an untouched line of `dkclHueF13SyncService.js`, confirmed present identically on the pre-change file via `git stash`.
- `npm run build` (frontend, unaffected by this backend-only ticket): PASS.
- No database touched, no login performed, no run created -- this delta was verified entirely through unit tests against isolated service instances and temporary SQLite fixtures created by the existing test harnesses.

### 23.7 Residual

`AB-AUTH-05` (PENDING vs BLOCKED session semantics) is next in the confirmed order and depends on this ticket's backoff mechanism per design Section 9.1 -- not started here.

State: implemented and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- this changes real Product Owner-visible behaviour (an F4.1/F1.3 HUE job that previously failed permanently after one `EXPORT_TIMEOUT` will now retry up to 3 times before giving up, and will visibly sit in `RETRY_WAIT` between attempts instead of `FAILED_TERMINAL` immediately). The Product Owner should confirm on a real `EXPORT_TIMEOUT` occurrence (most likely on the 234 outstanding F4.1 dates) that: the job retries instead of failing immediately, the total time before a final failure is noticeably under 10 minutes, and a `SUCCESS` on any retry attempt completes the job normally.

## 24. AB-AUTH-06 + AB-AUTH-07 -- Open-Run List API And Multi-Run Table Executed (2026-08-24, Claude Code Opus 5)

### 24.1 Scope

Per design Section 5 (C1 + C2), the Product Owner chose these two together since the UI ticket cannot exist without the API. `C3` (render `runError`) was already delivered under `AB-AUTH-02`; `C4` (merge bulk reimport into one run) remains `AB-AUTH-08`, explicitly deferred, not touched here.

### 24.2 AB-AUTH-06 -- `GET /api/import/auto-backfill/runs` (C1)

`backend/src/services/autoBackfillQueueStore.js`

- New `listRuns({ statuses, limit, offset })`: one query for the run rows (default `['RUNNING', 'PAUSING', 'PAUSED']`, i.e. every open run), one query for their jobs by `run_id IN (...)`, aggregated in memory into `jobCountsByState`, `indicators`, `lanes`, and `indicatorLanePairs` (exact `(indicator, sourceLane)` pairs, kept alongside the display arrays so the service layer can permission-filter without a second query).
- `blockedLanes` is deliberately **not** the system-wide `BLOCKED_LANES_SUBQUERY` from `AB-AUTH-03` -- it is scoped to each run's own jobs. The question this API answers is "which run is responsible for blocking a lane", not "which lanes are blocked anywhere"; those are different questions and conflating them would have made a healthy run appear to be the one blocking the queue.

`backend/src/services/autoBackfillQueueService.js`

- New `listRuns({ status, limit, offset, roles, permissionField })`: applies the **same** per-`(indicator, lane)` permission check `getRun()` already uses (`registrations()[...].lanes[...].permissions[permissionField]`). A run is included only if at least one of its pairs is readable; the displayed `indicators`/`lanes`/`blockedLanes` are trimmed to the readable subset so a restricted role never sees a lane name it has no access to.

`backend/src/controllers/autoBackfillQueueController.js` + `backend/src/routes/importRoutes.js`

- `GET /api/import/auto-backfill/runs` (query: `status`, `limit`, `offset`), `requireAuth` only -- consistent with the existing read routes (`getRun`, `getEvents`, `getReport`), which are also `requireAuth`, not `adminOnly`. Response: `{ success: true, data: { runs: [...] } }`.
- Registered before `/auto-backfill/runs/:runId` for readability only; Express does not confuse the two path shapes.

### 24.3 AB-AUTH-07 -- Multi-Run Table (C2)

`frontend/src/components/autoBackfillUiHelpers.js`

- New `resolveOpenRunRowActions(entry)`: pulled the per-row decision logic (run state, `isBlocking`, `canResume`) out of JSX into a plain function, matching this file's existing pattern of every other UI decision being a testable helper rather than inline JSX logic. `canResume` is `true` only when `resolveEffectiveRunState(entry.run) === 'WAITING_AUTH'` -- a run merely queued behind a lane blocked by a *different* run is not itself stuck and must not show a Resume button that does nothing.

`frontend/src/components/AutoBackfillOperatorPanel.jsx`

- New "Tất cả tiến trình đang mở" table, placed above the run-creation/detail panel per design C2. Polls `GET /auto-backfill/runs` every 5s (`fetchOpenRuns`, mirroring the existing `fetchRunStatus` 4s pattern) and also refreshes immediately after every mutating action (`handleCreateRun`, `handlePauseRun`, `handleResumeRun`, `handleResetCircuit`) that already refreshed the single-run panel.
- Each row shows: short run id, indicator/lane, state badge, job count, and -- only when `blockedLanes` is non-empty -- a red "Đang chặn nguồn X" flag with a "Mở đăng nhập X" button per blocked lane (reuses the existing, run-independent `handleOpenManualLogin(lane)`).
- A "Tiếp tục Run" button appears only when `canResume` is true, and acts on that row's own run id directly via a new `handleResumeRunFromList(runId)` -- the Product Owner does not have to first select the run as "active" to unblock it, which is the exact friction point from the 22/08-24/08 incidents documented in Sections 21 and prior investigation reports.
- Clicking a row (`handleSelectRunFromList`) switches the detail panel below to that run, reusing the existing `activeRunId`/`fetchRunStatus` machinery unchanged.

### 24.4 Regression Tests -- Verified To Fail Without The Fix

Backend, `test_autoBackfillQueueService.js` (28 -> 31): `listRuns returns every open run with per-run job counts and blocked lanes` (reuses the `AB-AUTH-03` `laneBlockedFixture()` -- a run with a blocked TCT job and a healthy HUE job must report `blockedLanes: ['TCT']` and both lanes counted), `listRuns excludes terminal runs by default and includes them when asked`, `listRuns applies the same per-lane permission filter as getRun` (a role with no readable lane must see `[]`, not a 403 -- listing silently omits, `getRun` on a single restricted run still throws).

Backend, `test_autoBackfillQueueController.js` (7 -> 10): `listRuns forwards status/limit/offset and roles, and wraps the result under { runs }`, the empty-query default case, and the existing error-passthrough pattern reused for `listRuns`.

Frontend, `AutoBackfillOperatorPanel.test.js` (14 -> 15, 5 sub-cases): a `WAITING_AUTH` entry offers Resume; **the incident reproduction** -- a healthy `RUNNING` run listed next to a blocked one must never offer Resume; a `PAUSED` run (a deliberate PO action, not `WAITING_AUTH`) must not offer Resume either; missing `blockedLanes` must not throw; a null/empty entry must not throw.

Verified to fail without the fix (same method as AB-AUTH-01/03/04): the four backend source files were reverted to their pre-fix `git checkout` state -- all three new `listRuns` service tests failed with `fixture.service.listRuns is not a function`. Separately, `autoBackfillUiHelpers.js` was reverted alone -- the frontend suite failed to even load (`SyntaxError: ... does not provide an export named 'resolveOpenRunRowActions'`), i.e. every consumer of the file breaks loudly rather than silently keeping stale behaviour. Both were then restored from a scratch backup and re-verified passing.

### 24.5 Validation

- **Gate 5 `test_autoBackfillSafety.js`: 11/11 PASS**, suite not modified.
- `test_autoBackfillQueueService.js`: 31/31 PASS. `test_autoBackfillQueueController.js`: 10/10 PASS. `test_autoBackfillCoverageController.js` (unaffected sibling controller, sanity check): PASS.
- Frontend: `AutoBackfillOperatorPanel.test.js` 15/15 PASS; `npm run build` (vite) PASS, 689 modules.
- `oxlint` on all 6 changed files: 0 new findings; the same single pre-existing `no-unused-vars` warning (`coverageError`) already present before this delta, unchanged.
- No database touched, no login performed, no run created -- verified entirely via unit/fixture tests and a static build.

### 24.6 Decisions Made Beyond The Design's Literal Text

- **`blockedLanes` scope (per-run, not system-wide):** the design's C1 wording ("lane nào đang bị run này chặn") is ambiguous between "which lanes does this run block" and "which lanes are blocked, reusing the AB-AUTH-03 query". Chose per-run, because the table's purpose is identifying *which run* to act on -- a system-wide union would make every run in a blocked system look equally suspect.
- **Resume button gated on `runState === 'WAITING_AUTH'`, not on `blockedLanes.length > 0`:** these differ for a run that is itself healthy but merely queued behind a lane a *different* run is blocking (post-`AB-AUTH-03`, this is now possible and expected). Showing Resume there would be a dead button -- resuming a run that was never `WAITING_AUTH` is a no-op in `resumeRun()`. This is the concrete design decision the `AB-AUTH-07` test suite (case 15.2) exists to lock in.
- **Read permission is `requireAuth`, not `adminOnly`:** matched the existing precedent (`getRun`, `getEvents`, `getReport` are all `requireAuth`); only mutating routes are `adminOnly`. Not explicitly stated for `C1` in the design but consistent with its own "quyền: `requireAuth` cho đọc" line.

### 24.7 Residual

`AB-AUTH-05` (PENDING vs BLOCKED session semantics) remains next in the confirmed order, not started in this delta. `AB-AUTH-08`/`AB-AUTH-09` (merge bulk reimport, indicator filter) remain deferred per explicit Product Owner instruction.

State: implemented and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- this adds a new, always-visible table to the Auto Backfill screen. The Product Owner should confirm: every open run appears (not just the one being tracked below), a run blocking a lane shows the red flag and its own "Mở đăng nhập"/"Tiếp tục Run" buttons work directly from the row, and clicking a row switches the detail panel to that run.

## 25. AB-AUTH-05 -- PENDING vs BLOCKED Session Semantics, End To End Executed (2026-08-24, Claude Code Opus 5)

### 25.1 Root Cause, Confirmed Exactly As Previously Reported

`dkclSessionPreflightService.js` already reports five distinct preflight statuses (`SESSION_VALID`, `AUTHENTICATION_REQUIRED`, `SESSION_CHECK_FAILED`, `LOGIN_IN_PROGRESS`, `LOGIN_TIMEOUT`), but `F13AutoBackfillExecutor.validateSession()` collapsed all four non-`SESSION_VALID` statuses into one hard `AUTHENTICATION_REQUIRED` failure. A Product Owner who had just opened the manual-login window (`LOGIN_IN_PROGRESS`) was therefore indistinguishable, at every downstream layer, from a session that was genuinely broken -- producing the single biggest recurring complaint: "Đang khởi tạo..." never told the Product Owner which of three real situations they were in.

### 25.2 What Changed, By Layer (Design Section 4.2, Items 1/2/4 -- Item 3 Is A Documented Deviation, See 25.6)

**Executor** (`backend/src/services/autoBackfillF13Executors.js`)

- `validateSession()` now branches three ways instead of two: `SESSION_VALID` returns normally; `LOGIN_IN_PROGRESS`/`LOGIN_TIMEOUT` (`PENDING_PREFLIGHT_STATUSES`) throw a new `sessionPendingError()` carrying `code: 'SESSION_PENDING_HUMAN_ACTION'` and `error.autoBackfill = { classification: 'TRANSIENT' }`; every other status (including no status at all) still throws the original `authenticationError()` (`AUTHENTICATION_REQUIRED`) -- the BLOCKED path is otherwise byte-for-byte unchanged.

**Registry** (`backend/src/services/importIndicatorRegistry.js`)

- `DEFAULT_ERROR_MAP.SESSION_PENDING_HUMAN_ACTION = 'TRANSIENT'`, one additive entry, matching design Section 4.2 item 2 exactly.

**Queue store** (`backend/src/services/autoBackfillQueueStore.js`)

- `recordLeasedFailure()` gained a new branch, checked first (before the `AUTHENTICATION` branch): `failure.code === 'SESSION_PENDING_HUMAN_ACTION'` sets `state: 'QUEUED'`, `safety_state: 'RETRY_WAIT'`, a fixed 15-second reschedule (`SESSION_PENDING_RETRY_DELAY_MS`), and -- critically -- is **not** gated by the `attempt_number < maxAttempts` check the generic `RETRY_WAIT` branch uses. See Section 25.6 for why this is a deliberate, documented departure from the design's literal wording, not an oversight.

**Frontend** (`frontend/src/components/autoBackfillUiHelpers.js`, `AutoBackfillOperatorPanel.jsx`)

- New `resolveRunIdleState(runData)`: classifies the panel's idle line into `EXECUTING` (a job is `RUNNING`/`LEASED`/`RECOVERY_CHECK`) > `SESSION_PENDING` (a job is `RETRY_WAIT` with `terminal_reason === 'SESSION_PENDING_HUMAN_ACTION'`) > `WAITING_AUTH` (the run itself is genuinely blocked) > `QUEUED_BEHIND_OTHER_WORK` (a job is plain `QUEUED`, including `RETRY_WAIT` for any *other* reason such as `EXPORT_TIMEOUT`) > `TERMINAL` / `INITIALIZING` fallback -- resolved in that priority order.
- The idle line now reads distinctly for three of the Product Owner's cases: "Đang xử lý..." (a, unchanged), a new blue "Đang chờ bạn hoàn tất đăng nhập [LANE]..." (the fix's actual target -- PENDING), "Đang xếp hàng chờ tới lượt..." (b, new -- previously indistinguishable from PENDING), and the existing amber "Cần đăng nhập thủ công" banner is untouched (c, still driven by `resolveWaitingAuthLanes`, which only ever matches a genuine `WAITING_AUTH` job/run -- `RETRY_WAIT` jobs, including `SESSION_PENDING` ones, were never visible to it).

### 25.3 Regression Tests -- Verified To Fail Without The Fix

Backend, `test_autoBackfillF13Executors.js` (12 -> 19): `validateSession` returns normally on `SESSION_VALID`; both `LOGIN_IN_PROGRESS` and `LOGIN_TIMEOUT` throw `SESSION_PENDING_HUMAN_ACTION`/`TRANSIENT`; `AUTHENTICATION_REQUIRED`, `SESSION_CHECK_FAILED`, and `undefined` all still throw the real `AUTHENTICATION_REQUIRED`; `DEFAULT_ERROR_MAP.SESSION_PENDING_HUMAN_ACTION` is `TRANSIENT` and classifies as retryable via the real `AutoBackfillSafetyCoordinator`.

Backend, `test_autoBackfillQueueService.js` (31 -> 32): `SESSION_PENDING_HUMAN_ACTION retries without exhausting attempts or setting WAITING_AUTH` -- 5 consecutive failures (past the lane's `maxAttempts: 3`) must each leave the job `RETRY_WAIT`, `run.safety_state === null`, never `FAILED_TERMINAL`; the 6th attempt succeeds and the run reaches `COMPLETED`. (A second, cross-lane test asserting "TCT pending never blocks HUE" was drafted and deliberately dropped -- see Section 25.6, second bullet, for why it would have been testing something the design does not actually guarantee.)

Frontend, `AutoBackfillOperatorPanel.test.js` (15 -> 16, 7 sub-cases): an executing job wins priority; **the exact reproduction** -- a job `RETRY_WAIT` with `terminal_reason: 'SESSION_PENDING_HUMAN_ACTION'` resolves to `SESSION_PENDING`, not the old generic text; a `RETRY_WAIT` job for a *different* reason (`EXPORT_TIMEOUT`) must **not** be confused with a pending login; a genuinely `WAITING_AUTH` run still resolves distinctly; a plain `QUEUED` job resolves to `QUEUED_BEHIND_OTHER_WORK`; all three terminal states; no run data at all must not throw.

Verified to fail without the fix (same method as AB-AUTH-01/03/04/06+07): the three backend source files were reverted to their pre-fix `git checkout` state -- 3 of the new `test_autoBackfillF13Executors.js` tests failed exactly as expected (`LOGIN_IN_PROGRESS`/`LOGIN_TIMEOUT` both threw the old hard `AUTHENTICATION_REQUIRED` instead of `SESSION_PENDING_HUMAN_ACTION`; the registry lookup returned `undefined`). Separately, `autoBackfillUiHelpers.js` was reverted alone -- the frontend suite failed to load at all (`SyntaxError: ... does not provide an export named 'resolveRunIdleState'`). Both were then restored from a scratch backup and re-verified passing.

### 25.4 Validation

- **Gate 5 `test_autoBackfillSafety.js`: 11/11 PASS**, suite not modified.
- `test_autoBackfillF13Executors.js`: 19/19 PASS. `test_autoBackfillQueueService.js`: 32/32 PASS.
- 12 related backend suites PASS: `autoBackfillQueueController`, `autoBackfillF41Executors`, the 4 coverage/exception suites, `dkclHueF13SyncService`, `dkclHueF13BackfillService`, `dkclHueBrowserBroker`, `dkclSessionCoordinator`, `browserProfileLock`, and `dkclSessionPreflightService` (run from the repository root).
- Frontend: `AutoBackfillOperatorPanel.test.js` 16/16 PASS; `npm run build` (vite) PASS, 689 modules.
- `oxlint` on all 5 changed files: **0 findings** (not even the pre-existing `coverageError` warning, which lives in an unrelated part of the JSX file untouched by this specific check).
- No database touched, no login performed, no run created.

### 25.5 Production Data Point Consistent With This Root Cause

The two `AUTHENTICATION_REQUIRED` failures the original investigation timed at `12ms` and `42ms` -- far too fast to involve a real Playwright round trip -- are exactly explained by this fix: those responses came from `dkclSessionPreflightService.js`'s in-memory `LOGIN_IN_PROGRESS`/`LOGIN_TIMEOUT` branches (checked synchronously before any browser interaction), which is precisely the case `validateSession()` now separates out instead of hard-failing.

### 25.6 Decisions Made Beyond The Design's Literal Text

- **Item 3 (backoff) was not implemented as literally worded, and this is a deliberate, reasoned departure, not an omission.** Design Section 4.2 item 3 says PENDING needs "backoff dài (người đăng nhập mất vài phút)... dùng chung cơ chế backoff theo mã lỗi với EXPORT_TIMEOUT." Investigation found that AB-AUTH-04's actual "cơ chế" for `EXPORT_TIMEOUT` is *not* a longer retry backoff at all -- it is a shortened *per-attempt* wait bound (`generationTimeoutMs`), with the between-attempt backoff staying at the lane's tiny default (2s/4s). There is no generic "backoff per error code" facility anywhere in this codebase to reuse, and the lane-wide `retryPolicy`/`maxAttempts` cannot be raised for `SESSION_PENDING_HUMAN_ACTION` without also raising it for `EXPORT_TIMEOUT` on the same lane -- which would blow AB-AUTH-04's carefully audited 10-minute ceiling. Simply reusing the existing generic backoff unmodified (2s/4s/8s, `maxAttempts: 3`) was tried conceptually first and rejected: it would terminally fail a job after ~14 seconds while the Product Owner is still mid-login, defeating the entire point of this ticket. The implemented alternative -- a fixed 15-second reschedule that does not count toward `maxAttempts` -- is bounded correctly by an *existing* mechanism already in the codebase, not a new one: `dkclSessionPreflightService.js` already reports `LOGIN_TIMEOUT` exactly once and resets to `NOT_AUTHENTICATED` once the interactive-login wait window (`DKCL_INTERACTIVE_AUTH_WAIT_MS`, ~4 minutes) elapses, after which the *next* `preflight()` call returns a genuine `AUTHENTICATION_REQUIRED`, which this store already routes to `WAITING_AUTH` via the untouched `AUTHENTICATION` branch. So the job can never retry forever even though this branch never "exhausts" it on its own terms.
- **The cross-lane fairness test was drafted, found to test something not actually guaranteed, and dropped rather than shipped as a false guarantee.** An attempt to write "TCT stuck pending a login must never block HUE" (mirroring AB-AUTH-03's own test shape) exposed that `acquireNextJob()`'s job ordering (`business_date DESC, indicator_priority ASC, lane_priority ASC, ...`) is a pure priority tie-break with no fairness/round-robin behavior: a same-date job on a higher-priority lane that keeps returning to `RETRY_WAIT` (whether via `SESSION_PENDING_HUMAN_ACTION` or any other short-backoff `TRANSIENT` code) can keep winning every scheduling decision, starving a lower-priority lane's job indefinitely. This is **pre-existing scheduler behaviour, unrelated to and not introduced by this ticket** -- `AB-AUTH-03`'s guarantee is specifically about hard-blocked (`WAITING_AUTH`/`BLOCKED_INTEGRITY`) states, which are fully excluded from selection; it was never a guarantee about `RETRY_WAIT` priority fairness. Flagging this as a residual (Section 25.7) rather than silently asserting a guarantee that does not hold.

### 25.7 Residual

The priority-tie-break starvation risk identified in Section 25.6 (a same-date, higher-priority lane's `RETRY_WAIT` job can indefinitely starve a lower-priority lane's job) is a pre-existing scheduler characteristic, not new to this ticket, and is **not fixed here** -- flagged for the Product Owner/CTO to decide whether it warrants its own ticket (e.g. round-robin or last-attempted-first tie-breaking) or is acceptable given real registry priorities (`HUE` lane priority `10` beats `TCT`'s `20` for both `F1.3` and `F4.1` today, so `TCT` is the lane actually exposed to it in production, not `HUE`).

`AB-AUTH-08`/`AB-AUTH-09` remain deferred per explicit Product Owner instruction, not touched here.

State: implemented and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- this changes the wording and color the Product Owner sees on the Auto Backfill panel whenever a manual login is in progress, and changes real backend retry behaviour (a job blocked only by an in-progress login retries indefinitely on a 15-second cycle instead of terminally failing after 3 quick attempts). The Product Owner should confirm on a real manual login: the panel shows the new blue "Đang chờ bạn hoàn tất đăng nhập..." line instead of "Đang khởi tạo...", the amber "Cần đăng nhập thủ công" banner does **not** appear while the login window is open, and the job actually resumes and completes automatically once login succeeds without any explicit Resume click.

## 26. F4.1 `assertSummary()` Diagnostic Logging -- Not In Original Design, Added Per Product Owner Request (2026-08-24, Claude Code Opus 5)

### 26.1 Why

Real run `208e49c4` (F4.1/HUE, business date 23/08) failed with `F41_HUE_OUTER_SUMMARY_INVALID` in ~6.7 seconds -- too fast to be `EXPORT_TIMEOUT`, and unrelated to `AB-AUTH-04`. Investigation traced the failure to `assertSummary()`, which combines **six** OR-ed conditions (`unitCount`, `totalVolume`, `passedVolume`, `passedVolume`/`totalVolume` rate, `exportIdentity`) into a single throw with no logging beforehand, and the database only ever persisted the final error code plus a hash (`evidence_json: {"classification":"SYSTEM","signature":"F41_HUE_OUTER_SUMMARY_INVALID:5f2fc6e2a5765b9d"}`). It was impossible to determine after the fact which condition had actually failed, or with what real values -- the investigation report to the Product Owner had to say so explicitly. This delta closes that gap for both `F41HueSingleDateService` (6 conditions) and `F41TctSingleDateService` (`outerRowCount`, `exportIdentity` -- 2 conditions).

### 26.2 What Changed

`backend/src/services/f41HueSingleDateService.js` and `backend/src/services/f41TctSingleDateService.js`

- Both constructors gained `this.logger = options.logger || console`, matching the existing pattern in `dkclHueF13SyncService.js`.
- `assertSummary()` in both files now evaluates each condition individually into a `checks` object (`{ value, expected, ok }` per field -- HUE additionally tracks `normalized` for the rate check), computes `failedChecks` (the names of only the conditions that actually failed), and -- only when `failedChecks.length > 0` -- logs one line (`this.logger.warn(...)`, tagged `[F41_HUE_SUMMARY]` / `[F41_TCT_SUMMARY]`) containing every field's real observed value and expected value as JSON, **before** throwing. The thrown error's message now also names the failed conditions (e.g. `"...incomplete or inconsistent (failed: unitCount, exportIdentity)."`) and its `details` carries both the raw `summary` and the full `checks` object, alongside the existing error code (`F41_HUE_OUTER_SUMMARY_INVALID` / `F41_TCT_OUTER_SUMMARY_INVALID`, both unchanged).
- No behavioural change to when the error is thrown, its code, or downstream classification (`DEFAULT_ERROR_MAP` has no entry for either code, so both remain `SYSTEM`/terminal, matching the real `208e49c4` outcome and the Product Owner's own framing that this specific failure needed diagnosis, not automatic retry).
- Style deliberately not identical to F1.3's `[AUTO-IMPORT-013] diagnostics(...)` (which logs on every probe regardless of outcome) -- this logs only on the actual failure path, since that is the exact gap the Product Owner asked to close, not a general-purpose trace.

### 26.3 Regression Tests -- Verified To Fail Without The Fix

4 new tests in `backend/test_autoBackfillF41Executors.js` (10 -> 14): HUE and TCT each get one test asserting the failure-path log line exists, is tagged correctly, names only the conditions that actually failed (asserting the log/message do **not** mention conditions that held, e.g. `totalVolume`/`passedVolume` when only `unitCount`/`exportIdentity` were wrong), and carries the real observed value (`"value":7"`, `"value":40"`); and one test each asserting the success path throws and logs nothing.

Verified to fail without the fix (same method as every prior ticket this session): both service files were reverted to their pre-fix `git checkout` state -- the two failure-path tests failed exactly as expected, with the thrown message reading only the old generic `"F4.1 HUE outer summary is incomplete or inconsistent."` / `"...TCT..."`, containing neither field name. Restored from a scratch backup and re-verified.

### 26.4 Validation

- **Gate 5 `test_autoBackfillSafety.js`: 11/11 PASS**, suite not modified, not touched by this change (F4.1-only).
- `test_autoBackfillF41Executors.js`: 14/14 PASS.
- `oxlint` on all 3 changed files: 0 findings.
- No database touched, no login performed, no run created -- verified entirely via direct unit calls to `assertSummary()` with a fake logger.

### 26.5 Residual

This closes the diagnostic gap only; it does not determine which of the two hypotheses raised for run `208e49c4` (a genuine data anomaly on the portal that day vs. a scraping/timing mismatch) was actually true -- that requires observing the next real occurrence's log line. Not something this delta can retroactively answer for the 208e49c4 incident itself, since it already happened before this logging existed.

State: implemented and technically verified; **not self-passed**, though this delta has no PO-visible UI surface -- it is backend logging only, verifiable the next time a real `F41_..._OUTER_SUMMARY_INVALID` occurs by reading `backend.log`/`backend_err.log` for the new `[F41_HUE_SUMMARY]`/`[F41_TCT_SUMMARY]` line.

## 27. AB-AUTH-05 Coverage Gap -- F4.1 Executor Was Never Updated (2026-08-24, Claude Code Opus 5)

### 27.1 What Was Missed And How It Was Found

`AB-AUTH-05` (commit `d4193263`) implemented the PENDING-vs-BLOCKED classification only in `F13AutoBackfillExecutor.validateSession()` (`autoBackfillF13Executors.js`). `F41AutoBackfillExecutor.validateSession()` (`autoBackfillF41Executors.js`, a structurally near-identical but separate class for the F4.1 indicator) still had the original binary logic -- every non-`SESSION_VALID` preflight status, including `LOGIN_IN_PROGRESS`/`LOGIN_TIMEOUT`, was thrown as a hard `AUTHENTICATION_REQUIRED`. This was flagged by the Product Owner after observing the exact symptom AB-AUTH-05 was built to eliminate -- "Mở đăng nhập HUE" flashing uselessly and "Tiếp tục Run" reporting `A valid manual HUE session is required` right after a successful login -- but on the F4.1 screen specifically.

### 27.2 Fix -- Reuse, Not Reimplementation

`autoBackfillF13Executors.js` now exports `sessionPendingError` and `PENDING_PREFLIGHT_STATUSES` (previously module-private). `autoBackfillF41Executors.js` imports both and `F41AutoBackfillExecutor.validateSession()` now branches identically to `F13AutoBackfillExecutor.validateSession()`: `SESSION_VALID` returns normally; `LOGIN_IN_PROGRESS`/`LOGIN_TIMEOUT` throw `sessionPendingError()` (`SESSION_PENDING_HUMAN_ACTION`, `TRANSIENT`); every other status still throws the original `AUTHENTICATION_REQUIRED` via F41's own local `executorError()` helper, byte-for-byte unchanged. No new logic was written -- exactly the classification F13 already has, reused.

### 27.3 Investigation -- `getInteractiveClient()` Returning `null` Right After `validateSession()` Confirms `SESSION_VALID`

Read in full: `dkclSessionPreflightService.js`'s `getInteractiveClient()` (`return entry.client || null`), `getRegistryState()` (`return getOrCreateRegistryEntry(...)`), and the entire `preflight()` method (lines ~425-590).

**Root mechanism found, with strong code evidence:** `preflight()` can reach `SESSION_VALID` through two structurally different paths, only one of which populates `entry.client` (the field `getInteractiveClient()` reads):

1. **`probeAndMaybeExpireClient(sourceConfig, entry)`** -- taken when `entry.client` is already truthy. Reuses the existing client; `entry.client` genuinely reflects a live browser handle here. Consistent.
2. **The "fresh background probe" branch** -- taken only when `entry.client` is `null`. It constructs a **disposable** client via `this.portalClientFactory` (headless), calls `client.authenticate({ requireExistingSession: true })` to confirm the underlying DKCL cookie session is still valid, sets `entry.authenticated = true` via `transitionEntry(..., { authenticated: true, backgroundReady: false, profileDir })` -- **this patch never includes `client`**, so `entry.client` stays `null` -- and then the method's own `finally` block explicitly closes that disposable client (`if (client?.close) await client.close()`) regardless of outcome. The success response's own message literally says `"... Tác vụ nền có thể tiếp tục."` ("... background task can continue") -- this path was designed as a lightweight cookie-validity check, not as a way to obtain a usable interactive browser.

**Consequence:** whenever branch 2 fires, `validateSession()` legitimately returns `SESSION_VALID` while `getInteractiveClient()` correctly returns `null` -- there genuinely is no live Playwright handle to return. This is **not a bug in `getInteractiveClient()`/`getRegistryState()`**; both behave correctly and consistently with `entry.client`'s true state. The inconsistency is architectural: `preflight()`'s `SESSION_VALID` contract does not distinguish "the DKCL cookie is confirmed valid via a disposable check" from "there is a live, ready-to-use interactive browser" -- but `F13AutoBackfillExecutor`/`F41AutoBackfillExecutor`'s `execute()` flow assumes the former implies the latter.

**Most likely trigger for entering branch 2 right after a successful interactive login** (plausible, evidence-supported, but not confirmed against a live incident in this delta -- this investigation was code-reading only, no database/log evidence tied to one specific occurrence was reviewed): `probeAndMaybeExpireClient()`'s own destructive path (further up in the same method) expires and nulls `entry.client` whenever a bounded retry concludes `probe.hasLoginInput` is true -- if a transient/ambiguous page read (e.g. mid-navigation) is misread as "a real login form is present," a perfectly valid interactive session gets expired. The *next* `preflight()` call then finds `entry.client` null, takes branch 2, and reports `SESSION_VALID` (the DKCL cookie is genuinely still valid) forever after -- but `getInteractiveClient()` can never return a usable client again until the Product Owner manually re-opens login via "Mở đăng nhập", which re-establishes `entry.client` through `interactiveAuthenticate()`. This would explain both halves of the reported symptom: the queue job fails on the interactive-client check specifically (not on `validateSession()`, which keeps reporting healthy) with `AUTHENTICATION_REQUIRED: A valid manual [LANE] session is required`, routing to `WAITING_AUTH` and showing "Mở đăng nhập" again -- and clicking it resolves quickly (no real re-login needed, the cookie was never actually invalid), reading as "flashing uselessly."

**Not fixed here, per the explicit instruction to report rather than guess-fix when not certain.** A fix would require a product/architecture decision: should the executor's `execute()` path require the specific persistent interactive client (current behaviour), or should it be able to establish its own on-demand connection when the underlying session is confirmed valid but no interactive client currently exists? Either direction changes real safety/behavioural semantics AB-AUTH-05 and prior tickets rely on, and is out of scope for a same-day follow-up fix. Flagged as a residual (Section 27.6) for a CTO/PO decision on whether and how to close it.

### 27.4 Regression Tests -- Verified To Fail Without The Fix

6 new tests in `backend/test_autoBackfillF41Executors.js` (14 -> 20), mirroring the F13 pattern exactly: `validateSession` returns normally on `SESSION_VALID`; both `LOGIN_IN_PROGRESS` and `LOGIN_TIMEOUT` throw `SESSION_PENDING_HUMAN_ACTION`/`TRANSIENT` -- **the exact reproduction the Product Owner asked for**; `AUTHENTICATION_REQUIRED`, `SESSION_CHECK_FAILED`, and `undefined` all still throw the real `AUTHENTICATION_REQUIRED`.

Verified to fail without the fix (same method as every prior ticket this session): both `autoBackfillF13Executors.js` (the export) and `autoBackfillF41Executors.js` were reverted to their pre-fix `git checkout` state -- the two `LOGIN_IN_PROGRESS`/`LOGIN_TIMEOUT` tests failed exactly as expected (`error.code` was `AUTHENTICATION_REQUIRED`, not `SESSION_PENDING_HUMAN_ACTION`). Restored from a scratch backup and re-verified.

### 27.5 Validation

- **Gate 5 `test_autoBackfillSafety.js`: 11/11 PASS**, suite not modified.
- `test_autoBackfillF41Executors.js`: 20/20 PASS (10 -> 20 across this and the prior delta's logging tests). `test_autoBackfillF13Executors.js`: 19/19 PASS (export addition only, no logic change).
- 6 related backend suites PASS: `autoBackfillQueueService`, `autoBackfillQueueController`, `dkclHueF13SyncService`, `dkclSessionCoordinator`, `dkclHueBrowserBroker`, `browserProfileLock`, `tctF13BackfillService`, and `dkclSessionPreflightService` (run from the repository root).
- `oxlint` on all 3 changed files: 0 findings.
- No database touched, no login performed, no run created.

### 27.6 Residual

The `getInteractiveClient()`-returns-null-after-`SESSION_VALID` mechanism described in Section 27.3 is a real, evidence-supported architectural gap, not fixed here. It requires a Product Owner/CTO decision on direction (require the persistent interactive client vs. allow on-demand connection establishment) before any fix is attempted. Until resolved, a Product Owner who sees "Cần đăng nhập thủ công" reappear very shortly after a successful login (with clicking it resolving quickly, no real re-login needed) should suspect this mechanism specifically.

State: implemented and technically verified; **not self-passed**. `READY FOR PO UI CHECK` -- this is a direct fix to Product Owner-visible behaviour on the F4.1 screen. The Product Owner should confirm: while a manual F4.1 HUE/TCT login is in progress, the panel shows the PENDING treatment (no false "Cần đăng nhập thủ công") the same way F1.3 already does.
