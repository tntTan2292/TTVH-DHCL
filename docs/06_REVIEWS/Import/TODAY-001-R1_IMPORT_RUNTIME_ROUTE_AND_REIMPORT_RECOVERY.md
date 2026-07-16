# TODAY-001-R1 Import Runtime Route and Reimport Recovery

## Status

| Field | Value |
| --- | --- |
| Parent Ticket | `TODAY-001 Import Daily Data Verification` |
| Recovery Ticket | `TODAY-001-R1 Import Runtime Route and Reimport Recovery` |
| PO Finding | `POF-TODAY-001-01` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `READY FOR PO RECHECK` |

## Recovery Scope

- Restored correct backend runtime process for import routes on port `5050`.
- Preserved `/import` frontend route and made status load failures visible instead of silently showing empty zero state.
- Added duplicate-date reimport confirmation UI before destructive overwrite.
- Preserved force reimport flow through `POST /api/import/upload?force=true`.
- Added safe Vietnamese backend error messages for invalid file/import failures.

## Runtime Evidence

| Check | Result |
| --- | --- |
| Backend process | Correct runtime started from `backend/server.js` on port `5050` |
| Watcher path | `Data DKCL/F1.3/Incoming` |
| Runtime DB | `backend/src/db/database.sqlite` |
| `GET /api/import/f13/status` | HTTP `200`, returns `success: true` and July import logs |
| Duplicate-date upload | HTTP `409`, returns `requiresConfirmation: true` and `REIMPORT_CONFIRMATION_REQUIRED` |
| Forced reimport | HTTP `200`, returns `total: 2547`, `inserted: 2547`, `skipped: 0`, `errors: 0` |
| Invalid file upload | HTTP `400`, returns visible Vietnamese validation message |
| Browser route | `http://localhost:5178/import` renders Data Import Center, summary cards, and 20-row import history |

## Browser Recheck Notes

Browser validation used the normal UI login flow with demo credentials and opened:

```text
http://localhost:5178/import
```

Observed visible UI:

- `Data Import Center`
- `Nạp file dữ liệu ngày`
- `Chờ xử lý: 0`
- `Thành công: 20`
- `Thất bại: 0`
- `Nhật ký Import (20 dòng gần nhất)`
- July files including `F1.3-2026.07.15.xlsx`, `F1.3-2026.07.14.xlsx`, `F1.3-2026.07.13.xlsx`, and `F1.3-2026.07.12.xlsx`

## Validation Commands

```powershell
node backend/test_excelParser.js
node backend/test_importProcessor.js
node backend/test_e2e_import_engine.js
npm.cmd run build
npm.cmd run lint
```

## Validation Result

- `backend/test_excelParser.js`: PASS, 32 passed, 0 failed.
- `backend/test_importProcessor.js`: PASS, 45 passed, 0 failed.
- `backend/test_e2e_import_engine.js`: PASS, 62 passed, 0 failed.
- `frontend` build: PASS.
- `frontend` lint: PASS with existing unrelated warnings only.

## PO Recheck Point

PO should recheck:

```text
http://localhost:5178/import
```

Expected result:

- `/import` does not 404.
- Import summary and history are visible.
- Dropping/uploading a duplicate-date `F1.3-YYYY.MM.DD.xlsx` asks for confirmation before overwrite.
- Confirming overwrite imports successfully.

PO result remains pending. Do not mark PO PASS until PO confirms.
