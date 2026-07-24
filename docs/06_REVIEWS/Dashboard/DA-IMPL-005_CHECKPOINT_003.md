# DA-IMPL-005 Checkpoint 003 - Technical Hardening and PO Handoff

- Ticket: `DA-IMPL-005`
- Status: `READY FOR PO CHECK`
- Date: `2026-07-20`
- Branch: `codex/da-impl-005`
- Scope boundary: technical hardening and PO acceptance preparation only; no browser UI acceptance, screenshot PO validation, backend API change, schema change, KPI formula change, business rule change, threshold change, BCVH mapping change, SSOT change, AUTO-IMPORT change, TCT scope, Architecture Freeze change, or PO PASS activity.

## Runtime Robustness Review

The Operating Pattern card is implemented in the active Dashboard path through `OperatingPatternTabsCard`.

Verified robustness points:

- Default tab is `Theo thứ`.
- Tabs are exactly `Theo thứ`, `Theo tháng`, and `Heatmap`.
- Only the active selected mode renders inside one `tabpanel`.
- The active Dashboard path mounts `OperatingPatternTabsCard` and does not mount `QualityTimelineAdapter`.
- API request uses existing `GET /api/f13/dashboard/quality-timeline`.
- API request sends active `toDate` and `ma_bcvh`.
- `fromDate` remains visible filter context only and is not sent as a new timeline API parameter.
- Request handling uses `AbortController` and request sequence protection to ignore stale responses.
- Loading, empty, partial/unavailable selected-mode, and API-error states are explicit.
- Retry action reuses the same active `toDate` and `ma_bcvh` contract.
- Grounded summary uses only response counts, response `pulse.text`, active filter context, and existing `QUALITY_TARGET_RATE = 90`.
- The 90% legend is presented as existing target/reference only.
- Local `70/60/50` color bands from legacy timeline code are not used or promoted as approved thresholds in the new card.

## API Contract Verification

Normal backend runtime checked on `localhost:5050`.

| Request | Result |
| --- | --- |
| `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=all` | `success: true`, `weekly: 7`, `monthly: 31`, `heatmap: 5`, `pulse: DANGER` |
| `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=536250` | `success: true`, `weekly: 7`, `monthly: 31`, `heatmap: 5`, `pulse: DANGER` |
| `GET /api/f13/dashboard/quality-timeline?toDate=bad-date&ma_bcvh=all` | HTTP `500`, `SERVER_ERROR`, message `Invalid time value`; frontend error state has a concise API-error path |

## Authoritative Mapping Verified

| UI value | Existing source |
| --- | --- |
| Weekly labels and values | `quality-timeline.weekly[].day`, `quality-timeline.weekly[].avg_kpi` |
| Monthly labels and values | `quality-timeline.monthly[].day`, `quality-timeline.monthly[].avg_kpi` |
| Heatmap cells | `quality-timeline.heatmap[][][].date`, `kpi_rate`, `dod` |
| Pulse / grounded summary text | `quality-timeline.pulse.text`; mapper counts available rows/cells |
| Target/reference legend | `QUALITY_TARGET_RATE = 90` from `comboTrendlineData.js` |
| Visible filter context | Dashboard `fromDate`, `toDate`, `maBcvh` props |

## Automated Validation

