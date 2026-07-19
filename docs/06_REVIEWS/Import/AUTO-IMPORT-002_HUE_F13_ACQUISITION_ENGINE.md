# AUTO-IMPORT-002 Hue F1.3 Acquisition Engine

- Ticket: `AUTO-IMPORT-002`
- Status: `COMPLETED / PO PASS`
- Date: `2026-07-19`
- Scope: backend/manual-trigger only
- PO PASS decision: `AUTO-IMPORT-002 is formally approved as COMPLETED / PO PASS`
- Verified implementation commit: `4798ec82bb6cc1f343167a6b596aa5d6f58d57cc`

## Architecture

The Hue F1.3 acquisition engine is implemented as a reusable backend service, not as UI-bound code.

Primary components:

- `backend/src/config/env.js`
- `backend/src/services/dkclHueF13SyncService.js`
- `backend/src/services/dkclHueF13PortalClient.js`
- `backend/src/controllers/dkclHueF13SyncController.js`
- `backend/src/routes/importRoutes.js`
- `backend/test_dkclHueF13SyncService.js`

The service owns orchestration, idempotency, concurrency, XLSX validation, standardized `Incoming\HUE` handoff, atomic importer invocation, and final DB/import-log verification.

The portal client owns DKCL browser acquisition using the local Hue account only. It uses a dedicated persistent Playwright profile and performs at most one automatic login attempt with local username, password, and fixed HRM employee identifier.

If login fails, another security step appears, or the portal layout is not recognized, the run returns `AUTHENTICATION_REQUIRED` and stops before report/export/download.

## Workflow

For one selected Hue measurement date:

1. Validate `measurement_date` format.
2. Check whether the date is already complete before DKCL access.
3. Reject inconsistent existing data as `MANUAL_REVIEW_REQUIRED`.
4. Enforce one active Hue F1.3 job.
5. Open DKCL with the dedicated persistent Hue browser profile.
6. Reuse the authenticated profile session if available.
7. If redirected to login, perform exactly one automatic username/password/HRM login attempt from local environment variables.
8. Stop as `AUTHENTICATION_REQUIRED` if login fails, another security step appears, or layout recognition fails.
9. Submit F1.3 report filters: `GR = BC`, `Tỉnh Phát = 53`, `BCKT Tỉnh Phát = NULL`, `Bưu cục Phát = NULL`, remaining filters default/all, selected date as both from/to.
10. Use the visible business metric column `SL bưu gửi phát thành công/Nộp tiền/CH` for drill-down; do not click hidden `d-none` cells.
11. Treat the opened detail-table `Tổng số` as the authoritative export/import row count.
12. Request detail-table `Xuất toàn bộ`.
13. Poll for the newest generated F1.3 detail XLSX created after the export request.
14. Download the green XLSX output to the raw-download folder.
15. Confirm the downloaded local file is complete/readable.
16. Delete only the exact generated filename row from DKCL `Quản lý tệp`.
17. Record a non-sensitive cleanup warning if portal deletion fails, but continue local import if the workbook is valid.
18. Validate XLSX structure and row count.
19. Preserve raw source unchanged.
20. Copy byte-identical standardized file to `Data DKCL\F1.3\Incoming\HUE`.
21. Invoke the existing atomic importer with `forceReimport: false`.
22. Verify processed file, one `SUCCESS` log, DB count, distinct shipment-code count, and Dashboard data availability.

## Configuration

Tracked placeholder configuration:

- `PORTAL_BASE_URL`
- `PORTAL_HUE_USERNAME`
- `PORTAL_HUE_PASSWORD`
- `PORTAL_HUE_HRM_CODE`
- `DKCL_HUE_AUTOMATION_ENABLED`
- `DKCL_HUE_PROFILE_DIR`
- `DKCL_HUE_RAW_DOWNLOAD_DIR`
- `DKCL_HUE_GENERATION_POLL_INTERVAL_MS`
- `DKCL_HUE_GENERATION_TIMEOUT_MS`
- `DKCL_HUE_IMPORT_COMPLETION_TIMEOUT_MS`

Credentials must exist only in local ignored `.env` and must not be printed, logged, screenshotted, documented, staged, or committed.

The backend loads local `.env` without printing values when `server.js` starts.

Default profile location:

- `Data DKCL\BrowserProfiles\HUE`

The profile directory is Git-ignored and must never use the Product Owner's normal browser profile.

## API

Manual trigger:

```http
POST /api/import/dkcl/hue/f13/sync
Content-Type: application/json

{
  "measurement_date": "YYYY-MM-DD"
}
```

Status:

```http
GET /api/import/dkcl/hue/f13/sync/:runId
```

