# DA-IMPL-008 CHECKPOINT 006

## Phase

- Ticket: `DA-IMPL-008`
- Checkpoint: `006 - Nationwide Ranking Integration`
- Current state: `REMEDIATION REQUIRED / READY FOR PO RECHECK`
- Technical status: `PASS - MONTHLY RANK REMEDIATION LEVEL 2 TARGETED VALIDATION`
- Runtime status: `LEVEL 2 TARGETED VALIDATION PASS`
- PO UI check required: `Yes`
- PO product status: `REMEDIATION REQUIRED - WAITING FOR PO RECHECK`

## Product Owner Decision

Product Owner accepted `DA-IMPL-008 CHECKPOINT 005` as `PO PASS` on `2026-07-27`.

Product Owner approved the expanded Checkpoint 006 implementation scope on `2026-07-27`.

Product Owner runtime result on `2026-07-28`: Heatmap inside `Quy luật vận hành` did not display nationwide ranking. Checkpoint 006 is not `PO PASS`; remediation remains required until Product Owner rechecks the runtime UI.

Product Owner decision on `2026-07-28`: tooltip-only Heatmap ranking is not accepted. Nationwide rank must be visible directly inside each dated all-network Heatmap cell. Checkpoint 006 remains `REMEDIATION REQUIRED` and is not `PO PASS`.

Product Owner decision on `2026-07-28`: Heatmap inline ranking is accepted visually. Extend province-level Hue nationwide ranking into `Quy luáº­t váº­n hÃ nh -> Theo thÃ¡ng`, showing monthly cumulative rank and month-over-month rank movement. Checkpoint 006 remains `REMEDIATION REQUIRED` and is not `PO PASS`.

Product Owner authorized province-level Hue nationwide ranking in three bounded contexts only:

1. Heatmap daily tooltip/focus for exact Heatmap dates.
2. Integrated Trend daily point tooltip/detail for exact daily chart points.
3. Selected-range summary detail where the existing aggregate chart/detail represents the full selected date range.

No Dashboard schema, KPI formula, Import lifecycle, threshold, mapping, completed checkpoint behavior, BCVH row ranking, chart rank line, or duplicate KPI card was changed.

## Existing Contract Findings

- Authoritative nationwide ranking data exists at province level in `fact_f13_national`, keyed by `ngay_do_kiem` and `ma_tinh_phat`.
- The current ranking contract supports Hue's single-date nationwide rank through backend ranking over one exact `ngay_do_kiem`.
- The current ranking contract supports selected-range nationwide rank through backend cumulative aggregation over exactly `startDate..endDate`.
- The top Dashboard `Xep hang toan quoc` widget and Unified Action Center already consume this selected-date or selected-range KPI contract.
- Checkpoint 004 behavior is preserved by keeping selected-range ranking in `getDashboardKpi(startDate, endDate)` and not replacing it with daily/latest fallback logic.
- No authoritative BCVH-level nationwide ranking contract was found. BCVH rows remain local BCVH ranking only and must not receive national rank labels.
- Heatmap currently receives day-level KPI data from `GET /f13/dashboard/quality-timeline?mode=heatmap`; weekday/month tabs are lazy-scoped from Checkpoint 005.
- Daily nationwide ranking can be supplied efficiently only if the backend enriches Heatmap dates from `fact_f13_national` in one batched query or shared ranking service. The frontend must not calculate province rank independently.

## Implemented Scope

- Added backend daily rank enrichment from authoritative `fact_f13_national` data using the same formula and tie order as Checkpoint 004: `tl_ptc_dung_qd_ct DESC`, then `sl_bg_ptc DESC`.
- Added one batched backend date query for daily rank maps; no chart point or Heatmap cell performs a per-date query.
- Enriched `GET /f13/dashboard/daily-trend` rows with backend-provided `national_rank` only for all-network scope.
- Added optional lazy Heatmap rank enrichment through `GET /f13/dashboard/quality-timeline?mode=heatmap&include_national_rank=1`.
- Suppressed province-level rank metadata whenever a BCVH filter is active.
- Heatmap all-network dated cells show compact exact-day Hue province rank inline while preserving the full hover/focus detail.
- Added Integrated Trend daily point tooltip rank detail without adding a rank series, rank line, or rank axis.
- Added selected-range rank detail in the existing Integrated Trend context row from the Checkpoint 004 `kpiData.national_rank` contract.
- Preserved the top Command Summary selected-date/range rank behavior.