- `node --test frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js` - PASS, 15 tests.
- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js frontend/src/features/dashboard/components/operatingPatternTabsData.test.js` - PASS, 68 tests.
- `node --check frontend/src/features/dashboard/components/operatingPatternTabsData.js` - PASS.
- `npm.cmd run lint` from `frontend` - PASS with pre-existing warnings outside DA-IMPL-005 scope.
- `npm.cmd run build` from `frontend` - PASS with existing Vite large-chunk warning.
- `git diff --check` - PASS with CRLF conversion warnings only.

## Technical Defects Found and Fixed

- Added hardening tests to verify `fromDate` remains display-only and is not sent as an API parameter.
- Added hardening tests to verify explicit loading, empty, partial/unavailable, and API-error state paths.
- No product behavior changes were needed during Checkpoint 003.

## Remaining Limitations

- The existing backend timeline service owns the weekly/monthly operating-pattern window as a 90-day range ending at `toDate`; DA-IMPL-005 does not change this API contract.
- The backend response still includes legacy color fields derived by existing backend code. The new card does not use those fields as threshold authority.
- Browser UI acceptance, visual approval, and PASS/WARNING/FAIL judgment remain Product Owner responsibilities.

## Readiness

DA-IMPL-005 technical criteria passed and is ready for Product Owner check.

Do not mark `PO PASS` until Product Owner completes visible acceptance.

## Genuine Blockers

None.

## PO Defect Fixes After Initial Checkpoint 003

- PO check result: `FAIL`.
- Defects fixed only within DA-IMPL-005 Operating Pattern card scope.
- Ticket status remains `READY FOR PO CHECK`.
- `PO PASS` was not marked.

### Defect 001 - Theo thứ Warning Colors

Authoritative guidance located:

- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_rules.md`
  - `Xanh`: KPI `>= 70%`
  - `Hồng`: KPI `60% - <70%`
  - `Vàng`: KPI `50% - <60%`
  - `Đỏ`: KPI `<50%`
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/acceptance_criteria.md`
  - Dashboard/ranking warning colors must follow configured `Xanh`, `Hồng`, `Vàng`, `Đỏ`.
- Existing backend contract already emits `quality-timeline.weekly[].color` with this sequence from `timelineService.js`.

Fix:

- Reused the approved weekday band sequence in `operatingPatternTabsData.js`.
- Weekday cards now use `band-green`, `band-pink`, `band-yellow`, and `band-red`.
- Added Vietnamese weekday legend: `Chú giải màu theo ngưỡng cảnh báo đã phê duyệt`.
- No alternate absolute thresholds were introduced.

Conflict review:

- No conflicting active DA-IMPL-005 authority was found.
- Legacy notes say thresholds should ultimately come from Settings Configuration; the current backend response already supplies the approved color classification, so no backend/schema/config change was required for this PO defect fix.

### Defect 002 - Heatmap Management Semantics

Fix:

- Heatmap no longer colors cells against the absolute TCT/target reference.
- Heatmap now calculates the KPI average for the displayed calendar month from existing response daily KPI cells.
- Each heatmap day keeps its actual KPI percentage visible.
- Heatmap color classes are relative to the selected month average:
  - `Cao hơn trung bình tháng rõ rệt`
  - `Cao hơn trung bình tháng`
  - `Xấp xỉ trung bình tháng`
  - `Thấp hơn trung bình tháng`
  - `Thấp hơn trung bình tháng rõ rệt`
- Legend label is `So sánh với KPI trung bình tháng`.
- These relative colors are not presented as TCT target compliance.

Management summary added:

- `KPI trung bình tháng`
- `Ngày tốt nhất`
- `Ngày thấp nhất`
- `Cao hơn trung bình`
- `Thấp hơn trung bình`

### Defect 003 - Monthly Translation / Raw Key Exposure

Fix:

- Removed raw operator-facing source labels such as `quality-timeline.monthly.avg_kpi`.
- Replaced source labels with UTF-8 Vietnamese:
  - `KPI trung bình theo thứ`
  - `KPI trung bình theo ngày trong tháng`
  - `KPI ngày đo kiểm`
- Added tests preventing raw `quality-timeline.*` and `avg_kpi` keys from appearing in `OperatingPatternTabsCard.jsx` operator-facing UI.

### Additional Validation After PO Defect Fix

- `node --test frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js` - PASS, 19 tests.
- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js frontend/src/features/dashboard/components/operatingPatternTabsData.test.js` - PASS, 72 tests.
- `node --check frontend/src/features/dashboard/components/operatingPatternTabsData.js` - PASS.
- `npm.cmd run lint` from `frontend` - PASS with pre-existing warnings outside DA-IMPL-005 scope.
- `npm.cmd run build` from `frontend` - PASS with existing Vite large-chunk warning.
- API checks on `localhost:5050`:
  - `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=all` - `success: true`, `weekly: 7`, `monthly: 31`, `heatmap: 5`, `pulse: DANGER`, first weekly color `red`.
  - `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=536250` - `success: true`, `weekly: 7`, `monthly: 31`, `heatmap: 5`, `pulse: DANGER`, first weekly color `red`.

