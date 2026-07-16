# TODAY-002-R2 KPI 2026 Dashboard Consistency Recovery

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-002-R2 KPI 2026 Dashboard Consistency Recovery` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `NOT READY` |
| Current Ticket | `TODAY-003-R1 Quality Trendline Runtime Route Recovery` |
| Next Ticket | `TODAY-004 Volume Trendline` |

## Root Cause

The Dashboard overview path still used `ket_qua_f13` while the daily trend path had already moved to `danh_gia_2026`.
That split created inconsistent KPI values between dashboard surfaces for the same reporting period.

## Impact Inventory

| File | Function / Query | Endpoint / Consumer | Current Source Field | Required Source Field | Migration Required | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `backend/src/controllers/kpiController.js` | `getDashboardKpi`, `getDashboardTrend`, `getDashboardTop`, `getBcvhRanking` | `/api/f13/dashboard/kpi`, dashboard top/summary surfaces | `ket_qua_f13` | `danh_gia_2026` | Yes | Visible KPI surfaces must match KPI 2026 reporting |
| `backend/src/repositories/FactBuuGuiRepository.js` | `getKpiMetrics`, `getBcvhRanking`, `getRouteRanking`, `getParetoData`, `getEvidenceList`, `getDailyTrendData` | Dashboard runtime repository layer | Mixed legacy/current | `danh_gia_2026` for current reporting | Yes | Keeps all current-period dashboard aggregations aligned |
| `backend/src/services/F13DashboardService.js` | `getDashboardKpi`, `getBcvhRanking`, `getRouteRanking`, `getParetoAnalysis` | Dashboard orchestration and adapters | Depends on repo/controller source | `danh_gia_2026` | Yes | Prevents adapter-level mismatch |
| `backend/src/services/timelineService.js` | `getQualityTimeline` | Dashboard timeline surface | `ket_qua_f13` | `danh_gia_2026` | Yes | Timeline is a current-reporting dashboard view |
| `backend/src/services/messageGenerationService.js` | `generateMessages` | Executive brief / messaging outputs | `ket_qua_f13` | `danh_gia_2026` | Yes | Message generation must reflect current KPI 2026 |
| `backend/src/engine/rules/RuleRegistry.js` | `execute` | Rule-engine KPI inputs | `ket_qua_f13` | `danh_gia_2026` | Yes | Recommendation inputs must not diverge from current KPI source |
| `backend/src/engine/rules/RuleF13302.js` | `evaluate` | Late-payment rule evaluation | `ket_qua_f13` | `danh_gia_2026` | Yes | Keeps rule-engine gating consistent with current reporting population |
| `backend/src/services/excelParser.js` | column mapping | Import compatibility | both columns | keep both | No | Import must preserve historical storage and KPI 2026 ingestion |
| `backend/src/repositories/FactBuuGuiRepository.js` | `overwriteImport` | Import persistence | `ket_qua_f13` | keep legacy storage | No | Historical compatibility and raw storage retention |
| `frontend/src/api/F13DashboardClient.js` | response mapping | Dashboard UI adapter | API fields | API contract unchanged | No | UI consumes API output; no direct source-field change |
| `frontend/src/features/dashboard/components/ExecutiveSummaryAdapter.jsx` | adapter mapping | Executive summary surface | API-derived | API-derived | No | Uses backend KPI response |

## Documentation Classification

- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/data_blueprint.md`: `REQUIRED UPDATE` via authoritative clarification; legacy MVP mapping is preserved for import compatibility, but current reporting must use `danh_gia_2026`
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_rules.md`: `REVIEWED — NO UPDATE REQUIRED`
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/measurement.md`: `REVIEWED — NO UPDATE REQUIRED`
- `backend/src/services/excelParser.js`: `REVIEWED — NO UPDATE REQUIRED`

## Runtime Reconciliation

Verified on actual data:

- `2026-07-15`
  - total records: `3677`
  - legacy passed count: `2471`
  - KPI 2026 passed count: `2471`
  - KPI 2026 failed count: `1037`
  - KPI 2026 NULL/returned count: `169`
  - expected quality rate: `67.2015%`
  - endpoint result: `67.2015%`
  - verdict: `PASS`
- `2026-07-14`
  - total records: `3134`
  - KPI 2026 passed count: `0`
  - KPI 2026 failed count: `0`
  - KPI 2026 NULL/returned count: `173`
  - expected quality rate: `0.0000%`
  - endpoint result: `0.0000%`
  - verdict: `PASS`
- `2026-07-13`
  - total records: `4375`
  - KPI 2026 passed count: `0`
  - KPI 2026 failed count: `0`
  - KPI 2026 NULL/returned count: `184`
  - expected quality rate: `0.0000%`
  - endpoint result: `0.0000%`
  - verdict: `PASS`
- BCVH-filtered case:
  - `BCVH Thuận Hóa` on `2026-07-15`
  - KPI 2026 rate: `73.9079%`
  - verdict: `PASS`
- Dashboard overview current-day check:
  - `2099-10-10`
  - endpoint result: `75.00%`
  - verdict: `PASS`

## Divergence Note

Runtime reconciliation confirmed `104` records on `2026-07-15` where `ket_qua_f13` and `danh_gia_2026` differ.
That divergence explains why dashboard surfaces that still used the legacy field could not match the approved KPI 2026 result.

## Contract Preserved

- one row per date
- ascending date order
- missing-day rows remain emitted
- returned-shipment `NULL` remains part of the population
- optional BCVH filtering remains supported
- API response envelope remains unchanged

## Regression Tests

- dashboard KPI regression fixture with deliberate legacy/KPI 2026 mismatch
- daily trend regression fixture with deliberate legacy/KPI 2026 mismatch
- BCVH ranking regression coverage

## Completion

The recovery is complete. The Dashboard overview, daily trend, BCVH ranking, timeline, message generation, and rule-engine inputs now use the KPI 2026 source where applicable.

## Closure Note

This record is closed and preserved for audit trail purposes. The active current ticket remains `TODAY-003-R1 Quality Trendline Runtime Route Recovery`, while `TODAY-004 Volume Trendline` is the next planned milestone.
