# TODAY-002-R1 KPI 2026 Source Column Recovery

## Scope

This recovery verifies and corrects the daily trend source column used by the leadership dashboard.

## Finding

The daily trend path was still aggregating from the legacy `ket_qua_f13` column.
The approved KPI 2026 source column is `danh_gia_2026`.

## Recovery Commit

- `cebe1ff655febf09242e23719150192c059d6555`

## Runtime Reconciliation

Direct database checks on the production-like SQLite data file showed the two columns can diverge on real dates:

- `2026-07-01`
  - `ket_qua_f13`: `Đạt = 2163`, `Không đạt = 767`, `NULL = 171`
  - `danh_gia_2026`: `Đạt = 2056`, `Không đạt = 871`, `NULL = 174`
- `2026-07-02`
  - `ket_qua_f13`: `Đạt = 0`, `Không đạt = 3356`
  - `danh_gia_2026`: `Đạt = 0`, `Không đạt = 0`
- `2026-07-15`
  - `ket_qua_f13`: `Đạt = 0`, `Không đạt = 3510`
  - `danh_gia_2026`: `Đạt = 0`, `Không đạt = 0`

These differences confirm that the dashboard must use `danh_gia_2026` for KPI 2026 reporting.

## Contract Preserved

- one row per date
- ascending date order
- missing-day row emission
- `data_available` behavior
- optional BCVH filter
- returned-shipment `NULL` population inclusion

## Regression Test

The focused regression test seeds rows where legacy and KPI 2026 values differ, then verifies that the daily trend path follows the KPI 2026 column.

## PO Recheck Point

- `GET /api/f13/dashboard/daily-trend`
- `backend/test_daily_trend.js`

## Closure Note

This source-column recovery was closed as part of the `TODAY-002-R2 KPI 2026 Dashboard Consistency Recovery` documentation closure. The runtime fix and evidence now live in the R2 closure record, while this note remains as the source-column root-cause record.