## Remediation Evidence - 2026-07-28

Root cause:

- Backend Heatmap enrichment was available, and the frontend request path used the opt-in rank parameter only for all-network Heatmap scope.
- Runtime API evidence confirmed dated all-network Heatmap cells contained backend `national_rank`.
- Runtime API evidence confirmed BCVH-filtered Heatmap cells did not contain province-level `national_rank`.
- The UI break point was frontend rendering: Heatmap rank detail existed only in a passive native `title` attribute and used non-approved wording, so the PO-visible Heatmap did not reliably display the ranking on hover/focus.

Remediation:

- Updated Heatmap rank wording to `Xếp hạng toàn quốc: Hạng X/Y`.
- Rendered the same Heatmap detail content in an on-hover and on-focus popup while keeping normal Heatmap cells unchanged.
- Preserved the backend-provided unavailable message for missing national data.
- Preserved BCVH-filter suppression: no rank opt-in request and no province-level rank display when a BCVH filter is active.

Runtime API check:

- `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=all&mode=heatmap&include_national_rank=1`
  - Result: `PASS`
  - Evidence: `49` dated Heatmap cells; sample `2026-07-19` contains `national_rank.rank=21`, `national_rank.total=34`.
- `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=535790&mode=heatmap&include_national_rank=1`
  - Result: `PASS`
  - Evidence: `49` dated Heatmap cells; `0` cells contain `national_rank`.

## Missing Data Behavior

- Missing national date returns clear unavailable wording for that exact date.
- Hue-absent national date returns clear unavailable wording for Hue in the national table.
- Missing and unavailable states never render fabricated values such as `0/34`, `--/34`, or another date's rank.
- BCVH-filtered Dashboard state suppresses province-level national rank details instead of showing misleading Hue province rank for a BCVH scope.

## Implemented Option

Added Hue nationwide rank to Heatmap day tooltip/focus detail, Integrated Trend daily point tooltip/detail, and the selected-range Integrated Trend context detail.

Implemented contract shape:

- Keep `GET /f13/dashboard/quality-timeline` backward compatible.
- Added opt-in parameter `include_national_rank=1` for `mode=heatmap`.
- Backend enriches each Heatmap date and daily-trend date with compact nullable `national_rank` metadata.
- Frontend displays Heatmap rank only in cell tooltip/focus text, leaving the visible cell layout unchanged.
- Missing national data never renders `0/34`; it renders clear unavailable wording.

Rationale:

- Heatmap is the most useful time-based surface for daily ranking context.
- Tooltip/focus keeps the two-month grid readable at desktop 100% zoom.
- Lazy Heatmap mode avoids impact on initial Dashboard load.
- A single backend-enriched Heatmap payload avoids per-cell requests.
- The existing top Dashboard rank and Action Center selected-range rank remain the primary range-level leadership signals.

## Alternatives And Trade-offs Preserved For Later PO Decision

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

- Initial Dashboard request count remains unchanged.
- Integrated Trend daily-rank metadata is carried on the existing daily-trend request.
- Heatmap daily-rank metadata loads only on the existing lazy Heatmap timeline request with `include_national_rank=1`.
- Payload growth is bounded to one small rank object per displayed daily point/date when all-network scope is active.
- Query cost is bounded by one indexed national table lookup per relevant surface request, not one query per cell or chart point.
- No database schema or broad query optimization was required.

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

## Validation

- `node --test backend/src/services/F13DashboardService.recovery.test.js`
  - Result: `PASS`
  - Evidence: `14` tests passed, including exact daily rank enrichment, BCVH-filter suppression, batched query ordering, selected-range C004 contract, and BCVH ranking no-latest fallback.
- `node --test backend/src/services/timelineService.recovery.test.js`
  - Result: `PASS`
  - Evidence: `6` tests passed, including Checkpoint 003 two-month Heatmap regressions and Heatmap rank map enrichment.
- `node --test frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/dashboardLoadPerformance.test.js`
  - Result: `PASS`
  - Evidence: `49` tests passed, including backend-provided rank mapping, Heatmap tooltip/focus metadata, Integrated Trend tooltip/detail guard, no rank line/axis, no BCVH row ranking, unchanged initial request count, and C003/C005 regressions.
