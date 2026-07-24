# DA-IMPL-004 Unified BCVH Analysis Table

- Ticket: `DA-IMPL-004`
- Status: `CHECKPOINT 001 - DISCOVERY AND CONTRACT DEFINITION`
- Date: `2026-07-20`
- Branch: `codex/da-impl-004`
- Scope boundary: discovery and contract only; no product UI implementation, KPI formula change, SSOT change, TCT scope, AUTO-IMPORT change, schema change, scheduling, or Architecture Freeze change.

## Governance Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/DA-IMPL-004_MANIFEST.md`
- `docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md`
- `docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md`
- `docs/10_TICKETS/DA-IMPL-003_MANIFEST.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-003_INTEGRATED_TREND_AND_RISK_WORKSPACE.md`

## Files Inspected

### Frontend

- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/pages/F13Dashboard.jsx`
- `frontend/src/components/f13/BcvhOperationTable.jsx`
- `frontend/src/features/dashboard/components/BcvhOperationTableAdapter.jsx`
- `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`
- `frontend/src/features/dashboard/components/integratedTrendRiskData.js`
- `frontend/src/features/dashboard/components/comboTrendlineData.js`
- `frontend/src/features/dashboard/components/samePeriodComparisonData.js`
- `frontend/src/features/dashboard/components/qualityTrendlineWindow.js`
- `frontend/src/features/dashboard/components/dashboardSemantics.js`
- `frontend/src/features/dashboard/components/TopListAdapter.jsx`
- `frontend/src/features/ranking/BcvhRankingPage.jsx`
- `frontend/src/features/ranking/RouteRankingPage.jsx`
- `frontend/src/api/client.js`
- `frontend/src/api/httpClient.js`
- `frontend/src/api/F13DashboardClient.js`

### Backend

- `backend/src/routes/f13Routes.js`
- `backend/src/controllers/DashboardController.js`
- `backend/src/controllers/kpiController.js`
- `backend/src/services/F13DashboardService.js`
- `backend/src/services/timelineService.js`
- `backend/src/repositories/FactBuuGuiRepository.js`
- `backend/src/config/canonicalBcvhUnits.js`

## Existing BCVH Surfaces

| Surface | File | Contract | Notes |
| --- | --- | --- | --- |
| Dashboard command summary | `frontend/src/features/dashboard/DashboardPage.jsx`, `UnifiedCommandSummary` | `GET /api/f13/dashboard/kpi` | Aggregate or canonical BCVH filter; already exposes total, pass, fail, unknown/chuyen hoan, pass rate, failed rate, national rank where applicable. |
| Integrated trend/risk workspace | `IntegratedTrendRiskWorkspace.jsx`, `integratedTrendRiskData.js` | `GET /api/f13/dashboard/daily-trend`, `GET /api/f13/dashboard/quality-timeline`, KPI data | Approved DA-IMPL-003 source for 30-day trend, D-1/D-7 comparison widgets, below-target markers, and API-provided Quality Pulse risk evidence. |
| Top/bottom BCVH cards | `TopListAdapter.jsx` | `GET /api/f13/dashboard/top` | Separate best/lowest surface duplicates BCVH ranking context and should be collapsed or de-emphasized by the unified table in the implementation checkpoint. |
| BCVH operation table | `components/f13/BcvhOperationTable.jsx`, `BcvhOperationTableAdapter.jsx` | `GET /api/f13/ranking/bcvh` | Main reusable row-level source. It already shows identity, status, volume, pass/fail counts, KPI, D-1 delta, D-7 delta, total row, sort, compact expanded detail, and local warning labels. |
| BCVH ranking page | `features/ranking/BcvhRankingPage.jsx` | `F13DashboardClient.getBcvhRankingForUi()` -> `GET /api/f13/ranking/bcvh` | Uses mapped runtime ranking data and drilldown to route ranking; contains stale hardcoded BCVH option labels and shell content not suitable as the unified dashboard table source. |
| Route/detail entry | `features/ranking/RouteRankingPage.jsx` | Currently mock rows, route/evidence backend exists | Backend route ranking and evidence-list contracts exist; visible route page still uses mock data, so DA-IMPL-004 action should be a narrow navigation entry to existing route context, not a new detail business rule. |
| Legacy dashboard page | `frontend/src/pages/F13Dashboard.jsx` | Mix of `/dashboard/kpi`, `/dashboard/top`, `/ranking/bcvh`, `/quality-timeline` | Legacy page still exists and uses camelCase parameters for some calls. The active dashboard path uses `features/dashboard/DashboardPage.jsx`. |

## Backend Contracts

| Endpoint | Owner | Existing request | Existing response fields relevant to DA-IMPL-004 |
| --- | --- | --- | --- |
| `GET /api/f13/ranking/bcvh` | `DashboardController.getBcvh` -> `F13DashboardService.getBcvhRanking` | `from_date`/`fromDate`, `to_date`/`toDate`, `sort`, `order`, `page`, `page_size`; controller currently passes `to_date` as the ranking date | `ma_bcvh`, `ten_bcvh`, `total_bg`, `passed_rate`, `total_failed`, `sl_bg_ptc`, `sl_ptc_nop_tien`, `dat_kpi_2026`, `khong_dat_kpi_2026`, `kpi_2026`, `kpi_2026_dod`, `kpi_2026_swc`, `f13_303_rate`, `rank`, `meta.total_row`. |
| `GET /api/f13/dashboard/daily-trend` | `DashboardController.getDailyTrend` -> `F13DashboardService.getDailyTrend` | `from_date`, `to_date`, optional `ma_bcvh` | `meta`, `items[]`: `date`, `total_volume`, `passed`, `failed`, `quality_rate`, `data_available`. |
| `GET /api/f13/dashboard/kpi` | `DashboardController.getKpi` -> `F13DashboardService.getDashboardKpi` | `from_date`, `to_date`, optional canonical `ma_bcvh` or `all` | `total_bg`, `total_passed`, `total_failed`, `total_unknown`, `passed_rate`, `failed_rate`, `national_rank`. |
| `GET /api/f13/dashboard/quality-timeline` | `DashboardController.getQualityTimeline` -> `timelineService.getQualityTimeline` | `toDate`, optional `ma_bcvh` | `timeline[]` and `pulse`; approved source for Quality Pulse evidence only. |
| `GET /api/f13/dashboard/top` | `kpiController.getDashboardTop` | `fromDate`, `toDate` | `best[]`, `lowest[]`: `ma_bcvh`, `ten_bcvh`, `kpi_rate`; duplicates ranking context. |
| `GET /api/f13/ranking/route` | `DashboardController.getRoute` -> `F13DashboardService.getRouteRanking` | `date`, `bcvh`, pagination/sort | `ma_tuyen`, `ten_tuyen`, `total_bg`, `passed_rate`, `total_failed`, `f13_303_rate`; backend exists, visible route page still has mock data. |
| `GET /api/f13/evidence-list` | `DashboardController.getEvidence` -> `F13DashboardService.getEvidenceList` | `date`, `bcvh`, `route`, pagination | Shipment-level failed evidence fields including `ma_bg`, `thoi_gian_ptc`, `thoi_gian_nop_tien`, `do_tre_gio`. |

## Authoritative Source Mapping

| Unified field | Requirement status | Existing source | Mapping rule for DA-IMPL-004 |
| --- | --- | --- | --- |
| BCVH ID | Required | `CANONICAL_BCVH_UNITS.ma_bcvh`; ranking response `ma_bcvh`; DB `fact_f13.ma_bcvh` | Use ranking row `ma_bcvh`; validate filter context against canonical units already exposed by dashboard meta. |
| BCVH name | Required | `CANONICAL_BCVH_UNITS.ten_bcvh`; ranking response `ten_bcvh`; DB `fact_f13.ten_bcvh` | Display ranking row `ten_bcvh`; do not create new name mapping. |
| Operational context | Required | Dashboard URL filters, `DashboardPage.jsx`, `GlobalFilterBar`, ranking row `rank` | Show selected date range, BCVH filter context, rank, and current table scope from existing state. |
| Total volume | Required | `GET /api/f13/ranking/bcvh`: `sl_bg_ptc` and `total_bg`; DB count from `FactBuuGuiRepository.getBcvhRanking` and `getBcvhOperationMetricsByDate` | Prefer `sl_bg_ptc` for current date operational table; fallback to `total_bg` only as the current service already does. |
| Pass count | Required | `dat_kpi_2026`; repository `SUM(danh_gia_2026 = 'Dat')` | Use `dat_kpi_2026`; no formula change. |
| Fail count | Required | `khong_dat_kpi_2026`; `total_failed`; repository `SUM(danh_gia_2026 = 'Khong dat')` | Use `khong_dat_kpi_2026`; `total_failed` may be displayed only as compatible supporting alias where present. |
| Missing/unknown/chuyen hoan | Optional where already available | KPI endpoint `total_unknown` only at aggregate or selected BCVH KPI context; DA-IMPL-003 approved label `Chuyen hoan` | Do not derive row-level unknown unless an existing per-BCVH row field is available. For Checkpoint 002, show as unavailable per row or only show aggregate/selected-context value from KPI if it matches the active BCVH context. |
| Current-period KPI | Required | Ranking row `kpi_2026`; existing `_calculateRate(dat_kpi_2026, sl_bg_ptc)` | Use existing `kpi_2026`; no new KPI formula. |
| Prior-period value | Required where available | Ranking row `kpi_2026_dod`, `kpi_2026_swc`; DA-IMPL-003 daily-trend comparison helpers | Use existing row deltas for D-1 and D-7. Do not calculate new comparison periods. |
| Variance | Required where available | `kpi_2026_dod`, `kpi_2026_swc`; `buildLeadershipComparisonWidgets` for aggregate/selected BCVH trend | Present signed existing deltas; no new semantic threshold. |
| Compact trend | Required | `GET /api/f13/dashboard/daily-trend` items and `integratedTrendRiskData` helpers | For Checkpoint 002, use current row deltas first. A mini-sparkline may be added only if it reuses daily-trend for the selected BCVH context without adding formulas. |
| Warning level | Required using approved rules only | `DASHBOARD_STATUS`, `dashboardSemantics.js`; Quality Pulse API; existing operation table status helper | Use only existing labels/semantics and existing target/pulse evidence. Do not introduce new thresholds. Existing table's local 70/60/50 thresholds must be reviewed before reuse because DA-IMPL-004 forbids new/unapproved thresholds. |
| Action/detail entry | Required | Dashboard navigation; `BcvhRankingPage.handleDrillDown`; backend `/ranking/route`, `/evidence-list` | Provide an action that carries existing `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name` to existing detail surfaces. Do not create new RCA semantics. |
| Sorting | Required | Existing `BcvhOperationTable` local sort; repository rank default | Default by existing `rank` or operational priority agreed by current service; allow existing sortable numeric columns only. |
| Filtering | Required | Dashboard URL filters, canonical BCVH filter, search param | Reuse `GlobalFilterBar` context; add table-local search/status filters only if implemented from existing row fields. |
| Default ordering | Required | `FactBuuGuiRepository.getBcvhRanking` rank order | Default ascending `rank`; preserve backend ranking order. |

## Field Availability Classification

### Required for Checkpoint 002

- `ma_bcvh`
- `ten_bcvh`
- active `from_date`/`to_date` context
- `rank`
- `sl_bg_ptc` or `total_bg`
- `dat_kpi_2026`
- `khong_dat_kpi_2026`
- `kpi_2026`
- `kpi_2026_dod`
- `kpi_2026_swc`
- existing warning/status label derived from approved semantics
- action URL context for detail entry

### Optional Where Existing Data Is Present

- `total_unknown` / `Chuyen hoan`: available from KPI contract, not row-level ranking.
- `f13_303_rate`: present in ranking response but DA-IMPL-004 should not elevate it into new business logic unless a prior approved display already uses it.
- `sl_ptc_nop_tien`: present in ranking response as operational context.
- Quality Pulse evidence: available from `quality-timeline`, scoped to aggregate or selected BCVH filter.
- Compact sparkline: possible from `daily-trend` only for aggregate or selected BCVH, not for all row BCVHs without multiple requests or a backend compatibility addition.

### Unavailable Without New Work

- Row-level missing/unknown/chuyen-hoan for every BCVH in a single existing ranking response.
- Row-level 30-day compact trend for every BCVH in one existing endpoint.
- Runtime route detail page backed by `/api/f13/ranking/route`; the backend exists, but the current visible route page still uses mock data.

### Prohibited From Being Newly Derived In This Ticket

- New KPI business formulas.
- New BCVH mapping rules.
- New risk thresholds or warning thresholds.
- New TCT fields or TCT comparisons.
- New AUTO-IMPORT behavior or import completeness logic.
- New same-period comparison definitions outside existing D-1/D-7 contracts.
- New database schema fields.

## Loading, Empty, Partial, and Error States

| State | Contract |
| --- | --- |
| Loading | Table body uses stable skeleton rows while `GET /api/f13/ranking/bcvh` is pending; no layout jump. |
| Empty | If ranking returns no rows for the selected period, show an operator-readable empty state with selected date range and no synthetic zero rows. |
| Partial data | If ranking rows load but optional KPI unknown/trend/pulse evidence is absent, render required row fields and mark optional fields as `Khong co du lieu` or `Chua xac dinh` using existing `DASHBOARD_STATUS` semantics. |
| Error | If the ranking endpoint fails, show retryable table-level error with endpoint context. If optional evidence fails, keep rows visible and show evidence-specific unavailable state. |

## Duplicate or Conflicting Implementations

- `frontend/src/pages/F13Dashboard.jsx` and `frontend/src/features/dashboard/DashboardPage.jsx` both render dashboard concepts; the active governed dashboard is the feature dashboard.
- `BcvhOperationTable.jsx` combines ranking, operational summary, warning/status, comparison, totals, and expanded recommendations in one legacy component.
- `TopListAdapter.jsx` duplicates best/lowest BCVH summary already represented by ranking rows.
- `BcvhRankingPage.jsx` maps the same ranking endpoint but has stale hardcoded BCVH option codes and shell cards.
- `RouteRankingPage.jsx` provides visible drilldown but currently uses mock route data despite backend route/evidence contracts existing.
- API parameter names are mixed: newer dashboard endpoints use `from_date`/`to_date`; legacy surfaces and `dashboard/top` still use `fromDate`/`toDate`.
- `F13DashboardClient.getKpi()` appears stale because it calls `/dashboard/kpi` without the `/f13` prefix.
- The existing operation-table warning helper contains local 70/60/50 cutoffs. DA-IMPL-004 must not treat these as newly approved business thresholds without an authority citation.

## Narrow Reuse Plan

- Replace only the dashboard's current BCVH detail area behind `BcvhOperationTableAdapter`; do not redesign the rest of the dashboard.
- Build a pure data adapter around the existing `GET /api/f13/ranking/bcvh` response and `meta.total_row`.
- Reuse `dashboardSemantics.js`, `StatusBadge`, `LoadingState`, `ErrorState`, and existing dashboard filter state.
- Reuse DA-IMPL-003 trend helpers only for aggregate/selected BCVH compact context where the active dashboard already loads `daily-trend`.
- Keep TopList visible until Checkpoint 002 confirms the unified table can cover its accepted business need without increasing dashboard height; removal/de-emphasis must stay inside DA-IMPL-004 scope and not touch unrelated widgets.
- Keep action/detail entry as navigation with existing URL parameters; do not implement new RCA/detail business logic.

## Proposed Unified Table Contract

```js
{
  meta: {
    from_date: 'YYYY-MM-DD',
    to_date: 'YYYY-MM-DD',
    ma_bcvh: 'all' | '<canonical ma_bcvh>',
    default_order: 'rank_asc',
    optional_evidence: {
      aggregate_unknown_available: boolean,
      row_unknown_available: boolean,
      compact_trend_available: boolean,
      quality_pulse_available: boolean
    }
  },
  rows: [
    {
      ma_bcvh: string,
      ten_bcvh: string,
      rank: number | null,
      context_label: string,
      total_volume: number,
      pass_count: number,
      fail_count: number,
      unknown_count: number | null,
      current_kpi: number,
      prior_periods: {
        d1: { delta: number | null, label: 'D-1' },
        d7: { delta: number | null, label: 'D-7' }
      },
      compact_trend: {
        available: boolean,
        points: Array<{ date: string, quality_rate: number | null, total_volume: number }>
      },
      warning: {
        level: 'good' | 'attention' | 'warning' | 'highRisk' | 'unknown',
        label: string,
        source: 'existing-status' | 'quality-pulse' | 'unavailable'
      },
      action: {
        type: 'navigate',
        route: '/f13/ranking/route',
        params: {
          from_date: string,
          to_date: string,
          interval: string,
          bcvh_id: string,
          bcvh_name: string
        }
      }
    }
  ],
  total_row: {
    total_volume: number,
    pass_count: number,
    fail_count: number,
    current_kpi: number,
    d1_delta: number | null,
    d7_delta: number | null
  }
}
```

## Checkpoint 002 Vertical Slice

- Add a pure frontend mapper/test for `GET /api/f13/ranking/bcvh` rows into the unified table contract.
- Render a minimal unified table in the existing `BcvhOperationTableAdapter` location on `/f13/dashboard`.
- Include required fields only: identity, rank/context, volume, pass, fail, KPI, D-1/D-7 variance, existing status, and detail action.
- Show optional unavailable fields explicitly but quietly; do not derive row-level unknown/trend when no existing source supplies it.
- Preserve active dashboard filters and URL state.
- Add targeted tests for mapping, ordering, optional-field fallback, warning-source boundary, action params, loading/empty/error states, and no unsupported threshold text.

## Risks and Gaps

- Row-level unknown/chuyen-hoan and row-level compact trend are not available in one existing ranking response.
- Existing route page is not runtime-backed, so action/detail acceptance may require a later narrow integration or a PO decision if visible route detail must be completed under DA-IMPL-004.
- Local warning thresholds in `BcvhOperationTable.jsx` need authority review before reuse; safest approach is to reuse existing labels only as presentation of already accepted behavior or fall back to `unknown`.
- Mixed endpoint parameter conventions increase regression risk; Checkpoint 002 should use the same axios client and request shape already used by `BcvhOperationTable.jsx`.

## Blockers Requiring PO Decision

- None for Checkpoint 001.
- Potential future PO decision only if Product Owner requires row-level unknown/chuyen-hoan or row-level multi-day trend for every BCVH without approving a narrow backend compatibility contract.

## Validation

- Discovery/static check only.
- `git diff --check`
