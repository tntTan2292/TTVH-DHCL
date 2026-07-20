# AUTO-IMPORT-005 Checkpoint 003

- Ticket: `AUTO-IMPORT-005 TCT Manual Backfill and Shared DKCL Background Operations`
- Status: `COMPLETED / PO PASS`
- Checkpoint status: `PO ACCEPTED`
- Branch: `codex/auto-import-005`
- Date: `2026-07-20`

## Implemented Scope

Implemented the TCT F1.3 manual backfill execution vertical slice:

- Enabled TCT `Update` only when the operator selects at least one currently scanned `MISSING` date.
- Added a sequential in-memory TCT queue with one active queue at a time.
- Added queue status, progress, graceful Stop, and eligible Retry APIs.
- Added pre-queue TCT session preflight.
- Added explicit interactive TCT re-authentication action for operator-driven login only.
- Reused the shared DKCL portal/profile workflow with source configuration and strict Hue/TCT profile separation.
- Added per-date background TCT F1.3 portal workflow, workbook validation, SSOT-approved 34-unit parse/import handoff, evidence capture, and temp workbook cleanup.
- Displayed TCT queue progress, item state, evidence, errors, retry controls, and in-memory restart warning in Data Import Center.

Not implemented:

- No unattended scheduling.
- No credential storage.
- No automatic credential-based login.
- No queue persistence.
- No force replacement.
- No Dashboard UI change.
- No SSOT, KPI formula, ranking-rule, 34-unit population, BCVH mapping, schema, AUTO-IMPORT-002/003 behavior, or TCT scope change.
- No PO UI acceptance testing.

## Files Changed

- `backend/src/services/tctF13BackfillService.js`
- `backend/src/services/dkclSessionPreflightService.js`
- `backend/src/services/dkclHueF13PortalClient.js`
- `backend/src/controllers/dkclSharedOperationsController.js`
- `backend/src/routes/importRoutes.js`
- `backend/test_tctF13BackfillService.js`
- `backend/test_dkclSessionPreflightService.js`
- `frontend/src/pages/DataImportCenter.jsx`
- `frontend/src/pages/dataImportTctScan.test.js`
- `frontend/src/pages/dataImportBackfillQueue.test.js`
- `docs/10_TICKETS/AUTO-IMPORT-005_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_003.md`

## API Contracts

### Session

`POST /api/import/dkcl/session/preflight`

- Request: `{ "source": "TCT" }`
- States: `SESSION_VALID`, `AUTHENTICATION_REQUIRED`, `SESSION_CHECK_FAILED`
- Safe behavior: no credentials, cookies, tokens, headers, localStorage, or profile paths are returned.

`POST /api/import/dkcl/session/interactive-auth`

- Request: `{ "source": "TCT" }`
- Opens a visible browser only for explicit operator login.
- Verifies the session after login, closes the browser context, and returns safe preflight status.

### TCT Queue

`POST /api/import/dkcl/tct/f13/backfill-queue`

- Request: `{ "dates": ["YYYY-MM-DD"] }`
- Creates one active queue only when all dates are valid `MISSING` dates and TCT preflight is `SESSION_VALID`.
- Rejects duplicate submitted dates, dates already completed, dates with inconsistent evidence, and dates already present in an active queue.
- Rejects before queue creation when TCT session is invalid.

`GET /api/import/dkcl/tct/f13/backfill-queue/active`

- Returns the active in-memory TCT queue or `404 QUEUE_NOT_FOUND`.

`GET /api/import/dkcl/tct/f13/backfill-queue/:queueId`

- Returns queue progress, item statuses, evidence, and restart warning.

`POST /api/import/dkcl/tct/f13/backfill-queue/:queueId/stop`

- Requests graceful stop. The running date is allowed to finish; remaining queued items are marked `STOPPED`.

`POST /api/import/dkcl/tct/f13/backfill-queue/:queueId/retry`

- Request: `{ "business_date": "YYYY-MM-DD" }`
- Allowed only for prior item statuses `FAILED` or `AUTHENTICATION_REQUIRED`.
- `SUCCESS` items cannot be retried.
- Retry creates a new queue for the same date after normal preflight and completed-date checks.

## Queue Rules