- `git diff --check`
  - Result: `PASS`

## Remediation Validation - 2026-07-28

- Product Owner runtime evidence after backend/frontend reset and hard refresh:
  - Heatmap inside `Quy luật vận hành -> Heatmap -> Toàn mạng` still showed no visible nationwide rank detail.
  - Checkpoint 006 remains `REMEDIATION REQUIRED`; this remediation does not self-award `PO PASS`.
- Runtime-first discovery:
  - Browser route: `http://localhost:5178/f13/dashboard?from_date=2026-07-13&to_date=2026-07-19&ma_bcvh=all`.
  - API contract evidence: `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=all&mode=heatmap&include_national_rank=1`.
  - Payload evidence: sample Heatmap date `2026-07-19` returned `national_rank.available=true`, `rank=21`, `total=34`.
  - BCVH suppression evidence: `GET /api/f13/dashboard/quality-timeline?toDate=2026-07-19&ma_bcvh=535790&mode=heatmap&include_national_rank=1` returned `0` dated cells with `national_rank`.
  - Runtime mapped model evidence: the rendered `2026-07-19` Heatmap cell carried `aria-label="-7.73 so với TB | Xếp hạng toàn quốc: Hạng 21/34"`.
  - DOM/CSS break point: the previous popup existed only as a hidden absolute child under the Heatmap cell path; runtime computed style stayed `display:none` and the ancestor path included the month scroller plus the card `overflow-hidden` boundary.
  - Built CSS evidence: `group-hover` utilities were present, but runtime hover/focus visibility remained fragile and PO-visible rank detail did not render reliably.
- Implemented smallest runtime correction:
  - Kept normal Heatmap cells unchanged and removed the in-cell hidden detail span.
  - Added one state-driven floating `role="tooltip"` detail layer with `data-testid="heatmap-rank-detail-layer"`.
  - The layer is anchored from the active cell's runtime bounding box and rendered as `position: fixed` with `z-index: 1000`, outside the month-cell and `overflow-x-auto` wrapper path.
  - Hover, focus, and click use the same `showDayDetail` path; mouseleave, blur, and `Escape` close the layer.
  - Available text remains `Xếp hạng toàn quốc: Hạng X/Y`; unavailable text uses the backend-provided Vietnamese message.
- Browser runtime recheck after implementation:
  - All-network Heatmap rendered exactly `Tháng 06/2026` and `Tháng 07/2026`.
  - All-network Heatmap exposed `49` dated cells with national-rank detail labels.
  - Clicking/focusing `2026-07-19` rendered one floating layer with text `-7.73 so với TB | Xếp hạng toàn quốc: Hạng 21/34`.
  - Floating layer computed style: `display=block`, `visibility=visible`, `opacity=1`, `position=fixed`, `z-index=1000`.
  - Floating layer placement evidence: `insideCell=false`; `insideOverflowXWrapper=false`.
  - `Escape` removed the floating layer.
  - BCVH-filter browser route rendered no national-rank labels and no floating rank layer.
- `node --test backend/src/services/F13DashboardService.recovery.test.js backend/src/services/timelineService.recovery.test.js`
  - Result: `PASS`
  - Evidence: `20` tests passed; C004 selected-range ranking, daily rank batching, BCVH suppression, C003 two-month Heatmap, and C005 lazy mode remained covered.
- `node --test frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/dashboardLoadPerformance.test.js`
  - Result: `PASS`
  - Evidence: `53` tests passed; request opt-in, mapper preservation, available wording, unavailable backend message, runtime fixed-layer model, hover/focus/click source path, BCVH suppression, no inline badge, no BCVH row/table ranking, and unchanged request count remained covered.
- `git diff --check`
  - Result: `PASS`

## Inline Heatmap Rank Remediation - 2026-07-28

- Product Owner decision:
  - Tooltip-only Heatmap ranking was not accepted.
  - All-network dated Heatmap cells must show rank at a glance as a third line, preferred format `H21/34`.
  - Checkpoint 006 remains `REMEDIATION REQUIRED`; this remediation does not self-award `PO PASS`.
