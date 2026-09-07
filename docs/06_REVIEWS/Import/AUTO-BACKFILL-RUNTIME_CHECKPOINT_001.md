# AUTO-BACKFILL-RUNTIME Checkpoint 001

Status: `CONFIRMED REAL RUN / SQLITE_BUSY INCIDENT CLOSED` (2026-09-07). Section 7's required one-date/one-source test has now been performed by the Product Owner and passed after a real defect was found and fixed. See Section 8.

## 1. Activation, Authority, And Baseline

- Ticket: `AUTO-BACKFILL-RUNTIME` (Ticket 7 / controlled real-run readiness in `AUTO-BACKFILL-PLAN_MANIFEST.md` Section 6).
- Baseline: `a135f799` on `codex/da-impl-006`.
- Authority: Product Owner confirmed agreement to begin real runs on 2026-08-20 and explicitly directed this Codex continuation to audit and complete governance activation. The prior closure does not self-activate Runtime; this direct authority does.
- Claude Code created the readiness manifest and completed the initial audit. Codex independently re-audited the live repository and operational state, created this checkpoint, and synchronized the governance pointer documents.
- Locked exclusion: no `POST /api/import/auto-backfill/runs`, Resume, reset, cancellation, Portal login/download, Import, data mutation, or business-logic change was performed.

## 2. Completion Ledger

| Work item | Claude Code status | Codex continuation status |
| --- | --- | --- |
| Runtime manifest and readiness analysis | Created, untracked | Re-read, independently verified, and completed Required Reading/authority fields |
| Four-lane registry state | Identified as all `AUTOMATED` | Re-evaluated from `listIndicatorConfigs()`; confirmed below |
| Safety / `5d425d72` impact | Analyzed | Rechecked by code diff and targeted regression validation |
| Operational queue / `WAITING_AUTH` state | Read-only findings recorded | Re-queried with SQLite `OPEN_READONLY`; confirmed below |
| Governance activation | Incomplete: no checkpoint and snapshot still `Current Ticket = None` | Completed: manifest, this checkpoint, snapshot, index, and progress synchronized |

## 3. Registry Verification (Actual Runtime Configuration)

| Indicator | Lane | `automationMode` | Verified adapter |
| --- | --- | --- | --- |
| F1.3 | HUE | `AUTOMATED` | `DKCL_F13_HUE_SINGLE_DATE_V1` |
| F1.3 | TCT | `AUTOMATED` | `DKCL_F13_TCT_SINGLE_DATE_V1` |
| F4.1 | HUE | `AUTOMATED` | `DKCL_F41_HUE_SINGLE_DATE_V1` |
| F4.1 | TCT | `AUTOMATED` | `DKCL_F41_TCT_SINGLE_DATE_V1` |

The registry's validation rejects an `AUTOMATED` lane lacking a verified adapter identity. All four production executors are registered for this runtime. A no-filter run would therefore target all four lanes; it is not a two-lane run.

## 4. Safety Verification

- `git diff --exit-code ef7cbe85 HEAD -- autoBackfillSafetyCoordinator.js autoBackfillQueueStore.js autoBackfillWorkerCoordinator.js` returned clean: accepted retry, circuit, lease, and `WAITING_AUTH` state-machine code is unchanged.
- Current lane contract on all four lanes: three attempts; bounded exponential delays 2s to 30s; retryable `PORTAL_TRANSIENT`/`LOCAL_SYSTEM` only; terminal `DATE_DATA`, `AUTH`, `PORTAL_SYSTEMIC`, `INTEGRITY_FATAL`; exact `adapter × source × resource` circuit scope; threshold five same-signature consecutive failures; integrity stops immediately; run/retry administration is admin-only.
- `resumeRun()` verifies `validateSession()` for each `WAITING_AUTH` job before persisting Resume. `acquireNextJob()` globally returns no job while any `RUNNING` run is `WAITING_AUTH` or `BLOCKED_INTEGRITY`.
- Commit `5d425d72` changed only the completion policy's `SUCCESS` gate (integrity-valid committed data no longer needs an artifact or SUCCESS import log). It did not modify Queue/Safety/Circuit code. Consequently post-execution provenance-only omissions no longer cause `INTEGRITY_FATAL`; short row counts, duplicates, and missing data still do. This is the accepted PO policy effect, reported only; no change was made.

## 5. Read-Only Operational State

SQLite was opened with `OPEN_READONLY` and no runtime service or queue action was called.

