# IMPORT-BULK-REIMPORT-ALL-01 Manifest

Status: `IMPLEMENTED / PO UI PASS / CLOSED (2026-09-22)`. Registered 2026-09-15. See Section 6-7 for the completed audit, Section 8 for the originally-locked Design of Record, Section 9 for the Opus-review blocker remediation (DoR v2), Section 10 for the Part A backend implementation, Section 11 for the first N1 fix and N2 test additions following Independent Review 001, Section 12 for closing N1's remaining `Error/HUE` half following Independent Review 002, Section 13 for Part B frontend UI implementation, and Section 14 for the Product Owner UI PASS and closure. No further work is authorized under this ticket; any later change requires a new ticket or explicit reopening.

## 1. Ticket Information

- Ticket ID: `IMPORT-BULK-REIMPORT-ALL-01`
- Ticket Name: `Import — Chọn tất cả để tái nhập hàng loạt`
- Owner: unassigned — pending Product Owner/CTO activation.
- Governance Version: `V2 Active`
- Registration authority: Product Owner instruction received in chat, 2026-09-15.
- Branch registered on: `codex/da-impl-006`
- Baseline commit: `425ed1c`

## 2. Objective

Preserve the existing action **“Chọn tất cả chưa hoàn tất”** and add a separate **“Chọn tất cả”** action that can include records already imported successfully, so the Product Owner can intentionally reimport them in bulk.

This objective is registered only. No behavior is approved until a read-only audit establishes the exact operational contract.

## 3. Mandatory Audit Before Any Implementation

A future, separately activated read-only audit must determine and evidence:

1. **Selection scope** — which visible/filtered dates, indicators, sources, pages, statuses, and holiday/exclusion states each bulk action selects; “Chọn tất cả chưa hoàn tất” must remain unchanged.
2. **Queue and dedup behavior** — how selected records map to runs/jobs, how active or duplicate identities are handled, whether successful historical jobs can be selected safely, and how partial enqueue failures are reported.
3. **Reimport rules** — whether successful data is replaced, overwritten, skipped, or versioned; transaction boundaries; idempotency; import-log/evidence behavior; and protection against duplicate or concurrent execution.
4. **Confirmation warning** — a distinct confirmation step before enqueue that states the exact count/scope and clearly warns that already-successful imports are included and may be replaced.
5. **Safety and authorization** — interaction with Auto-Backfill runtime states, manual authentication/Resume, circuit/safety controls, calendar exclusions, permissions, and recovery/cancellation constraints.

The audit must trace the current frontend selection logic, backend queue/run creation, active-identity dedup, completion policy, per-row reimport path, and real database state read-only. It must not infer a new business rule.

## 4. Explicitly Out of Scope at Registration

- Any frontend/backend code, test, schema, migration, database, queue, or runtime change.
- Any actual selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write.
- Any change to KPI definitions or frozen SSOT.
- Activation of this ticket by progress or closure of another ticket.
- Any change to the active `F13-BCVH-MONTHLY-CUMULATIVE-01` audit, `F13-ROUTE-POSTMAN-IDENTITY-01`, or paused `F41-DASHBOARD-MINIMUM-01`.

## 5. Next Step

Await explicit Product Owner/CTO activation for **DISCOVERY / READ-ONLY AUDIT**. The executor must return findings and a proposed contract to the Product Owner before any design or implementation is authorized. This registration does not self-activate the audit.

## 6. Discovery / Read-Only Audit — Completed (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat (2026-09-21) explicitly authorized starting the audit named in Section 5. Executor read commit `dfcefb850f2869b4dfec6285bb58fe772f7bfcc4` on `codex/da-impl-006`, static code only, read-only — no code, test, schema, or database changed; no Browser/Playwright/web automation used; no import, enqueue, Resume, Retry, cancellation, or business-data write performed. Full findings, file:line evidence, gaps/risks, and discovery-level contract observations: `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_CHECKPOINT_001.md`.

Headline finding: no code path in the current system can overwrite an already-successfully-imported (`COMPLETED`) date — the block is enforced independently at the coverage-eligibility layer (`ALREADY_SUCCESS`), the `createRun` `include_excluded` opt-in (which only re-admits `EXCLUDED` days, never `COMPLETED`), and every current Auto-Backfill executor's hard-coded `forceReimport:false` into the underlying import services. Delivering this ticket's objective therefore requires a new, explicit backend contract at all three layers, plus a still-unestablished trace of `importProcessor.js`'s actual row-level overwrite behavior, before any design can be written. Holiday (`LỊCH NGHỈ`) exclusion is confirmed enforced entirely server-side, upstream of every selection path (`scan()`/`selectable()`), and requires no new work to preserve.

Status: `DISCOVERY / READ-ONLY AUDIT COMPLETE`. This ticket remains `DISCOVERED / NOT ACTIVATED` for design or implementation. Next step unchanged from Section 5's intent: the Product Owner must review the checkpoint's Section 7 discovery-level contract observations and Section 6 gaps before any design/implementation activation.