- Implemented smallest correction:
  - Line 1 remains the existing date label.
  - Line 2 remains the existing KPI rate label.
  - Line 3 now shows compact backend-provided exact-day Hue national rank such as `H21/34`.
  - If backend rank metadata is present but unavailable, line 3 shows neutral compact `H–`; the existing tooltip/focus detail keeps the backend-provided Vietnamese reason.
  - If backend rank metadata is absent, no rank line is rendered. This preserves BCVH-filter suppression because BCVH Heatmap payloads do not receive province-level rank metadata.
  - Heatmap cells were increased from `h-14` to `h-16` with smaller secondary rank text to keep desktop 100% readability without horizontal overflow, month misalignment, clipped text, or overlap.
- Browser runtime evidence:
  - All-network route: `http://localhost:5178/f13/dashboard?from_date=2026-07-13&to_date=2026-07-19&ma_bcvh=all`.
  - Heatmap rendered exactly `Tháng 06/2026` and `Tháng 07/2026`.
  - Sample date `2026-07-19` rendered cell lines `19/07`, `52.56%`, `H21/34`.
  - Sample cell full detail remained `-7.73 so với TB | Xếp hạng toàn quốc: Hạng 21/34`.
  - Sample cell dimensions were `~54.86px x 64px`; runtime checks found no horizontal or vertical cell overflow.
  - Existing floating tooltip remained visible on click/focus with full wording.
  - BCVH route `ma_bcvh=535790` rendered Heatmap sample cell lines `19/07`, `74.47%` only; no compact rank pattern, no rank aria label, and no rank tooltip layer appeared.
- `node --test backend/src/services/F13DashboardService.recovery.test.js backend/src/services/timelineService.recovery.test.js backend/src/controllers/DashboardController.test.js`
  - Result: `PASS`
  - Evidence: `20` tests passed; C004 selected-date/range rank, daily rank batching, BCVH suppression, C003 two-month Heatmap, and C005 lazy mode remained covered.
- `node --test frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/dashboardLoadPerformance.test.js`
  - Result: `PASS`
  - Evidence: `54` tests passed; rendered cell line model covers `H21/34`, `H–`, backend-rank absence suppression, tooltip detail, unchanged initial request count, no BCVH rows/tables ranking, and no chart rank line or axis.
- `git diff --check`
  - Result: `PASS`

## Product Owner Checklist

- Open Dashboard with `ma_bcvh=all`.
- Confirm all-network dated Heatmap cells show a third compact line such as `H21/34`.
- Hover/focus Heatmap dates with TCT national data and confirm exact-day Hue national rank still appears in tooltip/focus text.
- Confirm unavailable national rank dates show neutral compact `H–` and the tooltip/focus detail explains the backend-provided reason.
- Hover Integrated Trend daily points and confirm exact-day Hue national rank appears with daily KPI/volume detail.
- Confirm the Integrated Trend selected-range context shows the cumulative Hue national rank for the selected range.
- Switch to any BCVH filter and confirm Heatmap, Integrated Trend tooltip, and selected-range detail no longer show province-level national rank.
- Confirm no national rank appears in BCVH rows/tables, weekday summaries, or monthly pattern rows.
- Confirm no duplicate rank KPI card, chart rank line, rank axis, or inline Heatmap rank badge was added.
- Confirm top Command Summary selected-date/range rank still behaves as accepted in Checkpoint 004.

## Monthly Rank Remediation - 2026-07-28

- Product Owner decision:
  - Heatmap inline ranking is accepted visually.
  - Add Hue province-level nationwide ranking to `Quy luáº­t váº­n hÃ nh -> Theo thÃ¡ng`.
  - Show each displayed month's backend-provided cumulative rank as `Háº¡ng X/Y` and movement versus the immediately previous displayed month as `â†‘ N háº¡ng`, `â†“ N háº¡ng`, or `KhÃ´ng Ä‘á»•i`.
  - Checkpoint 006 remains `REMEDIATION REQUIRED`; this remediation does not self-award `PO PASS`.
