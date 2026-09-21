# IMPORT-BULK-REIMPORT-ALL-01 Manifest

Status: `PART A IMPLEMENTED / TECHNICAL PASS / READY FOR INDEPENDENT REVIEW (2026-09-21)`. Registered 2026-09-15. See Section 6-7 for the completed audit, Section 8 for the originally-locked Design of Record, Section 9 for the Opus-review blocker remediation (DoR v2), and Section 10 for the Part A backend implementation. No queue action or business-data reimport was run against real data; no PO PASS is claimed.

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
