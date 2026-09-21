# IMPORT-BULK-REIMPORT-ALL-01 Checkpoint 001 — DISCOVERY / READ-ONLY AUDIT

Status: `DISCOVERY / READ-ONLY AUDIT COMPLETE`. No design, implementation, or business rule is authorized by this document. `IMPORT-BULK-REIMPORT-ALL-01` remains `DISCOVERED / NOT ACTIVATED` for design/implementation per `docs/10_TICKETS/IMPORT-BULK-REIMPORT-ALL-01_MANIFEST.md` Section 5.

## 1. Scope And Authority

Product Owner instruction received in chat (2026-09-21) explicitly authorized starting the audit step named in the ticket's own Section 5 ("Await explicit Product Owner/CTO activation for DISCOVERY / READ-ONLY AUDIT"). This is not activation of implementation. Executor: Claude Code / Sonnet 5.

- Commit examined: `dfcefb850f2869b4dfec6285bb58fe772f7bfcc4` (branch `codex/da-impl-006`, current HEAD at audit time).
- No file was modified. No Browser/Playwright/web automation was used. No import, enqueue, Resume, Retry, cancel, or reimport was executed. No database write occurred (read-only source inspection only; no live-DB query was run against the operational SQLite file in this pass — all findings are from static code tracing).

### Files read (frontend)
- `frontend/src/components/AutoBackfillOperatorPanel.jsx` (the audited screen; not `DataImportCenter.jsx`)
- `frontend/src/components/autoBackfillUiHelpers.js`

### Files read (backend)
- `backend/src/services/autoBackfillCoverageService.js`
- `backend/src/services/autoBackfillQueueService.js`
- `backend/src/services/autoBackfillQueueStore.js`
- `backend/src/services/autoBackfillHolidayCalendarService.js` (referenced, not fully read)
- `backend/src/services/autoBackfillCoverageExceptionService.js` (referenced, not fully read)
- `backend/src/services/autoBackfillCompletionPolicies.js` (referenced via `COMPLETION_STATUSES`)
- `backend/src/services/autoBackfillF13Executors.js`
- `backend/src/services/autoBackfillF41Executors.js` (referenced)
- `backend/src/services/dkclHueF13SyncService.js` (partially)
- `backend/src/services/tctF13BackfillService.js` (referenced)
- `backend/src/services/f13Adapters.js` (referenced)
- `backend/src/services/importPipeline.js` (referenced — `executeImport`, `getCommittedEvidence`)
- `backend/src/services/autoBackfillSafetyCoordinator.js` (referenced, enumeration only)
- `backend/src/controllers/autoBackfillQueueController.js`
- `backend/src/routes/importRoutes.js`

