# AUTO-IMPORT-003 Checkpoint 003

- Ticket: `AUTO-IMPORT-003`
- Status: `READY FOR PO CHECK`
- Date: `2026-07-20`
- Checkpoint: runtime UX and operational acceptance hardening

## Runtime Setup

- Existing backend port `5050` was occupied by project Node PID `11600`.
- That backend returned `404` for `GET /api/import/dkcl/hue/f13/backfill-queue/active`, confirming it did not serve the current branch queue routes.
- The existing backend was not killed or replaced.
- Isolated current-branch backend was started on `5051` with auth and import routes.
- Frontend was started on `5180` with:
  - `VITE_API_BASE_URL=http://localhost:5051/api`
  - `VITE_API_URL=http://localhost:5051/api`

## Browser Runtime Verification

Browser: Playwright Chromium headless.

Viewport: `1440x900`.

Screen: `http://127.0.0.1:5180/import`.

Login: repo demo admin login from local auth controller.

Verified workflow:

1. Opened Data Import Center.
2. Entered `from_date=2026-07-16` and `to_date=2026-07-18`.
3. Scanned missing Hue F1.3 dates.
4. Confirmed completed date `2026-07-16` checkbox is disabled.
5. Confirmed missing date `2026-07-17` checkbox is enabled.
6. Selected `2026-07-17`.
7. Confirmed `Update` becomes enabled only after selecting a missing date.
8. Started Update queue.
9. Observed queue ID, item run ID, progress `1/1`, item status, log counts, DB count, error code, and safe error message.
10. Confirmed Retry button is enabled for eligible `FAILED` item.
11. Confirmed page explains in-memory queue restart behavior when no active queue is returned.

Screenshots:

- `docs/06_REVIEWS/Import/runtime-artifacts/checkpoint-003-01-import-center.png`
- `docs/06_REVIEWS/Import/runtime-artifacts/checkpoint-003-02-scan-results.png`
- `docs/06_REVIEWS/Import/runtime-artifacts/checkpoint-003-03-queue-failed-evidence.png`
- `docs/06_REVIEWS/Import/runtime-artifacts/checkpoint-003-04-after-retry.png`
- `docs/06_REVIEWS/Import/runtime-artifacts/checkpoint-003-05-after-refresh.png`
- `docs/06_REVIEWS/Import/runtime-artifacts/checkpoint-003-06-refresh-empty-queue-notice.png`
- `docs/06_REVIEWS/Import/runtime-artifacts/checkpoint-003-07-final-runtime-flow.png`

## API Runtime Evidence

Observed browser API calls:

- `GET /api/import/dkcl/hue/f13/backfill-queue/active`
  - Result: `404 QUEUE_NOT_FOUND` when no active in-memory queue exists.
  - UI handles this as expected state and displays restart/in-memory explanation.
- `GET /api/import/dkcl/hue/f13/missing-dates`
  - Result: `200`.
  - Scan showed `2026-07-17` as selectable missing date between completed dates.
- `POST /api/import/dkcl/hue/f13/backfill-queue`
  - Result: `202`.
  - Queue initially returned `RUNNING`, item `RUNNING`.
- `GET /api/import/dkcl/hue/f13/backfill-queue/:queueId`
  - Result: `200`.
  - Local runtime queue reached terminal `FAILED` because `DKCL_HUE_AUTOMATION_ENABLED` is not enabled.
- `POST /api/import/dkcl/hue/f13/backfill-queue/:queueId/retry`
  - Result: `202`.
  - Retry starts a new queue for eligible failed item.

Separate API checks:

- Duplicate submitted dates return `400 DUPLICATE_DATES`.
- Completed date `2026-07-16` returns `400 DATE_ALREADY_COMPLETED`.
- Queue status response includes progress and item evidence.

## Queue-State Verification

Automated queue-state tests verify:

- sequential processing in ascending date order
- duplicate-date rejection
- completed-date rejection
- only one active queue
- graceful stop allows running item to finish and marks remaining queued items `STOPPED`
- retry after `FAILED`
- retry after `AUTHENTICATION_REQUIRED`
- prevention of retry after `SUCCESS`
- queue status and evidence response shape

## Database Evidence

Controlled DB checks for scan grounding:

- `2026-07-16`: `3941` rows and `3941` distinct shipment codes.
- `2026-07-17`: no fact/log evidence found, therefore selectable as missing.
- `2026-07-18`: `3174` rows and `3174` distinct shipment codes, with existing log evidence.

## Targeted UX Fixes

- Frontend API base URL is now configurable with `VITE_API_BASE_URL`, preserving default `http://localhost:5050/api`.
- Data Import Center fetches active in-memory queue on page load.
- `404 QUEUE_NOT_FOUND` from active queue lookup is treated as expected no-active-queue state.
- Data Import Center now clearly explains that backend restart can clear active in-memory queue state.
- Known disabled-automation backend message is rendered with operator-facing wording while preserving safe error code evidence.

## Validation Commands

- `node backend\test_dkclHueF13BackfillService.js`
- `node backend\test_dkclHueF13SyncService.js`
- `node frontend\src\pages\dataImportBackfillQueue.test.js`
- `node --check` on changed backend files
- frontend lint
- frontend build
- API runtime checks
- database/evidence checks
- `git diff --check`

## Known Limitations

- Queue state remains in memory by approved scope; backend restart can clear active queue state.
- No queue persistence.
- No unattended recovery.
- No unattended scheduling.
- Local runtime cannot complete live DKCL acquisition while automation is disabled; it safely surfaces failed item evidence and retry eligibility.

## Boundaries Preserved

- No TCT implementation.
- No KPI formula changes.
- No force replacement.
- No queue persistence.
- No unattended scheduling.
- AUTO-IMPORT-002 behavior preserved and regression-tested.
