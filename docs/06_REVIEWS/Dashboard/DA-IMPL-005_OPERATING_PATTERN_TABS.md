# DA-IMPL-005 Checkpoint 001 - Operating Pattern Tabs Discovery and Contract

- Ticket: `DA-IMPL-005`
- Status: `CHECKPOINT 001 - DISCOVERY AND CONTRACT DEFINITION`
- Date: `2026-07-20`
- Branch: `codex/da-impl-005`
- Scope boundary: discovery and contract definition only; no product UI implementation, backend API change, schema change, KPI formula change, threshold change, SSOT change, AUTO-IMPORT change, TCT scope, Architecture Freeze change, browser UI testing, or PO acceptance activity.

## Required Reading Completed

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/DA-IMPL-005_MANIFEST.md`
- `docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md`
- `docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md`
- `docs/10_TICKETS/DA-IMPL-004_MANIFEST.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-004_CHECKPOINT_003.md`
- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`
- `frontend/src/features/dashboard/components/integratedTrendRiskData.js`
- `frontend/src/features/dashboard/components/qualityTrendlineWindow.js`

## Files Inspected

| Area | Files |
| --- | --- |
| Live Dashboard composition | `frontend/src/features/dashboard/DashboardPage.jsx` |
| Integrated trend/risk surface | `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`, `frontend/src/features/dashboard/components/integratedTrendRiskData.js`, `frontend/src/features/dashboard/components/qualityTrendlineWindow.js` |
| Existing trend helpers | `frontend/src/features/dashboard/components/comboTrendlineData.js`, `frontend/src/features/dashboard/components/samePeriodComparisonData.js` |
| Legacy operating-pattern surface | `frontend/src/components/f13/QualityTimelinePanel.jsx`, `frontend/src/features/dashboard/components/QualityTimelineAdapter.jsx` |
| Backend API contracts | `backend/src/routes/f13Routes.js`, `backend/src/controllers/DashboardController.js`, `backend/src/services/F13DashboardService.js`, `backend/src/services/timelineService.js`, `backend/src/repositories/FactBuuGuiRepository.js` |
| Governance and prior evidence | `docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md`, `docs/06_REVIEWS/Dashboard/DA-IMPL-003_INTEGRATED_TREND_AND_RISK_WORKSPACE.md`, `docs/06_REVIEWS/Dashboard/DA-IMPL-004_CHECKPOINT_003.md` |

## Existing Surfaces and Contracts

| Surface | Current status | Contract / source | Checkpoint 001 finding |
| --- | --- | --- | --- |
| Integrated Trend and Risk workspace | Live in `DashboardPage.jsx` | `GET /api/f13/dashboard/daily-trend`; `GET /api/f13/dashboard/quality-timeline` pulse; `GET /api/f13/dashboard/kpi` supporting evidence | Current tabs are `30 ngày`, `7 ngày so sánh`, `Theo BCVH`, so this is not the DA-IMPL-005 operating-pattern card. It is reusable for loading/error/legend style and grounded-summary discipline. |
| Legacy Quality Timeline panel | Implemented but not currently mounted by `DashboardPage.jsx` | `GET /api/f13/dashboard/quality-timeline` | Contains daily, weekly, monthly, heatmap, and pulse views, but renders multiple pattern charts simultaneously and includes unapproved local color thresholds. |
| Quality Timeline adapter | Existing wrapper | Converts dashboard filter props into legacy `globalFilter` | Reusable only as a compatibility reference. It is disconnected from the current live Dashboard composition. |
| Daily trend endpoint | Active | `GET /api/f13/dashboard/daily-trend?from_date&to_date&ma_bcvh` | Authoritative source for daily `date`, `total_volume`, `passed`, `failed`, `quality_rate`, and `data_available`. |
| Quality timeline endpoint | Active | `GET /api/f13/dashboard/quality-timeline?toDate&ma_bcvh` | Existing source for `weekly`, `monthly`, `heatmap`, and `pulse`. Its 90-day/30-day windows are endpoint-defined and not driven by `from_date`. |
| Dashboard KPI endpoint | Active | `GET /api/f13/dashboard/kpi?from_date&to_date&ma_bcvh` | Existing source for current selected-period totals and grounded risk summary inputs. |

