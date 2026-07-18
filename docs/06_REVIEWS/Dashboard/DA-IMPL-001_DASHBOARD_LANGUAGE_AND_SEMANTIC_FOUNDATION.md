# DA-IMPL-001 Dashboard Language and Semantic Foundation

## 1. Review Status

- Ticket: `DA-IMPL-001`
- Status: `COMPLETED`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO Product Status: `PO PASS`
- Review date: `2026-07-18`
- Screen: `/f13/dashboard`
- Branch: `main`
- PO closure date: `2026-07-18`

## 2. Implementation Summary

DA-IMPL-001 established the visible language and semantic foundation for the accepted smart Dashboard direction without changing layout structure, API contracts, KPI formulas, database schema, canonical BCVH mapping, or threshold values.

Implemented changes:

- Added shared Dashboard semantic constants for colors, labels, and status vocabulary.
- Replaced visible shell, placeholder, technical, and runtime wording with Vietnamese business wording.
- Standardized chart and table language around `Sản lượng`, `Tỷ lệ đạt`, `Tỷ lệ không đạt`, `Mục tiêu`, `Kỳ hiện tại`, `Kỳ so sánh`, and missing/unknown data.
- Applied semantic colors:
  - volume/quantitative: blue
  - passed/good: green
  - failed/critical: red
  - warning: amber
  - unknown/missing: gray
  - target/reference: violet accent
  - comparison: slate accent
- Replaced operational table status labels with the approved vocabulary: `Tốt`, `Cần chú ý`, `Cảnh báo`, `Rủi ro cao`.
- Removed the unauthorized bottom placeholder widget block because it was visibly placeholder-only and not an accepted runtime surface.
- Preserved all accepted chart, table, ranking, recommendation, message, filter, and runtime data surfaces.

## 3. Visible Surface Inventory

Reviewed and updated visible `/f13/dashboard` surfaces:

- Page header, subtitle, route action, and filter badges.
- KPI cards and executive summary labels.
- Quality and volume combo trendline.
- Same-period comparison trendline.
- Daily, weekly, monthly, and heatmap quality timeline surfaces.
- Executive daily brief.
- Recommendation panel.
- Quick message generation panel.
- Ranking sections.
- BCVH operation table.
- Shared filter accessibility labels.
- Loading, empty, missing-data, and error wording where touched by the changed surfaces.

## 4. Preservation Notes

Preserved unchanged:

- KPI formulas and threshold values.
- API endpoint paths and request parameters.
- Database schema and imported data.
- Canonical BCVH option values.
- Existing Dashboard route and URL filter context.
- Accepted missing-date and missing-data semantics.
- Authentication/session behavior.
- Dashboard layout sequencing, except removal of the unauthorized placeholder-only block.

## 5. Validation Evidence

Commands executed:

- `node --test frontend\src\features\dashboard\components\dashboardLanguageSemantics.test.js frontend\src\features\dashboard\components\dashboardFilterOptions.test.js frontend\src\features\dashboard\components\comboTrendlineData.test.js frontend\src\features\dashboard\components\samePeriodComparisonData.test.js frontend\src\features\dashboard\components\qualityTrendlineWindow.test.js frontend\src\features\dashboard\components\dashboardStaleKpiRecovery.test.js`
  - Result: `PASS`, 27 tests passed.
- `npm.cmd run lint`
  - Result: `PASS`, lint exited successfully. Existing warnings remain outside DA-IMPL-001 scope.
- `npm.cmd run build`
  - Result: `PASS`, Vite production build completed. Existing chunk-size warning remains outside DA-IMPL-001 scope.
- `rg "Dashboard Shell|Executive Header|Navigation Integration Table|Widget Placeholder|Ranking Surface|Daily Timeline|Quality Timeline|Quality Pulse|Message Generation|SHOW ALL|No Data|Threshold|Critical|contract runtime" frontend\src\features\dashboard frontend\src\components\f13 -g "!*.test.js"`
  - Result: `PASS`, no production matches.
- `git diff --check`
  - Result: `PASS`.

Runtime validation:

- URL: `http://127.0.0.1:4174/f13/dashboard`
- Result: `PASS`
- Verified visible required labels: `Dashboard điều hành chất lượng F1.3`, `Tổng quan điều hành`, `Bản tin và thông báo điều hành`, `BCVH nổi bật và cần cải thiện`, `Chi tiết điều hành BCVH`, `Sản lượng`, `Tỷ lệ đạt`, `Tỷ lệ không đạt`, `Mục tiêu`, `Kỳ hiện tại`, `Kỳ so sánh`, `Không có dữ liệu`.
- Verified forbidden visible wording absent: `Dashboard Shell`, `Widget Placeholder`, `SHOW ALL`, `No Data`, `contract runtime`.
- Verified BCVH filter interaction: selecting `BCVH Hương Thủy` updates URL to `/f13/dashboard?ma_bcvh=536250`, shows `Theo BCVH`, and keeps the page loaded.
- Browser console errors: none observed during the runtime pass.

PO warning closure validation:

- Removed the visible technical word `runtime` from Executive Summary and other Dashboard business descriptions.
- Changed the `Tỷ lệ không đạt` KPI card from warning/yellow tone to danger/red tone.
- Runtime confirmation on `/f13/dashboard`: `runtime` text absent; Executive Summary subtitle reads `Tóm tắt KPI theo dữ liệu đã ghi nhận và phạm vi lọc hiện tại.`
- Runtime confirmation on `/f13/dashboard`: `TỶ LỆ KHÔNG ĐẠT` card renders with `from-red-50` and `border-red-100`, with no amber/yellow class.

## 6. PO Handoff

DA-IMPL-001 is technically complete and closed with Product Owner `PO PASS`.

Product Owner accepted the language and semantic normalization result.

The KPI-system changes requested after DA-IMPL-001 are transferred to DA-IMPL-002:

- Do not show `Tỷ lệ đạt` and `Tỷ lệ không đạt` simultaneously as two independent KPI cards.
- Restore `Xếp hạng toàn quốc` from imported nationwide data.
- Use `Bưu gửi cần xử lý` as the action card; `Tỷ lệ không đạt` is supporting information.

DA-IMPL-002 is the active next implementation ticket.
