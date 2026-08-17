# F41-PHASE-2 - Checkpoint 001

## 1. Ticket State

- Ticket: `F41-PHASE-2`
- State: `ACTIVE / IMPLEMENTATION AUTHORIZED`
- Executor: `Codex`
- Parent phase: `F41-PHASE-1`, Product Owner `PO PASS`.
- Activation baseline: `8902fc57`
- Activation date: `2026-08-17`

## 2. Baseline And Workspace

- Workspace: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`
- Branch: `codex/da-impl-006`
- Baseline commit: `8902fc57`
- Initial worktree status: only pre-existing untracked baseline exclusions `.claude/` and `Data QLML/`.
- These two paths remain excluded from inspection, staging, deletion, movement, restore, and modification.

## 3. Activation Authority

Product Owner decisions:

- `F41-PHASE-1`: `PO PASS`.
- Phase 2 authorized: multi-indicator Import for F1.3/F4.1, HUE/TCT; controlled first F4.1 import.
- Dashboard, BCVH Ranking and Evidence are explicitly out of scope.
- Do not guess the F4.1 portal export-match string.

## 4. Scope Lock

Allowed:

- Additive `fact_f41_national`.
- Dedicated positional F4.1 TCT parser for the frozen 38-column workbook.
- Indicator registry for F1.3/F4.1 carrying roots, filename rules, parsers and target tables.
- Generalized pipeline/watcher with unchanged F1.3 behavior and per-indicator test-isolation guards.
- Admin-only Import selector for indicator and HUE/TCT lane.
- Manual Import independent of portal automation.
- One deliberate, observed real F4.1 HUE and TCT import after schema, parsers, and isolated tests pass.

Locked out:

- Dashboard, BCVH Ranking, Evidence, Phase 3.
- Portal export-match implementation for F4.1.
- Manual movement/modification of source files.
- Unrelated UI/module changes.

## 5. Implementation Evidence

- Additive schema/migration:
  - `backend/migrate_f41_phase2_schema.js` creates `fact_f41_national` and adds `import_log.indicator`, `import_log.source_lane`, `import_log.trigger_source`.
  - `backend/src/db/schema.sql` includes the same fresh-bootstrap schema.
  - `backend/server.js` runs `applyF41Phase2Schema(activeDbPath)` after the existing Network Management Phase 1-4 migrations and F41 Phase 1 migration, before `app.listen()` and `startWatcher()`.
- F4.1 TCT parser:
  - `backend/src/services/f41TctExcelParser.js` is positional for the frozen 38-column workbook.
  - It skips header/legend/grand-total rows and requires exactly 46 reporting units.
- Multi-indicator Import foundation:
  - `backend/src/services/importIndicatorRegistry.js` carries F1.3/F4.1 roots, filename rules, HUE/TCT parsers, and target tables.
  - `backend/src/services/importPipeline.js`, `backend/src/services/importProcessor.js`, and `backend/src/services/importWatcher.js` were generalized through the registry while preserving F1.3 defaults and test-isolation guards.
  - `backend/src/controllers/importController.js` accepts explicit `indicator` and HUE/TCT lane for manual Import.
  - `frontend/src/components/UploadWidget.jsx` adds the Admin Import selector for `F1.3`/`F4.1` and `HUE`/`TCT`.
- Controlled real Import:
  - Applied live migration with `node migrate_f41_phase2_schema.js`; migration inserted no business data.
  - Deliberately ran manual F4.1 HUE and TCT pipeline imports only after targeted schema/parser/pipeline tests passed.
  - The source files were not moved by hand; the Import pipeline moved accepted files to `Data DKCL/F4.1/Processed/HUE/` and `Data DKCL/F4.1/Processed/TCT/`.
- Remediation 001 — TCT published-rate contract:
  - Fixed TC-4 defect: every F4.1 TCT published-rate column is now raw TEXT instead of REAL.
  - Identified rate columns: `tl_ptc_nop_tien`, `tl_dung_12_5h`, `tl_dung_72h`, `tl_qua_12_5h`, `tl_qua_72h`, `tl_chuyen_hoan`, `tl_ptc_8h_xnd_bd1`, `tl_ptc_8h_co_tms`, `tl_ptc_8h_lan_dau_xnd_bd1`, `tl_ptc_8h_lan_dau_co_tms`.
  - `backend/src/services/f41TctExcelParser.js` preserves these values as trimmed raw TEXT including `%`; count columns remain numeric.
  - `backend/src/db/schema.sql` and `backend/migrate_f41_phase2_schema.js` define these columns as TEXT for fresh and upgraded environments.
  - Existing live `fact_f41_national` was migrated transactionally by rebuilding the table with corrected TEXT columns, preserving row count, keys, indexes, and the `import_log` foreign-key relationship.
  - The 46 TCT rows were reloaded from the existing unmodified Processed workbook read-only; source files were not moved or modified.

## 6. Validation Evidence

- Targeted F4.1 validation PASS:
  - `node --test migrate_f41_phase2_schema.test.js test_f41TctExcelParser.js test_f41ImportPipeline.js server.startupMigrations.test.js test_f41HueExcelParser.js migrate_f41_phase1_schema.test.js`
  - Result: `15/15` tests passed.
- F1.3 regression validation PASS:
  - `node --test test_importProcessor.js test_importPipelineRace.js test_importHistoryPresenter.js test_importHistoryDefect3Recovery.js test_e2e_import_engine.js test_dkclImportOperationsContract.js`
  - Result: all 6 test files passed; existing F1.3 processor, race, history, E2E import, and DKCL contract checks stayed green.
- Frontend validation PASS:
  - `npm run build` in `frontend/` passed.
  - `npm run lint` in `frontend/` passed with pre-existing warnings outside this Phase 2 change.
- Live pre/post proof:
  - `fact_f13` before real F4.1 import: `709,234`.
  - `fact_f13` after real F4.1 import: `709,234`.
- Live HUE reconciliation after controlled import:
  - `fact_f41` date `2026-08-01`: total `4,695`; `Đạt 2,863`; `Không đạt 1,581`; blank `251`; rate `60.98%`.
- Live TCT reconciliation after controlled import:
  - `fact_f41_national` date `2026-08-01`: `46` reporting-unit rows; `0` null unit codes; grand total excluded.
- Live Import logs:
  - HUE log `id=1245`, indicator `F4.1`, source lane `HUE`, trigger `MANUAL`, status `SUCCESS`, total `4,695`, errors `0`, skipped `0`.
  - TCT log `id=1246`, indicator `F4.1`, source lane `TCT`, trigger `MANUAL`, status `SUCCESS`, total `46`, errors `0`, skipped `0`.
- Retry/deduplication proof:
  - `test_f41ImportPipeline.js` re-submits the same F4.1 HUE date in an isolated temp Import root and receives `requiresConfirmation=true`, with `fact_f41` and `fact_f13` unchanged.
- Remediation 001 validation PASS:
  - `node --test migrate_f41_phase2_schema.test.js test_f41TctExcelParser.js test_f41ImportPipeline.js server.startupMigrations.test.js`
  - Result: `7/7` remediation-focused tests passed before the live DB repair.
  - `node --test test_f41HueExcelParser.js migrate_f41_phase1_schema.test.js migrate_f41_phase2_schema.test.js test_f41TctExcelParser.js test_f41ImportPipeline.js server.startupMigrations.test.js`
  - Result: `16/16` F4.1/remediation tests passed after path updates to read the Phase 2 Processed workbooks.
  - F1.3 regression command remained PASS: `node --test test_importProcessor.js test_importPipelineRace.js test_importHistoryPresenter.js test_importHistoryDefect3Recovery.js test_e2e_import_engine.js test_dkclImportOperationsContract.js`.
  - Live TCT after transactional migration and read-only workbook reload: `46` units; grand total absent; Huế numerator `2,863`; denominator `4,684`; published rate stored exactly as `61.12%`.
  - Live TCT type check: all ten published-rate columns are `TEXT`; all ten rate columns have `%` strings on all 46 rows where present.
  - Live HUE remained `4,695 / 2,863 / 1,581 / 251`.
  - Live `fact_f13` remained `709,234`.
  - Reconciliation reload log: `import_log.id=1247`, indicator `F4.1`, source lane `TCT`, trigger `MANUAL_RECONCILE`, status `SUCCESS`, total `46`, errors `0`, skipped `0`.

## 7. Handoff

`PHASE 2 IMPLEMENTED / READY FOR PO CHECK`.

Phase 3 remains not activated. Dashboard, BCVH Ranking, Evidence, portal export-match implementation, and unrelated modules remain out of scope.