## Duplicate, Conflicting, Mock-backed, or Disconnected Implementations

| Finding | Evidence | Contract decision |
| --- | --- | --- |
| Duplicate pattern/trend storytelling exists between the live integrated trend workspace and the legacy quality timeline panel. | `IntegratedTrendRiskWorkspace.jsx` renders the accepted DA-IMPL-003 trend/risk surface; `QualityTimelinePanel.jsx` also renders daily trend, weekly pattern, monthly pattern, heatmap, and pulse. | DA-IMPL-005 must create one operating-pattern card instead of restoring the full legacy multi-chart panel. |
| Legacy panel renders weekly, monthly, and heatmap simultaneously. | `QualityTimelinePanel.jsx` returns all `renderWeekly`, `renderMonthly`, and `renderHeatmap` surfaces in one grid. | New card must render exactly one selected mode at a time. |
| Legacy panel and `timelineService` use `70/60/50` color bands. | `timelineService.js` maps KPI rates to green/pink/yellow/red; `QualityTimelinePanel.jsx` maps those colors to semantic colors. | These color bands may be displayed only as existing endpoint output if explicitly treated as existing technical fields. They must not be described as new approved business thresholds or used to create new warning rules. Approved visible threshold legend should prefer `QUALITY_TARGET_RATE = 90` where applicable. |
| Legacy endpoint accepts `toDate` but not `from_date`. | `DashboardController.getQualityTimeline` requires `toDate`; `timelineService.getQualityTimeline` internally builds a 90-day range ending at `toDate`. | The active dashboard `toDate` and `ma_bcvh` propagate directly. The active `fromDate` propagates as operator context but does not change this endpoint's existing 90-day calculation unless a later approved API contract changes it. |
| Legacy panel wording contains mojibake in source display in this shell. | Several inspected files render Vietnamese text as mojibake in PowerShell output. | Checkpoint 002 must preserve UTF-8 strings when editing and avoid copying mojibake into new UI. |
| No mock-backed operating-pattern endpoint was found. | Current relevant calls target live `/api/f13/dashboard/*` endpoints. | DA-IMPL-005 can use existing backend contracts without adding mock data. |

## Authoritative Source Mapping

| Display field / value | Required? | Existing authoritative source | Notes / prohibited derivation |
| --- | --- | --- | --- |
| Card title and tabs | Required | DA-IMPL-005 manifest and Smart Dashboard plan | Tabs must be exactly `Theo thứ`, `Theo tháng`, `Heatmap`. |
| Active date context | Required | `DashboardPage.jsx` URL params `from_date`, `to_date` | Display context must match active filter props. |
| Active BCVH context | Required | `DashboardPage.jsx` URL param `ma_bcvh`; metadata options from `/f13/dashboard/meta` | `all` means aggregate/toàn mạng. Canonical BCVH options are existing metadata. |
| Weekly day labels | Required for `Theo thứ` | `GET /api/f13/dashboard/quality-timeline` response `weekly[].day` | Existing labels are `T2` through `CN`. Do not add BCVH mapping rules. |
| Weekly pattern value | Required when available | `weekly[].avg_kpi` from `timelineService.getQualityTimeline` | Existing backend average over non-empty days in its 90-day window. Do not recalculate a different weekly KPI in frontend. |
| Monthly day labels | Required for `Theo tháng` | `monthly[].day` from `quality-timeline` | Existing labels are day-of-month labels. |
| Monthly pattern value | Required when available | `monthly[].avg_kpi` from `quality-timeline` | Existing backend average over non-empty days in its 90-day window. Do not define a new monthly formula. |
| Heatmap date | Required when available | `heatmap[][][].date` from `quality-timeline` | Existing endpoint provides last 30 days arranged by week. |
| Heatmap value | Required when available | `heatmap[][][].kpi_rate` from `quality-timeline` | Display endpoint-provided rate only. |
| Heatmap day-over-day delta | Optional | `heatmap[][][].dod` from `quality-timeline` | Optional supporting detail only; do not turn it into a new warning rule. |
| Volume, pass, fail supporting context | Optional | `daily-trend` items and selected-period `kpi` response | Useful for grounded summary where already available. |
| Target/reference legend | Required where shown | `QUALITY_TARGET_RATE = 90` in `comboTrendlineData.js`; existing DA-IMPL-003 target/reference line contract | Do not add `95` or `70/60/50` as new business thresholds. |
| Below-target evidence | Optional | `withTrendSemantics` comparing existing `quality_rate` to `QUALITY_TARGET_RATE` | Existing comparison only; no abnormal-day threshold. |
| Quality Pulse summary | Optional | `quality-timeline.pulse` | Existing endpoint-provided text/color/status. Do not invent cause. |
| Grounded summary statement | Required where data supports it | Existing `summarizeRiskEvidence`, `daily-trend`, `kpi`, and `quality-timeline.pulse` evidence | Must be concise, factual, and labeled unavailable when evidence is absent. |
| Warning level | Unavailable unless supplied | Existing endpoint fields only | Do not derive warning levels from local `70/60/50` cutoffs. |