### Governance docs read
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/03_PLANNING/TTVH-DHCL-UPGRADE-ROADMAP-01.md`
- `docs/10_TICKETS/IMPORT-BULK-REIMPORT-ALL-01_MANIFEST.md`
- `docs/10_TICKETS/AUTO-BACKFILL-SAFETY_MANIFEST.md`
- `docs/10_TICKETS/AUTO-BACKFILL-UI-REMEDIATION_MANIFEST.md`

## 2. Current Selection Flow ("Chọn tất cả chưa hoàn tất")

The status model is 4 canonical PO-facing statuses, identical on both sides: `COMPLETED | INCOMPLETE | EXCLUDED | DATA_ERROR` (`PO_STATUSES`, `frontend/src/components/autoBackfillUiHelpers.js:13`; `backend/src/services/autoBackfillCoverageService.js:30`). A day's status is derived server-side, live, per `(indicator, source_lane, business_date)` tuple in `toPoStatus()` (`autoBackfillCoverageService.js:59-71`) from a per-lane completion policy that inspects actually-committed data (`COMPLETION_STATUSES.SUCCESS/MISSING/...`).

**"LỊCH NGHỈ" is not a status value.** A holiday day is folded into PO status `EXCLUDED` by `resolveHoliday()`/`toPoStatus()` (`autoBackfillCoverageService.js:83-126`), and is only ever consulted when the raw completion is `MISSING` and no PO exception is active — real committed SUCCESS data always outranks a holiday marking. The specific reason is still emitted as a separate `item.holiday` object so the UI can show a distinct chip.

The button's actual work is done entirely server-side: `handleSelectAllUnfinished()` (`AutoBackfillOperatorPanel.jsx:247-292`) calls `GET /import/auto-backfill/coverage/selectable` (backed by `AutoBackfillCoverageService.selectable()`, `autoBackfillCoverageService.js:351-399`), scoped by the clicked accordion's `indicator` + `month` plus the panel-wide `laneFilter`. That endpoint's `scan()` already excludes holiday and PO-exception days and returns only `counts_as_unprocessed` (`INCOMPLETE` + `DATA_ERROR`) items as selectable, with `excluded_holiday`, `excluded_exception`, and `excluded_complete` returned separately purely for the operator-facing toast. **Holiday exclusion is enforced upstream of the button, not as a client-side filter layered on top of it** — a holiday day never appears in the candidate list the button seeds from. There is a second, independent guard at the per-row checkbox level: `isSelectable(item)` (`autoBackfillUiHelpers.js:40-43`) returns `true` only for `INCOMPLETE`/`DATA_ERROR`, and every manual bulk-selection path (`toggleSelectBulkItem`, `toggleSelectAllItems`, `AutoBackfillOperatorPanel.jsx:295-324`) is gated by it. This means **`COMPLETED` and `EXCLUDED` (including holiday) days are today structurally impossible to place into the shared bulk-selection set (`selectedBulkKeys`) through any existing UI path** — not merely excluded by the named "Chọn tất cả chưa hoàn tất" button, but excluded from bulk selection altogether.

Select-all scope covers all pages of the indicator+month+lane it targets (fetched fresh from the server), not just the currently rendered page; the panel's `statusFilter`/`indicatorFilter`/`monthFilter`/pagination state does not narrow it. A separate, purely client-side "select all on this page" exists for the table view (`toggleSelectAllItems`, page-scoped) and is unrelated to the named button.

## 3. Current Queue / Dedup / Reimport Flow

**There is no batch enqueue endpoint.** Every enqueue action — bulk create, single-row reimport, and bulk reimport — calls the same `POST /import/auto-backfill/runs` with a single `{indicator, lane, from_date, to_date, include_excluded?}` tuple. "Bulk reimport" (`handleExecuteBulkReimport`, `AutoBackfillOperatorPanel.jsx:807-856`) is a **client-side loop that fires one POST per selected date** (`from_date === to_date === that date`), each becoming its own DB transaction; there is no `include_excluded` sent from the bulk path at all. Partial-failure reporting is entirely client-side (`successCount`/`failCount`/per-item error list, shown in the confirmation modal after execution).

The backend never trusts the frontend's selection: `createRun()` (`backend/src/services/autoBackfillQueueService.js:100-192`) independently re-scans live coverage and intersects it with the requested date range (`eligible = coverage.items.filter(inRange).filter(item => item.queue_eligible || isReadmissibleExcluded(item))`); if nothing is eligible it throws `409 AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE` for that single call.

**Dedup / active-identity handling** (`AutoBackfillQueueStore.createRunWithJobs`, `backend/src/services/autoBackfillQueueStore.js:147-249`), one SQLite transaction:
1. Request-key dedup: a SHA-256 of the registry version, as-of date, and the exact `(indicator, lane, date)` tuple set. An identical request while a matching run is `RUNNING/PAUSING/PAUSED` is a no-op returning the existing run.
2. Per-tuple active-conflict check: `SELECT run_id FROM auto_backfill_job WHERE indicator=? AND source_lane=? AND business_date=? AND state IN ('QUEUED','RUNNING','RECOVERY_CHECK')`. A date already active elsewhere is dropped from the new job list (counted, not duplicated); if every requested date conflicts, no new run is created.
3. A date whose live status is already `COMPLETED` never reaches this dedup check — it is filtered out one layer earlier, in `queueDisposition()`, as `queue_eligible:false, reason:'ALREADY_SUCCESS'`.

**Reimport of a genuinely completed date is blocked at three independent layers, not one:**
1. Coverage/eligibility: `queueDisposition()` returns `ALREADY_SUCCESS` (`autoBackfillCoverageService.js:73-76`) — never queue-eligible.
2. `createRun`'s `include_excluded` opt-in only re-admits PO status `EXCLUDED` (holiday/exception), never `COMPLETED` (`isReadmissibleExcluded`, `autoBackfillQueueService.js:118-127`) — a solo `COMPLETED` date's reimport request throws `409` regardless of what flag is sent.
3. Even if a job were somehow created and dispatched for an already-complete date, `processNext()` (`autoBackfillQueueService.js:361-368`) rechecks completion immediately before calling any executor and short-circuits to `SKIPPED_ALREADY_SUCCESS` — the executor, and therefore the actual data-write path, is never invoked. Independently, every current Auto-Backfill executor hard-codes `refreshRequested/forceReimport: false` when calling the underlying import services (`autoBackfillF13Executors.js:115-119` → `f13Adapters.js` → `dkclHueF13SyncService.js:153-164`; `autoBackfillF41Executors.js:62` → `f41HueSingleDateService.js`/`f41TctSingleDateService.js`; `tctF13BackfillService.js:815,825`), so those services also refuse to overwrite committed data (`importPipeline.js`'s `executeImport()` returns `requiresConfirmation` without writing when `getCommittedEvidence()` finds existing SUCCESS evidence and `forceReimport` is not set).

**Net finding: no code path in the current system can overwrite an already-successfully-imported date.** No `force`/override flag for a `COMPLETED` status exists anywhere in the Auto-Backfill stack today. Delivering the ticket's business objective (bulk reimport including completed days) requires a new, explicit contract at all three layers above, not a frontend-only change.

**UI/backend mismatch found (existing behavior, not introduced by this audit):** the per-row "Nhập lại" (Reimport) button renders unconditionally for every row regardless of status (`AutoBackfillOperatorPanel.jsx:1598-1608`, `2560-2570` — not gated by `isSelectable`/`isActionable`, unlike the neighboring "LỊCH NGHỈ" and "Xác nhận Không phát sinh" buttons). An operator can already open the single-row reimport modal on a `COMPLETED` row today; the request is rejected by the backend with `409 AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE`, surfaced as an inline error, not a crash or silent data change. This is pre-existing, out of this ticket's authored scope, and is only recorded here because the audit surfaced it directly while tracing the reimport path.

Transaction/idempotency: each `createRunWithJobs` call is one transaction inserting the run, its jobs, and `RUN_CREATED`/`JOB_CREATED` events atomically. `request_key` dedup only prevents double-enqueue while a matching run is still in flight (`RUNNING/PAUSING/PAUSED`); it does not prevent re-submitting the identical request later once that run has ended. All run/job/attempt state transitions are appended to `auto_backfill_event`, readable via the panel's events drawer.

## 4. Confirmation UI — Current State

A confirmation dialog exists for every enqueue path reachable from this panel:
- Single-row reimport modal (`AutoBackfillOperatorPanel.jsx:1834-1881`): shows business key, current status, static explanatory text. No warning that a `COMPLETED` date will be rejected or that data would/would not be overwritten.
- Bulk reimport modal (`AutoBackfillOperatorPanel.jsx:1765-1831`): shows the selected count and the full list of `date / indicator — lane`, and after execution a success/fail report. Because bulk selection today can never contain a `COMPLETED`/`EXCLUDED` day (Section 2), this modal has never needed to warn about replacing successful data — it currently cannot happen through this path.
- No confirmation modal exists for the plain "create a run for indicator+month" button (`handleCreateRun`, fires on click).

**Gap for the new "Chọn tất cả" objective:** none of the existing confirmation UI distinguishes "already-successful days included in this batch" from "still-incomplete days" in its count or list. Building the ticket's required warning (Section 4 of the manifest) needs new data the panel does not currently compute or display: a breakdown of the selected set by current status, specifically calling out how many selected days are `COMPLETED` and will be replaced.

## 5. LỊCH NGHỈ (Holiday) Policy — Confirmed Evidence

- Holiday is a first-class calendar record (`backend/src/services/autoBackfillHolidayCalendarService.js`), admin-managed via `POST /import/auto-backfill/holiday-calendar` (mark) and `POST .../holiday-calendar/:id/revoke`, both admin-gated.
- A holiday day is only consulted when raw completion is `MISSING` and no PO exception is active (`resolveHoliday()`); it then forces PO status `EXCLUDED` and `queue_eligible:false, reason:'HOLIDAY'` (`queueDisposition()`).
- Real committed SUCCESS data always outranks a holiday marking — a day marked holiday that genuinely has data is never hidden or misreported as incomplete.
- Holiday exclusion is enforced server-side, in the same `scan()`/`selectable()` pipeline that "Chọn tất cả chưa hoàn tất" already consumes, and independently re-enforced by the frontend's `isSelectable()` gate on every manual selection action.
- No code path found anywhere in the traced selection/queue/reimport logic that could let a holiday-marked date be selected, enqueued, or reimported without first being explicitly revoked as a holiday, or handled through the narrow single-tuple `include_excluded` opt-in (which still requires `queueEligible`-adjacent conditions — active indicator, automated lane, and raw completion `MISSING` — none of which apply once a day has real committed data).

## 6. Gaps / Risks / Blockers

1. **No reimport-of-completed-data code path exists at all** (Section 3) — a "Chọn tất cả" that includes completed days cannot actually trigger a real reimport today even if the frontend selection were widened; the backend eligibility gate, the `include_excluded` contract, and the executor-level `forceReimport:false` hard-coding would all need deliberate, explicit changes. This is the central blocker for the ticket's stated objective.
2. **Selection state is shared between bulk reimport and bulk PO-exemption** (`selectedBulkKeys`, `AutoBackfillOperatorPanel.jsx:159`). If "Chọn tất cả" widens what can go into this same set to include `COMPLETED`/`EXCLUDED` days, the existing "Cập nhật dữ liệu - Loại bỏ phát sinh" (bulk exception) button would also become clickable against those same selected completed/excluded days unless a design decision separates the two selection modes or re-guards the exemption action independently. Not yet a bug — a design question to resolve before implementation.
3. **No idempotency safeguard against replaying a full "Chọn tất cả" reimport twice** beyond the existing in-flight `request_key`/active-job dedup (Section 3) — replaying the exact same completed-day batch after the first batch's jobs finish would not be blocked by anything found in this audit; whatever the eventual "reimport a completed day" contract turns out to be must define its own protection against duplicate re-execution, since the current one is scoped to in-flight jobs only.
4. **`importPipeline.js` internals (`importProcessor.js`'s actual row-level write: replace/upsert/append) were not traced to full depth in this pass.** The `executeImport()`/`getCommittedEvidence()` gate that blocks reimport was confirmed, but exactly what happens to `fact_f13`/`fact_f41` rows if `forceReimport` were ever set true (delete-then-insert vs. duplicate-append vs. versioned) is not yet evidenced and must be established before any design proceeds — this is a correctness-critical unknown, not a minor detail.
5. **Existing UI/backend mismatch** (Section 3): the per-row Reimport button is clickable on `COMPLETED` rows today and always fails server-side with a 409. Low risk (no data effect), but worth the Product Owner's awareness since it is adjacent to this ticket's exact concern.
6. **No live-database read-only verification was performed in this pass** — all findings are static code evidence. If the Product Owner wants runtime confirmation (e.g., an actual `COMPLETED` day's raw fact-table state), that is a follow-up, still read-only, action.

## 7. Discovery-Level Contract Observations (Not A Design Decision)

For the Product Owner's consideration only — none of the following is authorized or chosen by this audit:

- A "Chọn tất cả" that can include completed days most plausibly needs its own selection state (not reusing `selectedBulkKeys` as-is) or an explicit mode flag, so the existing bulk-exemption action is not accidentally exposed to completed-day selections.
- A confirmation step for this action needs, at minimum, a live count broken down by current status (e.g. "X ngày chưa hoàn tất, Y ngày ĐÃ HOÀN TẤT sẽ bị thay thế") computed from the same `scan()`/`selectable()`-style data already available server-side.
- Enabling an actual overwrite of `COMPLETED` data requires a new, explicit backend contract point (a distinct flag/endpoint, not reuse of `include_excluded`) at both the coverage-eligibility layer and the executor `forceReimport` layer, plus a decision on `importPipeline.js`'s actual overwrite behavior (Gap 4) before the contract can be written correctly.
- Holiday exclusion is already correctly enforced upstream of every selection path found; a new "Chọn tất cả" only needs to reuse the existing `scan()`/`selectable()` holiday/exception filtering, not reinvent it.

## 8. Confirmations

- No frontend/backend code, test, schema, or migration was changed.
- No selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write was performed.
- No Browser, Playwright, or web automation was used.
- This document and the linked manifest update are the only files changed by this audit.

---

## 9. Full Pipeline Trace — Closing Gap 4 (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat explicitly requested completing the audit: a full trace `AutoBackfillOperatorPanel.jsx → API → autoBackfillQueueService/Store → executor/adapter → import service/importProcessor → database transaction → import log/evidence`, closing this checkpoint's Gap 4 (`importProcessor.js` row-level overwrite behavior not previously traced). Still read-only: no code/schema/data changed, no Browser/Playwright, no import/enqueue/Resume/Retry/cancel/reimport executed. Commit re-confirmed unchanged: `dfcefb850f2869b4dfec6285bb58fe772f7bfcc4` (`codex/da-impl-006`).

### 9.1 Files read (new in this pass)

- `backend/src/services/importPipeline.js` (`executeImport`, `getCommittedEvidence`, `getHueCommittedEvidence`) — full read
- `backend/src/services/importProcessor.js` (`importParsedData`, `importNationalParsedData`, `importF41ParsedData`, `importF41NationalParsedData`) — full read
- `backend/src/services/f13Adapters.js` — full read
- `backend/src/controllers/importController.js` (`upload`) — partial read
- `backend/src/routes/importRoutes.js` — partial read (route table)
- `backend/src/services/importWatcher.js` — partial read
- `backend/src/services/autoBackfillQueueStore.js` (`acquireNextJob`, `claimInterruptedJobForRecovery`, `resolveRecovery`) — partial read
- `backend/src/services/autoBackfillQueueService.js` (`recoverInterruptedWork`) — partial read

### 9.2 Full flow, per outcome

**A. MISSING / INCOMPLETE (the only outcome that ever actually re-executes a Portal import today)**

`AutoBackfillOperatorPanel.jsx` (select-all or per-row) → `POST /import/auto-backfill/runs` (`autoBackfillQueueController.createRun`, `backend/src/controllers/autoBackfillQueueController.js:33-57`) → `AutoBackfillQueueService.createRun()` (`backend/src/services/autoBackfillQueueService.js:100-192`) re-scans live coverage, keeps only `queue_eligible` items (raw completion `MISSING`, no holiday, no exception, `queueDisposition()` returns `{queueEligible:true}` per `backend/src/services/autoBackfillCoverageService.js:98-101`) → `AutoBackfillQueueStore.createRunWithJobs()` (`autoBackfillQueueStore.js:147-249`) inserts `run`+`job` rows in one transaction, after the request-key and active-identity dedup checks (Checkpoint Section 3) → a worker's `processNext()` loop calls `acquireNextJob()` (`autoBackfillQueueStore.js:360-437`, global `GLOBAL_DKCL` lease + `state='RUNNING'` single-job guard) → `processNext()` (`autoBackfillQueueService.js:354-410`) re-evaluates completion; since it is genuinely `MISSING`, it proceeds to call the verified executor (`autoBackfillF13Executors.js:76-140` for F1.3, `autoBackfillF41Executors.js` for F4.1) → the executor always passes `refreshRequested:false`/`forceReimport:false` down into the adapter (`autoBackfillF13Executors.js:117`; `f13Adapters.js:36-44` `HueF13Adapter` → `syncService.start(..., {forceReimport: refreshRequested})`; `f13Adapters.js:54-64` `TctF13Adapter` → `runOneDateImport(..., {refreshRequested: context.refreshRequested})`, itself always `false` from the executor) → the underlying single-date import service (`dkclHueF13SyncService.js` for F1.3/HUE, `tctF13BackfillService.js` for F1.3/TCT, `f41HueSingleDateService.js`/`f41TctSingleDateService.js` for F4.1) downloads/parses the Portal file and calls `executeImport()` (`importPipeline.js:154-289`) with `forceReimport:false` → because no committed evidence yet exists for that date (`getCommittedEvidence()`, `importPipeline.js:90-112`, returns `null`), Step 2's `if (!forceReimport)` guard (`importPipeline.js:183-212`) is skipped and the parser output flows straight into `importParsedData()`/`importF41ParsedData()`/etc. (`importProcessor.js`) → **`BEGIN TRANSACTION`** (`importProcessor.js:190`, mirrored at lines 315, 396, 440 for the other 3 variants) → since `forceReimport` is `false`, the `DELETE FROM fact_f13/fact_f41/... WHERE ngay_do_kiem=?` branch (`importProcessor.js:196-198`, 319-321, 400, 444) is skipped entirely → a new `import_log` row is inserted (`insertImportLog()`, `importProcessor.js:55-63`) → rows are batch-`INSERT OR IGNORE`'d into the fact table (`importProcessor.js:212-239` for F1.3/HUE; equivalent blocks for the other 3 variants), relying on a `UNIQUE` constraint to silently drop any row that happens to collide → `import_log` is updated to `SUCCESS` and **`COMMIT`** (`importProcessor.js:260-268`) → control returns up the call chain to `processNext()`, which re-evaluates completion (`autoBackfillQueueService.js:396-402`) and, finding `SUCCESS`, records the job as `SUCCESS` (`autoBackfillQueueStore.js` `completeLeasedJob`, referenced at `autoBackfillQueueService.js:405-409`) and appends the corresponding event.

**B. COMPLETED, reimport attempted (the outcome this ticket's objective targets)**

Confirmed unreachable at the data-write layer through any code path found. Section 3 of this checkpoint already established the eligibility-layer and `include_excluded`-layer blocks; this pass additionally confirms the **data-write layer itself would still refuse even if those two were bypassed**: every Auto-Backfill executor (F1.3 HUE/TCT, F4.1 HUE/TCT) hard-codes `refreshRequested:false`/`forceReimport:false` in its call into the adapter/single-date service (citations above), which in turn always calls `executeImport({..., forceReimport:false})` — so `importPipeline.js`'s `if (!forceReimport)` existing-evidence check (`importPipeline.js:183-212`) is always active for the Auto-Backfill path, and a `COMPLETED` date's file is moved back to `Incoming` unimported (`moveFile(indicatorConfig.incomingDir)`, `importPipeline.js:201`) with `{requiresConfirmation:true, ...}` returned instead of writing anything. **`forceReimport:true` is never produced anywhere in the Auto-Backfill / `AutoBackfillOperatorPanel.jsx` code path** — grep-confirmed across `backend/src/services/*.js` (Section 9.3). The only place in the whole backend where a caller can set `forceReimport:true` from outside is `ImportController.upload()` (`backend/src/controllers/importController.js:104-111`: `forceReimport: req.query.force === 'true'`), reached via `POST /import/upload` (`backend/src/routes/importRoutes.js:16`, `admin`-only) — this is the **manual file-upload path** (`source:'MANUAL'`), structurally and permanently separate from `AutoBackfillOperatorPanel.jsx`, which never calls `/import/upload` (grep-confirmed, Section 9.3) and only ever calls `/import/auto-backfill/*` and `/import/dkcl/session/*`.

**If `forceReimport` were ever `true`** (today only reachable through the unrelated manual-upload path, never through Auto-Backfill): `importProcessor.js`'s Step 1 (`importParsedData`, line 196-198; equivalently lines 319-321, 400, 444 for the other 3 fact tables) executes `DELETE FROM fact_f13 WHERE ngay_do_kiem = ?` — an unconditional **delete of every row for that calendar date in the whole fact table**, inside the same transaction as the subsequent insert. This is delete-then-insert (replace), not an upsert/merge and not a versioned/soft-delete scheme, matching the SSOT comment quoted verbatim in the source (`importProcessor.js:152-153`: *"forceReimport = true → Xóa toàn bộ dữ liệu ngày đó → Import mới → Ghi log lịch sử."*). **Important scope nuance for any future design:** the `DELETE` is filtered by `ngay_do_kiem` only — it is not filtered by `source_lane` or `import_log_id`. `fact_f13`/`fact_f41` do not carry a `source_lane` column directly (lane is recorded only on the owning `import_log` row); if a business date ever has committed data from more than one lane (e.g. both HUE and TCT contributed rows for the same date), a `forceReimport` triggered by re-importing just one lane's file would delete **all** of that date's fact rows table-wide, not only the rows the triggering lane originally wrote. This is evidenced directly in code, not inferred as a business rule, and is a correctness-relevant fact the Product Owner should weigh before authorizing any "replace a completed day" contract.

**C. EXCLUDED, holiday (LỊCH NGHỈ)**

No new evidence beyond Checkpoint Section 5 was needed — a holiday day never reaches `createRun`'s eligible set (`queueDisposition()` returns `{queueEligible:false, reason:'HOLIDAY'}`, `autoBackfillCoverageService.js:83-88`) and is not covered by `include_excluded`'s `isReadmissibleExcluded()` unless the underlying raw completion is still `MISSING` and every other automation condition holds (`autoBackfillQueueService.js:118-127`) — i.e. `include_excluded` on a holiday day only ever re-admits it into the normal MISSING-import flow (Section 9.2.A above), it never triggers a `forceReimport`/delete-overwrite of existing data, because a day that is holiday-excluded by definition has no committed data to begin with (`resolveHoliday()` only fires when completion is `MISSING`, `autoBackfillCoverageService.js:122-126`).

### 9.3 Confirmatory greps (forceReimport/refreshRequested propagation)

`grep -rn "forceReimport\|refreshRequested" backend/src` was run to enumerate every write and read site; results confirm:
- Every Auto-Backfill executor call site sets the flag to the literal `false`: `autoBackfillF13Executors.js:117`, `autoBackfillF41Executors.js:62`, `f41HueAdapter.js:12`, `f41TctAdapter.js:12`, `f41HueSingleDateService.js:116`, `f41TctSingleDateService.js:129`.
- The only externally-controllable `true` value in the whole backend is `importController.js:107` (`req.query.force === 'true'`), on the manual-upload route only.
- `tctF13BackfillService.js:815,825` and `dkclHueF13BackfillService.js:234-235` compute their own `refreshRequested`/`forceReimport` from a `normalizedRefreshDates` list — this is a **separate, older manual "monthly backfill" queue mechanism** (not `AutoBackfillOperatorPanel.jsx`'s Auto-Backfill V2 platform; no `auto_backfill_run`/`auto_backfill_job` rows, no coverage scan, no circuit breaker); it was not traced further as out of this ticket's scope, but is recorded here so it is not mistaken for the audited panel's flow.
- `importWatcher.js:26` unconditionally calls `executeImport({..., forceReimport:true, source:'AUTO'})` — this is a **third, independent mechanism**: a filesystem `chokidar` watcher (`backend/src/services/importWatcher.js`) that auto-processes files dropped directly into the `Incoming/` directories outside any UI action. It has no queue/run/job model, is not reachable from `AutoBackfillOperatorPanel.jsx` or `DataImportCenter.jsx`, and is out of this ticket's scope; flagged only to avoid conflating it with the audited panel's reimport behavior.
- `grep -n "api\.(get|post)(" frontend/src/components/AutoBackfillOperatorPanel.jsx` confirms every call in the file targets `/import/auto-backfill/*` or `/import/dkcl/session/*` — never `/import/upload`.

### 9.4 Transaction boundary and idempotency — confirmed

- Each `importParsedData`/`importNationalParsedData`/`importF41ParsedData`/`importF41NationalParsedData` call is exactly one `BEGIN TRANSACTION` … `COMMIT` (or `ROLLBACK` on any thrown error), covering: the optional forced `DELETE`, the `import_log` insert, the batched `INSERT OR IGNORE` loop, the F1.3/HUE-only post-insert row-count verification (`verifyHueImportTransaction()`, `importProcessor.js:121-135`, throws `IMPORT_COMMIT_VERIFICATION_FAILED` on mismatch), and the `import_log` `SUCCESS` update. Rollback is explicitly scoped to database/system errors only (`importProcessor.js:280-290`, comment: *"rollback is only triggered by DB errors, never by duplicate rows"*); a separate, non-transactional `FAILED` `import_log` row is always written afterward regardless (`importProcessor.js:292-304`), outside the rolled-back transaction, so failure evidence survives the rollback.
- Idempotency without `forceReimport`: guaranteed by the `INSERT OR IGNORE` + `UNIQUE` constraint pattern — re-running the identical file a second time (still `forceReimport:false`) is a safe no-op at the row level (every row collides and is ignored), though it still writes a new `import_log` row each time (audit trail is not deduplicated, only the fact rows are).
- Idempotency with `forceReimport:true` (manual-upload path only, never reached by Auto-Backfill): each call deletes then fully re-inserts the date's data, so replaying the identical file twice converges to the same end state, but is not itself guarded against being triggered twice concurrently beyond ordinary SQLite transaction isolation — no additional lock/dedup was found specific to the manual-upload `forceReimport` path (out of this ticket's scope to design against, since `AutoBackfillOperatorPanel.jsx` cannot reach it).
- Import log / evidence: every outcome (`SUCCESS`, `FAILED`, and `importPipeline.js`'s own `FILE_MOVE_FAILED` recoverable state, `importPipeline.js:114-131`) is recorded in `import_log`, readable via `getCommittedEvidence()`/`getHueCommittedEvidence()` (`importPipeline.js:86-112`) — the same read used both to decide `requiresConfirmation` in the manual path and to compute the `COMPLETED` PO status Auto-Backfill's coverage scan reports.

### 9.5 Active-job dedup and concurrent execution — confirmed

Restates and extends Checkpoint Section 3 with the concurrency mechanics: `acquireNextJob()` (`autoBackfillQueueStore.js:360-437`) enforces a single global `GLOBAL_DKCL` worker lease row plus a `state='RUNNING'` single-job guard (line 362-364) before it will lease any job — i.e. **at most one Auto-Backfill job executes system-wide at any moment**, regardless of how many runs/dates were enqueued. A per-lane block list (`BLOCKED_LANES_SUBQUERY`, referenced at line 378) additionally excludes jobs on a lane currently `WAITING_AUTH`/`BLOCKED_INTEGRITY` from being picked, without freezing other lanes (AB-AUTH-03, comment at lines 366-370). This is layered on top of, not a replacement for, the per-tuple active-identity dedup at enqueue time (Checkpoint Section 3.2c).

### 9.6 Safety, Resume, Retry, cancellation, recovery — confirmed

- **Retry**: bounded, persisted, classification-driven (`autoBackfillSafetyCoordinator.js`, enumerated in Checkpoint Section 5; not re-traced to full depth in this pass, consistent with the original audit's instruction to enumerate rather than evaluate sufficiency).
- **Resume**: `AutoBackfillQueueService.resumeRun()` (`autoBackfillQueueService.js:259-284`, per prior audit) re-validates every `WAITING_AUTH` job's session via `executor.validateSession()` before actually resuming; admin-gated (`assertAdmin()`, line 21-25).
- **Recovery** (crash/restart): `processNext()` always calls `recoverInterruptedWork()` first (`autoBackfillQueueService.js:354-355`), which repeatedly claims any job left in an interrupted state via `AutoBackfillQueueStore.claimInterruptedJobForRecovery()` (`autoBackfillQueueStore.js:932`), re-evaluates real completion (`evaluateCompletion()`), and resolves it via `resolveRecovery()` (`autoBackfillQueueStore.js:970`) to either a confirmed-complete terminal state or back to `QUEUED` for a normal retry — the executor is never blindly re-invoked on recovery; completion is always re-checked against real data first, consistent with pattern A above.
- **Cancellation**: confirmed **no run/job cancellation endpoint exists anywhere in the current codebase** — `grep -n "cancel\|Cancel" backend/src/services/autoBackfillQueueService.js` returns no matches, and the only `cancel`-named route in `backend/src/routes/importRoutes.js` is `POST /dkcl/session/cancel-login` (line 42, cancels a pending manual DKCL login attempt only, unrelated to job/run cancellation). This matches and reconfirms, at the current commit, the same finding already on record in `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`'s `AUTO-BACKFILL-RUNTIME` backlog-investigation entry (`2026-08-20`: *"No cancel endpoint exists anywhere."*) — still true today.

### 9.7 Gap 4 — Resolution

Checkpoint Section 6, Gap 4 (`importProcessor.js` row-level overwrite behavior not traced) is now **closed with evidence**: `forceReimport:true` performs an unconditional `DELETE FROM <fact_table> WHERE ngay_do_kiem=?` followed by re-insert, inside one transaction (Section 9.2.B, 9.4 above) — not upsert, not versioned. This is currently unreachable from `AutoBackfillOperatorPanel.jsx` under any traced code path; it is only reachable from the manual `DataImportCenter.jsx`-style upload flow (`POST /import/upload`). The new, scope-relevant fact this closure surfaces (Section 9.2.B) — that the delete is table-wide-by-date, not lane-scoped — is recorded as a new Gap 7 in Section 10 below (append-only: Section 6's original gap list is left unedited).

## 10. Additional Gap (2026-09-21)

7. **A `forceReimport` delete is scoped by `ngay_do_kiem` only, not by `source_lane`.** If a future "reimport a completed day" contract for `AutoBackfillOperatorPanel.jsx` reuses the existing `forceReimport` mechanism as-is, reimporting one lane's data for a date that also has committed data from a different lane would delete that other lane's rows too. Any design must either explicitly account for this (e.g. lane-scoped delete) or confirm with the Product Owner that today's date-wide-only granularity is acceptable.

## 11. Confirmations (this pass)

- No frontend/backend code, test, schema, or migration was changed.
- No selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write was performed.
- No Browser, Playwright, or web automation was used.
- No new business rule was inferred or decided; Section 9.2.B's delete-scope observation is a direct code-evidence fact, not a proposed rule.
- Files changed by this pass: this checkpoint (Sections 9-11 appended) and `docs/10_TICKETS/IMPORT-BULK-REIMPORT-ALL-01_MANIFEST.md` (Section 7 appended).

---

## 12. Gap 7 Correction — Design of Record v2 Remediation (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat: an independent pre-implementation review (Claude Opus) found the Design of Record's realization of Gap 7 (§10 above) was itself defective, and instructed a design-only remediation. Tracing this required re-reading `backend/src/db/schema.sql` and `backend/src/services/importIndicatorRegistry.js`, not read in the original passes above. Still read-only: no code/schema/database changed, no Browser/Playwright, no import/enqueue/reimport executed.

**Gap 7's premise (§10, "a `forceReimport` delete... reimporting one lane's data for a date that also has committed data from a different lane would delete that other lane's rows too") is corrected, not retracted (append-only — §10 is left as originally written):** it assumed HUE and TCT could write to the same fact table for the same indicator. They cannot. `importIndicatorRegistry.js:140-155` (F1.3) and `:187-202` (F4.1) register each lane against its own dedicated `targetTable` — F1.3/HUE→`fact_f13`, F1.3/TCT→`fact_f13_national`, F4.1/HUE→`fact_f41`, F4.1/TCT→`fact_f41_national` — and `importPipeline.js:216-236` branches to the correct table purely by lane before any `DELETE`/`INSERT` runs. No two lanes ever share a table, so the cross-lane collision Gap 7 worried about is not structurally possible, and a plain `DELETE ... WHERE ngay_do_kiem=?` (today's actual, unmodified code) was never unsafe on that specific axis.

**The real risk Gap 7 should have named**, found while designing the fix the Design of Record proposed for it (`import_log_id IN (SELECT ... source_lane=?)`, since retracted — see `docs/04_TECHNICAL_PLANNING/Feature/IMPORT-BULK-REIMPORT-ALL-01_DESIGN_OF_RECORD.md` §8.1): `fact_f13_national` (`backend/src/db/schema.sql:110-136`) has **no `import_log_id` column at all**, and `fact_f13`/`fact_f41` rows backing a `LEGACY_BASELINE` `COMPLETED` status (`autoBackfillCoverageService.js:59-71`; real, PO-confirmed pre-Import data per `AB-CALENDAR-01` D2) can have `import_log_id IS NULL`. A delete design that requires joining through `import_log_id`/`source_lane` — which is what a naive reading of Gap 7 would suggest — silently fails to remove exactly these rows, which is the actual defect the Product Owner should have been warned about instead.

**Resolution:** the Design of Record's revised §8 (DoR v2) keeps the delete scoped by date only (matching today's unmodified code, now confirmed correct for lane isolation by table selection) and adds post-delete/post-write verification plus a registry-load uniqueness assertion for defense in depth. Full design: `docs/04_TECHNICAL_PLANNING/Feature/IMPORT-BULK-REIMPORT-ALL-01_DESIGN_OF_RECORD.md` §8, §0.

## 13. Confirmations (Gap 7 correction pass)

- No frontend/backend code, test, schema, or migration was changed.
- No selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write was performed.
- No Browser, Playwright, or web automation was used.
- No new business rule was inferred or decided; this is a factual correction to a prior gap's premise, evidenced directly from schema/registry code.
- Files changed by this pass: this checkpoint (Sections 12-13 appended), `docs/10_TICKETS/IMPORT-BULK-REIMPORT-ALL-01_MANIFEST.md` (Section 9 appended), `docs/04_TECHNICAL_PLANNING/Feature/IMPORT-BULK-REIMPORT-ALL-01_DESIGN_OF_RECORD.md` (revised to DoR v2).

## 14. Part A Independent Review 001 (2026-09-22, Claude Code/Opus 5)

Read-only review of `0e16c99` by a different model from the implementer. Result: **PASS (technical), no BLOCKER**. Full record: `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_PART_A_REVIEW_001.md`.

- Six gates (DoR v2 §7.4) and crash recovery (§7.5) verified in code; gate 6 additionally verified by an independent scenario the repo lacks.
- Independent isolated-DB data checks (25/25): each of the four fact tables has its selected date fully replaced, including rows with `import_log_id = NULL`; all other (table, date) cells unchanged; `import_log` history kept; a failure injected after DELETE+INSERT and before COMMIT restores the old rows exactly in all four tables.
- Independent queue scenarios (9/9): LỊCH NGHỈ without data cannot be enqueued or selected; one job per tuple under repeated requests; only the confirmed tuple executes with `forceReimport:true`; INCOMPLETE days never carry the flag; default "Chọn tất cả chưa hoàn tất" unchanged; migration idempotent.
- Tests: default sweep 394/398 with the same 4 pre-existing failures (files byte-identical to `e1132b6`); the default sweep does not execute `test_*.js`, whose Part A suites all pass per file as reported.
- Findings: N1 (recommended before PO UI check) F1.3/HUE `verifyImport` fails a correct reimport whenever the date has any historical FAILED import_log; N2 repository test gaps (covered by the reviewer's scenarios); N3 report wording; N4 migration not standalone on an empty DB (fails loudly); N5 restart + backup before first real use.
- Observation for Part B copy: under AB-CALENDAR-01 precedence a holiday-marked day with real data is COMPLETED and can be reimported; only no-data holidays are LỊCH NGHỈ.

Next gate: Part B (Antigravity) may start. No PO PASS is claimed or implied.