- One active TCT queue at a time.
- Dates are processed sequentially in ascending business-date order.
- Required states: `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`, `AUTHENTICATION_REQUIRED`, `STOPPED`, `SKIPPED`.
- Queue state is in memory for this ticket.
- Operator-facing warning: backend restart can clear the active queue state.
- No force replacement.
- Completed dates are not selectable and cannot be queued.
- Duplicate dates are rejected before queue creation.
- PO state-classification defect fix:
  - `COMPLETE`: exactly `34` valid ranked units plus success evidence; not selectable and cannot be retried/updated.
  - `MISSING`: no valid national fact rows and no active/stale import evidence; selectable for controlled Update.
  - `INCOMPLETE`: fewer than `34` valid ranked units, including `0/34` with stale, failed, or incomplete evidence; selectable with operator action `Xử lý lại`.
  - Incomplete dates may be processed through the controlled queue without replacing a true `COMPLETE` date.
  - During import, the service rechecks the date before DB write; if it has become `COMPLETE`, replacement is blocked.
  - Invalid/incomplete rows are superseded through the existing atomic national import transaction while preserving import-log audit history.

## Session and Browser Behavior

- TCT queue creation always runs TCT session preflight first.
- `SESSION_VALID`: queue is created and item execution uses the TCT persistent profile in background/headless mode.
- `AUTHENTICATION_REQUIRED`: queue creation is rejected before `RUNNING`; Data Import Center exposes `Đăng nhập TCT DKCL` / `Đăng nhập lại`.
- `SESSION_CHECK_FAILED`: queue creation is rejected with a distinct technical error.
- Only the explicit interactive-auth action opens a visible browser.
- Hue and TCT profile directories remain separate.
- Profile locking and lock release remain owned by the shared portal client.

## Per-Date Import Contract

For each selected TCT date:

- Open DKCL F1.3 using the TCT profile.
- Set GR = `Tỉnh`.
- Set From date and To date to the selected business date.
- Run `Thống kê`.
- Click `Xuất toàn bộ`.
- Wait for the generated file through the shared DKCL file-management workflow.
- Identify the newest matching TCT F1.3 export.
- Download workbook to the approved temporary directory only.
- Validate XLSX type and workbook structure.
- Parse exactly the SSOT-approved 34 ranked units.
- Import atomically through the existing national F1.3 destination/import contract.
- Apply accepted ranking order: `tl_ptc_dung_qd_ct DESC`, then `sl_bg_ptc DESC`, without shared-tie grouping.
- Delete the temporary workbook after success or failure and verify deletion.

## Evidence Fields

Per item response includes, when available:

- business date;
- queue ID and run ID;
- start/end timestamps;
- downloaded filename;
- workbook row count;
- parsed ranked-unit count;
- imported database row count;
- Hue volume, pass, KPI, and nationwide rank;
- total ranked population;
- success/error log evidence;
- error code and message;
- temporary-file deletion confirmation.

## Validation

- `node backend\test_tctF13BackfillService.js` - PASS.
- `node backend\test_dkclSessionPreflightService.js` - PASS.
- `node backend\test_dkclHueF13BackfillService.js` - PASS, `35` passed / `0` failed.
- `node backend\test_dkclHueF13SyncService.js` - PASS, `84` passed / `0` failed.
- `node --check` on changed backend files and backend tests - PASS.
- `node frontend\src\pages\dataImportTctScan.test.js` - PASS.
- `node frontend\src\pages\dataImportBackfillQueue.test.js` - PASS.
- `npm.cmd run lint` - PASS with pre-existing warnings in unrelated frontend files.
- `npm.cmd run build` - PASS with existing Vite bundle-size warning.

## Runtime Verification Status

Backend listener on `localhost:5050` was confirmed as this project backend through `GET /api/import/f13/status`, then safely restarted from `backend/server.js`.

Runtime API checks on the refreshed backend:

- `POST /api/import/dkcl/session/preflight` with `source=TCT` returned `SESSION_VALID`, `profile.source=TCT`, and `profile.isolated=true`.
- `GET /api/import/dkcl/tct/f13/coverage-summary?from_date=2026-07-19&to_date=2026-07-20` returned first business date `2026-06-28`, latest business date `2026-07-19`, imported-date count `2`, latest successful import `F1.3-2026.07.19.xlsx`, completed date `2026-07-19`, and missing date `2026-07-20`.
- `GET /api/import/dkcl/tct/f13/missing-dates?from_date=2026-07-19&to_date=2026-07-20` returned `2026-07-19` as `COMPLETE` / not selectable and `2026-07-20` as `MISSING` / selectable.
- `POST /api/import/dkcl/tct/f13/backfill-queue` with completed date `2026-07-19` returned `400 DATE_ALREADY_COMPLETED`.
- `GET /api/import/dkcl/tct/f13/backfill-queue/active` returned `404 QUEUE_NOT_FOUND` when no queue was active.
- Existing import history continued to load through `GET /api/import/f13/status`.
- Database evidence check on `2026-07-19` confirmed `fact_f13_national` has `34` rows and `34` distinct ranked units. The current shared `import_log` table has no `source_type` column, so log evidence remains interpreted through the existing filename/date contract.

