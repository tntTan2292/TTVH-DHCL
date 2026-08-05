# AUTO-IMPORT-012 Manifest

- Ticket ID: `AUTO-IMPORT-012`
- Ticket Name: `Emergency follow-up — isolate Import test suites from production data`
- Phase: `Emergency remediation follow-up`
- Current State: `COMPLETED / TECHNICAL PASS`
- Technical Status: `Import test suites that write to the database or file system now run against an isolated temp sandbox, never the operational database.sqlite or the production Data DKCL/F1.3 tree. A fail-fast guard rejects NODE_ENV=test without an isolated sandbox for both the database and the file system.`
- PO UI Check Required: `No — backend test-infrastructure change only, no product code behavior change, no UI change`
- PO Product Status: `Technical follow-up to AUTO-IMPORT-011, PO-directed activation`
- Activation date: `2026-08-05`
- Primary executor: `Claude Code`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-012_MANIFEST.md`
5. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-012_CHECKPOINT_001.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-012_CHECKPOINT_001.md` — full evidence and validation
- `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_001.md` — the confirmed root cause this ticket fixes

## Authority

Direct Product Owner activation, `2026-08-05`, as an emergency follow-up to `AUTO-IMPORT-011` (commit `d8771174`, acknowledged by Product Owner). Root cause confirmed in that ticket: `test_dkclHueF13SyncService.js` used `BASE_INCOMING`/`BASE_PROCESSED` and the live database directly, so running it could recreate the `2098-xx`/`AUTO002_000x` fixture pattern in production `fact_f13`/`import_log` and the production `Data DKCL/F1.3` folders.

Does not resume `NETWORK-MANAGEMENT-001` (remains paused, unaffected).

## Objective

Guarantee that no automated backend test can read or write:

- the production `Data DKCL/F1.3` folder tree
- the production `backend/src/db/database.sqlite`
- production `fact_f13`/`import_log` rows

for any Import-related test suite, and add a fail-fast guard so a future test that forgets to configure isolation fails immediately and loudly rather than silently touching production.

## Root Cause (Confirmed Under AUTO-IMPORT-011, Fixed Here)

- `backend/src/services/importPipeline.js` resolved `BASE_INCOMING`/`BASE_PROCESSING`/`BASE_PROCESSED`/`BASE_ERROR`/`BASE_QUARANTINE` unconditionally from `path.resolve(process.cwd(), '../Data DKCL/F1.3/...')` — the real production tree, with no override for tests, and no relationship to `NODE_ENV`.
- `backend/src/config/db.js` already had a correct isolation guard for the database (`NODE_ENV=test` requires `QIS_TEST_DB_PATH`, which must not equal the operational path) — but most Import test files did not set `NODE_ENV=test`, so this guard was simply never engaged.
- Four test files actually read/wrote real data through these unguarded paths: `test_dkclHueF13SyncService.js` and `test_importPipelineRace.js` (file system + database), `test_importProcessor.js` and `test_e2e_import_engine.js` (database only — they call `importParsedData` with in-memory rows, no real file writes).

## Fix

1. `backend/src/services/importPipeline.js`: added the same isolation pattern already used in `db.js`. `BASE_INCOMING` etc. now resolve from `QIS_TEST_DATA_ROOT` when `NODE_ENV=test`, and the module throws immediately if `NODE_ENV=test` is set without `QIS_TEST_DATA_ROOT`, or if `QIS_TEST_DATA_ROOT` resolves to the operational `Data DKCL/F1.3` path. Exported `dataRoot`/`operationalDataRoot` for test assertions.
2. New shared helper `backend/test/importTestSandbox.js`: creates a fresh OS temp directory per test run with the full `Incoming/Processing/Processed/Error/Quarantine × HUE/TCT` folder layout, applies `backend/src/db/schema.sql` to a fresh temp SQLite file, and provides a destroy function.
3. All four Import test files now set `NODE_ENV=test` (+ `QIS_TEST_DB_PATH`, and `QIS_TEST_DATA_ROOT` for the two that touch the file system) **before** requiring `./src/config/db` or `./src/services/importPipeline` (both resolve their paths once, at require-time), and assert at the top of `runTests()` that the resolved paths are inside the sandbox and not equal to the operational paths.
4. `QIS_ALLOW_TEST_FUTURE_DATE=true` (added under `AUTO-IMPORT-011`) remains set only inside these isolated test files; it is not added to any production configuration, `.env`, or launcher script.

## Out Of Scope

- `NETWORK-MANAGEMENT-001` — not touched.
- Symptom B (HUE/TCT browser not opening) — remains discovery-only per explicit instruction; no reproduction attempted or achieved in this ticket.
- Any product runtime behavior change — this ticket only changes test infrastructure.
- Non-Import test suites that already read production data by design for contract verification (e.g., dashboard/KPI tests reading real 2026 data) — out of scope; they do not write fixture rows and were not implicated in the AUTO-IMPORT-011 finding.

## Validation Requirements

- `node backend/test_dkclHueF13SyncService.js`, `test_importPipelineRace.js`, `test_importProcessor.js`, `test_e2e_import_engine.js` each run twice in immediate succession; all pass with stable counts (no flakiness from residual state).
- Fail-fast guard proven directly: `NODE_ENV=test node -e "require('./src/services/importPipeline')"` throws without `QIS_TEST_DATA_ROOT`; same for `db.js` without `QIS_TEST_DB_PATH`.
- After all test runs: `fact_f13` row count exactly `663,126` (authoritative baseline from `F13-DATA-2098-CLEANUP-IMPL`), zero `2098`-dated rows, zero `import_log` rows referencing `2098`/`AUTO002`, and no new files under production `Data DKCL/F1.3` newer than the test run.
- `git diff --check` clean.
- Both pre-existing stashes (`F13-SHIPMENT-001`, pre-existing HTML maps) preserved untouched.

## Completion And Handoff

`COMPLETED / TECHNICAL PASS`. No PO UI check applies (test-infrastructure only). Symptom B remains open under `AUTO-IMPORT-011`'s checkpoint, unchanged, awaiting Product Owner live reproduction.

Next ticket: none self-activated. `NETWORK-MANAGEMENT-001` Phase 1 remains paused pending PO Gate 1; resuming it requires explicit Product Owner direction, separate from this ticket.