## PO Redesign Fixes After Second PO Check

- PO check result: `FAIL pending approved redesign`.
- Defects fixed only within the Operating Pattern card and the narrow additive `quality-timeline` API contract extension required by the approved scope.
- Ticket status remains `READY FOR PO CHECK`.
- `PO PASS` was not marked.

### Data and Contract Review

Existing `quality-timeline` before this fix supplied:

- weekly pass-rate style value: `weekly[].avg_kpi`;
- monthly day-of-month average: `monthly[].avg_kpi`;
- heatmap daily date and KPI: `heatmap[][][].date`, `kpi_rate`;
- pulse text/status.

Existing contract did not supply:

- YTD monthly shipment volume;
- YTD monthly pass rate;
- current-month cumulative cutoff;
- weekday shipment volume;
- weekday pass rate.

Narrow additive backend extension added in `backend/src/services/timelineService.js`:

- `weekly[].total_volume`
- `weekly[].passed`
- `weekly[].pass_rate`
- `monthly_ytd[]` with `month`, `label`, `total_volume`, `passed`, `pass_rate`, `from_date`, `to_date`, `is_current_month`, `cumulative_label`
- `latest_business_date`

Existing fields are preserved for compatibility.

### Redesign Implementation

- Tab order is now exactly `Theo tháng`, `Theo thứ`, `Heatmap`.
- Default active tab is `Theo tháng`.
- `Theo tháng` is now a year-to-date monthly management combo chart:
  - columns: monthly shipment volume;
  - line: monthly pass rate;
  - completed months use full available calendar-month data;
  - current month uses cumulative data from day `01` to the latest available business-data date in that month;
  - current month is labeled `Lũy kế đến ngày dd/MM/yyyy`.
- Monthly grounded summary includes:
  - highest-volume month;
  - lowest-volume month;
  - best pass-rate month;
  - lowest pass-rate month;
  - current-month cumulative volume and pass rate.
- `Theo thứ` is now a combo chart:
  - x-axis: `T2` through `CN`;
  - columns: shipment volume;
  - line: pass rate;
  - approved F1.3 warning band legend retained from `business_rules.md`.
- `Heatmap` remains the daily operational view:
  - cells show actual date as `dd/MM`;
  - each month is visually separated with `Tháng MM/YYYY`;
  - each month shows exact range `Từ dd/MM/yyyy đến dd/MM/yyyy`;
  - coloring is relative to that month average, not TCT compliance;
  - each month includes best day, worst day, above-average count, and below-average count.
- Raw API/i18n keys such as `quality-timeline.monthly.avg_kpi` are not exposed in the operator-facing card.

### Validation After Redesign Fix

- `node --test frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js` - PASS, 19 tests.
- Dashboard regression bundle ending in `operatingPatternTabsData.test.js` - PASS, 72 tests.
- `node --check frontend/src/features/dashboard/components/operatingPatternTabsData.js` - PASS.
- `node --check backend/src/services/timelineService.js` - PASS.
- `npm.cmd run lint` from `frontend` - PASS with pre-existing warnings outside DA-IMPL-005 scope.
- `npm.cmd run build` from `frontend` - PASS with existing Vite large-chunk warning.
- Direct updated service contract check:
  - `getQualityTimeline('2026-07-19', 'all')`: `weekly[0].total_volume = 45373`, `weekly[0].pass_rate = 43.01`, `monthly_ytd.length = 7`, `latest_business_date = 2026-07-19`, current month `T7` volume `64520`, pass rate `60.36`.
  - `getQualityTimeline('2026-07-19', '536250')`: `weekly[0].total_volume = 7762`, `weekly[0].pass_rate = 25.66`, `monthly_ytd.length = 7`, `latest_business_date = 2026-07-19`, current month `T7` volume `9966`, pass rate `48.66`.

Runtime note:

- The already-running `localhost:5050` backend process served the old pre-change module during this fix cycle. A normal backend restart is required for the live HTTP endpoint to expose the additive fields. The updated service code was validated directly without killing or replacing the existing process.
