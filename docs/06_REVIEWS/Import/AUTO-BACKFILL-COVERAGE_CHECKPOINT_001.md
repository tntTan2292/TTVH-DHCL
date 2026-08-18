# AUTO-BACKFILL-COVERAGE - Checkpoint 001

## 1. Technical Execution Report

- State: `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`
- Date: `2026-08-18`
- Branch: `codex/da-impl-006`
- Baseline: `f376391adfe9546c6c257f8f7bb1230e21d1ef8e`
- Executor: `Codex`, authorized for this ticket only
- Worktree before edits: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`
- Exclusions: neither excluded path was opened, changed, staged, moved, deleted, restored, or stashed

No frontend, schema, operational database, watcher, Portal automation, credentials, or business data was changed. No real Import or live Portal action was run.

## 2. Product Owner Decisions Recorded

| Decision | Implemented contract |
| --- | --- |
| Q-01 | F1.3/F4.1 `trackingStartDate = 2026-01-01` |
| Q-02 | Scanner computes `N-1` once in `Asia/Ho_Chi_Minh` |
| Q-03 | Committed data plus `FILE_MOVE_FAILED` or missing Processed artifact is `MANUAL_REVIEW_REQUIRED`; never runnable |
| Q-04 | Registry declares three attempts with bounded exponential backoff; runtime is deferred |
| Q-05 | Registry declares five same-signature failures per adapter/source/resource and immediate integrity stop; runtime is deferred |
| Q-06 | Flat coverage ordering is date descending, registry priority ascending, lane priority ascending |
| Q-07 | Restart rule remains contract metadata for `AUTO-BACKFILL-QUEUE`; no queue was added |
| Q-08 | Coverage read is lane-declared; run control/retry declarations are admin-only |
| Q-09 | Append-only indefinite audit remains the approved future Safety contract; no audit store was added |
| Q-10 | F4.1 HUE/TCT stay `MANUAL_ONLY`; no Portal report identity was inferred |

## 3. Implementation

### 3.1 Shared Registry

`importIndicatorRegistry.js` now validates the full shared declaration instead of only parser/table/filename metadata. The existing `getIndicatorConfig`, `getLaneConfig`, watcher directory and path-resolution APIs remain available so current F1.3/F4.1 Import behavior is preserved.

Validation rejects unsafe SQL identifiers, invalid dates/timezones, missing parsers or completion policies, undeclared roles, non-admin run control, unverified automated adapters, contradictory manual-only adapters, non-approved retry metadata, and an incorrect circuit scope.

Test-root selection is declaration-driven. Adding a synthetic indicator to the acceptance fixture requires no branch in the scanner.

### 3.2 Exact Completion Policy

`createSqliteImportCompletionPolicy()` consumes only lane declarations. For one exact `indicator + source_lane + business_date`, it checks:

- target-table row count and distinct-key integrity;
- exact `import_log.indicator`, `source_lane`, and `ngay_do_kiem` evidence;
- the registered Processed/lane/standardized-filename artifact.

Classification is fail-safe:

- `SUCCESS`: valid facts, exact SUCCESS log, and required artifact;
- `MISSING`: no facts, exact logs, or artifact;
- `INCOMPLETE`: log/artifact evidence without target data;
- `MANUAL_REVIEW_REQUIRED`: committed facts without complete evidence, including `FILE_MOVE_FAILED`, missing artifact, or integrity mismatch.

The policy returns sanitized counts and artifact filename, not credentials, cookies, page content, shipment rows, or a full local path.

### 3.3 Coverage Scanner

The scanner expands ACTIVE/PAUSED registrations from their own start date through `N-1`, sorts all keys newest-first, and invokes the injected completion policy. It contains no indicator codes, target-table list, or F1.3/F4.1 branch.

`MANUAL_ONLY + MISSING` is presented as `MANUAL_ONLY_MISSING` with `queue_eligible=false`. SUCCESS and all uncertain evidence are also not queue-eligible. The ticket creates no jobs and has no execution side effect.

### 3.4 API And Permissions

The new authenticated read-only route is:

`GET /api/import/auto-backfill/coverage?indicator=...&lane=...`

The controller passes the authenticated role to the scanner. Production does not accept a caller-selected business clock: any `as_of` query key is rejected with HTTP 400. Registry permission denial fails closed with HTTP 403. Existing Import routes are unchanged.

## 4. Extensibility Acceptance

| ID | Result | Evidence |
| --- | --- | --- |
| AB-EXT-01 | PASS | `F9.TEST` validates in a test-only registry; scanner source contains no F1.3/F4.1/table branch |
| AB-EXT-02 | PASS | Registering `F9.TEST/HUE` automatically yields three coverage dates |
| AB-EXT-03 | PASS | One seeded SUCCESS plus two gaps yields `SUCCESS + 2 MANUAL_ONLY_MISSING`, zero runnable jobs |
| AB-EXT-04 | PASS | Changing only fixture start date changes item count from three to two |
| AB-ISO-01 | PASS | F1.3/HUE SUCCESS leaves F1.3/TCT and both F4.1 lanes independently missing |
| AB-ISO-02 | PASS | Same-indicator HUE facts/log/artifact cannot satisfy TCT |

Additional acceptance: HCM timezone rollover, N-1 exclusion, newest-first/priority ordering, invalid scope rejection, registry permission denial, committed FILE_MOVE_FAILED, and missing Processed artifact all PASS.

## 5. Validation Evidence

All mutation-capable commands used isolated in-memory or OS-temp SQLite/filesystem sandboxes. Parser regressions also performed their existing read-only reconciliation against the established F4.1 source workbooks. No operational Import or data write was run.

| Command / suite | Result |
| --- | --- |
| `node --test test_autoBackfillCoverageService.js` | `12/12 PASS` |
| `node --test test_f41ImportPipeline.js` | `1/1 PASS`; isolated HUE/TCT pipeline and F1.3 isolation |
| `node test_f41HueExcelParser.js` | `5/5 PASS`, including existing read-only source reconciliation |
| `node test_f41TctExcelParser.js` | `6/6 PASS`, including existing read-only source reconciliation |
| `node test_importPipelineRace.js` | `41/41 PASS` |
| `node test_importProcessor.js` | `59/59 PASS` |
| `node test_dkclHueF13BackfillService.js` | `39/39 PASS` |
| `node test_tctF13BackfillService.js` | PASS, all listed checks |
| `node --check` on new/changed backend modules | PASS |
| `git diff --check` | PASS |

## 6. Scope And Safety Proof

- Shared scanner/policy files contain no `F1.3`, `F4.1`, `fact_f13`, or `fact_f41` branch/list.
- No schema/migration/database file changed.
- No frontend file changed.
- No Portal client, session, legacy queue, watcher, parser, Import processor, or Import pipeline behavior changed.
- No persistent queue, retry/circuit runtime, pause/resume/restart worker, UI, or audit store exists from this ticket.
- F4.1 remains manual-only and no Portal identity was guessed.
- F1.3 legacy HUE/TCT automation remains available through existing routes; shared-engine automation remains gated for `AUTO-BACKFILL-F13`.

## 7. Risks And Gate Notes

- Exact matching deliberately does not accept legacy logs with null/mismatched indicator or lane. This prevents cross-indicator completion but may expose historical dates as missing/manual review.
- Coverage returns a detailed daily read model; UI pagination/virtualization belongs to deferred `AUTO-BACKFILL-UI`.
- This ticket evaluates coverage sequentially and performs no DKCL loading. Persistent planning/execution performance belongs to `AUTO-BACKFILL-QUEUE`.
- Gate 1 should confirm F1.3's shared-adapter-pending label, F4.1 manual-only state, and completion classifications before any queue work starts.

No technical blocker remains for Gate 1. Product Owner approval is still required; Codex does not self-award it.

## 8. Final State

`AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`

`AUTO-BACKFILL-QUEUE` and every later ticket remain inactive.

## 9. Gate 1 Remediation - Caller-Controlled `as_of`

### 9.1 Finding And Root Cause

Gate 1 review found that `autoBackfillCoverageController.js` forwarded `req.query.as_of` into `AutoBackfillCoverageService.scan()`. The service intentionally supports deterministic `asOf` injection for tests, but exposing that parameter at the production API boundary allowed callers to move `N` into the future and manufacture a large false gap set.

### 9.2 Fix

- The controller now checks key presence with `Object.hasOwn(req.query || {}, 'as_of')`.
- Any supplied value, including empty input, returns HTTP 400:
  - code: `AUTO_BACKFILL_AS_OF_NOT_ALLOWED`;
  - message: `as_of is not allowed; coverage always uses the backend business clock in Asia/Ho_Chi_Minh.`
- The production controller no longer passes `asOf` to `scan()`.
- Default coverage-service/database creation is lazy. Therefore a rejected request returns before the service or DB layer is initialized.
- Service-level `asOf` and injected `clock` remain unchanged for deterministic scanner tests only.

### 9.3 API Contract Tests

New `test_autoBackfillCoverageController.js` proves:

1. A normal request at `2026-01-03T18:30:00Z` resolves backend HCM business date `2026-01-04`, scans only through `2026-01-03`, and never includes current day.
2. `as_of=2098-01-01` returns the exact 400 contract before scanner invocation.
3. `as_of=` is also rejected, preventing bypass through an empty value.
4. Rejection leaves scanner, Import, queue and database-write counters at zero.
5. The default production controller rejects before `config/db` is loaded, proving lazy DB/service initialization is not crossed.

### 9.4 Remediation Validation

| Command / suite | Result |
| --- | --- |
| `node --test test_autoBackfillCoverageController.js test_autoBackfillCoverageService.js` | `16/16 PASS` (`4` controller + unchanged `12` service/AB acceptance) |
| `node --test test_f41ImportPipeline.js` | `1/1 PASS` |
| `node test_importPipelineRace.js` | `41/41 PASS` |
| `node test_importProcessor.js` | `59/59 PASS` |
| `node test_dkclHueF13BackfillService.js` | `39/39 PASS` |
| `node test_tctF13BackfillService.js` | all listed checks PASS |

Preserved unchanged: newest-date-first ordering, indicator/lane/date isolation, F1.3/F4.1 registrations, F4.1 manual-only state, AB-EXT-01..04, AB-ISO-01..02, and read-only production behavior.

No queue, Portal automation, frontend, schema/database change, Import execution, business-data mutation, or successor activation occurred.

Remediation state: `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`.
