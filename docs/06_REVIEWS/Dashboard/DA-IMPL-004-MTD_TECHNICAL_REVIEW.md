# DA-IMPL-004-MTD Technical Review

- Ticket: `DA-IMPL-004-MTD Unified BCVH Monthly Cumulative Columns`
- Date: `2026-07-20`
- Branch: `codex/da-impl-006`
- Status: `COMPLETED / PO PASS`
- PO Product Status: `PO PASS`

## Scope Completed

The Unified BCVH Analysis Table now separates month-to-date data from the evaluation-day data:

- `NGÀY ĐÁNH GIÁ — dd/MM/yyyy`: `Sản lượng`, `Đạt`, `Tỷ lệ đạt`, `D-1`, `D-7`, `Bổ sung`.
- `LŨY KẾ THÁNG — dd/MM–dd/MM/yyyy`: `Sản lượng`, `Δ SL`, `Tỷ lệ đạt`, `Δ Tỷ lệ`.

The change is scoped to the existing BCVH table data path and does not change KPI formulas, SSOT, database schema, BCVH mappings, AUTO-IMPORT, TCT, Route Performance Center, or unrelated Dashboard sections.

## Files Changed

- `backend/src/services/F13DashboardService.js`
- `backend/test_bcvhMonthToDateContract.js`
- `frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`
- `frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js`
- `frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js`
- `docs/10_TICKETS/DA-IMPL-004-MTD_MANIFEST.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-004-MTD_TECHNICAL_REVIEW.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-004-MTD_PO_ACCEPTANCE_CHECKLIST.md`

## Technical Contract

Endpoint extended compatibly:

- `GET /api/f13/ranking/bcvh`

Evaluation-day row fields already existed and remain the source for the `NGÀY ĐÁNH GIÁ` group:

- `sl_bg_ptc`
- `dat_kpi_2026`
- `khong_dat_kpi_2026`
- `kpi_2026`

Month-to-date row fields:

- `month_to_date_sl_bg_ptc`
- `month_to_date_dat_kpi_2026`
- `month_to_date_khong_dat_kpi_2026`
- `month_to_date_kpi_2026`
- `previous_month_to_date_sl_bg_ptc`
- `previous_month_to_date_dat_kpi_2026`
- `previous_month_to_date_kpi_2026`

Added response metadata:

```json
{
  "meta": {
    "month_to_date": {
      "from_date": "YYYY-MM-01",
      "to_date": "YYYY-MM-DD",
      "requested_to_date": "YYYY-MM-DD",
      "current_data_date": "YYYY-MM-DD",
      "used_latest_available": true,
      "available": true
    },
    "previous_month_to_date": {
      "from_date": "YYYY-MM-01",
      "to_date": "YYYY-MM-DD",
      "available": true
    },
    "evaluation_date": {
      "date": "YYYY-MM-DD",
      "requested_to_date": "YYYY-MM-DD",
      "used_latest_available": true,
      "available": true
    }
  }
}
```

## Source Mapping

| Display field | Source | Calculation |
| --- | --- | --- |
| `LŨY KẾ THÁNG / Sản lượng` | `fact_f13` via `FactBuuGuiRepository.getBcvhOperationMetricsBetween()` | `COUNT(ma_bg)` grouped by `ma_bcvh` from day `01` of selected end-date month through cutoff date. |
| `LŨY KẾ THÁNG / Đạt` | Same cumulative query | Sum of approved pass rows in the cumulative period. |
| `LŨY KẾ THÁNG / Tỷ lệ đạt` | `F13DashboardService._calculateRate()` | Cumulative pass divided by cumulative volume. |
| `LŨY KẾ THÁNG / Δ SL` | Current cumulative period and same-period previous month | `(current cumulative volume - previous comparable cumulative volume) / previous comparable cumulative volume * 100`. |
| `LŨY KẾ THÁNG / Δ Tỷ lệ` | Current cumulative period and same-period previous month | Current cumulative pass rate minus previous comparable cumulative pass rate. |
| `NGÀY ĐÁNH GIÁ / Sản lượng` | `fact_f13` via `FactBuuGuiRepository.getBcvhOperationMetricsByDate(effectiveDate)` | Count for the effective evaluation date only. |
| `NGÀY ĐÁNH GIÁ / Đạt` | Same evaluation-day query | Pass count for the effective evaluation date only. |
| `NGÀY ĐÁNH GIÁ / Tỷ lệ đạt` | `F13DashboardService._calculateRate()` | Evaluation-day pass divided by evaluation-day volume. |
| Total-row rates | Service totals | Recalculated from summed pass and summed volume for each respective period; no averaging of BCVH rates. |
| `So với D-1`, `So với D-7` | Existing service comparison fields | Comparison of the effective evaluation date only. |

## PO Warning Remediation

- Removed the misleading group label `Theo bộ lọc` from the table header.
- Added two primary table groups with different header backgrounds and clear borders.
- Moved period information into group headers; total row now only displays `TỔNG CỘNG`.
- Added cumulative failed count to the backend contract so the month-to-date group has a complete `Sản lượng / Đạt / Không đạt / Tỷ lệ đạt` set.
- Added same-period previous-month fields for `Δ SL` and `Δ Tỷ lệ`.
- Removed visible `Không đạt` columns from both primary groups per PO decision.
- Removed `Không đạt` from column definitions, preset lists, header/body rendering, and the column-options menu. Backend fields remain available for calculations only.
- Reordered the table to `BCVH`, `NGÀY ĐÁNH GIÁ`, `LŨY KẾ THÁNG`, `Chi tiết`, making the evaluation-day group the primary operational group and the month-to-date group a compact reference group.
- Kept the evaluation-day group bound to daily fields, not cumulative fields.
- Fixed total-row evaluation-day values so they use the full evaluation-day metric set, not the current paginated page.
- Added `Tùy chọn cột` with `Gọn`, `Mặc định`, accessible checkboxes, and localStorage persistence.
- Kept `So với D-1` and `So với D-7` after the evaluation-day group and labeled them as evaluation-day comparisons.
- Operator-facing frontend strings in the changed component/helper are encoded safely and render proper UTF-8 Vietnamese.