## Proposed One-card Tabs Contract

Component contract name for Checkpoint 002 planning: `OperatingPatternTabsCard`.

Inputs:

- `fromDate`: active dashboard `from_date` filter, required for visible context.
- `toDate`: active dashboard `to_date` filter and authoritative anchor for `quality-timeline`, required.
- `maBcvh`: active dashboard BCVH filter, required.
- `bcvhLabel`: active BCVH display label, optional but preferred.
- `timelineData`: `quality-timeline` response with `weekly`, `monthly`, `heatmap`, and optional `pulse`.
- `trendData`: normalized `daily-trend` items, optional supporting evidence.
- `kpiData`: selected-period KPI response, optional supporting evidence.
- `loading`, `error`: explicit state inputs.

Tabs:

- `Theo thứ`
- `Theo tháng`
- `Heatmap`

Default tab:

- Default to `Theo thứ`, the first approved operating-pattern tab.
- The tab state is local to the card for Checkpoint 002. It does not need a new URL parameter unless a later checkpoint proves URL persistence is technically required.

Tab switching:

- Use accessible tab semantics: one `tablist`, three `tab` controls, and one visible `tabpanel`.
- Only the selected mode renders its visualization and details.
- Inactive modes must not render hidden duplicate charts.
- Switching tabs must not trigger unrelated Dashboard reloads. The existing source data can be reused once loaded for the active filter context.

Filter propagation:

- `toDate` and `maBcvh` must be passed to `/api/f13/dashboard/quality-timeline`.
- `fromDate`, `toDate`, and `maBcvh` must be displayed as the operator's active context.
- `daily-trend` continues to use `buildTrendlineRequestParams` unless Checkpoint 002 introduces a narrow compatibility change within approved scope.
- On date or BCVH filter change, the operating-pattern card must clear stale visible content or ignore stale responses before showing new data.

## Field Availability Contract

| Category | Fields |
| --- | --- |
| Required fields | tab labels, active tab state, selected date/BCVH context, mode-specific labels, mode-specific endpoint values when present, target/reference legend where shown, loading/empty/error states |
| Optional fields | Quality Pulse text, grounded summary evidence, daily trend supporting counts, day-over-day heatmap delta |
| Unavailable fields | new row-level warning level, new causal explanation, new threshold bands, new BCVH-specific operating-pattern mapping, pattern persistence in URL |
| Prohibited derived fields | new KPI formulas, new average formulas replacing `quality-timeline`, new `70/60/50` warning semantics, new `95%` monitoring threshold, TCT values, AUTO-IMPORT state, route-detail values |

## State Contract