| Observation | Verified result |
| --- | --- |
| Queued jobs | 472: F1.3/HUE 4; F1.3/TCT 8; F4.1/HUE 230; F4.1/TCT 230 |
| Terminal jobs | 2 (`AUTHENTICATION_REQUIRED`): F1.3/HUE 1; F4.1/HUE 1 |
| Runs | 4 `RUNNING`; one is `WAITING_AUTH` |
| Global safety block | Run `9769766f-4416-45a3-9da9-014eb941d4cb`, with action: complete supported manual login, then Admin explicitly Resume |
| Open circuits | 0 |
| Coverage exceptions | 4 active, 1 revoked |
| First queued job if unblocked | F1.3 / HUE / 2026-08-19 |

This is safe at rest: the global block makes `acquireNextJob()` return `null`. It is not safe to treat Resume as a one-day test: Resume releases the backlog into automatic draining on the next wake/start.

## 6. Validation

- Registry runtime evaluation: all four lanes and adapters listed in Section 3.
- Read-only SQLite status query: Section 5.
- Static route review: `POST /api/import/auto-backfill/runs` is registered behind `adminOnly`.
- Safety-diff review from accepted Gate 5 baseline: Section 4.
- Isolated temporary-fixture regressions: `node test_autoBackfillSafety.js` `11/11` PASS; `node test_autoBackfillQueueService.js` `24/24` PASS; `node test_autoBackfillCoverageService.js` `14/14` PASS; `node test_autoBackfillCoverageExceptionService.js` `24/24` PASS; `node test_autoBackfillF13Executors.js` `7/7` PASS; `node test_autoBackfillF41Executors.js` `10/10` PASS.

## 7. PO Check And Required Next Action

`READY FOR PO CHECK`, not PO PASS and not Gate 7 acceptance.

1. Product Owner decides how to dispose of the existing 4 `RUNNING` runs and 472 queued jobs. Do not Resume the stale `WAITING_AUTH` run merely to test one date.
2. Once unblocked without releasing that backlog, Product Owner tests exactly **one date, one source** using the per-row **"Nhập lại"** button.
3. Verify normal completion and the `WAITING_AUTH`/valid-login/explicit-Resume path for that single-date run before authorizing any wider scope.
4. Only then may the Product Owner consider a one-month, one-lane expansion. No automatic or executor-awarded PASS is permitted.

Items 1-2 above were completed: the backlog was cleared (Section 15 of `AUTO-BACKFILL-RUNTIME_MANIFEST.md`, "Option A executed", 2026-08-21) and the Product Owner subsequently ran real one-day/one-source (and larger) tests. Section 8 records a defect this real usage surfaced and its closure.

## 8. F41-AUTOBF-SQLITE-BUSY-01 -- SQLITE_BUSY Terminal Failure Found And Fixed; PO Confirmation Run PASSED (2026-09-07, Claude Code Sonnet 5)

### 8.1 Incident

On 2026-09-07 the Product Owner submitted a burst of 11 F1.3/F4.1 Auto Backfill runs (one run per date/lane) in rapid succession via the existing UI. Per the accepted design, `auto_backfill_job` allows only one globally `RUNNING` job at a time (`uq_auto_backfill_one_running_job`, one DKCL browser session), so the coordinator drained the burst serially -- this by itself is expected behavior, not a defect, and produced no incorrect result. One job inside that burst, F4.1/HUE/2026-09-06 (run `d4d8acb7-7b48-4ebf-b8ef-09d9559ffc7a`, job `468a5679-e72c-41e0-8229-7326c23b3f63`), failed on its first attempt with `result_code=SQLITE_BUSY` (`error_signature SQLITE_BUSY:7da82a0826280542`), classified `SYSTEM` (non-retriable), terminalizing the job and completing its run as `COMPLETED_WITH_ERRORS` / `NO_REMAINING_ACTIVE_JOBS`.

### 8.2 Root Cause

