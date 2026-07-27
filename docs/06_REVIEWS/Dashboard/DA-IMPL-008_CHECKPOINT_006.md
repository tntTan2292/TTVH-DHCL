# DA-IMPL-008 CHECKPOINT 006

## Phase

- Ticket: `DA-IMPL-008`
- Checkpoint: `006 - Nationwide Ranking Integration Discovery`
- Current state: `DISCOVERY COMPLETE / READY FOR PO DECISION`
- Technical status: `DISCOVERY PASS`
- Runtime status: `NOT RUN - DISCOVERY ONLY`
- PO UI check required: `Yes - decision required before implementation`
- PO product status: `WAITING FOR PO DECISION`

## Product Owner Decision

Product Owner accepted `DA-IMPL-008 CHECKPOINT 005` as `PO PASS` on `2026-07-27`.

Product Owner authorized discovery only for Checkpoint 006. No Dashboard code, schema, KPI formula, Import lifecycle, threshold, mapping, or completed checkpoint behavior was changed.

## Existing Contract Findings

- Authoritative nationwide ranking data exists at province level in `fact_f13_national`, keyed by `ngay_do_kiem` and `ma_tinh_phat`.
- The current ranking contract supports Hue's single-date nationwide rank through backend ranking over one exact `ngay_do_kiem`.
- The current ranking contract supports selected-range nationwide rank through backend cumulative aggregation over exactly `startDate..endDate`.
- The top Dashboard `Xep hang toan quoc` widget and Unified Action Center already consume this selected-date or selected-range KPI contract.
- Checkpoint 004 behavior is preserved by keeping selected-range ranking in `getDashboardKpi(startDate, endDate)` and not replacing it with daily/latest fallback logic.
- No authoritative BCVH-level nationwide ranking contract was found. BCVH rows remain local BCVH ranking only and must not receive national rank labels.
- Heatmap currently receives day-level KPI data from `GET /f13/dashboard/quality-timeline?mode=heatmap`; weekday/month tabs are lazy-scoped from Checkpoint 005.
- Daily nationwide ranking can be supplied efficiently only if the backend enriches Heatmap dates from `fact_f13_national` in one batched query or shared ranking service. The frontend must not calculate province rank independently.

## Recommended Primary Option

Add Hue nationwide rank to Heatmap day tooltip/focus detail, supplied by the backend only for Heatmap mode.

Recommended contract shape after PO approval:

- Keep `GET /f13/dashboard/quality-timeline` backward compatible.
- Add an opt-in parameter such as `include_national_rank=1` for `mode=heatmap`.
- Backend enriches each Heatmap date with a compact nullable object, for example `national_rank: { available, rank, total, period, province_code, metric, metric_value, volume, message }`.
- Frontend displays the rank only in the Heatmap cell tooltip/focus text, leaving the visible cell layout unchanged at first.
- Missing national data never renders `0/34`; it renders clear unavailable wording.

Rationale:

- Heatmap is the most useful time-based surface for daily ranking context.
- Tooltip/focus keeps the two-month grid readable at desktop 100% zoom.
- Lazy Heatmap mode avoids impact on initial Dashboard load.
- A single backend-enriched Heatmap payload avoids per-cell requests.
- The existing top Dashboard rank and Action Center selected-range rank remain the primary range-level leadership signals.

## Alternatives And Trade-offs

1. Inline Heatmap day badge such as `#24/34`.
   - Benefit: easiest to scan without hover.
   - Trade-off: high density in 14-column/two-month layout; risks cramped cells at 100% zoom.

2. Dedicated ranking row under each Heatmap month.
   - Benefit: visible day-by-day rank comparison.
   - Trade-off: adds height and cognitive load; likely needs responsive scrolling rules.

3. Secondary rank line in the Integrated Trend chart.
   - Benefit: helps compare KPI rate movement with national rank movement.
   - Trade-off: mixed axes can mislead because rank direction is inverse and the trend chart already carries volume and KPI rate.

4. Month summary rank strip in Heatmap.
   - Benefit: compact month-level context.
   - Trade-off: cumulative month/range rank can be confused with daily Heatmap cells unless wording is very explicit.