Example local command:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:5050/api/import/dkcl/hue/f13/sync' -ContentType 'application/json' -Body '{"measurement_date":"YYYY-MM-DD"}'
```

Do not run another live date until Product Owner provides the next controlled missing date.

## Statuses

- `QUEUED`
- `RUNNING`
- `ALREADY_COMPLETED`
- `WAITING_FOR_EXPORT`
- `DOWNLOADING`
- `VALIDATING`
- `WAITING_FOR_IMPORT`
- `SUCCESS`
- `NO_DATA`
- `FAILED`
- `AUTHENTICATION_REQUIRED`
- `MANUAL_REVIEW_REQUIRED`

Each run records only safe operational metadata: run ID, measurement date, start/end time, selected filters, portal summary total, visible detail metric, detail-table total, generated filename, downloaded filename, SHA-256, workbook row count, standardized filename, imported count, final file location, cleanup warning, final status, and safe error message.

## Security Boundaries

Never log or return:

- username/password
- fixed HRM employee identifier
- cookies
- CSRF tokens
- authorization headers
- shipment identifiers

The engine does not use the TCT/nationwide account.

Persistent profile security:

- only one process/job may open the Hue profile at a time
- concurrent profile access returns safely instead of opening a second browser profile
- profile contents survive backend/process restart
- profile contents must never be staged or committed
- storage-state contents, cookies, CSRF tokens, and authorization headers are never returned or logged

## Implementation Decisions

- DKCL hidden date values use `MM/DD/YYYY`.
- `BCKT/BC` all-default values use `NULL`.
- F1.3 detail drill-down uses the visible business metric column, not hidden `d-none` cells.
- Detail-table total is the authoritative export/import row count.
- Portal cleanup targets exact filename row only and never performs bulk cleanup.
- Persistent profile supports automatic username/password/fixed HRM login.
- `AUTHENTICATION_REQUIRED` remains the safe fallback.
- The engine performs no force replacement.

## Live Verification

Controlled live verification for `2026-07-16` passed end to end.

Evidence:

- Visible business metric: `SL bưu gửi phát thành công/Nộp tiền/CH`
- Visible metric/detail population: `3941`
- Workbook rows: `3941`
- Imported DB rows: `3941`
- Distinct shipment codes: `3941`
- Import logs: exactly `1 SUCCESS`
- Skipped/error rows: `0`
- Dashboard backend `total_bg`: `3941`
- Portal cleanup target filename: `19-07-2026_23-08-07_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet(1).xlsx`
- Portal cleanup: target generated file deleted successfully
- Cleanup verification: exact filename `matchCount = 0`
- Final result: `AUTO-IMPORT-002 live end-to-end verification PASSED`
- Implementation commit: `4798ec82bb6cc1f343167a6b596aa5d6f58d57cc`

## Tests

Focused tests cover:

- existing completed date returns `ALREADY_COMPLETED`
- only one active Hue job
- successful generated-file matching
- old matching file rejection
- export timeout
- session expiry handling
- corrupt or non-XLSX download
- workbook count mismatch
- standardized filename
- one `Incoming` handoff
- importer `SUCCESS` detection
- importer failure path
- no automatic force replacement
- sensitive values absent from safe errors
- successful download followed by successful portal delete
- download failure does not trigger delete
- correct generated row/file is targeted
- exact filename row selection
- multiple similar filenames
- ambiguous delete actions outside the target row
- already-deleted file
- delete confirmation handling
- row disappearance verification
- cleanup failure warning without converting valid import to `FAILED`
- no bulk or unrelated deletion
- authenticated persistent profile reuse
- expired session triggers one automatic username/password/HRM login
- successful automatic login continues the same sync run
- failed login returns `AUTHENTICATION_REQUIRED`
- only one login attempt is performed
- profile survives process restart
- concurrent profile access is rejected safely
- profile path and secrets are absent from safe messages
- profile path is Git-ignored
- hidden `d-none` detail cells are ignored
- visible business metric drill-down is selected by column/header
- detail-table total becomes the authoritative expected row count
- detail total mismatch stops safely

Current automated evidence:

- `node backend\test_dkclHueF13SyncService.js`: `80 passed, 0 failed`
- `node backend\test_importPipelineRace.js`: `16 passed, 0 failed`
- `node backend\test_excelParser.js`: `32 passed, 0 failed`
- `node backend\test_importProcessor.js`: `45 passed, 0 failed`
- syntax checks: `PASSED`
- `git diff --check`: `PASSED`

## Remaining Limitations

- No Data Import Center UI is implemented.
- No missing-date scan is implemented.
- No daily scheduler is implemented.
- No TCT/nationwide source workflow is implemented.
- Portal export cleanup is limited to the file generated by the current run; no historical or bulk cleanup is implemented.

## Proposed Commit Message

`feat(import): complete Huế F1.3 automated acquisition`
