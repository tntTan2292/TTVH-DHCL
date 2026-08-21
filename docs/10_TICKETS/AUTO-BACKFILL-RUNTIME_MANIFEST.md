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