5. Additional top-level Dashboard rank card.
   - Not recommended because the top Command Summary already owns selected-date/range national rank.

6. BCVH table or BCVH rows.
   - Not allowed under current authority because no BCVH-level nationwide ranking contract exists.

## Affected Components And Contracts

- Backend: `backend/src/services/F13DashboardService.js` already contains the authoritative date/range ranking logic.
- Backend: `backend/src/services/timelineService.js` is the smallest Heatmap payload integration point if PO approves daily rank enrichment.
- Backend: a shared national ranking helper/service is preferable during implementation to prevent formula drift from Checkpoint 004.
- Frontend: `frontend/src/features/dashboard/components/OperatingPatternTabsCard.jsx` would display rank in Heatmap tooltip/focus text.
- Frontend: `frontend/src/features/dashboard/components/operatingPatternTabsData.js` would preserve and map optional `national_rank` metadata per Heatmap date.
- No API path, schema, KPI formula, thresholds, mappings, Import lifecycle, or BCVH ranking table contract should change.

## Expected Performance Impact

- Initial Dashboard load request count should remain unchanged because Heatmap is not the default Operating Patterns tab.
- If implemented as an opt-in Heatmap parameter, rank payload loads only when the user opens the Heatmap tab.
- Payload growth is bounded to one small rank object per rendered Heatmap business date, at most the prior full month plus current month through latest data.
- Query cost is bounded by the indexed national table dates: approximately `34` ranked provinces multiplied by up to about `62` Heatmap dates.
- Implementation must use one batched backend query or request-level cache, not one request or query per Heatmap cell.
- No backend query optimization is recommended until implementation evidence shows the batched national lookup is a bottleneck.

## Missing Data Behavior And Wording

- If no national rows exist for a Heatmap date: `Chua co du lieu xep hang toan quoc cho ngay DD/MM/YYYY`.
- If national rows exist but Hue is absent: `Chua co du lieu xep hang cua Hue trong bang toan quoc ngay DD/MM/YYYY`.
- If the user is filtered to a BCVH: do not show BCVH national rank; wording should clarify that nationwide rank is province-level Hue context only if PO approves showing it in all-scope Heatmap.
- Never show fabricated values such as `0/34`, `--/34`, or a latest-date rank for an older Heatmap date.

## Positions Where Ranking Is Misleading Or Redundant

- BCVH rows: misleading without BCVH-level nationwide contract.
- Same-period comparison rows: redundant unless the comparison contract is extended to national daily/range ranking for both periods.
- Integrated Trend default view: potentially misleading without a clearly labeled optional rank overlay because rank direction and KPI rate direction differ.
- Unified Command Summary and Action Center: already display the selected-date/range ranking and should not receive another duplicate rank surface.

## Proposed Validation

- Backend targeted tests for daily Heatmap rank enrichment using exact date rows from `fact_f13_national`.
- Backend targeted tests for missing national date and Hue-missing national date.
- Backend targeted test that Heatmap daily enrichment does not call or change selected-range ranking from Checkpoint 004.
- Frontend mapper tests preserving optional `national_rank` metadata without changing missing/unknown KPI semantics.
- Frontend tooltip/focus tests for available and unavailable national-rank wording.
- Request-count check confirming initial Dashboard load is unchanged and Heatmap rank data is lazy-loaded only when the Heatmap tab is selected.
- Regression check confirming no national rank is added to BCVH rows or BCVH table data.
- `git diff --check` and existing targeted Dashboard tests affected by implementation.

## Product Owner Checklist

- Decide whether to approve the recommended Heatmap tooltip/focus rank option.
- Confirm whether province-level Hue rank should show when a BCVH filter is selected, or only when Dashboard scope is all-network.
- Confirm whether visible rank badges are desired now or deferred after tooltip/focus validation.
- Confirm that BCVH rows remain excluded until an authoritative BCVH-level nationwide ranking contract exists.
- Confirm that top Command Summary selected-range ranking remains unchanged.

## Handoff

Checkpoint 006 is discovery-only and is ready for Product Owner decision. Do not implement nationwide ranking integration until the Product Owner approves one option.
