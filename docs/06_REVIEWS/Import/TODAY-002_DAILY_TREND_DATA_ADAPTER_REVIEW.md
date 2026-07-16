# TODAY-002 Daily Trend Data Adapter Review

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-002 Daily Trend Data Adapter` |
| Technical Status | `REOPENED` |
| Runtime Status | `RECHECK REQUIRED` |
| PO UI Check Required | `No` |
| PO Product Status | `NOT REQUIRED` |
| Final Completion Status | `RECOVERY IN PROGRESS` |
| Closure Date | `Pending` |
| Current Ticket | `TODAY-002-R1 KPI 2026 Source Column Recovery` |
| Next Ticket | `TODAY-003 Quality Delivery Rate Trendline` |

## Review Evidence

- Implementation commit: `ba34d9170c107fa2f99e6ef5960b172d6addbb97`
- Recovery commit: `0c08d53`
- GitHub exposes the current daily-trend code path on `origin/main`
- The runtime adapter returns one normalized daily record per calendar date
- Missing calendar dates return `data_available = false`
- Record-level `NULL` remains part of the F1.3 evaluation population
- PO found the daily trend query was still using the legacy KPI column instead of the KPI 2026 source column

## Classification

- Source Code Classification: `RECOVERY REQUIRED`
- Test Classification: `RECOVERY REQUIRED`
- Documentation Classification: `REQUIRED UPDATE`

## Closure Note

The Product Owner finding reopened the review because the approved KPI 2026 source column was not being used by the daily trend path.
This recovery keeps the contract shape unchanged while correcting the source column used for aggregation.