| State | Expected operator-visible behavior |
| --- | --- |
| Loading | Show one card-level loading state for the selected operating-pattern mode. Do not show three simultaneous skeleton charts. |
| Empty | If endpoint succeeds but selected mode has no usable values, show a concise empty state for that selected tab only. |
| Partial data | Render available mode values and mark missing optional supporting summary as `Chưa có dữ liệu`. |
| API error | Show a card-level error with concise operator wording and a retry affordance if consistent with existing dashboard patterns. |
| Unavailable mode | If a selected mode has no authoritative source data, show `Chưa có dữ liệu` for that mode instead of deriving replacement values. |

## Reuse Plan

- Reuse `DashboardPage.jsx` as the integration point after `IntegratedTrendRiskWorkspace`, preserving overall Dashboard order.
- Reuse `/api/f13/dashboard/quality-timeline` for existing `weekly`, `monthly`, `heatmap`, and `pulse` data.
- Reuse `/api/f13/dashboard/daily-trend` normalized rows only as supporting evidence, not as a replacement for backend weekly/monthly calculations.
- Reuse `CardContainer`, `LoadingState`, `EmptyState`, `ErrorState`, and `StatusBadge`.
- Reuse `QUALITY_TARGET_RATE`, `formatRate`, `formatNumber`, and `DASHBOARD_SEMANTIC_COLORS`.
- Reuse the DA-IMPL-003 discipline for grounded summary: show evidence only from existing endpoint fields and avoid invented causes.

## Conflicts, Gaps, and Technical Risks

- The legacy operating-pattern source is real, but it is disconnected from the live Dashboard after DA-IMPL-003 consolidation.
- The legacy UI violates DA-IMPL-005 by rendering weekly, monthly, and heatmap simultaneously.
- The backend timeline service contains existing `70/60/50` color bands. These should not become visible as newly approved warning thresholds.
- The endpoint's pattern window is fixed internally to 90 days ending at `toDate`; the selected `fromDate` is not part of that backend calculation.
- The current dashboard trend fetch already handles stale state less strictly than the DA-IMPL-004 table did; Checkpoint 002 should guard operating-pattern fetches against out-of-order responses.
- Source files display mojibake in PowerShell output, so Checkpoint 002 must verify edited Vietnamese strings directly in UTF-8-aware tooling.

## Proposed Checkpoint 002 Vertical Slice

Implement the narrowest compatible slice:

- Add a pure frontend mapper for `quality-timeline` response into `Theo thứ`, `Theo tháng`, and `Heatmap` mode models.
- Add one `OperatingPatternTabsCard` in the existing operating-pattern area of `DashboardPage.jsx`.
- Fetch or receive `quality-timeline` data with active `toDate` and `maBcvh`; display `fromDate` as context only unless an approved API contract later changes the backend window.
- Render exactly one selected tab at a time, defaulting to `Theo thứ`.
- Display endpoint-provided weekly/monthly/heatmap values and `Chưa có dữ liệu` for unavailable optional evidence.
- Show only the existing approved target/reference legend from `QUALITY_TARGET_RATE = 90` where a target legend is used.
- Add focused mapper/component tests for tab default, tab switching, one-mode rendering, empty/partial/error handling, filter propagation, and no unsupported threshold wording.

## Genuine PO / SSOT Blockers

None for Checkpoint 001.

## Checkpoint 002 - Technical Vertical Slice

- Status: `COMPLETED - TECHNICAL VERTICAL SLICE`
- Date: `2026-07-20`
- Scope boundary: implemented only the consolidated operating-pattern card and focused tests. No backend API, database schema, KPI formula, business rule, threshold, mapping, SSOT, AUTO-IMPORT, TCT, or Architecture Freeze change.

### Files Changed

