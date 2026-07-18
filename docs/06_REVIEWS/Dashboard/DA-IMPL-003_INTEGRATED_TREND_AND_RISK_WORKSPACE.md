# DA-IMPL-003 Integrated Trend and Risk Workspace

- Ticket: `DA-IMPL-003`
- Status: `PO WARNING`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO Product Status: `PO WARNING`
- Date: `2026-07-18`
- Product Owner decision: `PENDING`

## PO Warning Remediation

Product Owner finding: D-1 and D-7 comparison data was correct but not sufficiently visible for leadership use because the main comparison result depended too much on hover detail.

Additional Product Owner finding: the value previously presented as `chưa phân loại` is actually `Bưu gửi chuyển hoàn`; the measurement population is `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`; the leadership quality story must use `Tỷ lệ đạt` as the only primary quality rate.

Resolution:

- Added a prominent `So sánh điều hành` widget above the main trend chart.
- Added two visible modes: `So với hôm qua` and `So cùng kỳ tuần trước`.
- Each mode makes `Tỷ lệ đạt` the primary comparison metric and keeps total volume plus failed count as compact supporting context.
- Added visible D-7 per-day delta evidence inside the existing `7 ngày so sánh` mode.
- Renamed the residual measurement population from `chưa phân loại`/`total_unknown` presentation to `Chuyển hoàn` while preserving the existing API field for compatibility.
- Removed the `Tỷ lệ không đạt` line, legend item, and tooltip story from the integrated trend chart.
- Preserved existing API contracts, formulas, aggregate/BCVH filter context, missing-data semantics, and approved semantic colors.

## Review Finding Closure

Review finding: the original DA-IMPL-003 implementation used an unsupported `25%` failed-rate threshold for `abnormal_day`, `Rủi ro cao`, and the wording `tỷ lệ không đạt từ 25%`.

Authority trace result:

- No authoritative repository source was found for a `25%` failed-rate threshold.
- Approved sources authorize target/reference markers and API-provided Quality Pulse evidence, but do not authorize a new failed-rate risk threshold.
- Relevant authority: `docs/10_TICKETS/DA-IMPL-003_MANIFEST.md` prohibits new thresholds; `docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md` requires preserving thresholds and not inventing business calculations; `docs/08_ARCHIVE/Legacy/01_RULES/ARCH-001.md` explicitly warns against hardcoded business thresholds.

Resolution:

- Removed the unsupported threshold-based `abnormal_day` classification.
- Removed `Rủi ro cao` classification derived from failed rate.
- Removed the wording `tỷ lệ không đạt từ 25%`.
- Preserved failed count as supporting evidence, approved below-target markers, and Quality Pulse evidence from the existing API.

## Scope Delivered

- Added the Product Owner-approved D-1 comparison `So với hôm qua` using Option A: compare the selected date, or the latest available date in the selected range, with the immediately previous calendar day.
- D-1 comparison covers total volume, pass rate, and failed shipment count, and displays `Không có dữ liệu so sánh` when the previous calendar day is unavailable.
- Added the Product Owner-requested leadership comparison widget with visible `So với hôm qua` and `So cùng kỳ tuần trước` modes above the main chart.
- Added visible per-day D-7 delta evidence in `7 ngày so sánh` mode so tooltip hover is supporting detail only.
- Added measurement composition handling where `total_unknown` is presented as `Chuyển hoàn` and checked against `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`.
- Removed the redundant `Tỷ lệ không đạt` quality-rate story from the integrated chart; the chart now has volume bars, one `Tỷ lệ đạt` line, target/reference line, and below-target markers.

- Added one primary Dashboard surface named `Xu hướng điều hành tổng hợp`.
- Consolidated the accepted 30-day trend and 7-day comparison into modes inside one workspace.
- Added the approved `Theo BCVH` mode without changing URL filter context or API contracts.
- Added pass-rate, volume, target/reference line, below-target markers, legend, and Vietnamese tooltip wording.
- Added the side panel `Ngoại lệ & Rủi ro chính` using confirmed API values, API-provided Quality Pulse evidence, and explicit unknown-cause wording.
- Stopped rendering the duplicate legacy trend widgets on `/f13/dashboard`: separate 30-day card, separate 7-day card, and legacy Quality Timeline adapter.

