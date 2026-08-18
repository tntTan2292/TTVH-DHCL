# AUTO-BACKFILL-PLAN - Checkpoint 001

Planning and documentation only. No product code, schema, database, Import, watcher, Portal automation, frontend, or operational data was changed. No real Import was run.

## Table of Contents

- [1. Ticket State](#1-ticket-state)
- [2. Baseline And Scope](#2-baseline-and-scope)
- [3. Delta-Only Survey](#3-delta-only-survey)
- [4. Target Architecture](#4-target-architecture)
- [5. Indicator Registration Contract](#5-indicator-registration-contract)
- [6. Completion And Coverage Contract](#6-completion-and-coverage-contract)
- [7. Persistent Queue And API Contract](#7-persistent-queue-and-api-contract)
- [8. Failure, Retry And Circuit Contract](#8-failure-retry-and-circuit-contract)
- [9. Session And Manual-Only Contract](#9-session-and-manual-only-contract)
- [10. Isolation And Audit Contract](#10-isolation-and-audit-contract)
- [11. Ticket Plan](#11-ticket-plan)
- [12. Extensibility Acceptance Suite](#12-extensibility-acceptance-suite)
- [13. Risk Register](#13-risk-register)
- [14. Blockers And Product Owner Questions](#14-blockers-and-product-owner-questions)
- [15. Governance And Validation](#15-governance-and-validation)
- [16. Final State](#16-final-state)
- [17. Product Owner Decisions And Successor Activation](#17-product-owner-decisions-and-successor-activation)

## 1. Ticket State

- Ticket: `AUTO-BACKFILL-PLAN`
- State: `PLAN COMPLETE / AWAITING PO APPROVAL`
- Executor: `Codex`, explicitly authorized by the Product Owner for this ticket
- Activation date: `2026-08-18`
- Activation authority: `PO authorizes activation of AUTO-BACKFILL-PLAN`
- Candidate next ticket: `AUTO-BACKFILL-COVERAGE`, not activated

## 2. Baseline And Scope

- Workspace: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`
- Branch: `codex/da-impl-006`
- Expected and observed baseline: `f702cddb47286a006072d5aef8b84501ec051bad`
- Remote at activation: `origin/codex/da-impl-006` at the same commit
- Initial tracked worktree: clean
- Known untracked exclusions: `.claude/`, `Data QLML/`; neither path was opened, modified, staged, deleted, moved, restored, or stashed
- No other worktree change, including Antigravity UI work, was present

Allowed:

- Read-only code/document survey.
- Architecture and delivery planning.
- This checkpoint, its manifest, and the required Governance V2 synchronization.

Locked out:

- Frontend, backend, schema, database, Import, watcher, Portal automation, source data, and runtime execution.
- Real Import and live Portal probing.
- F4.1 Portal name/export/selector inference.
- Any successor ticket activation.

## 3. Delta-Only Survey

### 3.1 Current F1.3 Coverage And Backfill

**D-01 - Coverage is duplicated and F1.3-specific.** `dkclHueF13BackfillService.js` scans `fact_f13`; `tctF13BackfillService.js` scans `fact_f13_national`. Both enumerate a caller-supplied date range and classify local evidence, but neither consumes `importIndicatorRegistry.js`.

**D-02 - Queue identity is source/report-specific, not indicator-generic.** Routes, controllers, service names, IDs, evidence fields, and API paths are all fixed to `/hue/f13` or `/tct/f13`. `f13Adapters.js` exposes only `HueF13Adapter` and `TctF13Adapter`.

**D-03 - Execution is sequential but split into two in-memory queues.** Each service uses `new Map()` plus one `activeQueueId`. Dates run sequentially within a HUE queue or TCT queue, but the two services can be active independently; there is no single process-wide DKCL work scheduler preventing cross-source concurrent loading.

**D-04 - Pause does not exist; Stop is graceful and terminal.** The current API can request Stop, allowing the running date to finish and marking remaining dates `STOPPED`. There is no resumable `PAUSED` state.

**D-05 - Restart recovery does not exist for work.** Both queues are memory-only and explicitly report that an application/backend restart clears active queue state. Session coordinator recovery is not queue recovery.

**D-06 - Retry is manual and item-scoped.** A failed or authentication-required item may create a new one-item queue. There is no declared per-indicator retry policy, retry delay, scheduled next attempt, or persisted attempt history.

### 3.2 Current Completion Evidence

**D-07 - HUE F1.3 completion is composite.** A date is complete only when `fact_f13` has rows, `COUNT(DISTINCT ma_bg) = COUNT(*)`, at least one `import_log.status = SUCCESS`, and the standardized Processed/HUE workbook exists.

**D-08 - TCT F1.3 completion is composite and population-specific.** It requires exactly 34 rows and 34 distinct `ma_tinh_phat`, at least one SUCCESS log, and the Processed/TCT workbook. Partial/stale evidence becomes `INCOMPLETE`.

**D-09 - Existing scans can cross-match unrelated logs.** The legacy HUE and TCT completion queries filter by date/filename but do not consistently require exact `indicator` and `source_lane`. This was acceptable before multi-indicator Import but is unsafe as a generic completion rule.

**D-10 - Import pipeline duplicate protection is closer to the needed key but still lane-asymmetric.** HUE committed evidence filters indicator and joins facts through `import_log_id`; TCT checks exact indicator/lane/date SUCCESS but does not require target fact evidence in the duplicate query. A shared completion policy cannot be inferred from log status alone.

**D-11 - `FILE_MOVE_FAILED` can mean committed HUE facts.** `importPipeline.js` treats `SUCCESS` and `FILE_MOVE_FAILED` as committed HUE statuses when facts exist. The Product Owner rule says never reload `SUCCESS`; the disposition of committed data with missing processed-file evidence must be explicitly approved rather than guessed.

### 3.3 Current Multi-Indicator Import Foundation

**D-12 - F41-PHASE-2 provides the starting registry, not the final Auto Backfill contract.** `importIndicatorRegistry.js` registers F1.3/F4.1 filename patterns, date extractors, HUE/TCT parsers, and target tables. It has no display name, lifecycle status, tracking start date, completion policy, Portal adapter, permissions, retry policy, manual-only state, or circuit scope.

**D-13 - Import storage is already partially isolated.** `import_log` has `indicator`, `source_lane`, and `trigger_source`; F1.3/F4.1 facts are in separate tables. This supports exact completion keys but does not persist Auto Backfill runs/jobs/attempts/events.

**D-14 - F4.1 Import is manual-capable but Portal acquisition is unverified.** HUE and TCT parsers/tables exist and controlled manual Import succeeded under F41-PHASE-2. The F4.1 reference explicitly forbids deriving a Portal export match string from the official report name. Therefore both F4.1 lanes must register as `MANUAL_ONLY` for Auto Backfill until `AUTO-BACKFILL-F41` verifies real Portal behavior.

### 3.4 Session, Error And Audit Behavior

**D-15 - HUE/TCT use manual interactive sessions with source isolation.** All Import/backfill routes are admin-only. `DkclSessionPreflightService` keeps separate HUE/TCT registry entries, profile ownership, source locks, interactive login, preflight, recovery, and session-expiry states. AUTO-IMPORT-014 added per-source operation locking and active-operation protection.

**D-16 - Authentication is recognized but does not consistently stop all remaining work immediately.** HUE maps an item to `AUTHENTICATION_REQUIRED` but continues iterating the remaining in-memory items. TCT marks the item similarly unless the code also matches its systemic set. The new platform must make authentication loss a run-level immediate wait state.

**D-17 - Systemic error handling is inconsistent.** TCT has a fixed F1.3-specific `SYSTEMIC_PORTAL_ERROR_CODES` set and blocks after the first matching error. HUE has no equivalent circuit logic. Neither implements the proposed threshold of five consecutive same-signature system errors.

**D-18 - Import logging is not a complete Auto Backfill audit.** `import_log` records file/date/indicator/lane/trigger/status/counts. It does not record scanner decisions, queue state transitions, pause/resume, restart recovery, retry schedule, circuit changes, actor, or PO-facing run summaries.

## 4. Target Architecture

The platform is separated into contracts and shared engines:

1. `Indicator Registry` - declarations only; owns indicator/lane variation.
2. `Coverage Scanner` - expands each enabled registry lane over `trackingStartDate..N-1` and invokes its completion policy.
3. `Persistent Planner/Queue` - upserts one idempotent job per `indicator x lane x date` and stores run intent/progress.
4. `Single Worker` - leases and executes at most one DKCL job globally.
5. `Portal Adapter` - optional lane plugin; a null adapter means `MANUAL_ONLY`, never simulated automation.
6. `Safety Coordinator` - retry, error classification, session stop, circuit breaker, and global integrity stop.
7. `Audit/Reporter` - append-only events and deterministic PO summaries.

Core rule: shared engines may compare generic state values, but may not branch on indicator codes, target table names, `F1.3`, or `F4.1`. The first two indicators are registry data plus adapters.

## 5. Indicator Registration Contract

Every indicator must declare all required business and technical facts before it can be enabled:

| Field | Required contract |
| --- | --- |
| `code`, `name` | Stable identity and Product Owner-facing name |
| `status` | `ACTIVE`, `PLANNED`, `PAUSED`, or `RETIRED`; only approved states participate |
| `trackingStartDate` | ISO date; default proposal `2026-01-01`, with explicit per-indicator override |
| `lanes` | Explicit HUE/TCT support; no lane inferred from another indicator |
| `parser` | Verified parser function/adapter for the lane's source shape |
| `targetTable` | Approved fact table; used through a safe registry-owned query adapter, not raw user input |
| `filenameDateRule` | Parser and formatter for the business date in a filename |
| `completionPolicy` | Registry-owned evidence predicate returning `SUCCESS`, `MISSING`, `INCOMPLETE`, or `MANUAL_REVIEW_REQUIRED` plus evidence |
| `portalAdapter` | Verified adapter ID and report/export identity, or null |
| `automationMode` | `AUTOMATED`, `MANUAL_ONLY`, or `DISABLED` per lane |
| `permissions` | Roles allowed to view coverage, create/control runs, retry, and view audit |
| `retryPolicy` | Maximum attempts, backoff, retryable classifications, and terminal classifications |
| `circuitScope` | Scope key and system-error signatures used by Safety |

Registration validation must fail closed when any required declaration is missing or contradictory. In particular, `automationMode = AUTOMATED` requires a verified non-null Portal adapter; `MANUAL_ONLY` permits coverage scanning but forbids automated job execution.

Initial configuration proposal:

| Indicator | Lane | Import parser/table | Auto Backfill Portal mode |
| --- | --- | --- | --- |
| F1.3 | HUE | Existing parser / `fact_f13` | `AUTOMATED` after `AUTO-BACKFILL-F13` adapter acceptance |
| F1.3 | TCT | Existing national parser / `fact_f13_national` | `AUTOMATED` after `AUTO-BACKFILL-F13` adapter acceptance |
| F4.1 | HUE | Existing F41 parser / `fact_f41` | `MANUAL_ONLY` until Portal verification |
| F4.1 | TCT | Existing F41 TCT parser / `fact_f41_national` | `MANUAL_ONLY` until Portal verification |

## 6. Completion And Coverage Contract

### 6.1 Exact Success Key

Coverage and duplicate prevention use the exact key:

`indicator_code + source_lane + business_date`

An Import log, Processed artifact, or target fact from another key must never satisfy completion.

### 6.2 Completion Policy

Each lane policy must define:

- exact target fact query and expected integrity rule;
- exact matching Import statuses and metadata;
- whether Processed artifact presence is mandatory;
- expected row/distinct/reconciliation checks where applicable;
- treatment of stale, partial, committed-but-file-move-failed, and manual evidence;
- sanitized evidence returned to coverage and audit.

`SUCCESS` means the declared policy is fully satisfied. A SUCCESS key is immutable to automated backfill: it produces no runnable job, and every pre-execution/recovery check skips it again.

### 6.3 Scan Window

- Business window: indicator `trackingStartDate` through `N-1`, inclusive.
- Default start proposal: `2026-01-01`.
- `N` is computed once per scan in the approved business timezone; today's date is never included.
- Future indicators may override the start date; no historical period is inferred from first fact date.
- Scanner output groups by indicator and lane and reports counts/lists for `SUCCESS`, `MISSING`, `INCOMPLETE`, `MANUAL_REVIEW_REQUIRED`, and `MANUAL_ONLY_MISSING`.

### 6.4 Coverage API Proposal

`GET /api/import/auto-backfill/coverage?as_of=YYYY-MM-DD&indicator=...&lane=...`

Response per lane includes registry identity/status, tracking start, effective `to_date`, automation mode, counts, date items, completion evidence summary, and `queue_eligible`. `MANUAL_ONLY_MISSING` remains visible with `queue_eligible=false` and reason `PORTAL_ADAPTER_NOT_REGISTERED`.

## 7. Persistent Queue And API Contract

### 7.1 Proposed Persistence

| Store | Purpose |
| --- | --- |
| `auto_backfill_run` | Requested scope, actor, as-of date, intent, current state, pause/wait/block reason, totals and timestamps |
| `auto_backfill_job` | One durable `indicator x lane x date` job, idempotency key, state, priority/order, attempts, next attempt and completion evidence |
| `auto_backfill_attempt` | Immutable attempt start/end, adapter, result classification, sanitized error signature, Import log link and evidence |
| `auto_backfill_event` | Append-only state transitions for run/job/session/circuit/audit reporting |
| `auto_backfill_circuit` | Persisted circuit scope, signature, consecutive count, state, opened/reset timestamps and evidence |

No table is created by this plan. Exact migration design belongs to `AUTO-BACKFILL-QUEUE` and `AUTO-BACKFILL-SAFETY`.

### 7.2 State Model

Run states: `PLANNED`, `RUNNING`, `PAUSING`, `PAUSED`, `WAITING_AUTH`, `CIRCUIT_OPEN`, `BLOCKED_INTEGRITY`, `COMPLETED`, `CANCELLED`.

Job states: `QUEUED`, `RUNNING`, `RETRY_WAIT`, `SUCCESS`, `FAILED_ISOLATED`, `FAILED_TERMINAL`, `WAITING_AUTH`, `SKIPPED_ALREADY_SUCCESS`, `MANUAL_ONLY`, `CANCELLED`.

### 7.3 Execution Rules

- One global worker lease; at most one DKCL job is `RUNNING`, regardless of indicator or lane.
- Deterministic provisional order: oldest business date first, then registry priority, then lane priority. PO approval is requested in Q-06.
- Before download and again before Import commit, re-run the completion policy. A newly-successful key becomes `SKIPPED_ALREADY_SUCCESS`.
- A day-level failure is committed only to its job/attempt and cannot rollback or overwrite another indicator/lane/date.
- Pause is graceful: finish the current atomic date, then stop leasing work. Resume continues persisted `QUEUED`/`RETRY_WAIT` jobs.
- Cancel never interrupts a committed Import transaction; it prevents new leases and marks only unstarted jobs cancelled.

### 7.4 Restart Recovery

At startup, the worker acquires/repairs the lease and inspects nonterminal runs:

1. Reclassify an orphaned `RUNNING` job as `RECOVERY_CHECK` internally.
2. Execute its completion policy before any Portal action.
3. If complete, mark `SUCCESS` with recovery evidence; never download again.
4. If incomplete and retryable, return to `QUEUED` without losing attempt history.
5. If a required manual session is invalid, set the run to `WAITING_AUTH`.
6. Preserve explicit `PAUSED` intent across restart.

Proposed behavior for a previously `RUNNING` run is automatic continuation when session preflight is valid; Q-07 asks the PO to confirm.

### 7.5 API Proposal

- `POST /api/import/auto-backfill/runs` - create an idempotent run from a coverage snapshot/filter.
- `GET /api/import/auto-backfill/runs/:runId` - progress and job summary.
- `POST /api/import/auto-backfill/runs/:runId/pause` - graceful pause.
- `POST /api/import/auto-backfill/runs/:runId/resume` - explicit resume.
- `POST /api/import/auto-backfill/runs/:runId/cancel` - cancel unstarted work.
- `POST /api/import/auto-backfill/jobs/:jobId/retry` - retry an eligible isolated/terminal job under its policy.
- `GET /api/import/auto-backfill/runs/:runId/events` - sanitized audit timeline.
- `GET /api/import/auto-backfill/runs/:runId/report` - PO-facing reconciliation summary.

All mutating APIs are admin-only by default until registry permissions are approved. Existing `/dkcl/session/*` APIs remain the source-session authority; the platform must not invent a second login store.

## 8. Failure, Retry And Circuit Contract

### 8.1 Error Taxonomy

| Class | Examples | Required behavior |
| --- | --- | --- |
| `DATE_DATA` | no data, malformed workbook, parser/row reconciliation for one date | Isolate job; retry only if lane policy allows; continue other dates after exhaustion |
| `AUTH` | `AUTHENTICATION_REQUIRED`, confirmed session expiry/logout | Stop leasing immediately; run `WAITING_AUTH`; ask PO/admin to log in; no circuit count |
| `PORTAL_TRANSIENT` | timeout/network/export generation transient | Retry with policy/backoff; count normalized signature in adapter/source circuit |
| `PORTAL_SYSTEMIC` | report layout/selector/filter/export contract broken across dates | Retry only as approved; open circuit at threshold; preserve remaining jobs |
| `LOCAL_SYSTEM` | temporary filesystem/SQLite busy | Retry with bounded backoff; circuit scope depends on affected resource |
| `INTEGRITY_FATAL` | database corruption, schema mismatch, transaction verification failure | Immediate global stop `BLOCKED_INTEGRITY`; no fifth attempt required |

### 8.2 Retry

- Policy is declared per indicator/lane; core has no F1.3/F4.1 constants.
- Every attempt is persisted before adapter execution.
- A retry always rechecks completion first.
- Backoff must be bounded and restart-safe through `next_attempt_at`.
- Proposed default requiring PO approval: three total attempts for retryable transient errors; no automatic retry for parser/integrity failures.

### 8.3 Circuit Breaker

- Proposed threshold: five consecutive failures with the same normalized system signature in the same circuit scope.
- Different signatures start a new sequence; a successful operation in that scope resets the consecutive count.
- Date-data errors and authentication do not increment a system circuit.
- Opening a circuit persists the evidence, stops new leases in the affected scope, and produces a PO alert/report.
- `INTEGRITY_FATAL` bypasses the threshold and stops globally.
- Circuit reset requires an authorized resume/reset action and a fresh preflight; it is not cleared by restart.

## 9. Session And Manual-Only Contract

- Reuse the existing manual HUE/TCT interactive login, separate profiles, source locks, and coordinator state.
- Never store or auto-enter credentials as part of Auto Backfill.
- Worker checks the required source session before leasing and immediately before adapter execution.
- Authentication loss stops the run immediately at `WAITING_AUTH`; no later job starts until an authorized resume after successful preflight.
- HUE and TCT session state remain independent; no session/client is shared across sources.
- `MANUAL_ONLY` lanes participate fully in coverage and reports but create no executable Portal job. They may link to manual Import evidence later; UI must not display them as automated.
- F4.1 HUE/TCT remain `MANUAL_ONLY` until the real Portal report, filters, export trigger/readiness, generated-file identity, filename mapping, and completion handoff are observed and tested.

## 10. Isolation And Audit Contract

Isolation dimensions are mandatory on every job, attempt, completion query, Import link, event, and report:

- indicator;
- source lane;
- business date;
- run/job/attempt identity;
- target table/completion policy identity;
- Portal adapter/circuit scope.

One job owns one atomic Import transaction. Shared-engine errors cannot delete or force-reimport facts for another key. No bulk rollback crosses job boundaries.

Audit events include registry snapshot/version, scan start/end, completion decision, job creation/skip, attempt start/end, Import log ID, pause/resume/cancel, auth wait/recovery, restart recovery, circuit increment/open/reset, and final run reconciliation. Payloads must exclude credentials, cookies, tokens, raw page content, shipment-level data, and sensitive filenames beyond approved operational evidence.

The PO report must show, by indicator and lane: requested window, SUCCESS already present, newly successful, manual-only missing, isolated failures, retries, skipped-after-recheck, auth/circuit stops, remaining work, and exact error codes/signatures suitable for action.

## 11. Ticket Plan

### 11.1 AUTO-BACKFILL-COVERAGE

Scope:

- Extend the current Import registry into the validated registration contract without changing parser behavior.
- Build an injected, indicator-neutral coverage scanner over `trackingStartDate..N-1`.
- Implement exact completion-policy adapters for F1.3/F4.1 HUE/TCT.
- Mark F4.1 lanes manual-only until Portal verification.

Dependencies: this plan PO-approved; indicator start dates/timezone/completion disposition approved; F41-PHASE-2 remains the parser/table baseline.

Data/API contract: no queue execution; coverage read model and `GET /auto-backfill/coverage`; registry validation and safe table-query adapters.

Tests: registry validation; N-1 boundary; per-indicator start override; exact indicator/lane/date isolation; F1.3/F4.1 completion fixtures; manual-only visibility; synthetic indicator tests AB-EXT-01..04.

Risks: legacy Import logs with null lane; unsafe dynamic table names; treating Processed files or logs alone as success; accidental F4.1 automation.

PO Gate 1: approve coverage output for F1.3/F4.1, start dates, manual-only labels, and proof that the synthetic indicator appeared with zero shared-engine edit.

### 11.2 AUTO-BACKFILL-QUEUE

Scope:

- Add durable run/job/attempt state and one global worker lease.
- Implement idempotent planning, sequential execution shell, graceful pause/resume/cancel, and restart recovery.
- Use a fake adapter only for automated validation; do not run a real Portal Import.

Dependencies: Gate 1 pass; persistence/state/API contract approved.

Data/API contract: proposed run/job/attempt tables; run control/status APIs in Section 7; unique active idempotency key.

Tests: one global running job; deterministic order; duplicate plan idempotency; pause/resume; restart with orphaned RUNNING job; completion recheck; crash between Import success and job update; no cross-key mutation.

Risks: duplicate execution after crash; multiple backend instances leasing one job; dead lease; pause during atomic Import; old in-memory UI assumptions.

PO Gate 2: approve persisted progress and a restart simulation proving no SUCCESS date is downloaded/imported again.

### 11.3 AUTO-BACKFILL-F13

Scope:

- Wrap the accepted F1.3 HUE/TCT one-date workflows as Portal adapters implementing one common interface.
- Preserve manual session/profile behavior and current F1.3 completion rules after approved corrections.
- Remove F1.3 branching from shared orchestration, not from F1.3-specific adapters/parsers.

Dependencies: Gate 2 pass; AUTO-IMPORT-014 session locking remains authoritative; no live run until AUTO-BACKFILL-RUNTIME.

Data/API contract: adapter identity, preflight, `runOneDate`, normalized result/error, Import log link, completion evidence. No new F1.3 business rule.

Tests: HUE/TCT adapter contract; manual session required; source-lock isolation; date filter/filename identity; success/failed/auth mapping; no regression of existing F1.3 backfill/import suites.

Risks: changing closed F1.3 behavior; concurrent HUE/TCT access; current HUE and TCT completion asymmetry; legacy refresh/Re-Update paths that permit overwrite.

PO Gate 3: technical adapter contract pass and explicit confirmation that Auto Backfill never uses the operator's force-refresh path for SUCCESS dates.

### 11.4 AUTO-BACKFILL-F41

Scope:

- Discovery first: observe actual F4.1 HUE and TCT Portal report navigation, filters, result readiness, export action, generated-file identity, filename/date behavior, and session handling.
- Implement adapters only for lanes whose full identity is verified.
- Keep any unverified lane `MANUAL_ONLY` with coverage intact.

Dependencies: Gate 2 pass; F4.1 parsers/tables from F41-PHASE-2; explicit PO authorization for controlled Portal discovery; valid manual HUE/TCT sessions.

Data/API contract: same adapter interface as F1.3, with F4.1-specific verified identities inside the adapter configuration only. No derived name from `F4.1_Chất lượng phát thành công của bưu cục`.

Tests: captured/mocked Portal contract, wrong-report rejection, filename/date mapping, HUE/TCT parser handoff, manual-only fallback, no F1.3 regression. Real execution remains Runtime ticket only.

Risks: official report name differs from export identity; HUE/TCT source shapes differ; a lane may not support daily export; unverified automation could download the wrong report.

PO Gate 4: approve each lane separately as `AUTOMATED` or `MANUAL_ONLY`. Missing verification is a legitimate blocker, not a reason to infer.

### 11.5 AUTO-BACKFILL-SAFETY

Scope:

- Implement normalized error taxonomy, per-lane retry policy, persistent backoff, session stop, circuit breaker, integrity stop, alert events, and PO report.
- Migrate any adapter-local systemic classifications into declared adapter error maps while keeping core generic.

Dependencies: Gate 2; adapter error contracts from Tickets 3/4. It may proceed with F4.1 manual-only lanes.

Data/API contract: circuit/event persistence; retry/reset actions; sanitized report in Sections 8 and 10.

Tests: day isolation; auth immediate stop; five same-signature failures open circuit; mixed signatures do not; success resets; restart retains circuit; fatal integrity stops immediately; retry never reruns SUCCESS; audit completeness/redaction.

Risks: misclassification either causes excessive retries or premature stop; circuit scope too broad harms other lanes; audit leaks sensitive material.

PO Gate 5: approve retry defaults, threshold/scope, alert/report wording, and controlled failure-injection results.

### 11.6 AUTO-BACKFILL-UI

Scope:

- Antigravity implements the operator surface only after API/state contracts freeze: coverage by indicator/lane, manual-only labels, run controls, progress, isolated failures, auth/circuit alerts, and audit/report view.
- UI Remediation remains deferred until explicit PO activation.

Dependencies: Gates 1-5; Product Owner resumes UI work; backend APIs stable.

Data/API contract: consumes only approved APIs; no business/completion logic in frontend.

Tests: component/API contract, permissions, responsive and Windows runtime checks, non-overlap, long labels, manual-only clarity, pause/resume/restart state rendering.

Risks: UI implies automation for manual-only lanes; stale polling races sessions; large historical date lists; accidental force-reimport control.

PO Gate 6: Product Owner visible/runtime acceptance. Antigravity provides technical visual evidence but does not self-award PO PASS.

### 11.7 AUTO-BACKFILL-RUNTIME

Scope:

- Execute a separately authorized, observed, bounded real run with backups/monitoring and stop criteria.
- Reconcile coverage, queue, Import logs, target facts, Processed artifacts, audit, restart recovery, auth stop, and final PO report.

Dependencies: all applicable gates approved; real Portal adapters approved; explicit dates/lanes authorized; valid sessions; rollback/recovery runbook accepted.

Data/API contract: no new feature contract; validates the frozen contracts end to end.

Tests: dry-run coverage first; small allowlisted date set; one known SUCCESS skip; one missing date per approved automated lane; controlled pause/restart; controlled auth-expiry scenario only if PO authorizes; post-run reconciliation and source/data integrity checks.

Risks: operational Portal or DKCL changes, large historical load, session expiry, wrong report, irreversible data impact. Stop immediately on contract mismatch.

PO Gate 7: PO reviews the real run report and grants runtime acceptance. Ticket ends without activating any unrelated phase.

## 12. Extensibility Acceptance Suite

The following suite is mandatory. `AUTO-BACKFILL-COVERAGE` must implement AB-EXT-01..04 first; later tickets extend the suite.

| ID | Acceptance test | Required proof |
| --- | --- | --- |
| AB-EXT-01 | Register synthetic indicator `F9.TEST` only in a test registry fixture | No edit to shared scanner/queue/circuit source; registry validation passes |
| AB-EXT-02 | Give `F9.TEST/HUE` a test target table, filename-date rule, completion policy, start date, and `MANUAL_ONLY` mode | Coverage automatically contains `F9.TEST/HUE` |
| AB-EXT-03 | Seed one SUCCESS date and leave two dates missing | Scanner returns exact one SUCCESS plus two `MANUAL_ONLY_MISSING`; no runnable Portal jobs |
| AB-EXT-04 | Change only the fixture start date | Coverage window changes without an engine edit |
| AB-ISO-01 | Same date SUCCESS for F1.3/HUE only | F1.3/TCT, F4.1/HUE, and F4.1/TCT remain independently evaluated |
| AB-ISO-02 | Same indicator/date SUCCESS in HUE only | TCT cannot reuse the HUE log/facts/artifact |
| AB-ISO-03 | Fail one date parser/import transaction | Next eligible date runs; no facts/logs for other keys are changed |
| AB-SUC-01 | Job is queued, then external/manual Import makes it SUCCESS before lease | Worker marks `SKIPPED_ALREADY_SUCCESS`; adapter is never called |
| AB-SUC-02 | Backend crashes after Import commit but before job SUCCESS update | Startup completion recheck marks SUCCESS; no second download/import |
| AB-QUE-01 | Queue multiple indicators/lanes/dates | Exactly one job RUNNING globally and deterministic order observed |
| AB-QUE-02 | Pause while one date is RUNNING | Current date finishes atomically; no next lease; resume continues persisted work |
| AB-QUE-03 | Restart with RUNNING and PAUSED runs | RUNNING recovers by recheck; PAUSED remains paused |
| AB-RET-01 | Retryable day failure | Policy attempts/backoff persist across restart; success stops retries |
| AB-RET-02 | Terminal data failure | Job isolates; later jobs continue; audit preserves evidence |
| AB-AUTH-01 | Adapter returns `AUTHENTICATION_REQUIRED` | Run immediately becomes WAITING_AUTH; no later job starts |
| AB-CB-01 | Five consecutive same-signature system failures | Circuit opens exactly at five and persists across restart |
| AB-CB-02 | Four matching failures, success, then another failure | Counter resets; circuit remains closed |
| AB-CB-03 | Alternating system signatures | No false five-in-a-row opening |
| AB-FATAL-01 | Transaction verification/schema integrity error | Immediate global `BLOCKED_INTEGRITY`, independent of threshold |
| AB-AUD-01 | Complete run with success, skip, failure, retry, pause and resume | PO report reconciles every job and event; no secret/raw-page/shipment leakage |
| AB-PERM-01 | Viewer/admin exercise registry-declared permissions | Mutating actions are denied unless explicitly allowed |

Acceptance definition for extensibility: adding `F9.TEST` requires a new registration and its adapter/policy test fixture only. Any required edit to a shared-engine `switch`, route branch, table-name list, or circuit condition is a FAIL.

## 13. Risk Register

| ID | Risk | Mitigation / gate |
| --- | --- | --- |
| R-01 | Legacy completion queries cross-match indicator/lane evidence | Exact-key completion adapters and negative isolation tests at Gate 1 |
| R-02 | Registry target table becomes unsafe dynamic SQL | Registry allowlist/query adapter; never accept table from request input |
| R-03 | Current watcher `ignoreInitial:false` imports staged files when scope changes | Auto Backfill tickets do not extend watcher roots implicitly; controlled activation/runtime gate |
| R-04 | Queue crash duplicates a committed date | Persist attempts and mandatory completion recheck before every execution/recovery |
| R-05 | Two worker processes run concurrently | Database-backed lease/fencing and one RUNNING invariant |
| R-06 | F1.3 refresh path overwrites a SUCCESS date | Auto Backfill never sets force refresh for SUCCESS; adapter contract and regression test |
| R-07 | Circuit scoped globally for a lane-specific defect | Registry/adapter circuit scope plus affected-scope report; fatal integrity is the only immediate global stop |
| R-08 | Auth error is retried as a transient system error | AUTH is a separate non-circuit class and immediate wait state |
| R-09 | F4.1 official name is mistaken for export identity | Manual-only until controlled Portal discovery and lane-specific PO approval |
| R-10 | F4.1's Planned/TODO effective state generates false history | PO must approve tracking start/status before Gate 1 |
| R-11 | Audit captures credentials or business-sensitive row data | Structured allowlisted event schema and redaction tests |
| R-12 | UI polling recreates session race | API/state polling must not probe/close the live Portal client; reuse session coordinator locks |
| R-13 | Large `2026-01-01..N-1` backlog overloads Portal/DKCL | Sequential worker, bounded run creation/batching, pause, circuit, explicit Runtime allowlist |
| R-14 | Manual-only is misunderstood as automated support | Distinct status and zero executable jobs; explicit UI/report acceptance |

## 14. Blockers And Product Owner Questions

| ID | Decision needed | Blocking scope | Proposed default |
| --- | --- | --- | --- |
| Q-01 | Confirm tracking start for F1.3 and F4.1 | Gate 1 production coverage | `2026-01-01` for both unless PO sets F4.1 later |
| Q-02 | Confirm business timezone used to compute N-1 | Gate 1 | `Asia/Ho_Chi_Minh` |
| Q-03 | Define SUCCESS disposition for committed facts with `FILE_MOVE_FAILED` or missing Processed artifact | Gate 1/F13 adapter | Never redownload automatically; classify `MANUAL_REVIEW_REQUIRED` until evidence is repaired |
| Q-04 | Approve default retry policy | Gate 5 | Three total attempts for retryable transient errors; bounded exponential backoff; none for parser/integrity |
| Q-05 | Approve circuit rule and scopes | Gate 5 | Five consecutive same-signature errors per adapter/source/resource; success resets; fatal integrity stops immediately |
| Q-06 | Approve global queue ordering | Gate 2 | Oldest date, then registry priority, then lane priority |
| Q-07 | After backend restart, auto-continue a previously RUNNING run when session is valid, or require operator Resume? | Gate 2 | Auto-continue; preserve explicit PAUSED state |
| Q-08 | Approve permissions per indicator/lane | Gate 1/UI | Coverage/audit read per declared roles; all run control admin-only initially |
| Q-09 | Approve audit retention and report audience | Gate 5 | Append-only indefinite retention until a separate retention policy is approved |
| Q-10 | Provide/authorize real F4.1 HUE/TCT Portal discovery: report navigation, filters, export identity and generated filename behavior | Hard blocker only for automated `AUTO-BACKFILL-F41` lane(s) | Keep both lanes `MANUAL_ONLY`; do not infer |

None of Q-01..Q-10 blocks completion of this planning ticket. Q-01..Q-03/Q-08 block production coverage activation; Q-06/Q-07 block final queue contract; Q-04/Q-05/Q-09 block Safety acceptance; Q-10 blocks only F4.1 Portal automation. A lane may remain manual-only without blocking the shared platform.

## 15. Governance And Validation

Governance sync for this activation:

- New manifest: `docs/10_TICKETS/AUTO-BACKFILL-PLAN_MANIFEST.md`
- New checkpoint: `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md`
- Live state: `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- Append-only ticket history: `PROJECT_PROGRESS.md`
- Document registration: `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`

Validation performed:

- Baseline/branch/HEAD/worktree check before edits: PASS.
- Authority/onboarding chain: PASS.
- Delta-only static code and governed-history survey: PASS.
- Documentation scope review: PASS; exactly the manifest, checkpoint, snapshot, append-only progress entry, and document-index registration are in scope.
- No runtime/build/lint/database/Import command was run because this ticket changes documentation only.

## 16. Final State

`PLAN COMPLETE / AWAITING PO APPROVAL`

No successor ticket is activated. No real Import is authorized by this checkpoint.

## 17. Product Owner Decisions And Successor Activation

On `2026-08-18`, the Product Owner approved the plan, decided Q-01..Q-10, and separately authorized `AUTO-BACKFILL-COVERAGE` only from baseline `f376391adfe9546c6c257f8f7bb1230e21d1ef8e`.

The approved decisions are authoritative over Section 14's proposed defaults. In particular, Q-06 is newest-date-first, not oldest-date-first. F4.1 remains manual-only; no Portal identity may be inferred. Queue/restart/retry/circuit/audit decisions are locked contracts for their later tickets but were not implemented by Coverage.

Successor result: `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`. Evidence: `docs/06_REVIEWS/Import/AUTO-BACKFILL-COVERAGE_CHECKPOINT_001.md`. No later ticket is activated.