PO defect runtime recheck on refreshed `localhost:5050`:

- `GET /api/import/dkcl/tct/f13/missing-dates?from_date=2026-07-13&to_date=2026-07-19` returned `complete_count=1`, `incomplete_count=6`, `missing_count=0`.
- Retryable/selectable dates returned: `2026-07-13`, `2026-07-14`, `2026-07-15`, `2026-07-16`, `2026-07-17`, `2026-07-18`.
- Completed dates returned: `2026-07-19`.
- `2026-07-18` returned `status=INCOMPLETE`, `selectable=true`, `action=Xử lý lại`, evidence `row_count=0`, `distinct_ranked_unit_count=0`, `success_log_count=4`, `import_log_count=5`, `failed_log_count=1`.

Source-separation and cumulative-ranking defect fix:

- Hue operational KPI, volume, pass, fail, returned/unknown, and operational analysis remain sourced from the Hue `fact_f13` dataset.
- TCT national workbook data is used only for national population coverage and Hue nationwide rank.
- Dashboard KPI response now includes `source_metadata.operational.source = HUE_F13` and `source_metadata.national_rank.source = TCT_NATIONAL`.
- Multi-day nationwide ranking is calculated from cumulative national data across the selected range:
  - cumulative volume = `SUM(sl_bg_ptc)`;
  - cumulative pass = `SUM(sl_ptc_dung_qd_ct)`;
  - cumulative KPI = cumulative pass / cumulative volume;
  - ranking order = cumulative KPI descending, then cumulative volume descending, with no shared-tie grouping.
- The rank service does not average daily KPI percentages, average daily ranks, or reuse the latest day rank for a multi-day range.
- If any selected national date lacks a complete 34-unit population, the Dashboard returns `available=false`, `status=PARTIAL_NATIONAL_DATA`, and lists `missing_dates` / `incomplete_dates`.

Runtime checks after backend refresh:

- `GET /api/f13/dashboard/kpi?from_date=2026-07-18&to_date=2026-07-18&ma_bcvh=all` returned Hue operational `total_bg=3174`, Hue operational `passed_rate=61.8`, national rank `19/34`, national source `TCT_NATIONAL`.
- `GET /api/f13/dashboard/kpi?from_date=2026-07-19&to_date=2026-07-19&ma_bcvh=all` returned Hue operational `total_bg=2399`, Hue operational `passed_rate=52.6`, national rank `24/34`, national source `TCT_NATIONAL`.
- `GET /api/f13/dashboard/kpi?from_date=2026-07-18&to_date=2026-07-19&ma_bcvh=all` returned Hue operational `total_bg=5573`, Hue operational `total_passed=3224`, Hue operational `passed_rate=57.9`, national rank `21/34`, national cumulative volume `5574`, national cumulative pass `3148`, period `2026-07-18..2026-07-19`.
- The range check confirms national cumulative volume may differ from Hue operational volume and does not overwrite the Hue operational KPI.
- `GET /api/f13/dashboard/kpi?from_date=2026-07-13&to_date=2026-07-19&ma_bcvh=all` returned `national_rank.available=false`, `status=PARTIAL_NATIONAL_DATA`, and missing national dates `2026-07-13`, `2026-07-14`, `2026-07-15`, `2026-07-16`, `2026-07-17`.

The live import action was not forced during this checkpoint evidence update because the previously controlled TCT date `2026-07-19` is already completed and force replacement is excluded. A live queue execution requires an operator-selected `MISSING` date whose source workbook is available under the active TCT session.

## Known Limitations

- Queue state is intentionally in memory and can be cleared by backend restart.
- A visible browser appears only for explicit TCT re-authentication.
- No unattended recovery exists for failed queue items; operators use eligible Retry.
- Live portal availability, DKCL export latency, and TCT session expiry can still make a date fail safely with evidence.

## Blockers

No genuine Product Owner business, SSOT, KPI, ranking, population, schema, or scope blocker is open for AUTO-IMPORT-005.

## PO Acceptance

Product Owner accepted `AUTO-IMPORT-005 = PO PASS` on `2026-07-20`.

Accepted operational result:

- TCT F1.3 manual backfill workflow: `PASS`.
- TCT session preflight and explicit re-authentication action: `PASS`.
- Missing, incomplete, and completed date-state contract: `PASS`.
- Controlled re-import of incomplete national dates without replacing true `COMPLETE` 34/34 datasets: `PASS`.
- Sequential in-memory queue, graceful Stop, and eligible Retry: `PASS`.
- Hue/TCT source separation: `PASS`.
- Cumulative range-based nationwide ranking: `PASS`.
