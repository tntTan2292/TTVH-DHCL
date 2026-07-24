# AUTO-IMPORT-003 Checkpoint 002

- Ticket: `AUTO-IMPORT-003`
- Status: `ACTIVE / IMPLEMENTATION`
- Date: `2026-07-20`
- Checkpoint: manual Hue F1.3 sequential backfill queue vertical slice

## Implemented Scope

- Enabled Data Import Center `Update` action for selected `MISSING` Hue F1.3 dates.
- Added an in-memory sequential Hue F1.3 backfill queue.
- Reused the completed AUTO-IMPORT-002 one-date sync engine through `DkclHueF13SyncService.start(measurementDate)`.
- Added queue status, graceful stop, and retry APIs.
- Displayed queue progress, item status, run ID, workbook/import counts, log evidence, export filename, and safe error evidence in Data Import Center.

## API Contracts

- `GET /api/import/dkcl/hue/f13/missing-dates?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`
  - Scans an inclusive date range.
  - Returns `COMPLETE`, `MISSING`, or `MANUAL_REVIEW_REQUIRED`.
- `POST /api/import/dkcl/hue/f13/backfill-queue`
  - Body: `{ "dates": ["YYYY-MM-DD"] }`
  - Creates one active in-memory queue and processes dates in ascending order.
- `GET /api/import/dkcl/hue/f13/backfill-queue/active`
  - Returns the active in-memory queue when one exists.
- `GET /api/import/dkcl/hue/f13/backfill-queue/:queueId`
  - Returns queue status, progress, items, and safe evidence.
- `POST /api/import/dkcl/hue/f13/backfill-queue/:queueId/stop`
  - Requests graceful stop.
- `POST /api/import/dkcl/hue/f13/backfill-queue/:queueId/retry`
  - Body: `{ "measurement_date": "YYYY-MM-DD" }`
  - Starts a new retry queue for a failed or authentication-required item.

## Queue-State Rules

- Only one active Hue F1.3 backfill queue is allowed at a time.
- Submitted dates are normalized and processed sequentially in ascending date order.
- Duplicate dates in one submission are rejected.
- Completed dates are rejected before queue start and before retry.
- A date already present in an active queue is rejected.
- Queue item states include `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`, `AUTHENTICATION_REQUIRED`, `STOPPED`, and `SKIPPED`.
- `Stop` is graceful: the running one-date sync is allowed to finish; remaining queued items become `STOPPED`.
- `Retry` is allowed only for `FAILED` or `AUTHENTICATION_REQUIRED` items.
- `SUCCESS` items cannot be retried.
- No force replacement is used.

## Evidence Contract

Each queue item exposes safe metadata when available:

- business date
- queue ID and run ID
- start/end timestamps
- exported or downloaded filename
- workbook row count
- imported database row count
- distinct shipment count
- success/error log counts
- error code and safe error message

Credentials, cookies, tokens, HRM identifiers, authorization headers, and shipment identifiers are not exposed.

## Known Technical Limitation

Queue state is intentionally in memory for this ticket. An application restart can clear the active queue and this limitation is visible in the Data Import Center queue panel and API response. Queue persistence, unattended recovery, and scheduled unattended execution remain out of scope.

## Boundaries Preserved

- No TCT workflow.
- No KPI formula changes.
- No unattended scheduling.
- No force replacement.
- AUTO-IMPORT-002 behavior is preserved; the queue reuses its public one-date orchestration and completion check.
