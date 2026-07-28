# F13 BCVH Ranking Redesign Implementation Wave 1 Checkpoint 001

- Ticket: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Date: `2026-07-28`
- Scope: `Wave 1 backend/runtime contract only`
- Status: `WAVE 1 COMPLETE / READY FOR FRONTEND WAVE 2`
- PO UI Check Required: `Not yet for this wave alone`

## Scope Applied

Wave 1 implemented only the bounded backend/runtime contract for the approved BCVH Ranking redesign.

Included fields:

- raw `D-1` volume
- raw `D-7` volume
- raw `D-1` F1.3 rate
- raw `D-7` F1.3 rate
- `D-1` volume delta
- `D-7` volume delta
- `D-1` comparison-period rank
- `D-7` comparison-period rank
- `D-1` rank movement
- `D-7` rank movement
- delayed cash-handover count
- participating postman-route count
- green / yellow / red route-distribution counts

Wave 1 intentionally did not implement grouped table UI, inline `Phan tich BCVH`, doughnut rendering, or visual polish.

## Preserved Authority

- Dashboard SSOT remains unchanged.
- Existing KPI formulas remain unchanged.
- Existing Dashboard color thresholds remain unchanged.
- Existing semantic colors remain unchanged.
- The `7` confirmed non-postman/customer-pickup routes remain excluded from participating postman-route counts.
- Route-distribution counting preserves the accepted Dashboard band thresholds:
  - `green >= 70`
  - `pink >= 60 and < 70` preserved internally but not part of the requested green/yellow/red Wave 1 deliverable
  - `yellow >= 50 and < 60`
  - `red < 50`

## Implemented Runtime Contract

Active endpoint base:

- `GET /api/f13/ranking/bcvh`

Each BCVH row now includes the existing fields plus:

```json
{
  "delayed_cash_handover_count": 0,
  "route_distribution": {
    "participating_postman_route_count": 0,
    "green_route_count": 0,
    "yellow_route_count": 0,
    "red_route_count": 0,
    "pink_route_count": 0
  },
  "comparisons": {
    "d1": {
      "volume": 0,
      "f1_3_rate": 0,
      "volume_delta": 0,
      "comparison_rank": 0,
      "rank_movement": {
        "comparison_rank": 0,
        "delta": 0,
        "direction": "improved | declined | unchanged | unavailable"
      }
    },
    "d7": {
      "volume": 0,
      "f1_3_rate": 0,
      "volume_delta": 0,
      "comparison_rank": 0,
      "rank_movement": {
        "comparison_rank": 0,
        "delta": 0,
        "direction": "improved | declined | unchanged | unavailable"
      }
    }
  }
}
```

Notes:

- Existing `kpi_2026_dod` and `kpi_2026_swc` remain the authoritative `Delta F1.3` fields.
- `rank_movement.direction` follows the explicit PO decision:
  - current rank lower than comparison rank = `improved`
  - current rank higher than comparison rank = `declined`
  - equal = `unchanged`
- `rank_movement.delta` is `comparison_rank - current_rank`.
- When comparison data is unavailable, raw comparison values and deltas remain `null`, and movement direction becomes `unavailable`.
- `pink_route_count` is preserved in the runtime contract because the Dashboard SSOT still uses the accepted 60-69.9 band even though Wave 1 delivery required reporting only green/yellow/red counts.

## Total Row Contract

`meta.total_row` now also includes:

- `delayed_cash_handover_count`
- `route_distribution.participating_postman_route_count`
- `route_distribution.green_route_count`
- `route_distribution.yellow_route_count`
- `route_distribution.red_route_count`
- `route_distribution.pink_route_count`

Wave 1 does not add aggregate D-1/D-7 rank movement to `meta.total_row`.

## Frontend Wave 2 Handoff Contract

Frontend Wave 2 should consume:

- existing current-day columns from the current row contract
- `kpi_2026_dod` as `Delta F1.3 D-1`
- `kpi_2026_swc` as `Delta F1.3 D-7`
- `comparisons.d1.volume` as raw `San luong D-1`
- `comparisons.d1.f1_3_rate` as raw `Ty le F1.3 D-1`
- `comparisons.d1.volume_delta` as `Delta san luong D-1`
- `comparisons.d1.comparison_rank` as `Hang D-1`
- `comparisons.d1.rank_movement.direction` and `comparisons.d1.rank_movement.delta` as `Dich chuyen hang D-1`
- `comparisons.d7.volume` as raw `San luong D-7`
- `comparisons.d7.f1_3_rate` as raw `Ty le F1.3 D-7`
- `comparisons.d7.volume_delta` as `Delta san luong D-7`
- `comparisons.d7.comparison_rank` as `Hang D-7`
- `comparisons.d7.rank_movement.direction` and `comparisons.d7.rank_movement.delta` as `Dich chuyen hang D-7`
- `delayed_cash_handover_count`
- existing `f13_303_rate`
- `route_distribution.participating_postman_route_count`
- `route_distribution.green_route_count`
- `route_distribution.yellow_route_count`
- `route_distribution.red_route_count`
- optional `route_distribution.pink_route_count` if the frontend needs exact SSOT-preserving distribution totals for a later doughnut or legend treatment

Frontend Wave 2 must still handle presentation colors independently and must not invent new thresholds.

## Validation Evidence

Focused backend validation completed:

- `node --test backend/src/services/F13DashboardService.recovery.test.js`
- `node --test backend/test_f13_route_classification.js`
- `git diff --check`

Coverage confirmed:

- no selected-date fallback regression
- null D-1 / D-7 comparison handling when prior rows are unavailable
- Wave 1 comparison contract fields
- explicit rank-movement semantics
- delayed cash-handover count
- participating postman-route count
- preserved exclusion of the `7` confirmed non-postman routes
- route-distribution green/yellow/red counting with pink preserved internally

## Remaining Work

Wave 2 frontend/presentation remains open for:

- grouped BCVH ranking table UI
- D-1 / D-7 visible-column handling
- independent signal colors in the table
- inline `Phan tich BCVH`
- doughnut visualization
- final PO-visible manual checklist

Do not self-award PO PASS from this checkpoint.
