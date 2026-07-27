# DA-IMPL-008 CHECKPOINT 004

## Phase

- Ticket: `DA-IMPL-008`
- Checkpoint: `004 - Dashboard nationwide ranking range correction`
- Current state: `COMPLETED`
- Technical status: `PASS`
- Runtime status: `LEVEL 2 TARGETED VALIDATION PASS; BACKEND RESTART NOT PERFORMED`
- PO UI check required: `Yes`
- PO product status: `PO PASS`

## Product Owner Decision

Product Owner expanded Checkpoint 004 to include correction of the top Dashboard `Xep hang toan quoc` widget.

Product Owner accepted `DA-IMPL-008 CHECKPOINT 004` as `PO PASS` on `2026-07-27`.

Required behavior:

- For a single selected date, show Hue's nationwide rank for that date.
- For a selected date range, calculate nationwide ranking from authoritative cumulative TCT data for exactly that range.
- The widget must react to `fromDate` / `toDate` changes.
- Do not use the latest available day's rank as the rank for a multi-day range.
- Preserve the existing authoritative KPI formula, eligible province population, tie handling, missing-data semantics, and nationwide data source.
- Do not invent a frontend-only ranking formula.

## Targeted Discovery

Root cause:

- `backend/src/services/F13DashboardService.js` called `_getNationalRankSummary(endDate)` from `getDashboardKpi(startDate, endDate, ...)`.
- `_getNationalRankSummary(endDate)` queried `MAX(ngay_do_kiem) WHERE ngay_do_kiem <= ?`, then ranked Hue for that latest available TCT day.
- Because the selected `startDate` was not part of the ranking contract, multi-day ranges could display the latest available day rank instead of an exact cumulative selected-range rank.

Existing contract support:

- `fact_f13_national` stores authoritative TCT daily rows by `ngay_do_kiem`, `ma_tinh_phat`, `sl_bg_ptc`, and `sl_ptc_dung_qd_ct`.
- The accepted KPI formula can be preserved for a selected range by aggregating `SUM(sl_ptc_dung_qd_ct) / SUM(sl_bg_ptc)` over exactly `BETWEEN startDate AND endDate`.
- Existing rank ordering is preserved: KPI descending, then volume descending, without grouped tied ranks.
- Missing/unknown semantics are preserved by returning unavailable ranking when no national rows exist, when the requested province is absent, or when the selected date input is invalid.

## Implemented Scope

- Changed the Dashboard KPI service contract to call `_getNationalRankSummary(startDate, endDate)`.
- Kept single-date ranking on exact `ngay_do_kiem = endDate`; removed the previous latest-available fallback from the selected-period rank path.
- Added cumulative selected-range ranking from `fact_f13_national` using grouped national TCT rows between the selected dates.
- Preserved the existing `national_rank` response shape and added compatible period metadata:
  - `period_start`
  - `period_end`
  - `period_type`
  - `requested_period_start`
  - `requested_period_end`
- Updated the top Dashboard command summary text to display the selected nationwide ranking period instead of "latest nationwide data".

## Preserved Scope

- KPI formulas are unchanged.
- Thresholds are unchanged.
- Canonical BCVH mappings are unchanged.
- API endpoint and request parameters are unchanged.
- Database schema is unchanged.
- Filters and accepted Dashboard data sources are unchanged.
- Nationwide data source remains `fact_f13_national`.
- Import lifecycle and TCT Import operations were not changed.
- Backend was not restarted.
- Nationwide-ranking integration beyond the top Dashboard widget was not started.
- Dashboard performance optimization was not started.
- Completed Dashboard and Import tickets were not reopened.

## Compact Heatmap Ranking Options

Documented only; not implemented in this checkpoint.

1. Inline rank badge per day
   - Show a compact `#rank/34` chip only on Heatmap cells with complete national ranking data.
   - Pros: immediate day-level leadership signal.
   - Risk: dense on desktop and likely too crowded on smaller screens.

2. Hover/focus rank detail
   - Keep cells visually clean and add rank only in tooltip/focus detail.
   - Pros: best preserves current Heatmap readability.
   - Risk: less scannable for leadership without interaction.

3. Month summary rank strip
   - Add one compact strip above each month block showing selected month-to-date Hue rank where complete data exists.
   - Pros: aligns with the two-month block layout.
   - Risk: requires a separate month/range ranking contract decision.

## Validation

- `node --test backend/src/services/F13DashboardService.recovery.test.js`
  - Result: `PASS`
  - Evidence: selected range is passed to nationwide ranking summary; source contract no longer contains `WHERE ngay_do_kiem <= ?` latest fallback for selected-period ranking.
- `node --test frontend/src/features/dashboard/components/unifiedCommandSummary.test.js`
  - Result: `PASS`
  - Evidence: top Dashboard rank card displays selected single-date and selected-range ranking period wording.
- `git diff --check`
  - Result: `PASS`

Runtime note:

- Backend restart and browser runtime retest were not performed because Product Owner explicitly instructed not to restart backend while TCT Import is running.

## Product Owner Checklist

Use the existing Dashboard review URL after the running TCT Import can safely complete and normal runtime retest is authorized.

- Select a single date with available TCT national data and confirm `Xep hang toan quoc` shows Hue's rank for that exact date.
- Select a multi-day date range with available TCT national data and confirm the rank changes according to the cumulative selected range.
- Change only `fromDate` and confirm the top rank widget reacts.
- Change only `toDate` and confirm the top rank widget reacts.
- Confirm the widget no longer describes or behaves as "latest available nationwide data" for a selected range.
- Confirm missing national data still shows an unavailable rank rather than `0/34` or a fabricated value.

## Handoff

This checkpoint is completed with Product Owner `PO PASS`.