Read-only investigation (event/attempt/lease trail, source review) found: `backend/src/config/db.js`'s shared connection -- used by `importPipeline.js` to commit the F4.1 executor's completion write into `fact_f41` -- had no `PRAGMA busy_timeout` set (sqlite3's own undocumented default is 1000ms). `backend/src/services/autoBackfillQueueStore.js` opens its own, separate connection to the same database file per call and already sets `busy_timeout=5000` around its `BEGIN IMMEDIATE` job/run writes. While that store's connection was writing the burst's new `auto_backfill_run`/`auto_backfill_job` rows (10 new runs created within a ~4-second window), the under-timed-out `config/db.js` connection tried to commit the F4.1/HUE/2026-09-06 completion write, hit the lock, and failed immediately instead of waiting it out. This is a single, well-localized technical defect -- not a session/lease/Portal/parser/duplicate-request defect. Full read-only evidence (query outputs) is in this session's transcript; not duplicated here.

### 8.3 Fix

`backend/src/config/db.js`: added `PRAGMA busy_timeout = 5000` to the connection's existing startup PRAGMA call, matching `autoBackfillQueueStore.js`'s own connection. No schema, business-logic, safety-policy, or completion-policy change. Added `backend/test_dbBusyTimeoutConfig.js`, reproducing the exact two-connection lock race against a real on-disk sandbox SQLite file (file-level locking does not occur with `:memory:`); confirmed it fails against the pre-fix default (`1000 !== 5000`, and a held lock beyond 1000ms throws) and passes with the fix. Re-ran `test_importProcessor.js` (59/59), `test_e2e_import_engine.js` (65/65), `test_importPipelineRace.js` (41/41), `test_dkclHueF13SyncService.js` (224/224), `test_autoBackfillQueueService.js` (36/36), `test_autoBackfillF41Executors.js` (32/32) -- zero regressions. Implementation commit: `8f0a9d62`.

The failed job (`468a5679`, F4.1/HUE/2026-09-06) was left untouched -- not Resumed, retried, or deleted -- per the "no batch/no data-mutation before root cause" instruction; the fix was validated by the PO's own single confirmation run (Section 8.4), not by touching that job directly.

### 8.4 PO Confirmation Run (Real Production Data)

Per this checkpoint's own Section 7 instruction ("Product Owner tests exactly one date, one source"), the Product Owner used the per-row **"Nhập lại"** button for exactly **F4.1 / HUE / 2026-09-06** after the fix landed. No other date, lane, or indicator was triggered. Read-only verification against the live operational database confirmed:

| Check | Result |
| --- | --- |
| New run | `d6589085-38e3-41cd-be38-06fc6876e82e` -- `requested_indicator=F4.1`, `requested_lane=HUE`, `as_of_business_date=2026-09-07`, `status=COMPLETED`, `status_reason=NO_REMAINING_ACTIVE_JOBS` |
| New job | `f48ab8f0-03f0-4caa-9c10-7523cce053ac` -- `business_date=2026-09-06`, `state=SUCCESS`, `terminal_reason=COMPLETION_CONFIRMED_AFTER_EXECUTION`, single attempt (attempt_number 1, no retry needed) |
| SQLITE_BUSY recurrence | None: 0 rows in `auto_backfill_event`/`auto_backfill_attempt` with a `SQLITE_BUSY` reason/signature since the fix landed |
| Completion evidence | `completion_evidence_json`: `target_table=fact_f41`, `row_count=2613`, `distinct_count=2613`, `processed_artifact_present=true`, `processed_artifact_filename=F4.1-2026.09.06.xlsx` |
| Data written | `fact_f41 WHERE ngay_do_kiem='2026-09-06'` = exactly `2613` rows (`2613` distinct `ma_bg`), matching the completion evidence exactly; sample rows carry real BCVH/mã bưu gửi content, not placeholders |
| Import log | `import_log.id=1331`, `file_name=F4.1-2026.09.06.xlsx`, `status=SUCCESS`, `total_records=2613`, `trigger_source=AUTO_BACKFILL_F41_HUE` |
| Original failed job | `468a5679` still `FAILED_TERMINAL` / `SQLITE_BUSY`, `updated_at` unchanged since the incident -- confirmed untouched |
| No batch | Exactly one new `auto_backfill_run` row created after the fix; no other run/job was triggered |

The `WAITING_AUTH`/explicit-Resume path named in Section 7 item 3 was not exercised by this run (the HUE session was already valid at the time of the click) and remains to be observed the next time a HUE session genuinely expires mid-queue; this does not block closing the SQLITE_BUSY incident, which is a separate, now-resolved defect.

### 8.5 Closure

`F41-AUTOBF-SQLITE-BUSY-01` is `CLOSED / PO-CONFIRMED`. Section 7's required "exactly one date, one source" real-run test is satisfied for F4.1/HUE. This does not itself constitute a formal PO Gate 7 runtime acceptance for the whole `AUTO-BACKFILL-RUNTIME` ticket (F1.3 lanes and the TCT lane were not separately re-confirmed by this incident, and no wider-scope expansion was requested or performed) -- that remains a separate, explicit Product Owner decision per Section 7 item 4.