- Backend implementation:
  - Added `getNationalRanksForPeriods(periods = [])` to calculate monthly cumulative Hue province rank from authoritative `fact_f13_national`.
  - Uses one batched national query across all displayed month periods; no per-month query loop.
  - Reuses Checkpoint 004 formula and ordering: aggregated KPI descending, then volume descending, with ordinal rank positions and no grouped tied ranks.
  - Completed prior months use full calendar month periods, for example `2026-06-01..2026-06-30`.
  - Current/latest-data month uses day `01` through latest available business-data date, for example `2026-07-01..2026-07-19`.
  - Missing month or Hue-absent national data returns backend Vietnamese unavailable wording and does not fabricate `0/34`, `--/34`, or another month's rank.
  - Movement is calculated only when both adjacent displayed months have valid ranks; smaller numeric rank is improvement.
- Frontend implementation:
  - Added a compact monthly rank strip in `Theo thÃ¡ng`, aligned above the existing monthly bar/line chart.
  - Preserved monthly bars, KPI-rate line, management summary, legend, and layout.
  - Full detail is available through `title` and focusable `aria-label`, including rank period and movement.
  - Province-level monthly rank is requested and rendered only for `ma_bcvh=all`.
  - BCVH filters suppress monthly rank request metadata and UI.
  - No ranking line, extra chart axis, duplicate KPI card, rank legend entry, BCVH row/table ranking, weekday ranking, or monthly chart series was added.
- Service-level runtime evidence without restarting the shared backend process:
  - Direct service call `getQualityTimeline('2026-07-19', 'all', { mode: 'month', includeNationalRank: true })` returned `7` monthly rows and `7` monthly rank objects.
  - Sample `2026-06`: `period_start=2026-06-01`, `period_end=2026-06-30`, `rank=18/34`, movement `â†“ 8 háº¡ng`.
  - Sample `2026-07`: `period_start=2026-07-01`, `period_end=2026-07-19`, `rank=13/34`, movement `â†‘ 5 háº¡ng`.
  - Direct BCVH service call with `ma_bcvh=535790` returned `7` monthly rows and `0` monthly rank objects.
  - Live `localhost:5050` process was not restarted; its API response lacked new `rank_period_*` fields, indicating it was still running pre-change code. Import lifecycle was not disturbed.
- LEVEL 2 targeted validation:
  - `node --test backend/src/services/F13DashboardService.recovery.test.js backend/src/services/timelineService.recovery.test.js backend/src/controllers/DashboardController.test.js`
    - Result: `PASS`
    - Evidence: `25` tests passed, covering C004 selected-date/range rank, daily and monthly rank batching, movement direction, missing-adjacent movement suppression, full prior-month periods, latest-data current month, BCVH suppression, C003 Heatmap regressions, and C005 lazy mode.
  - `node --test frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/operatingPatternTabsData.test.js frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/dashboardLoadPerformance.test.js`
    - Result: `PASS`
    - Evidence: `57` tests passed, covering rendered monthly rank labels, movement labels, missing-month wording, BCVH suppression, no rank chart line/axis, no duplicate card, unchanged initial request count, and existing C006 Heatmap/Integrated Trend behavior.
  - `git diff --check`
    - Result: `PASS`

## Monthly Rank PO Recheck Checklist

- Open Dashboard with `ma_bcvh=all`, `Quy luáº­t váº­n hÃ nh -> Theo thÃ¡ng`.
- Confirm the monthly rank strip shows compact `Háº¡ng X/Y` for each available month.
- Confirm movement text uses `â†‘ N háº¡ng` for improvement, `â†“ N háº¡ng` for decline, and `KhÃ´ng Ä‘á»•i` when unchanged.
- Confirm completed prior months rank against full calendar months and the current month ranks only through latest available business-data date.
- Confirm unavailable monthly rank uses clear Vietnamese missing-data wording and no fabricated rank.
- Switch to a BCVH filter and confirm monthly province-level rank strip/details are suppressed.
- Confirm no rank line, rank axis, duplicate KPI card, volume/rate legend rank item, BCVH row/table ranking, weekday ranking, or monthly chart-series ranking was added.
- Confirm Heatmap daily inline rank, Integrated Trend rank detail, C004 top selected-range rank, and C005 initial request count remain unchanged.

## Handoff

Checkpoint 006 monthly rank remediation is complete and ready for Product Owner visible recheck.

Do not mark Checkpoint 006 or DA-IMPL-008 as `PO PASS` until Product Owner explicitly accepts it.
