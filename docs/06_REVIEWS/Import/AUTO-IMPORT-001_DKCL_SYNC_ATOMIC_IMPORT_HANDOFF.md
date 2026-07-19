# AUTO-IMPORT-001 DKCL Sync Atomic Import Handoff

- Ticket: `AUTO-IMPORT-001`
- Work item: `Atomic importer claim`
- Status: `COMPLETED / VERIFIED`
- Date: `2026-07-19`

## Root Cause

Multiple backend/watcher instances could see and process the same `Incoming` file concurrently.

This created duplicate import attempts for one standardized DKCL workbook and could leave misleading duplicate or trailing `FAILED` import-log entries even when data had already imported successfully.

## Fix Summary

The importer now claims a file by atomically moving it from `Incoming` to `Processing` before parsing or writing data.

Only the process that successfully performs that move may continue. Other watcher/backend instances that find the source file already claimed must exit cleanly without creating a `FAILED` log.

After import:

- successful imports move from `Processing` to `Processed`
- genuine parser/import failures move from `Processing` to `Error`
- file-not-found caused by another process claiming the file is treated as an already-claimed skip, not an import failure

## Files Changed

- `backend/src/services/importPipeline.js`
- `backend/test_importPipelineRace.js`

## Automated Test Evidence

| Test | Result |
| --- | --- |
| Race tests | `16 passed` |
| Excel parser tests | `32 passed` |
| Import processor tests | `45 passed` |

## Real Verification Evidence

| Field | Result |
| --- | --- |
| Verification file | `F1.3-2026.02.01.xlsx` |
| Final location | `Data DKCL\F1.3\Processed\HUE\F1.3-2026.02.01.xlsx` |
| Imported rows | `2374` |
| Distinct shipment codes | `2374` |
| Import logs | exactly `1 SUCCESS` |
| Error rows | `0` |
| Skipped rows | `0` |
| Duplicate or trailing `FAILED` log | none |
| Atomic claim real test | `PASSED` |

No shipment identifiers, credentials, cookies, tokens, or row-level operational data are recorded in this evidence document.

## Status Update

`Atomic importer claim` is `COMPLETED / VERIFIED` under AUTO-IMPORT-001.

This does not activate daily automation, scheduler, retry, monitoring, or the System Administrator synchronization screen.

## Next Planned Stages

1. Huế automatic daily acquisition
2. System Administrator missing-date scan and manual backfill
3. TCT source for nationwide ranking

These stages remain planned only and must not be implemented until explicitly authorized by Product Owner and Governance.
