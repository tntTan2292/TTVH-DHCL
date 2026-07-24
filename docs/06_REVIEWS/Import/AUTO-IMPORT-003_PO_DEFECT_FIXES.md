# AUTO-IMPORT-003 PO Defect Fixes

- Ticket: `AUTO-IMPORT-003`
- Status: `READY FOR PO CHECK`
- Date: `2026-07-20`
- Scope: PO defect fixes only

## DEFECT-003 - Unsupported 62-day limitation

Status: `FIXED / READY FOR PO RECHECK`

PO-visible failure:

- Missing-date scan rejected ranges longer than 62 days with `DATE_RANGE_TOO_LARGE`.
- The 62-day limit was not defined by SSOT or approved business rules.

Targeted fix:

- Removed the hard-coded `MAX_SCAN_DAYS = 62` restriction from the Huế F1.3 backfill scan enumerator.
- Kept only date format validation and `from_date <= to_date` validation.
- Preserved one logical operator action: the operator can scan a reasonable business range without arbitrary backend rejection.

Runtime verification on normal backend `5050`:

- Request: `GET /api/import/dkcl/hue/f13/missing-dates?from_date=2026-01-01&to_date=2026-04-01`
- Result: `200`, `success: true`
- Total days: `91`
- Complete dates: `27`
- Missing dates: `64`
- No `DATE_RANGE_TOO_LARGE` response.

## DEFECT-004 - Queue cannot complete because authentication expires

Status: `FIXED / READY FOR PO RECHECK`

PO-visible failure:

- Queue could enter `RUNNING`.
- Backend worker could open/redirect to `dkcl.vnpost.vn` login during automated queue execution.
- This allowed `QUEUED -> RUNNING -> browser login page`, which is not acceptable for an automated backfill queue.

Root cause:

- AUTO-IMPORT-002 one-date sync engine supports portal login through the persistent browser profile.
- AUTO-IMPORT-003 queue reused that engine without a queue-level authentication preflight.
- Therefore an invalid/expired DKCL profile could be discovered only after the queue item had already started.

Targeted fix:

- Added `DkclHueF13SyncService.validateAuthentication({ requireExistingSession: true })`.
- Added queue-level preflight in `DkclHueF13BackfillService.startQueue()` and retry queue creation.
- Added `requireExistingSession` support to the portal client.
- When `requireExistingSession` is true:
  - the client opens the persistent DKCL profile and checks whether it is already authenticated;
  - it does not navigate to the login flow for queue execution;
  - it does not fill username/password/HRM fields;
  - it returns `AUTHENTICATION_REQUIRED` if the profile is invalid.
- Queue worker calls the sync engine with `{ requireExistingSession: true }` so automatic backfill does not rely on hidden browser login.
- Added a 10-second authentication validation timeout so queue creation fails clearly instead of hanging.

Runtime verification on normal backend `5050` with current invalid DKCL session:

- Request: `POST /api/import/dkcl/hue/f13/backfill-queue`
- Body: `{ "dates": ["2026-07-17"] }`
- Elapsed: about `10.72s`
- Result:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Không thể tạo hàng đợi Huế F1.3 vì phiên đăng nhập DKCL không hợp lệ. Vui lòng đăng nhập/cập nhật phiên DKCL trước khi chạy bù dữ liệu."
  }
}
```

Expected operator behavior:

- If DKCL authentication is valid: queue creation is allowed and items run sequentially.
- If DKCL authentication is invalid: queue creation is rejected before any queue is created or any item enters `RUNNING`.
- The operator receives a clear action: refresh/login DKCL session before starting backfill.

## Prior PO Recheck Runtime Failure

Status: `FIXED / READY FOR PO RECHECK`

Targeted fix:

- Confirmed normal PO runtime uses frontend `http://localhost:5178` and backend `http://localhost:5050`.
- Confirmed and restarted project-owned backend/frontend processes when stale runtime source caused new endpoints to return `404`.
- Updated the shared Data Import Center Axios client to resolve:
  - `VITE_API_BASE_URL`
  - `VITE_API_URL`
  - `http://localhost:5050/api`

Runtime verification:

- `GET /api/import/f13/status` -> `200`, `success: true`
- `GET /api/import/dkcl/hue/f13/coverage-summary?from_date=2026-07-13&to_date=2026-07-19` -> `200`, `success: true`
- `GET /api/import/dkcl/hue/f13/missing-dates?from_date=2026-07-13&to_date=2026-07-19` -> `200`, `success: true`
- Existing/completed dates: `2026-07-13`, `2026-07-14`, `2026-07-15`, `2026-07-16`, `2026-07-18`
- Missing dates: `2026-07-17`, `2026-07-19`

## DEFECT-001 - Data Coverage Summary

Status: `FIXED / READY FOR PO RECHECK`

Fix summary:

- Added a Huế F1.3 data coverage summary above the manual backfill section in Data Import Center.
- The summary shows available years, available months, first business date, last business date, imported dates count, missing dates count within selected scan range, and latest successful import.
- Scan results expose explicit existing, missing, and completed date lists.

Runtime evidence for `2026-07-13..2026-07-19`:

- available year: `2026`
- first business date: `2026-02-01`
- last business date: `2026-07-18`
- imported dates count: `134`
- latest successful import: `2026-07-16`
- missing dates: `2026-07-17`, `2026-07-19`
- completed dates: `2026-07-13`, `2026-07-14`, `2026-07-15`, `2026-07-16`, `2026-07-18`

## DEFECT-002 - Vietnamese Unicode Rendering

Status: `FIXED / READY FOR PO RECHECK`

Fix summary:

- Replaced newly added Huế backfill UI strings that used ASCII fallback Vietnamese.
- New operator-facing strings in the Huế F1.3 backfill workflow render with UTF-8 Vietnamese diacritics.
- Repaired shared auth/http client messages that contained mojibake.

Verified examples:

- `Tổng quan dữ liệu Huế F1.3`
- `Bù dữ liệu thủ công Huế F1.3`
- `Quét ngày thiếu và chọn ngày cần nạp bổ sung qua hàng đợi tuần tự.`
- `Từ ngày`
- `Đến ngày`
- `Tổng ngày`
- `Thiếu`
- `Đã có`
- `Cần soát xét`
- `Bằng chứng`
- `Tự động nạp Huế F1.3 đang tắt trong cấu hình backend.`
- `Có lỗi xảy ra từ máy chủ.`
- `Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.`

## Validation

- `node backend\test_dkclHueF13BackfillService.js` -> `35 passed, 0 failed`
- `node backend\test_dkclHueF13SyncService.js` -> `84 passed, 0 failed`
- `node frontend\src\pages\dataImportBackfillQueue.test.js` -> passed
- `node --check` on changed backend files and targeted tests -> passed
- `npm.cmd run lint` -> passed with pre-existing warnings only
- `npm.cmd run build` -> passed with existing chunk-size warning
- `git diff --check` -> passed
- Runtime scan check on normal backend `5050` -> passed
- Runtime auth-preflight queue rejection on normal backend `5050` -> passed

## Boundaries Preserved

- No AUTO-IMPORT-002 behavior changes outside minimal compatible integration flags.
- No business-rule changes.
- No SSOT changes.
- No KPI formula changes.
- No TCT.
- No unattended scheduling.
- No queue persistence.
- No force replacement.
