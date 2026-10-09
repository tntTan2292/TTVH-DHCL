# F11-PHASE-2 Manifest

Status: `IMPLEMENTED / TECH PASS / FIRST LIVE LOAD DONE / READY FOR PO REVIEW (2026-10-09)`. Import of the Huế F1.1 detail file through the shared Import pipeline (manual lane). No portal download, no TCT lane, no dashboard.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Scope](#4-scope)
- [5. Changes Made](#5-changes-made)
- [6. Validation](#6-validation)
- [7. First Live Load](#7-first-live-load)
- [8. Residual / Notes](#8-residual--notes)
- [9. Next Ticket](#9-next-ticket)
- [10. PO Acceptance Checklist](#10-po-acceptance-checklist)

## 1. Ticket Information

- Ticket ID: `F11-PHASE-2` — `F1.1 Import (Huế lane, manual)`
- Parent: `F11-MODULE-PLAN` (checkpoint Section 13); depends on `F11-PHASE-1` (Opus review PASS, gates N-1/N-2/N-7/N-8 fixed)
- Owner: `Claude Code (Sonnet 5.5)`
- Authorization: `PO in chat 2026-10-09: "ok vậy bạn nạp thử đi"` (go-ahead for the first load)
- Branch `codex/da-impl-006`; baseline `9d13d79`

## 2. Objective

Let a `F1.1-YYYY.MM.DD.xlsx` Huế detail file enter the system through the same Import pipeline as F1.3 and F4.1, and load the 2026-10-07 file once, observed.

## 3. Current Status

- State: `IMPLEMENTED / TECH PASS`, first live load done and verified.
- PO UI Check Required: `Yes, small` — in the Import Center, indicator list now has `F1.1` (upload widget). The PO may check that the option appears; backend restart is needed for the running server to pick up the new code.

## 4. Scope

In: registry entry `F1.1` (HUE lane only, `PLANNED`, manual), import function for `fact_f11`, pipeline branch, upload-widget option, tests, one live load. Out: portal login/download and auto-backfill (Phase 3), TCT lane (Phase 4), any API/dashboard, any change to F1.3/F4.1 behavior.

## 5. Changes Made

| File | Change |
| --- | --- |
| `backend/src/services/importIndicatorRegistry.js` | `INDICATORS['F1.1']`: folder `F1.1`, name pattern `F1.1-YYYY.MM.DD.xlsx`, HUE lane → `fact_f11`, `MANUAL_ONLY` with reason, status `PLANNED` (so auto-backfill coverage/queue, which look only at ACTIVE/PAUSED, ignore it until Phase 3), test-sandbox root `QIS_TEST_DATA_ROOT_F11` (fallback sibling `F1.1`) |
| `backend/src/services/importProcessor.js` | `importF11ParsedData` (same transaction contract as F4.1/HUE: delete-by-date only when forced and verified empty, scoped post-write count, FAILED log on error) |
| `backend/src/services/importPipeline.js` | indicator branch for `F1.1` |
| `frontend/src/components/UploadWidget.jsx`, `pages/DataImportCenter.jsx` | `F1.1` option in the indicator select; caption mentions F1.1 |
| `backend/test_f11ImportPipeline.js` | 6 sandbox tests (registry; import/retry-confirmation/forced replace; bad value → Error + FAILED log; wrong file-name family rejected; real file through the pipeline) |

## 6. Validation

- `node --test --experimental-sqlite test_f11ImportPipeline.js`: **6/6**, including the real 2026-10-07 file imported through the pipeline in a sandbox: 2.621 rows, Đạt 2.348, Không đạt 240, blank 33, **89,58 %**, six BCVH 2.338 / 2.611, pair grid sums to 2.621; the PO's source file is copied, never moved or changed.
- Regression: `test_f41ImportPipeline.js`, `test_importProcessor.js`, `test_importPipelineRace.js`, `test_dkclHueF13SyncService.js`, `test_autoBackfillSafety.js` 11/11, `test_autoBackfillQueueService.js` 45/45 all pass (one unexplained single failure of `test_f41ImportPipeline.js` in one loop run did not reproduce in 9 further runs). Full backend sweep **475/479**; the 4 failures are the known pre-existing ones (3 need an HTTP server, 1 timeline source-text assertion). Frontend Import Center tests 4/4. `oxlint` 0 new warnings on the changed code (pre-existing warnings elsewhere in the touched files unchanged).

## 7. First Live Load

One-off run against the live database (2026-10-09), observed: the `fact_f11` table was created by the additive migration; the file was **copied** into `Data DKCL/F1.1/Incoming/HUE/` and imported through `executeImport` (manual lane, no force). Result: `total=2621, inserted=2621, skipped=0`; `fact_f11` = 2.621 rows for 2026-10-07: Đạt 2.348, Không đạt 240, blank 33, rate **89,58 %**. `import_log` +1 row (id 1794, F1.1 / HUE / SUCCESS). Row counts before = after for `fact_f13` (891.465), `fact_f13_national` (9.350), `fact_f41` (847.008), `fact_f41_national` (6.460). The processed copy is in `Data DKCL/F1.1/Processed/HUE/F1.1-2026.10.07.xlsx`; the PO's original at `Data DKCL/F1.1-2026.10.07.xlsx` is untouched (SHA-256 `11aa0168…573d8c`). No database backup was taken: the change only adds one table and one log row.

## 8. Residual / Notes

- **Backend restart needed** for the running server to know F1.1 (upload option works through the API only after restart). The PO decides the moment (an import or backfill may be running).
- The stray 16-byte `Data DKCL/F1.1/Incoming/TCT/test.xlsx` makes the watcher log one error line at the next restart (the TCT lane is not registered yet); it changes no data. The PO may delete it.
- Non-blocking review items still open for the dashboard queries: N-3 (redundant `idx_f11_date`), N-4 (covering month × BCVH index), N-5 (week key as date range), N-6 (index on `ma_bg`, not needed after PD-18).

## 9. Next Ticket

`F11-PHASE-3` (read-only portal probe, then automatic download and backfill) and `F11-PHASE-4` (TCT lane + national rank by delivering province, PD-17) — each needs explicit PO authorization. Then `F11-DASHBOARD-RANKING-01`.

## 10. PO Acceptance Checklist

- Restart the backend when convenient, open Import Center → upload widget → the indicator list shows `F1.1`.
- Confirm that 2.621 rows / 89,58 % for 2026-10-07 is what you expect to see after the load.
