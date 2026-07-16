# TODAY-003-R2 Quality Trendline 30-Day Window Recovery

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-003-R2 Quality Trendline 30-Day Window Recovery` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `READY FOR PO CHECK` |
| Current Ticket | `TODAY-003-R2 Quality Trendline 30-Day Window Recovery` |
| Next Ticket | `TODAY-004 Volume Trendline` |

## Summary

The Quality Delivery Rate Trendline now uses a rolling 30-day date window anchored on the selected dashboard end date or the latest available reporting date.

The approved runtime endpoint remains:

- `GET /api/f13/dashboard/daily-trend`

The frontend adapter now derives the trendline request window independently from the KPI reporting range.

## Browser and Runtime Validation

Authenticated browser validation used the local test account configured for this environment.

Observed network requests:

- `GET http://localhost:5050/api/f13/dashboard/meta` -> `200`
- `GET http://localhost:5050/api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` -> `200`
- `GET http://localhost:5050/api/f13/dashboard/daily-trend?from_date=2026-06-16&to_date=2026-07-15` -> `200`

Observed trendline payload:

- `meta.from_date = 2026-06-16`
- `meta.to_date = 2026-07-15`
- `meta.record_count = 30`
- `meta.latest_import = 2026-07-15`
- missing dates remain gaps
- `quality_rate` remains data-driven and no zero-fill is introduced

The chart rendered the 90% target line and the daily quality series across the 30-day window ending on `2026-07-15`.

## Effective Route

- Browser origin: `http://localhost:5178`
- Backend origin: `http://localhost:5050`
- Effective API base URL: `http://localhost:5050/api`
- Effective route: `/api/f13/dashboard/daily-trend`

## Root Cause Note

The previous behavior reused the dashboard-selected date range directly for the trendline request.

That caused the chart to collapse to one point whenever the dashboard filter was set to a single day.

## Contract Preserved

- `danh_gia_2026` remains the current-reporting KPI field
- returned-shipment `NULL` handling remains unchanged
- missing calendar dates remain gaps
- optional BCVH filtering remains supported
- current date-range reporting for KPI cards remains intact

## PO Recheck Instructions

1. Open `http://localhost:5178/`
2. Sign in with the local test account configured for this environment
3. Set the dashboard date filter to `2026-07-15`
4. Open `Home -> F13 -> Dashboard`
5. Open browser DevTools and Network
6. Confirm the `daily-trend` request returns `HTTP 200`
7. Confirm the request window spans `2026-06-16` through `2026-07-15`
8. Confirm the chart displays the 90% target line
9. Confirm missing dates are not converted to `0%`
10. Change BCVH and confirm the 30-day window stays anchored on the same end date

## Completion Note

This recovery is technically and runtime verified. It remains open for Product Owner recheck and is not marked as PO PASS.
