# AUTO-IMPORT-005 Checkpoint 002

- Ticket: `AUTO-IMPORT-005 TCT Manual Backfill and Shared DKCL Background Operations`
- Status: `ACTIVE / IMPLEMENTATION`
- Checkpoint status: `COMPLETED - TECHNICAL PASS`
- Branch: `codex/auto-import-005`
- Date: `2026-07-20`

## Implemented Scope

Implemented the narrowest vertical slice only:

- Shared DKCL session preflight for `HUE` and `TCT`.
- TCT F1.3 coverage summary API for existing national F1.3 destination data.
- TCT F1.3 missing-date scan API using the operator-selected date range.
- Data Import Center TCT scan-only section with coverage, session status, date range inputs, scan action, existing/completed/missing dates, selectable missing dates, and disabled/unavailable `Update`.

Not implemented in this checkpoint:

- No TCT queue.
- No TCT Update execution.
- No portal file download.
- No workbook parse/import.
- No Stop or Retry.
- No unattended scheduling.
- No credential storage or automatic credential-based login.
- No SSOT, KPI, ranking, 34-unit population, Dashboard UI, BCVH mapping, or schema change.

## Files Changed

- `backend/src/services/dkclHueF13PortalClient.js`
- `backend/src/services/dkclSessionPreflightService.js`
- `backend/src/services/tctF13BackfillService.js`
- `backend/src/controllers/dkclSharedOperationsController.js`
- `backend/src/routes/importRoutes.js`
- `backend/test_dkclSessionPreflightService.js`
- `backend/test_tctF13BackfillService.js`
- `frontend/src/pages/DataImportCenter.jsx`
- `frontend/src/pages/dataImportTctScan.test.js`
- `docs/10_TICKETS/AUTO-IMPORT-005_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_002.md`

## API Contracts

### Shared Session Preflight

`POST /api/import/dkcl/session/preflight`

Request:

```json
{ "source": "HUE" }
```

or:

```json
{ "source": "TCT" }
```

Response states:

- `SESSION_VALID`: existing persistent profile is authenticated and background operation may continue.
- `AUTHENTICATION_REQUIRED`: queue/action must be rejected before `RUNNING`; operator must re-authenticate.
- `SESSION_CHECK_FAILED`: backend could not verify the session; operator receives a concise safe error.

Security behavior:

- Preflight uses `requireExistingSession=true`.
- Preflight does not pass username/password.
- Preflight does not implement automatic login.
- Preflight does not expose credentials, cookies, tokens, headers, localStorage, or profile paths.
- Profile locks are acquired by the portal client and released through `close()` in `finally`.
- Hue profile and TCT profile are configured separately.

### TCT Coverage Summary

`GET /api/import/dkcl/tct/f13/coverage-summary?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`

Response includes:

- `source = TCT`
- `report = F1.3`
- `ranked_population_count = 34`
- `available_years`
- `available_months`
- `first_business_date`
- `last_business_date`
- `imported_dates_count`
- `latest_successful_import`
- optional `selected_range` with existing, completed, and missing dates.

### TCT Missing-Date Scan

`GET /api/import/dkcl/tct/f13/missing-dates?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`

Rules:

- Range is supplied by the operator.
- Range is inclusive.
- No arbitrary maximum range is imposed.
- A date is `COMPLETE` only when `fact_f13_national` has exactly `34` rows, `34` distinct ranked units, and success import evidence.
- Partial evidence becomes `MANUAL_REVIEW_REQUIRED` and is not selectable.
- Missing dates are selectable.
- Date result lists are duplicate-free.

## Runtime/API Evidence

Backend process on `localhost:5050` was restarted after confirming the previous listener was this project `server.js`.

`POST /api/import/dkcl/session/preflight` with `source=TCT` returned:

- `success=true`
- `status=SESSION_VALID`
- `profile.source=TCT`
- `profile.isolated=true`

`GET /api/import/dkcl/tct/f13/coverage-summary?from_date=2026-07-19&to_date=2026-07-20` returned:

- first business date: `2026-06-28`
- latest business date: `2026-07-19`
- available years: `2026`
- available months: `2026-06`, `2026-07`
- imported-date count: `2`
- latest successful import: `F1.3-2026.07.19.xlsx`, business date `2026-07-19`, total records `34`
- selected range existing/completed: `2026-07-19`
- selected range missing: `2026-07-20`

`GET /api/import/dkcl/tct/f13/missing-dates?from_date=2026-07-19&to_date=2026-07-20` returned:

- total days: `2`
- completed: `1`
- missing: `1`
- manual review: `0`
- `2026-07-19`: `COMPLETE`, not selectable, `34/34` ranked units
- `2026-07-20`: `MISSING`, selectable, `0/34` ranked units

Existing import history endpoint continued to load through `GET /api/import/f13/status`.

## Frontend Contract

Data Import Center now has a separate TCT F1.3 section:

- Displays TCT session status.
- Displays TCT coverage summary.
- Allows operator-selected `Từ ngày` and `Đến ngày`.
- Calls TCT missing-date scan.
- Shows existing, completed, missing, and manual-review counts.
- Allows selecting only missing dates.
- Shows `Update chưa khả dụng` and keeps the TCT Update button disabled for this checkpoint.

No TCT queue/download/sync endpoint is called by the frontend in Checkpoint 002.

## Validation

- `node backend\test_dkclSessionPreflightService.js` - PASS.
- `node backend\test_tctF13BackfillService.js` - PASS.
- `node --test frontend\src\pages\dataImportTctScan.test.js frontend\src\pages\dataImportBackfillQueue.test.js` - PASS.
- `node backend\test_dkclHueF13SyncService.js` - PASS, `84` passed / `0` failed.
- `node backend\test_dkclHueF13BackfillService.js` - PASS, `35` passed / `0` failed.
- `node --check` on changed backend files and new backend tests - PASS.
- `npm.cmd run lint` - PASS with pre-existing warnings.
- `npm.cmd run build` - PASS with existing bundle-size warning.
- API checks against refreshed `localhost:5050` - PASS.

## Known Limitations

- TCT Update, queue creation, Stop, Retry, portal export/download, workbook parse/import, and item evidence are intentionally deferred.
- TCT queue state is not implemented yet; future queue state may remain in memory under the ticket boundary.
- If preflight returns `AUTHENTICATION_REQUIRED`, the current checkpoint shows the operator-safe state but does not yet implement a dedicated interactive re-authentication button.

## Blockers

No genuine Product Owner business, SSOT, KPI, ranking, population, schema, or scope blocker is open for Checkpoint 002.
