# DA-IMPL-003 Integrated Trend and Risk Workspace

- Ticket: `DA-IMPL-003`
- Status: `READY FOR PO CHECK`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO Product Status: `READY FOR PO CHECK`
- Date: `2026-07-18`
- Product Owner decision: `PENDING`

## Scope Delivered

- Added one primary Dashboard surface named `Xu hướng điều hành tổng hợp`.
- Consolidated the accepted 30-day trend and 7-day comparison into modes inside one workspace.
- Added the approved `Theo BCVH` mode without changing URL filter context or API contracts.
- Added pass-rate, failed-rate, volume, target/reference line, below-target markers, abnormal-day markers, legend, and Vietnamese tooltip wording.
- Added the side panel `Ngoại lệ & Rủi ro chính` using confirmed API values and explicit unknown-cause wording.
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

- `frontend/src/features/dashboard/DashboardPage.jsx`: replaced three separate trend story renders with `IntegratedTrendRiskWorkspace`.
- `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`: added one tabbed workspace, combined chart, business tooltip, legend, markers, and risk panel.
- `frontend/src/features/dashboard/components/integratedTrendRiskData.js`: added pure mapping helpers for modes, failed-rate derivation, risk evidence, and marker semantics.
- `frontend/src/features/dashboard/components/integratedTrendRiskData.test.js`: added targeted tests for modes, filter-preserving comparison rows, risk evidence, marker derivation, and duplicate-widget regression.
- Runtime screenshots:
  - `docs/06_REVIEWS/Dashboard/runtime/DA-IMPL-003-runtime-aggregate-2026-07-15.png`
  - `docs/06_REVIEWS/Dashboard/runtime/DA-IMPL-003-runtime-bcvh-533140-2026-07-15.png`

## Daily Timeline Decision

Legacy Daily Timeline was prepared for removal from the visible Dashboard flow and its daily/risk story was converted into evidence inside the integrated workspace.

Technical basis:

- The old timeline repeated the already accepted 30-day trend story.
- Weekly, monthly, and heatmap pattern views belong to later Operating Patterns scope, not DA-IMPL-003.
- Quality Pulse remains available through the existing `quality-timeline` endpoint and is presented as risk evidence without inventing causes.
- The old adapter is no longer rendered on `/f13/dashboard`; its source remains available for later ticket decisions.

## Runtime Evidence

- Frontend preview URL: `http://127.0.0.1:4174/f13/dashboard`.
- Backend API URL: `http://localhost:5050/api`.
- Aggregate runtime URL: `http://127.0.0.1:4174/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all`.
- BCVH runtime URL: `http://127.0.0.1:4174/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=533140`.
- Aggregate browser validation:
  - `Xu hướng điều hành tổng hợp` visible.
  - Three tabs visible: `30 ngày`, `7 ngày so sánh`, `Theo BCVH`.
  - `Ngoại lệ & Rủi ro chính` visible.
  - Old titles `Sản lượng và tỷ lệ đạt - 30 ngày`, `So sánh cùng kỳ 7 ngày`, and `Diễn biến và quy luật chất lượng` absent.
  - Console errors: none observed.
- Mode interaction validation:
  - `7 ngày so sánh`, `Theo BCVH`, and `30 ngày` each selected successfully through unique `role="tab"` controls.
  - Failed-rate legend and risk panel remained visible after mode changes.
- BCVH validation for `533140`:
  - Integrated workspace and risk panel visible.
  - Risk panel showed `373 bưu gửi không đạt, tỷ lệ 22.00%`.
  - Duplicate legacy trend widgets remained absent.
  - Console errors: none observed.

## Validation

- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js`
- `npm.cmd run lint`
- `npm.cmd run build`
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
- DA-IMPL-003 is not Product Owner accepted yet. Stop state is `READY FOR PO CHECK`.
