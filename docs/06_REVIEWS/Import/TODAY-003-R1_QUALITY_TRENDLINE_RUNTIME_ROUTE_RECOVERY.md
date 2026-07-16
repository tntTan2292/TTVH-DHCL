# TODAY-003-R1 Quality Trendline Runtime Route Recovery

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-003-R1 Quality Trendline Runtime Route Recovery` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `READY FOR PO CHECK` |
| Current Ticket | `TODAY-003-R1 Quality Trendline Runtime Route Recovery` |
| Next Ticket | `TODAY-004 Volume Trendline` |

## Summary

The Quality Delivery Rate Trendline now loads its runtime data successfully from the backend during authenticated browser use.

The approved runtime endpoint remains:

- `GET /api/f13/dashboard/daily-trend`

The frontend adapter continues to call:

- `/f13/dashboard/daily-trend`

through the shared API client, which resolves against the backend origin `http://localhost:5050/api`.

## Browser and Runtime Validation

Authenticated browser validation used the demo `admin / admin123` login and a valid runtime session.

Observed network requests:

- `GET http://localhost:5050/api/f13/dashboard/meta` -> `200`
- `GET http://localhost:5050/api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` -> `200`
- `GET http://localhost:5050/api/f13/dashboard/daily-trend?from_date=2026-07-15&to_date=2026-07-15` -> `200`

Observed trendline payload:

- `meta.from_date = 2026-07-15`
- `meta.to_date = 2026-07-15`
- `meta.record_count = 1`
- `meta.latest_import = 2026-07-15`
- `items[0].date = 2026-07-15`
- `items[0].total_volume = 3677`
- `items[0].passed = 2471`
- `items[0].failed = 1037`
- `items[0].quality_rate = 67.2015`
- `items[0].data_available = true`

The chart rendered the 90% target line and the daily quality point for `2026-07-15`.

## Effective Route

- Browser origin: `http://localhost:5178`
- Backend origin: `http://localhost:5050`
- Effective API base URL: `http://localhost:5050/api`
- Effective route: `/api/f13/dashboard/daily-trend`

## Root Cause Note

The current runtime no longer reproduces the previously reported 404. The verified browser session resolves the trendline request directly to the backend and receives `HTTP 200`.

No KPI 2026 calculation changes were required for this recovery state.

## Contract Preserved

- `danh_gia_2026` remains the current-reporting KPI field
- returned-shipment `NULL` handling remains unchanged
- missing calendar dates remain gaps
- optional BCVH filtering remains supported
- current date-range context remains intact

## PO Recheck Instructions

1. Open `http://localhost:5178/`
2. Sign in with `admin / admin123`
3. Open `Home → F13 → Dashboard`
4. Open browser DevTools and Network
5. Confirm the `daily-trend` request returns `HTTP 200`
6. Confirm the chart displays the 90% target line
7. Confirm the data point and tooltip values match the API payload
8. Confirm missing dates are not converted to `0%`
9. Leave the ticket at `READY FOR PO CHECK`

## Completion Note

This recovery is technically and runtime verified. It remains open for Product Owner recheck and is not marked as PO PASS.