## Baseline Findings

- Dashboard page/container: `frontend/src/features/dashboard/DashboardPage.jsx`.
- Existing 30-day chart: `QualityVolumeComboTrendlineAdapter.jsx`, using `GET /api/f13/dashboard/daily-trend`.
- Existing 7-day comparison: `SamePeriodComparisonTrendlineAdapter.jsx`, derived from the same 30-day daily-trend response.
- Existing Quality Pulse and Daily Timeline: `QualityTimelineAdapter.jsx` wrapping `components/f13/QualityTimelinePanel.jsx`, using `GET /api/f13/dashboard/quality-timeline`.
- API request helper: `qualityTrendlineWindow.js`; aggregate context omits `ma_bcvh`, BCVH context passes canonical `ma_bcvh`.
- Shared data contracts preserved: `comboTrendlineData.js`, `samePeriodComparisonData.js`, KPI data from `GET /api/f13/dashboard/kpi`.
- Loading/empty/error behavior preserved through shared `LoadingState`, `EmptyState`, and `ErrorState`.

## Implementation

- D-1 remediation adds no backend endpoint, schema, or API contract change; it reuses the existing `daily-trend` data already loaded for the integrated workspace.
- `frontend/src/features/dashboard/DashboardPage.jsx`: passes `fromDate` into `IntegratedTrendRiskWorkspace` so the latest available current-day record is selected inside the chosen date range.
- `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`: renders the visible `So với hôm qua` comparison above the integrated chart.
- `frontend/src/features/dashboard/components/integratedTrendRiskData.js`: adds `buildDayOverDayComparison` for current-day selection, D-1 lookup, deltas, and missing D-1 handling.
- `frontend/src/features/dashboard/components/integratedTrendRiskData.test.js`: covers D-1 date selection, aggregate context, BCVH context, deltas, and missing D-1 data.
- `frontend/src/features/dashboard/DashboardPage.jsx`: replaced three separate trend story renders with `IntegratedTrendRiskWorkspace`.
- `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`: added one tabbed workspace, combined chart, business tooltip, legend, markers, and risk panel.
- `frontend/src/features/dashboard/components/integratedTrendRiskData.js`: added pure mapping helpers for modes, supporting failed-count evidence, risk evidence, and marker semantics.
- `frontend/src/features/dashboard/components/integratedTrendRiskData.test.js`: added targeted tests for modes, filter-preserving comparison rows, risk evidence, marker derivation, and duplicate-widget regression.
- Runtime screenshots:
  - `docs/06_REVIEWS/Dashboard/runtime/DA-IMPL-003-runtime-aggregate-2026-07-15-threshold-closure.png`
  - `docs/06_REVIEWS/Dashboard/runtime/DA-IMPL-003-runtime-bcvh-533140-2026-07-15-threshold-closure.png`

## Daily Timeline Decision

Legacy Daily Timeline was prepared for removal from the visible Dashboard flow and its daily/risk story was converted into evidence inside the integrated workspace.

Technical basis:

- The old timeline repeated the already accepted 30-day trend story.
- Weekly, monthly, and heatmap pattern views belong to later Operating Patterns scope, not DA-IMPL-003.
- Quality Pulse remains available through the existing `quality-timeline` endpoint and is presented as risk evidence without inventing causes.
- The old adapter is no longer rendered on `/f13/dashboard`; its source remains available for later ticket decisions.

## Runtime Evidence

