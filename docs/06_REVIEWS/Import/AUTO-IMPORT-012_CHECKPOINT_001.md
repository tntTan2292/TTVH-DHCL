# AUTO-IMPORT-012 CHECKPOINT 001

## Executive State

- Ticket: `AUTO-IMPORT-012`
- Current state: `COMPLETED / TECHNICAL PASS`
- Follow-up to `AUTO-IMPORT-011` (commit `d8771174`, acknowledged by Product Owner)

## Root Cause Recap (from AUTO-IMPORT-011)

`backend/src/services/importPipeline.js` resolved `BASE_INCOMING`/`BASE_PROCESSING`/`BASE_PROCESSED`/`BASE_ERROR`/`BASE_QUARANTINE` unconditionally from the real production `Data DKCL/F1.3` tree — no test override existed. `test_dkclHueF13SyncService.js` used these paths and the live database directly; running it (confirmed twice under `AUTO-IMPORT-011`) recreated the `2098-xx`/`AUTO002_000x` fixture pattern in production `fact_f13`/`import_log`.

## Fix

### 1. File-system isolation guard (mirrors the existing database guard)

`backend/src/services/importPipeline.js`:

```js
const operationalDataRoot = path.resolve(process.cwd(), '../Data DKCL/F1.3');
const configuredTestDataRoot = process.env.QIS_TEST_DATA_ROOT
    ? path.resolve(process.env.QIS_TEST_DATA_ROOT)
    : null;

if (process.env.NODE_ENV === 'test') {
    if (!configuredTestDataRoot) {
        throw new Error('NODE_ENV=test requires QIS_TEST_DATA_ROOT to point to an isolated Import sandbox directory.');
    }
    if (configuredTestDataRoot === operationalDataRoot) {
        throw new Error('QIS_TEST_DATA_ROOT must not resolve to the operational Data DKCL/F1.3 directory.');
    }
}

const dataRoot = process.env.NODE_ENV === 'test' ? configuredTestDataRoot : operationalDataRoot;
```

`BASE_INCOMING`/etc. are now `path.join(dataRoot, 'Incoming')` and so on. `dataRoot`/`operationalDataRoot` exported for test assertions.

### 2. Shared sandbox helper

New file `backend/test/importTestSandbox.js`: `createSandbox(prefix)` builds a fresh OS temp directory with `Incoming/Processing/Processed/Error/Quarantine × HUE/TCT` subfolders and a unique temp SQLite path; `initSchema(db)` applies `backend/src/db/schema.sql` to it; `destroySandbox(sandbox)` removes the temp tree.

### 3. Applied to all four Import test files

| File | Isolates | How |
| --- | --- | --- |
| `test_dkclHueF13SyncService.js` | DB + file system | Uses the shared sandbox helper; sets `NODE_ENV=test`, `QIS_TEST_DB_PATH`, `QIS_TEST_DATA_ROOT`, `QIS_ALLOW_TEST_FUTURE_DATE` before requiring `db.js`/`importPipeline.js`; new `initializeSandbox()` asserts isolation and applies schema before `runTests()`; `destroySandbox` in `.finally()`. |
| `test_importPipelineRace.js` | DB (already isolated) + file system (newly isolated) | Already had its own temp-dir DB isolation; added `QIS_TEST_DATA_ROOT` pointing into the same temp dir with an `Incoming/Processing/Processed/Error/Quarantine/HUE` layout, and one new assertion. |
| `test_importProcessor.js` | DB only (no file-system writes in this suite) | Uses the shared sandbox helper for `QIS_TEST_DB_PATH`; asserts isolation and applies schema at the top of `runTests()`. |
| `test_e2e_import_engine.js` | DB only (no file-system writes in this suite) | Same pattern as `test_importProcessor.js`; keeps its existing `QIS_ALLOW_TEST_FUTURE_DATE` fixture flag from `AUTO-IMPORT-011`. |

`QIS_ALLOW_TEST_FUTURE_DATE=true` is set only inside these test files, never in any `.env`, launcher, or production configuration — confirmed by inspection; no other file in the repository sets this variable.

## Validation Evidence

Fail-fast guards, proven directly:

```
NODE_ENV=test node -e "require('./src/config/db')"
→ Error: NODE_ENV=test requires QIS_TEST_DB_PATH to point to an isolated SQLite database.

NODE_ENV=test QIS_TEST_DB_PATH=/tmp/x.sqlite node -e "require('./src/services/importPipeline')"
→ Error: NODE_ENV=test requires QIS_TEST_DATA_ROOT to point to an isolated Import sandbox directory.
```

Test suite results (each file run twice in immediate succession, to prove no flakiness from residual sandbox state):

| Suite | Run 1 | Run 2 |
| --- | --- | --- |
| `test_importProcessor.js` | 53 passed, 1 failed | 53 passed, 1 failed |
| `test_e2e_import_engine.js` | 65 passed, 0 failed | 65 passed, 0 failed |
| `test_dkclHueF13SyncService.js` | 129 passed, 0 failed | 129 passed, 0 failed |
| `test_importPipelineRace.js` | 41 passed, 0 failed | 41 passed, 0 failed |

The one remaining `test_importProcessor.js` failure (`TEST 5: Empty parsedData`) is the same pre-existing, unrelated defect already documented under `AUTO-IMPORT-010`/`AUTO-IMPORT-011` (a `koffi`-adjacent commit-verification message unrelated to date validation or test isolation) — confirmed present before any of this ticket's or `AUTO-IMPORT-011`'s changes.

Production-safety proof, checked after all runs above:

1. `find "Data DKCL/F1.3" -newer backend/src/db/database.sqlite -type f` (excluding `Quarantine`, which legitimately predates this session) — **empty**. No new production file created.
2. `SELECT COUNT(*) FROM fact_f13` — **663,126**, exactly matching the authoritative baseline recorded at `F13-DATA-2098-CLEANUP-IMPL`'s closure.
3. `SELECT COUNT(*) FROM fact_f13 WHERE ngay_do_kiem LIKE '2098%'` — **0**. `SELECT COUNT(*) FROM import_log WHERE file_name LIKE '%2098%' OR file_name LIKE '%AUTO002%'` — **0**.

`git diff --check` clean. Both pre-existing stashes (`F13-SHIPMENT-001`, pre-existing HTML maps) preserved, `git stash list` unchanged.

## Symptom B — Unchanged

Not addressed in this ticket, per explicit instruction. Remains `discovery only`, blocked on Product Owner live reproduction, as recorded in `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_001.md`.

## Files Changed

- `backend/src/services/importPipeline.js` — file-system isolation guard.
- `backend/test/importTestSandbox.js` — new shared sandbox helper.
- `backend/test_dkclHueF13SyncService.js`, `backend/test_importPipelineRace.js`, `backend/test_importProcessor.js`, `backend/test_e2e_import_engine.js` — isolated per the table above.

## Next Action

None self-activated. `NETWORK-MANAGEMENT-001` remains paused pending Product Owner PO Gate 1 review, unaffected by this ticket. Symptom B awaits Product Owner live reproduction.
