# F13-ROUTE-RANKING-PERIOD-01 Phase F1 — Technical Execution Report

## 1. Ticket Information

- **Ticket ID**: `F13-ROUTE-RANKING-PERIOD-01`
- **Phase**: `Phase F1 (Frontend Route Periods implementation)`
- **Branch**: `codex/da-impl-006`
- **Baseline Commit**: `bfa1d515` (or current remote HEAD)
- **Status**: `COMPLETED / AWAITING PO CHECK`

## 2. Execution Summary

This checkpoint documents the direct execution of Phase F1 (Frontend) for the new Route Periods endpoint (`GET /f13/ranking/route/periods`), strictly according to the Design of Record Revision R1 (§9.2 Frontend Implementation Plan).

### What was done
1. **API Client Update**: Added `getRoutePeriods` method to `F13DashboardClient.js` targeting the new `/f13/ranking/route/periods` endpoint.
2. **Data Helper**: Created `routePeriodData.js` to process the new data contract safely, avoiding the banned term "MTD" (mapped as `month_rate` and `previous_month_rate`).
3. **Màn hình chính (RoutePerformancePage.jsx)**:
    - Replaced the date range (from/to) with a single `Ngày phân tích` picker (`analysis_date`), updating the URL conditionally while still accepting `from_date` and `to_date` for backward compatibility. Added a warning badge if `from_date != to_date`.
    - Integrated `reconciliation` data (Tổng BG Tuyến, Không thuộc Tuyến, Tổng BCVH) directly under the Global Filter Bar.
    - Updated `RouteRankingTable` columns to include `Hạng`, `Tỷ lệ ngày`, `Lũy kế tháng`, `Cùng kỳ T.trước`, `Chênh lệch`, `Ngày có DL`, and `Sản lượng`. Removed legacy metrics.
    - Updated `RouteSelectedPanel` to reflect the new period indicators.
    - Applied heatmaps (`f13HeatmapBandCatalog`) consistently to `day_rate` and `month_rate` columns and panel values.

### What was NOT done
- No backend code, database, or API schemas were altered.
- No Evidence screen logic or backend routes were altered.
- Did NOT grant a self PO PASS.
- Did NOT touch other components not explicitly requested in this phase.

## 3. Test & Verification
- Unit test suite run locally on the frontend. `RoutePerformancePage.dateResolution.test.js` was updated to assert the new `getRoutePeriods` call and now passes. The remaining 12 test failures are confirmed as pre-existing (baseline matching).
- Scope strictly enforced via Git. No `networkMap`, `Data QLML`, or unrelated tests were modified or committed.

## 4. Next Steps
- **Action Required**: Product Owner UI / Runtime test.
- Do NOT proceed to other phases until a PO PASS is explicitly documented.
