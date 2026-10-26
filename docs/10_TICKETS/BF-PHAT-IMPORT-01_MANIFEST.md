# BF-PHAT-IMPORT-01 - Daily delivery BatchFile (BF Phát) into the system, N-1, with import log

Status: IMPLEMENTED (backend) / backfill 2026 done / PO check of the Import log pending
Owner: Claude Code (Sonnet), 2026-10-26. Does not change the Current Ticket.

## 1. PO request and decisions (2026-10-26)

Load the whole delivery BatchFile into the system on the same N-1 basis as the F indicators, to support analysis (lô, tuyến, bưu tá). PO decisions: source = WinSCP session `cas_hue@10.1.45.10`, folder `/SLP Chitiet` (password saved in WinSCP); scope = year 2026, same as the F indicators; keep all 28 columns; take every daily file from WinSCP (not the OneDrive copies); plan A (own table); the load must appear in the Import log.

## 2. Design

- Own table `fact_bf_phat`, one row per delivery event, all 28 source columns + `ngay_bf` (file date), `source_file`, `import_log_id`. Not merged into `fact_f13`: that table is one row per measured BG, the BatchFile has many events per BG, so mixing them would change the grain of every F1.3 number. Join by `LADING_CODE`.
- Source file `SanLuongChiTiet_DDMMYYYY[_NNN].xlsx` is written about 04:00 on D+1. Where a day has a plain file and a re-export (`_001`, `_002`) the newest by modified time wins; the server leaves a 3 KB header-only stub as the plain file in some cases, so an empty file never replaces data (logged FAILED).
- A day is replaced whole in one transaction (idempotent, a failure keeps the old rows). Dedicated SQLite connection, 30 s busy timeout.
- Import log: every attempt writes `import_log` with `indicator='BF-PHAT'`, `source_lane='HUE'`, mode NEW/REIMPORT, replaced row count, actor. The history table has a `BF-PHAT` filter. "Log ngày mới" gets a high item `BF_PHAT_MISSING` when D-1 is still not in at 08:00; failed BF files appear in its existing failed-import list.
- Daily load: `BfPhatScheduler` (started in `server.js`, on by default, `BF_PHAT_SCHEDULE_ENABLED=false` to stop): from 05:00 Vietnam time, if D-1 has no SUCCESS log today, download D-1, D-2, D-3 with `WinSCP.com` and import; failures are logged FAILED and retried hourly (max 12). Refresh days re-import only when the newest file differs from the last logged one. Download only, nothing on the server is changed. The password stays in WinSCP.

## 3. Files

| Part | Where |
| --- | --- |
| Schema (also applied at backend start) | `backend/migrate_bf_phat_01_schema.js`, hooked in `server.js` |
| Parser (by header name) | `backend/src/services/bfPhat/parseBfPhatDailyExcel.js` |
| Import service | `backend/src/services/bfPhat/bfPhatImportService.js` |
| WinSCP download | `backend/src/services/bfPhat/bfPhatWinscpService.js` |
| Daily scheduler | `backend/src/services/bfPhat/bfPhatScheduler.js` |
| CLI | `backend/import_bf_phat.js` (`--dry-run`, `--force`, `--year`, `--download <dates>`) |
| Log views | `importDailyLogService.js` (`bf_phat`, `BF_PHAT_MISSING`), `AutoBackfillImportHistory.jsx` filter |
| Local raw files (not in git) | `Data BF Phat/<year>/` |

## 4. Validation

See Section 5 for the backfill result. Tests: `src/services/bfPhat/*.test.js` 6/6 (date parsing, idempotent re-import, header failure keeps data, newest re-export wins, scheduler window and retry gap); `test_importDailyLogService.js` 8/8 unchanged.

## 5. Backfill result

WinSCP `cas_hue@10.1.45.10:/SLP Chitiet`: 305 files for 2026 downloaded (298 days, 2026-01-01..2026-10-25, no missing day; 11 days had a `_001`/`_002` re-export that was picked over a 3 KB stub or the older file). Loaded with `node import_bf_phat.js`: 298 days SUCCESS, 0 failed, 1,666,275 rows, 1,626,732 distinct BG, 133,520 rows with Mã lô; 298 SUCCESS rows in `import_log` (`BF-PHAT`/`HUE`/NEW).
Checks: 2026-10-20 has 5,686 rows vs 5,687 data lines in the file (1 line without LADING_CODE skipped); 3,140 BF events join to the 3,108 `fact_f13` BG of that day. Thin days are real low-volume days (Tet 14-23 Feb, 1-3 May, 1-2 Sep, 4 Jan). 1 row has STATUS_DATE different from the file day (kept as is).

## 6. Open points

- Phase 2 (not started): move `phan_tich_lo.py` to read `fact_bf_phat` instead of Excel; unblocks Phase 4-5 of F13-ROUTE-POSTMAN-IDENTITY-01.
- Backend restart needed for the scheduler and the log changes.
