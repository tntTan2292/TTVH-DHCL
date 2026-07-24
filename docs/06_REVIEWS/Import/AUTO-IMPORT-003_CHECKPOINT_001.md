# AUTO-IMPORT-003 Checkpoint 001

- Ticket: `AUTO-IMPORT-003`
- Status: `ACTIVE / IMPLEMENTATION`
- Date: `2026-07-19`
- Checkpoint: first vertical slice

## Inspected Surfaces

- Data Import Center UI: `frontend/src/pages/DataImportCenter.jsx`
- Import client surface: `frontend/src/api/F13ImportClient.js`
- Import routes: `backend/src/routes/importRoutes.js`
- Import status controller: `backend/src/controllers/importController.js`
- AUTO-IMPORT-002 sync controller: `backend/src/controllers/dkclHueF13SyncController.js`
- AUTO-IMPORT-002 sync service: `backend/src/services/dkclHueF13SyncService.js`
- Import pipeline: `backend/src/services/importPipeline.js`
- Database schema: `backend/src/db/schema.sql`
- SQLite adapter: `backend/src/config/db.js`
- Import logs: `import_log`
- Imported fact data: `fact_f13`

## Reusable Integration Points

- One-date Hue F1.3 acquisition remains owned by `DkclHueF13SyncService.start(measurementDate)`.
- Completion evidence is already centralized in `DkclHueF13SyncService.checkCompleted(measurementDate)`.
- Standardized filenames remain owned by `standardizedFilename(measurementDate)`.
- Existing API routes remain available:
  - `POST /api/import/dkcl/hue/f13/sync`
  - `GET /api/import/dkcl/hue/f13/sync/:runId`
- Import history and status remain backed by `import_log`.
- Completed Hue date evidence requires DB rows, distinct shipment count parity, at least one `SUCCESS` import log, and the standardized processed file.

## Missing-Date Scan Contract

- Endpoint: `GET /api/import/dkcl/hue/f13/missing-dates?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`
- Date range is inclusive.
- Maximum scan window is `62` days.
- Result states:
  - `COMPLETE`: date already satisfies AUTO-IMPORT-002 completion evidence.
  - `MISSING`: no complete or inconsistent evidence exists; selectable for manual backfill.
  - `MANUAL_REVIEW_REQUIRED`: partial DB/log/file evidence exists and must not be force replaced.
- Response evidence is safe metadata only: standardized filename, row count, distinct count, processed-file presence, and safe reason.

## Sequential Backfill Queue Contract

- Future queue endpoint will accept selected `MISSING` dates only.
- Queue processing must be sequential.
- Each queue item must call the existing one-date AUTO-IMPORT-002 orchestration path.
- Retry may target only failed or stopped queue items.
- Stop prevents remaining queued dates from starting and must not roll back completed date imports.
- Unattended scheduling remains disabled; queue is manual backfill first.

## First Vertical Slice

Implemented a scan-only vertical slice:

- Backend service: `backend/src/services/dkclHueF13BackfillService.js`
- Backend route: `GET /api/import/dkcl/hue/f13/missing-dates`
- Data Import Center operations panel with date range fields, Scan action, summary counts, selectable missing rows, and safe evidence display.
- Update action is visible but disabled until queue execution is implemented.

## Boundaries Preserved

- No TCT workflow.
- No KPI business formula changes.
- No unattended scheduling.
- No force replacement.
- AUTO-IMPORT-002 changed only by compatible reuse of its existing completion check through the new backfill service.