## Runtime Data Verification

Normal runtime backend:

- Existing project backend process on `localhost:5050` was confirmed to serve the project API but was stale.
- The process was restarted from `backend/server.js` using the current workspace code.
- New backend process on `localhost:5050`: `85368`.
- Live `GET /api/f13/ranking/bcvh?from_date=2026-07-19&to_date=2026-07-19&page=1&page_size=1` now exposes `month_to_date_khong_dat_kpi_2026` and `meta.evaluation_date`.

Direct service check for `to_date=2026-07-19`:

```json
{
  "evaluation_date": "2026-07-19",
  "month_to_date": "2026-07-01..2026-07-19",
  "total_day": { "volume": 2399, "pass": 1261, "fail": 1050, "kpi": 52.6 },
  "total_mtd": { "volume": 64520, "pass": 38942, "fail": 22572, "kpi": 60.4 },
  "sample_bcvh": "535790 BCVH A Lưới",
  "sample_day": { "volume": 94, "pass": 70, "fail": 24, "kpi": 74.5 },
  "sample_mtd": { "volume": 1796, "pass": 1224, "fail": 518, "kpi": 68.2 },
  "sample_previous_mtd": { "volume": 1701, "pass": 1139, "kpi": 67.0 }
}
```

Direct service check with `page_size=1`:

```json
{
  "page_rows": 1,
  "total_items": 6,
  "total_day_volume": 2399,
  "total_month_to_date_volume": 64520,
  "total_previous_month_to_date_volume": 59148
}
```

Direct service check for requested `to_date=2026-07-20` when latest available July data is `2026-07-19`:

```json
{
  "month_to_date": {
    "from_date": "2026-07-01",
    "to_date": "2026-07-19",
    "requested_to_date": "2026-07-20",
    "used_latest_available": true
  },
  "evaluation_date": {
    "date": "2026-07-19",
    "requested_to_date": "2026-07-20",
    "used_latest_available": true
  }
}
```

## Validation Results

- `node backend/test_bcvhMonthToDateContract.js`: PASS.
- `node --check backend/src/services/F13DashboardService.js`: PASS.
- `node --check frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js`: PASS.
- `node --test frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js`: PASS.
- Targeted mojibake search across changed Unified BCVH table component/helper/test: PASS.
- Direct service checks for `2026-07-19` and requested `2026-07-20`: PASS.
- Direct service pagination check with `page_size=1`: PASS; total row remains full-period.
- Live API checks on normal backend runtime `localhost:5050`: PASS after backend restart to process `57780`.
- Frontend normal runtime `localhost:5178/f13/dashboard`: reached `/login`; browser UI table verification is blocked until a QIS runtime user session is available. No authentication bypass was performed.
- Column-configuration behavior is covered by focused source/mapper tests: mandatory columns remain present, optional columns use dynamic group colspans, `Gọn`/`Mặc định` are present, duplicated `Đầy đủ` is absent, and localStorage key is `qis.unifiedBcvhAnalysisTable.columns.v3`.
- PO WARNING preset remediation updated the column configuration schema to `qis.unifiedBcvhAnalysisTable.columns.v2` so stale `v1` localStorage cannot make presets look identical.
- Presets now replace the full visible-column state:
  - `Gọn`: `BCVH`, month-to-date volume/rate, evaluation-day volume/rate, `Chi tiết`.
- `Mặc định`: the full evaluation-day group plus the four approved month-to-date reference columns.
- Final PO PASS cleanup removed duplicated `Đầy đủ`; the menu now keeps only `Gọn`, `Mặc định`, approved optional checkboxes, and `Khôi phục mặc định`.
- `Chưa có dữ liệu` for delta columns now renders as compact text instead of a wide status pill.
- PO WARNING no-`Không đạt` remediation updated localStorage key to `qis.unifiedBcvhAnalysisTable.columns.v3` so stale `v2` layouts cannot restore prohibited columns/order.

Final PO PASS cleanup validation:

- `node --test frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js`: PASS.
- `npm.cmd --prefix frontend run lint`: PASS with pre-existing unrelated warnings.
- `npm.cmd --prefix frontend run build`: PASS with existing Vite chunk-size warning.
- Source check confirms `UnifiedBcvhAnalysisTable.jsx` has no `Đầy đủ`, `PRESETS.full`, `TEXT.full`, or visible `Không đạt` column definitions.
- `git diff --check`: PASS.

## Known Limitations

- The added fields are compatible response extensions on the existing ranking endpoint, not a new persisted schema.
- This ticket does not repair the Route Performance Center destination.
- Product Owner visual acceptance remains separate from Codex technical validation.

## PO Readiness

Technical criteria passed and Product Owner explicitly accepted the ticket. Status is `COMPLETED / PO PASS`; handoff returns to `DA-IMPL-006` Checkpoint 002.