| File | Change |
| --- | --- |
| `frontend/src/features/dashboard/DashboardPage.jsx` | Mounted one `OperatingPatternTabsCard` in the current Dashboard path after the integrated trend/risk surface. |
| `frontend/src/features/dashboard/components/OperatingPatternTabsCard.jsx` | Added the consolidated operating-pattern card with `Theo thứ`, `Theo tháng`, and `Heatmap` tabs. |
| `frontend/src/features/dashboard/components/operatingPatternTabsData.js` | Added pure mapper/summary helpers around the existing `quality-timeline` response contract. |
| `frontend/src/features/dashboard/components/operatingPatternTabsData.test.js` | Added focused mapper/source tests for tabs, one-mode rendering, filter propagation, state handling, grounded summary, and no unsupported cutoff promotion. |
| `frontend/src/features/dashboard/components/dashboardFilterOptions.test.js` | Updated stale dashboard regression expectations to the accepted command-summary wording and the new operating-pattern active path. |
| `docs/10_TICKETS/DA-IMPL-005_MANIFEST.md` | Added Checkpoint 002 evidence/status. |

### Implemented Behavior

- Added one consolidated card titled `Quy luật vận hành`.
- Tabs are exactly `Theo thứ`, `Theo tháng`, and `Heatmap`.
- Default tab is `Theo thứ`.
- Only one selected mode renders inside one `tabpanel`.
- The card calls `GET /api/f13/dashboard/quality-timeline` with:
  - `toDate`: active dashboard `toDate`;
  - `ma_bcvh`: active dashboard `maBcvh`.
- `fromDate` is retained as visible filter context only.
- Request reloads clear visible data, use `AbortController`, and ignore stale responses through a request sequence guard.
- Loading, API-error with retry, empty, partial/unavailable selected-mode states are explicit.
- Grounded summary uses only endpoint counts, endpoint pulse text, selected filter context, and `QUALITY_TARGET_RATE = 90`.
- The active Dashboard path does not mount `QualityTimelineAdapter`; legacy simultaneous weekly/monthly/heatmap rendering remains outside the active Dashboard path.

### Authoritative Source Mapping

| UI value | Existing source |
| --- | --- |
| Weekly tab rows | `quality-timeline.weekly[].day`, `quality-timeline.weekly[].avg_kpi` |
| Monthly tab rows | `quality-timeline.monthly[].day`, `quality-timeline.monthly[].avg_kpi` |
| Heatmap cells | `quality-timeline.heatmap[][][].date`, `kpi_rate`, `dod` |
| Quality Pulse text | `quality-timeline.pulse.text` |
| Target/reference legend | `QUALITY_TARGET_RATE = 90` from `comboTrendlineData.js` |
| Dashboard context | `DashboardPage.jsx` active `fromDate`, `toDate`, `maBcvh` |

### Preserved Boundaries

- No new formulas were added.
- No backend API semantics were changed.
- No `70/60/50` local color bands were promoted as approved thresholds.
- No new warning or risk rules were introduced.
- No hidden or mock data was added.
- No legacy multi-pattern chart grid was mounted in the active Dashboard path.

### Automated Validation

- `node --test frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js` - PASS, 13 tests.
- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js frontend/src/features/dashboard/components/operatingPatternTabsData.test.js` - PASS, 66 tests.
- `node --check frontend/src/features/dashboard/components/operatingPatternTabsData.js` - PASS.
- `npm.cmd run lint` from `frontend` - PASS with existing warnings outside DA-IMPL-005 scope.
- `npm.cmd run build` from `frontend` - PASS with existing Vite large-chunk warning.

### API Checks

Normal backend runtime checked on `localhost:5050`.

- `GET http://localhost:5050/api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=all`
  - Result: `success: true`, `weekly: 7`, `monthly: 31`, `heatmap: 5`, `pulse: DANGER`.
- `GET http://localhost:5050/api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=536250`
  - Result: `success: true`, `weekly: 7`, `monthly: 31`, `heatmap: 5`, `pulse: DANGER`.

### Known Limitations

- The existing backend timeline service owns the weekly/monthly calculation window as a 90-day range ending at `toDate`; this ticket does not alter that API contract.
- `fromDate` is visible context only for this card because the approved vertical slice does not add new API semantics.
- The backend response still includes legacy color fields, but the new card does not use them as threshold authority.
- Browser PO acceptance and visual approval are deferred to the governed PO check workflow.

### Genuine PO / SSOT Blockers

None for Checkpoint 002.