- D-1 remediation frontend preview URL: `http://127.0.0.1:5180/f13/dashboard`.
- PO warning remediation frontend preview URL: `http://127.0.0.1:5181/f13/dashboard`.
- Frontend preview URL: `http://127.0.0.1:4174/f13/dashboard`.
- Backend API URL: `http://localhost:5050/api`.
- Aggregate runtime URL: `http://127.0.0.1:4174/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all`.
- BCVH runtime URL: `http://127.0.0.1:4174/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=533140`.
- Aggregate browser validation:
  - PO warning remediation on preview `http://127.0.0.1:5181/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` showed `So sánh điều hành` above the main chart.
  - D-1 remediation on preview `http://127.0.0.1:5180/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` showed `So với hôm qua`.
  - D-1 aggregate compared `2026-07-15` with `2026-07-14`.
  - D-1 aggregate values: total volume `3.677`, delta `+543`; pass rate `67.20%`, delta `+6.80 điểm %`; failed shipment count `1.037`, delta `-31`.
  - D-7 aggregate compared `2026-07-15` with `2026-07-08`.
  - D-7 aggregate values: total volume `3.677` versus `3.688`, delta `-11`; pass rate `67.20%` versus `66.57%`, delta `+0.63 điểm %`; failed shipment count `1.037` versus `1.092`, delta `-55`.
  - `7 ngày so sánh` mode showed visible per-day delta rows, including `2026-07-15`: `Sản lượng -11`, `Tỷ lệ đạt +0.63 điểm %`, `Không đạt -55`.
  - Measurement equation check: `Đạt 2.471 + Không đạt 1.037 + Chuyển hoàn 169 = Tổng mẫu đo kiểm 3.677`.
  - `Xu hướng điều hành tổng hợp` visible.
  - Three tabs visible: `30 ngày`, `7 ngày so sánh`, `Theo BCVH`.
  - `Ngoại lệ & Rủi ro chính` visible.
  - Unsupported `25%` failed-rate wording absent.
  - `Rủi ro cao` appears only from API-provided Quality Pulse when the pulse color is red.
  - Old titles `Sản lượng và tỷ lệ đạt - 30 ngày`, `So sánh cùng kỳ 7 ngày`, and `Diễn biến và quy luật chất lượng` absent.
  - Console errors: none observed.
- Mode interaction validation:
  - `7 ngày so sánh`, `Theo BCVH`, and `30 ngày` each selected successfully through unique `role="tab"` controls in the prior browser validation cycle.
  - The integrated chart source now removes the `Tỷ lệ không đạt` line and legend; failed count remains only as supporting evidence.
  - Unsupported `25%` failed-rate wording remained absent.
- BCVH validation for `533140`:
  - PO warning remediation on preview `http://127.0.0.1:5181/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=533140` showed the same leadership comparison widget under canonical BCVH filter context.
  - D-1 remediation on preview `http://127.0.0.1:5180/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=533140` showed `So với hôm qua`.
  - D-1 BCVH compared `2026-07-15` with `2026-07-14`.
  - D-1 BCVH values: total volume `1.694`, delta `+141`; pass rate `73.91%`, delta `-1.49 điểm %`; failed shipment count `373`, delta `+67`.
  - D-7 BCVH compared `2026-07-15` with `2026-07-08`.
  - D-7 BCVH values: total volume `1.694` versus `1.990`, delta `-296`; pass rate `73.91%` versus `67.54%`, delta `+6.37 điểm %`; failed shipment count `373` versus `583`, delta `-210`.
  - Measurement equation check: `Đạt 1.252 + Không đạt 373 + Chuyển hoàn 69 = Tổng mẫu đo kiểm 1.694`.
  - Integrated workspace and risk panel visible.
  - Risk panel showed `373 bưu gửi không đạt, tỷ lệ 22.00%`.
  - Unsupported `25%` failed-rate wording absent.
  - Duplicate legacy trend widgets remained absent.
  - Console errors: none observed.

## Validation

- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js`
- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js`
- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js`
- Data-contract check through backend service for aggregate and BCVH `533140`: `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- API checks:
  - `GET /api/f13/dashboard/daily-trend?from_date=2026-06-16&to_date=2026-07-15`
  - `GET /api/f13/dashboard/daily-trend?from_date=2026-06-16&to_date=2026-07-15&ma_bcvh=533140`
  - `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-15`
  - `GET /api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all`
  - `GET /api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=533140`

## Known Notes

- `npm.cmd run lint` passes with pre-existing warnings outside DA-IMPL-003 scope.
- `npm.cmd run build` passes with the existing Vite large-chunk warning.
- Type-check is not a separate repository script; the frontend is JavaScript, and production build completed.
- DA-IMPL-003 is not Product Owner accepted yet. Stop state is `PO WARNING` pending Product Owner recheck.