## 7. Full Pipeline Trace — Gap 4 Closed (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat explicitly requested completing the audit with a full trace: `AutoBackfillOperatorPanel.jsx → API → autoBackfillQueueService/Store → executor/adapter → import service/importProcessor → database transaction → import log/evidence`. Still read-only, same commit `dfcefb850f2869b4dfec6285bb58fe772f7bfcc4`. Full findings with file:line citations: `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_CHECKPOINT_001.md` Sections 9-11.

Gap 4 (Section 6's checkpoint reference) is now closed with evidence: `forceReimport:true` in `backend/src/services/importProcessor.js` performs an unconditional `DELETE FROM <fact_table> WHERE ngay_do_kiem=?` followed by batched `INSERT OR IGNORE`, inside one `BEGIN TRANSACTION`/`COMMIT` — a delete-then-insert replace, not an upsert or a versioned scheme, matching the source's own SSOT comment. This is confirmed **unreachable from `AutoBackfillOperatorPanel.jsx`**: every Auto-Backfill executor (F1.3 HUE/TCT, F4.1 HUE/TCT) hard-codes `forceReimport:false`/`refreshRequested:false` all the way down to `importPipeline.js`'s `executeImport()`, so a `COMPLETED` date's file is always returned as `requiresConfirmation` without any write. The only place `forceReimport:true` is reachable from is `POST /import/upload` (`importController.js:104-111`, `source:'MANUAL'`) — the manual `DataImportCenter.jsx`-style upload path, structurally and permanently separate from the audited panel (grep-confirmed: `AutoBackfillOperatorPanel.jsx` never calls `/import/upload`).

New scope-relevant fact surfaced (recorded as Checkpoint Gap 7, not a business-rule decision): the `forceReimport` delete is scoped by `ngay_do_kiem` only, not by `source_lane` — if a future "reimport a completed day" contract reuses this mechanism as-is, it would delete a date's committed rows from every lane, not just the lane being reimported. This needs an explicit Product Owner decision before any design.

Also confirmed at the current commit: no run/job cancellation endpoint exists anywhere in the codebase (only a manual-DKCL-login `cancel-login` endpoint, unrelated) — consistent with the same finding already on record in `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`'s `AUTO-BACKFILL-RUNTIME` backlog-investigation entry (2026-08-20).

Status: `DISCOVERY / READ-ONLY AUDIT COMPLETE (full pipeline trace closed)`. This ticket remains `DISCOVERED / NOT ACTIVATED` for design or implementation. No new business rule was decided; the Product Owner must still resolve the confirmation-warning design, the selection-state design, the `forceReimport` lane-scope question, and the shared-selection-state question (Checkpoint Section 6 gaps 1-3/5-6 and Section 10 gap 7) before any implementation activation.

## 8. Design of Record Locked (2026-09-21, Claude Code/Sonnet 5)

Product Owner decisions received in chat (2026-09-21), resolving the open questions left by Sections 6-7:

1. Keep "Chọn tất cả chưa hoàn tất" unchanged.
2. Rename the existing "Nhập lại" action to "Nhập mới" for `INCOMPLETE`/`DATA_ERROR` dates (label-only; no backend behavior change, since this action never overwrites existing data).
3. Add a new "Chọn tất cả" button (separate selection state) whose scope includes `COMPLETED` in addition to `INCOMPLETE`/`DATA_ERROR`; `LỊCH NGHỈ` (`EXCLUDED`) always omitted.
4. Add a new, real "Nhập lại" action for `COMPLETED` dates: the selected date's data is deleted and replaced, scoped to exactly that date (and, per the technical design below, exactly that indicator+source_lane), never affecting any other date.

Design of Record written and locked: `docs/04_TECHNICAL_PLANNING/Feature/IMPORT-BULK-REIMPORT-ALL-01_DESIGN_OF_RECORD.md`. It specifies, based directly on Checkpoint Sections 3-6/9-11 and this manifest's Sections 6-7: two independent frontend selection states (existing `selectedBulkKeys` untouched; new `selectedReimportKeys`) so the pre-existing, PO-accepted bulk PO-exemption action is never exposed to `COMPLETED` selections; a new optional `include_completed` query parameter reusing the existing `coverage/selectable` endpoint (no new endpoint, `LỊCH NGHỈ` exclusion untouched); a new optional `confirm_replace_completed` request flag on `POST /import/auto-backfill/runs`, single-tuple-only like the existing `include_excluded`; a new additive `auto_backfill_job.force_reimport` column that is the **only** place the previously-unconditional `SKIPPED_ALREADY_SUCCESS` pre-execution guard (Checkpoint 9.2.B) becomes conditional; a query-level fix scoping the forced-delete in `importProcessor.js` through `import_log.source_lane` instead of date-only (closing Checkpoint Gap 7); and a new recovery-path rule (a `force_reimport` job interrupted mid-execution is always requeued, never auto-resolved via the generic completion check, because stale pre-existing data would otherwise be misread as "reimport already done"). All existing dedup, global concurrency, circuit breaker, retry, Resume, and audit-log mechanisms are reused unchanged; one new event reason code is added for audit distinction only.

Status: `DESIGN LOCKED / NOT ACTIVATED FOR IMPLEMENTATION`. No code, schema, migration, or database change was made. No implementation may begin without a further, separate, explicit Product Owner/CTO activation and executor assignment per `CLAUDE.md` Section 2.

## 9. Design of Record v2 — Blocker Remediation (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat (2026-09-21): an independent pre-implementation review (Claude Opus) found 2 blockers in the Design of Record locked under Section 8 and instructed a design-only remediation before any implementation. Still no code/schema/database change; no queue action or data reimport performed.

Section 8's claim that the forced-delete fix would scope through `import_log.source_lane` is **superseded, not corrected in place** (append-only) — re-tracing the actual schema and registry for this remediation found that design was itself defective: `fact_f13_national` has no `import_log_id` column at all, and `LEGACY_BASELINE`-backed `COMPLETED` days (real, PO-confirmed pre-Import data) can have `fact_f13`/`fact_f41` rows with `import_log_id IS NULL` — for either case, the Section 8 design's join-based delete would silently delete nothing, leaving old data in place under a "Nhập lại" that reports success. The corrected design (`docs/04_TECHNICAL_PLANNING/Feature/IMPORT-BULK-REIMPORT-ALL-01_DESIGN_OF_RECORD.md` §8, DoR v2) instead relies on a fact already true in the registry/schema: each `(indicator, lane)` pair writes to its own dedicated fact table (F1.3/HUE→`fact_f13`, F1.3/TCT→`fact_f13_national`, F4.1/HUE→`fact_f41`, F4.1/TCT→`fact_f41_national`), so table selection alone already provides full indicator+lane isolation and the delete can safely stay scoped by date only — this also resolves tables lacking `source_lane`/`import_log_id` by construction rather than special-casing them. New: a post-delete verification (row count must read 0 before insert) and a post-write verification (extended from F1.3/HUE-only to all 4 write functions), both executed inside the existing transaction so any failure rolls back and restores the pre-reimport data automatically; and one new registry-load assertion (no two lane registrations may share a `targetTable`) protecting the invariant the whole fix depends on.

Also found: the DoR v1 gate-propagation design (`force_reimport` flowing to `forceReimport`) named only 2 of 6 real gates. Re-tracing the F4.1 executor chain found `f41HueAdapter.js`/`f41TctAdapter.js` each silently drop the incoming flag and re-hardcode `false`, and `f41HueSingleDateService.js`/`f41TctSingleDateService.js` each contain an explicit, unconditional throw (`F41_HUE_FORCE_REIMPORT_FORBIDDEN`/`F41_TCT_FORCE_REIMPORT_FORBIDDEN`) forbidding force-reimport outright — without also changing these 4 sites, the F1.3-only fix in Section 8 would leave F4.1 "Nhập lại" non-functional. A 6th gate — the executor-error recheck inside `processNext()`'s `catch` block — has the same "does SUCCESS mean finished or untouched" ambiguity the original design already fixed for crash recovery, but had never been fixed for the synchronous in-process error path; both are now resolved the same way (never infer completion from a generic re-read for a `force_reimport` job, always let a fresh, provably-clean attempt run instead).

Status: `DESIGN LOCKED (v2) / NOT ACTIVATED FOR IMPLEMENTATION`. No new business rule was decided. The Product Owner's 4 locked decisions (Section 8) are unaffected by this remediation — only the technical design realizing them changed. No implementation may begin without a further, separate, explicit Product Owner/CTO activation and executor assignment.

## 10. Part A Implementation — Backend, Data, Tests (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat (2026-09-21) explicitly activated Part A implementation per DoR v2, scoped to backend/data/tests only per `CLAUDE.md` §2 role split. No Browser/Playwright used; no queue action or reimport run against real/operational data; every mutation-capable test ran against an isolated temp SQLite sandbox, never `database.sqlite`.

### 10.1 Implemented exactly the DoR v2 contract

- **§7.1** `AutoBackfillCoverageService.selectable()` gained `includeCompleted` (widens the status filter to include `COMPLETED`; `EXCLUDED` stays absolute); `GET /import/auto-backfill/coverage/selectable` accepts `include_completed=true`.
- **§7.2/§7.3** `POST /import/auto-backfill/runs` accepts `confirm_replace_completed`, single-tuple-only (`AUTO_BACKFILL_CONFIRM_REPLACE_REQUIRES_SINGLE_TUPLE` otherwise); `createRun()`'s new `isReadmissibleCompleted()` admits a `COMPLETED` item only for an `ACTIVE` indicator + `AUTOMATED` lane, mirroring `isReadmissibleExcluded()`'s guard.
- **§7.4** New additive `auto_backfill_job.force_reimport` column (migration `backend/migrate_import_bulk_reimport_all_01_schema.js`, idempotent `ALTER TABLE ... ADD COLUMN`, wired into `server.js`'s `ensureStartupSchemaMigrations`; also added directly to `schema.sql`'s base `CREATE TABLE` for fresh installs). All 6 gates the remediation enumerated were implemented exactly as specified: (1) `processNext()`'s pre-execution recheck now conditions on `job.force_reimport`; (2)/(3) the F1.3/F4.1 executor call sites pass `forceReimport: Boolean(job.force_reimport)` instead of a hard-coded `false`; (4) `f41HueAdapter.js`/`f41TctAdapter.js` now forward `context.refreshRequested` instead of silently dropping it; (5) `f41HueSingleDateService.js`/`f41TctSingleDateService.js`'s unconditional forbid-throws are removed and `refreshRequested` is threaded into their `executeImport()` calls; (6) `processNext()`'s executor-error recheck no longer resolves a `force_reimport` job as `SKIPPED_ALREADY_SUCCESS` from a same-attempt completion guess.
- **§7.5** `recoverInterruptedWork()` never resolves an interrupted `force_reimport` job via the generic completion match — always requeues it, regardless of what `evaluateCompletion()` reports.
- **§8.2** No schema/`source_lane` column added to any fact table; the forced delete stays scoped by `ngay_do_kiem` only (unchanged shape), now provably safe because `importIndicatorRegistry.js`'s `validateIndicatorRegistry()` gained `assertUniqueTargetTables()`, asserting at registry load that no two `(indicator, lane)` pairs ever share a `targetTable`.
- **§8.3** `importProcessor.js` gained `assertForceReimportDeleteComplete()` (post-delete, must read 0 before any `INSERT`) and `verifyPostWriteCount()` (post-write, generalizing the existing F1.3/HUE-only `verifyHueImportTransaction()` to `fact_f41`/`fact_f41_national` unconditionally, and to `fact_f13_national` only when `forceReimport` is true, per the DoR's documented reasoning for why that table's no-`import_log_id` case needs that precondition). Both run inside each write function's existing transaction, so a thrown verification failure is caught by the existing rollback path and the pre-reimport data is restored automatically — no new rollback mechanism was needed.
- **§9** `createRunWithJobs()` persists `force_reimport` per job and records the `JOB_CREATED` event under a new `REPLACE_COMPLETED_CONFIRMED` reason code when the job was admitted via `confirm_replace_completed`, instead of the existing `COVERAGE_ITEM_QUEUE_ELIGIBLE`. All existing dedup (request-key + active-identity), global concurrency, circuit breaker, retry, Resume, and cancellation behavior is unmodified and reused as-is.
- **Decision 1 preserved exactly**: "Chọn tất cả chưa hoàn tất" (`selectedBulkKeys`, the un-widened `selectable()` call, `isSelectable()`) has zero code changes in this pass — Part A is backend/data/tests only; the frontend split into "Nhập mới"/"Nhập lại" (§3-§6, §4.3) is Part B, not implemented here.

### 10.2 Validation

- Full backend sweep: `node --experimental-sqlite --test` → `394/398 PASS`. The 4 failures are the same pre-existing, environmental ones already on record in `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` (`DashboardController.r6.integration.test.js` ×2 needing a separately-running HTTP server, `DashboardController.recovery.test.js` ×1 and `timelineService.recovery.test.js` ×1, the already-registered `F13-DASHBOARD-RECOVERY-DEFECTS-01`) — confirmed by file location, unrelated to Import/Auto-Backfill, unchanged by this ticket.
- `node --experimental-sqlite test_importProcessor.js` (the file's own custom runner): `71/71 PASS`, including new Test 3A2 (forced-reimport mid-transaction failure restores the exact prior rows) and new Test 6 (`importNationalParsedData`/`fact_f13_national` forceReimport genuinely replaces, not merges, since that table has no `import_log_id` to lean on).
- New/updated targeted suites, all passing: `test_autoBackfillQueueService.js` (42/42, incl. 6 new tests: unreachable-without-confirm, single-tuple rejection, MANUAL_ONLY/PAUSED guard, `processNext` actually executes and passes `forceReimport:true` to the executor, and recovery always requeues an interrupted `force_reimport` job), `test_autoBackfillF41Executors.js` (32/32, the 2 old `*_FORCE_REIMPORT_FORBIDDEN` assertions replaced with real delete-then-replace proofs for both F4.1 HUE and TCT), `test_autoBackfillCoverageService.js` (registry-uniqueness accept/reject cases added), `test_autoBackfillHolidayCalendar.js` (`includeCompleted` selectable + controller passthrough, holiday/exception exclusion reconfirmed unaffected), `test_autoBackfillQueueController.js` (`confirm_replace_completed` passthrough; 2 pre-existing exact-shape assertions updated for the new field), `test_autoBackfillF13Executors.js`, `test_autoBackfillSafety.js` (schema-fixture updates only, all still pass).
- No `oxlint` run: this repo's `lint` script exists only under `frontend/package.json`; there is no backend lint script, and this ticket touched no frontend file.
- All 24 changed/new files are backend-only: `server.js`, 3 controllers/services touched for wiring, `schema.sql`, `autoBackfillCoverageService.js`, `autoBackfillF13Executors.js`, `autoBackfillF41Executors.js`, `autoBackfillQueueService.js`, `autoBackfillQueueStore.js`, `f41HueAdapter.js`, `f41HueSingleDateService.js`, `f41TctAdapter.js`, `f41TctSingleDateService.js`, `importIndicatorRegistry.js`, `importProcessor.js`, new `migrate_import_bulk_reimport_all_01_schema.js`, and 8 test files. No frontend file was touched.

### 10.3 Stop condition

`IMPORT-BULK-REIMPORT-ALL-01 PART A IMPLEMENTED / TECHNICAL PASS / READY FOR INDEPENDENT REVIEW`. Per `CLAUDE.md` §2 model discipline (the same model must not both implement and self-approve/self-review a change of this risk level), this stops here for an independent review by a different model (Opus) before any further activation. No PO PASS, technical or UI, is claimed or awarded by this section — PO UI acceptance is separately owned and requires Part B (frontend, Antigravity) first. Part B (the frontend UI split into "Nhập mới"/"Nhập lại", the new `selectedReimportKeys` state, and the confirmation warning UI, §3-§6 of the DoR) remains not implemented.

## 11. Part A Independent Review 001 (2026-09-22, Claude Code/Opus 5)

Status after review: `PART A TECHNICAL PASS (INDEPENDENTLY REVIEWED) / PART B MAY START`. Full record: `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_PART_A_REVIEW_001.md`.

- No BLOCKER. All six gates plus recovery verified; replacement is exact per indicator/lane/date in all four fact tables (including legacy unlinked rows); other dates, tables and lanes are untouched; old data is restored on mid-transaction failure; LỊCH NGHỈ, dedup and "Chọn tất cả chưa hoàn tất" behave as locked; migration idempotent.
- Test claim reconciled: 394/398 is accurate for the default sweep (same 4 pre-existing failures), but that sweep does not execute `test_*.js`; the per-suite Part A results reported in Section 10.2 were reproduced exactly.
- N1 (recommended before PO UI check): `dkclHueF13SyncService.verifyImport()` fails a correct F1.3/HUE reimport whenever the date has any historical FAILED import_log row. N2 test gaps, N3 report wording, N4 migration standalone on empty DB, N5 restart + backup before first real use.
- Part B (frontend, Antigravity) may start per DoR v2 §3-§6. No PO PASS claimed.

## 11. N1 Fix and N2 Test Additions (2026-09-22, Claude Code/Sonnet 5)

Product Owner instruction received in chat (2026-09-22) activated remediation of N1 and N2 from `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_PART_A_REVIEW_001.md`, still backend/data/tests only, before Part B (UI) starts. No Browser/Playwright used; no queue action or reimport run against real/operational data; every mutation-capable test used an isolated temp SQLite sandbox.

### 11.1 N1 fix — `dkclHueF13SyncService.js`

Root cause confirmed exactly as the review stated: `verifyImport()` queried `import_log` by `WHERE ngay_do_kiem = ? OR file_name = ?` with no scoping to the current attempt, so any `FAILED` row left by an earlier, unrelated attempt on the same date/filename made every later attempt — including one that had already correctly deleted and replaced the data — report `IMPORT_FAILED`.

**Fix:** a watermark, not a data change. `getImportLogWatermarkId()` reads `SELECT COALESCE(MAX(id), 0) AS id FROM import_log` immediately before `executeImport()` is called; `verifyImport()` gained a 4th parameter (`sinceLogId`, default `0` for backward compatibility) and its query became `WHERE (ngay_do_kiem = ? OR file_name = ?) AND id > ?`. This scopes the check to rows this specific attempt could itself have written, while leaving every historical row exactly as-is in `import_log` (nothing is deleted, hidden, or reinterpreted) — a genuine failure written by the *current* attempt is still caught (regression-tested, see 11.2).

### 11.2 N2 — tests added, matching the reviewer's independently-verified scenarios

- `test_dkclHueF13SyncService.js`: TEST 2H (a stale `FAILED` log from a prior, unrelated attempt no longer fails a later successful force reimport; the old row is preserved in history, not deleted) and TEST 2I (a `FAILED` log written by *this same* attempt still fails it — proves N1 did not weaken real-failure detection).
- `test_autoBackfillQueueService.js`: gate 6 (an executor throw on a `force_reimport` job is never resolved as `SKIPPED_ALREADY_SUCCESS` from a same-attempt completion guess, even though the stale pre-reimport data still reads `SUCCESS`); force-job dedup (a second `confirm_replace_completed` request for the same queued tuple creates no second job); LỊCH NGHỈ + `confirm_replace_completed` at `createRun` (a true holiday day stays unreachable even with the new flag, since it is never PO status `COMPLETED`).
- `test_importProcessor.js`: TEST 7 (legacy rows with `import_log_id IS NULL` are genuinely replaced by a forced reimport in both `fact_f13` and `fact_f41`; a different date and a different table are confirmed byte-for-byte untouched) and TEST 8 (mid-transaction failure — using a `TEMP TRIGGER` that aborts the `import_log` `UPDATE`, the same technique the independent reviewer used — restores the exact prior rows for `fact_f13_national`, `fact_f41`, and `fact_f41_national`, the 3 write functions the existing `TEST 3A2` rollback test did not cover).

Migration idempotency and gate 6 were both independently verified by the reviewer already (Section 10.2/this section); the repo now carries its own regression coverage for all 5 items the Product Owner named.

### 11.3 Validation

- `node --experimental-sqlite test_dkclHueF13SyncService.js`: **228/228** (up from 226; 2 new tests).
- `node --experimental-sqlite test_importProcessor.js`: **85/85** (up from 71; 14 new assertions across TEST 7-8).
- `node --experimental-sqlite --test test_autoBackfillQueueService.js test_autoBackfillF41Executors.js test_autoBackfillF13Executors.js test_autoBackfillCoverageService.js test_autoBackfillHolidayCalendar.js test_autoBackfillQueueController.js test_autoBackfillSafety.js`: **153/153**.
- Full default sweep `node --experimental-sqlite --test`: **394/398**, the same 4 pre-existing, environmental, unrelated failures already on record (this sweep does not execute `test_*.js`, per the reviewer's own N3 note — the per-suite results above are Part A/N1/N2's real evidence).

### 11.4 Stop condition

Status: `PART A N1/N2 REMEDIATED / TECHNICAL PASS`. No new business rule was decided; N1 is a bug fix (a correct reimport must not be reported as failed), not a behavior change to what gets replaced or when. No PO PASS is claimed. Part B (frontend, Antigravity) may proceed per DoR v2 §3-§6; N3 (report wording), N4 (migration-on-empty-DB, already safe by design) and N5 (deployment note: restart to pick up the migration, verified backup, PO go-ahead before first real use) remain informational, not code changes.

## 12. Part A Independent Review 002 — N1/N2 remediation (2026-09-22, Claude Code/Opus 5)

Status after review: `PART A TECHNICAL PASS FOR PART B / N1 PARTIALLY OPEN (NON-BLOCKER)`. Full record: `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_PART_A_REVIEW_002.md`.

- No BLOCKER. N2 CLOSED. N3 CLOSED (manifest wording now states the default sweep does not run `test_*.js`).
- N1 PARTIALLY FIXED: the `import_log` watermark in `dkclHueF13SyncService.verifyImport()` is correct and verified, but the `Error/HUE` file check is still unscoped. After a real failed attempt, which leaves both a FAILED row and the file in `Error/HUE`, a later correct F1.3/HUE reimport is still reported FAILED (sandbox reproduction; data correct). Must be closed before the PO UI check; extend TEST 2H to seed the error file.
- Validation reproduced exactly: 228/228, 85/85, 153/153, 394/398 (same 4 pre-existing failures).
- Part B (frontend, Antigravity) may proceed per DoR v2 §3-§6. No PO PASS claimed.

## 12. N1 Fully Closed — `Error/HUE` Stale File (2026-09-22, Claude Code/Sonnet 5)

Product Owner instruction received in chat (2026-09-22), following Independent Review 002, activated closing N1's remaining half. Still backend/data/tests only; no Browser/Playwright; no queue action or reimport run against real/operational data.

### 12.1 Root cause, confirmed exactly as reviewed

`importPipeline.executeImport()` moves a failed attempt's file to `Error/HUE/<standardized filename>` on failure, alongside the `FAILED` `import_log` row. The standardized filename depends only on the business date, so that file persists at the same path across every later attempt for the same date. `verifyImport()`'s `fs.existsSync(errorPath)` check had no scoping to the current attempt — Section 11's watermark fix only scoped the `import_log` half of the twin failure footprint, not the file half.

### 12.2 Fix — archive, not a check-side workaround

`dkclHueF13SyncService.js` gained `archiveStaleErrorFile(filename)`, called once, immediately after `handoffToIncoming()` and before the `import_log` watermark is captured: if a file already exists at `Error/HUE/<filename>`, it is renamed aside (`<name>.stale-<timestamp><ext>`, same directory) — never deleted. This guarantees any file `verifyImport()` later finds at the exact `errorPath` was written by *this* attempt, mirroring the existing `quarantineStaleProcessedEvidence()` pattern `importPipeline.js` already uses for the analogous stale-`Processed`-file problem. No change to `verifyImport()`'s check logic itself was needed once the precondition (a clean `errorPath` at attempt start) is guaranteed upstream.

### 12.3 Tests added — `test_dkclHueF13SyncService.js`

- **TEST 2J**: seeds both twin traces of a real prior failure (a `FAILED` `import_log` row and a stale file at the real `Error/HUE/<filename>` path), then runs a genuinely successful attempt. Asserts: final status `SUCCESS`; the data was actually written (2/2 rows); the portal was asked to export **exactly once** (`requestDetailExport` called once — no unnecessary reload/retry); the exact `errorPath` no longer holds the old file; the old file was archived (a `.stale-`-suffixed sibling exists), not deleted.
- **TEST 2K**: seeds the same two stale artifacts, but this attempt's own `executeImport` genuinely fails and writes its *own* new `FAILED` `import_log` row and its *own* new file at the same `errorPath` (simulating the real `importPipeline` failure footprint). Asserts the run is still reported `FAILED` — proving `archiveStaleErrorFile()` only clears pre-existing files, never masks a real current-attempt failure.

### 12.4 Validation

- `node --experimental-sqlite test_dkclHueF13SyncService.js`: **234/234** (228 + 6 new assertions across TEST 2J/2K).
- `node --experimental-sqlite test_importProcessor.js`: **85/85** (unchanged — this file's code was not touched this round).
- `node --experimental-sqlite --test` (7 Auto-Backfill suites): **153/153** (unchanged).
- Full default sweep `node --experimental-sqlite --test`: **394/398**, same 4 pre-existing, environmental, unrelated failures (this sweep does not execute `test_*.js`).
- Only product-code file changed: `backend/src/services/dkclHueF13SyncService.js`.

### 12.5 Stop condition

Status: `PART A N1 FULLY CLOSED / TECHNICAL PASS`. Both halves of N1 (the `import_log` watermark from Section 11 and the `Error/HUE` archive from this section) are now closed with regression coverage for both the false-failure case and the still-must-fail case. No new business rule was decided — this is a bug fix (a correct reimport must not be reported as failed) plus its matching test coverage, not a change to replacement scope or timing. No PO PASS is claimed. Part B (frontend, Antigravity) may proceed per DoR v2 §3-§6, and — per Review 002's Section 6 — N1 is now closed ahead of the PO UI check, as recommended.

## 13. Part B Implementation — Frontend UI & Selection Separation (2026-09-22, Antigravity)

Product Owner instruction received in chat (2026-09-22) activated Part B frontend UI implementation per DoR v2 (§3-§6). No Browser/Playwright automation was used; backend code was untouched; `DataImportCenter.jsx`, KPI calculations, and SSOT were untouched.

### 13.1 Delivered Scope & UI Contract

1. **"Chọn tất cả chưa hoàn tất" Preserved**:
   - Backed by existing `selectedBulkKeys`.
   - Continues to query `GET /import/auto-backfill/coverage/selectable` (without `include_completed`) to select only `INCOMPLETE` and `DATA_ERROR` records.
   - Clears `selectedReimportKeys` to maintain strict selection state isolation.

2. **Renamed "Nhập lại" to "Nhập mới" for Unfinished / Data Error**:
   - Single-row buttons for `INCOMPLETE`, `DATA_ERROR`, and holiday-excluded rows now render as "Nhập mới" (`RotateCw` icon, blue theme).
   - The bulk unfinished modal now explicitly states "Yêu cầu Nhập mới Dữ liệu Hàng loạt" and runs `handleExecuteBulkNewImport`.

3. **Added "Chọn tất cả" for Bulk Reimport**:
   - Rendered in monthly accordion headers (`MonthlyAccordionGroup`) next to "Chọn tất cả chưa hoàn tất".
   - Calls `GET /import/auto-backfill/coverage/selectable?include_completed=true` to select `COMPLETED`, `INCOMPLETE`, and `DATA_ERROR` dates.
   - Holiday (`LỊCH NGHỈ`) days are always excluded by `isReimportSelectable()` and backend exclusion filtering.
   - Clears `selectedBulkKeys` to prevent action collision.

4. **Separate Selection State (`selectedReimportKeys`)**:
   - Dedicated `selectedReimportKeys` state (`Set`) for Reimport, completely separated from `selectedBulkKeys` (which backs PO Exception and Nhập mới).
   - Distinct floating action bars:
     - Blue bar for `selectedBulkKeys` with "Nhập mới" and "Loại bỏ phát sinh (PO Xác nhận)".
     - Indigo bar for `selectedReimportKeys` with "Nhập lại" button only (never exposes bulk PO exemption).

5. **Modal Separation & Item Breakdown**:
   - `splitReimportItems()` partitions selected dates into "Nhập mới" (`INCOMPLETE`/`DATA_ERROR`) vs "Đã hoàn tất sẽ bị thay thế" (`COMPLETED`).
   - Reimport modal displays high-level count badges and per-row status chips (`Đã hoàn tất (sẽ thay thế)` in red/amber vs `Chưa có dữ liệu (nhập mới)` in blue).
   - If completed dates exist, a prominent amber/red warning banner informs the operator that previous data will be permanently overwritten.

6. **Mandatory User Confirmation Checkbox**:
   - When completed items are present, the reimport button in both single-row dialog and bulk modal is disabled until the operator checks the acknowledgment checkbox (`bulkReimportAck` / `reimportAck`).
   - Calls backend `POST /import/auto-backfill/runs` with `confirm_replace_completed: true` using `buildRunPayload()`.

### 13.2 Validation & Quality Gates

- **Unit / Contract Tests**: `node frontend/src/components/AutoBackfillOperatorPanel.test.js` → **24/24 Test Suites PASSED** (added suite 24 covering `isReimportSelectable`, `splitReimportItems`, `buildRunPayload`, and selection state isolation).
- **Backend Regression**: `node backend/test_dkclHueF13SyncService.js` → **234/234 PASSED**; backend code 100% untouched.
- **Lint Check**: `npm.cmd run lint` (`oxlint`) → 0 errors, 0 warnings in modified files.
- **Production Build**: `npm.cmd run build` (`vite build`) → Success in 10.53s.

### 13.3 Stop Condition

Status: `PART B FRONTEND IMPLEMENTED / READY FOR PO CHECK`. No PO PASS is claimed or self-awarded. Ready for PO review and UI verification.

## 14. Product Owner UI PASS and Closure (2026-09-22, Claude Code/Sonnet 5)

### 14.1 Accepted implementation baseline

Part A (backend/data/tests, Claude Code) and Part B (frontend UI, Antigravity) are both accepted as implemented on branch `codex/da-impl-006`:

**Part A — backend/data/tests:**
- `0e16c99`: `feat(import-bulk-reimport-all-01): implement Part A backend for confirmed COMPLETED-date reimport` — the six force-reimport gates, `confirm_replace_completed`, `auto_backfill_job.force_reimport`, and the post-delete/post-write verification in `importProcessor.js` (Section 10).
- `72a09fd`: independent review 001 of Part A (Claude Opus 5) — `PASS (technical), no BLOCKER`, N1/N2 recorded (Section 11 / Checkpoint Section 14).
- `a725c1b`: N1 fix (`import_log` watermark) and N2 reviewer-verified regression tests added to the repo (Section 11).
- `57da33a`: independent review 002 of the N1/N2 remediation (Claude Opus 5) — N2 `CLOSED`, N1 found only half-fixed (`Error/HUE` stale file still open) (Section 12 / Checkpoint Section 15).
- `5387101`: N1 fully closed — `archiveStaleErrorFile()` in `dkclHueF13SyncService.js` (Section 12).

**Part B — frontend UI:**
- `9c9e09b`: `feat(import-bulk-reimport-all-01): implement Part B UI for bulk reimport and selection split` — "Chọn tất cả chưa hoàn tất" preserved unchanged, existing "Nhập lại" renamed to "Nhập mới" for `INCOMPLETE`/`DATA_ERROR`, new "Chọn tất cả" (including `COMPLETED`) with LỊCH NGHỈ always excluded, a separate `selectedReimportKeys` selection state so bulk PO-exemption is never exposed to `COMPLETED` selections, and a mandatory acknowledgment checkbox before any reimport of completed dates is enabled (Section 13).

Design authority: `docs/04_TECHNICAL_PLANNING/Feature/IMPORT-BULK-REIMPORT-ALL-01_DESIGN_OF_RECORD.md` (DoR v2). No F1.3/F4.1 KPI definition, frozen SSOT, or unrelated ticket was touched by either part.

### 14.2 Technical validation (already on record, restated for closure)

- Part A: `test_dkclHueF13SyncService.js` 234/234, `test_importProcessor.js` 85/85, 7 Auto-Backfill `node:test` suites 153/153, full default sweep 394/398 (4 pre-existing, environmental, unrelated failures).
- Part B: `frontend AutoBackfillOperatorPanel.test.js` 24/24 test suites, `npm run lint` (oxlint) 0 errors/warnings on modified files, `npm run build` succeeds.
- No Browser/Playwright was used at any point across Part A or Part B. No real/operational business data was reimported; no queue action was run against real data.

### 14.3 Product Owner decision

Product Owner instruction received in chat (2026-09-22): explicit confirmation that the Product Owner personally checked the Part B UI and it **PASSED** ("PO đã kiểm tra giao diện và xác nhận PASS Part B của IMPORT-BULK-REIMPORT-ALL-01").

This is the explicit Product Owner UI acceptance for Part B, completing the ticket's full accepted scope (Part A backend + Part B frontend, both per the locked DoR v2). Final state:

`IMPLEMENTED / PO UI PASS / CLOSED`.

No further work is authorized under this ticket. Any later change — including the discovery-level items DoR v2 left open (`PO_EXEMPTED`/`VERIFIED_NO_DATA` `EXCLUDED` days remaining out of scope, exact UI copy, technical field naming) — requires a new ticket or explicit reopening.

