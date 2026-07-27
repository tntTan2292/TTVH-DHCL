# DA-IMPL-008 CHECKPOINT 003

## Phase

- Ticket: `DA-IMPL-008`
- Checkpoint: `003 - Full two-month Heatmap and weekday labels`
- Current state: `READY FOR PO CHECK - REMEDIATION VALIDATED`
- Technical status: `PASS`
- Runtime status: `LEVEL 1 TARGETED VALIDATION PASS`
- PO UI check required: `Yes`
- PO product status: `WAITING FOR PO CHECK`

## Product Owner Decision

Product Owner accepted `DA-IMPL-008 CHECKPOINT 002` as `PO PASS`.

Product Owner authorized Checkpoint 003 to improve the Operating Patterns Heatmap only:

- Display the complete previous calendar month.
- Display the current calendar month through the latest available date.
- Preserve the existing two-month block layout.
- Add clear weekday labels above the corresponding dates.
- Preserve missing/unknown data semantics.
- Keep desktop usability at `100%` zoom with controlled responsive behavior.

## Implemented Scope

- Extended the existing `quality-timeline` Heatmap payload content to cover previous-month start through latest available data date while keeping the same endpoint, request params, and `heatmap` week-array response field.
- Preserved missing calendar dates as unavailable Heatmap cells instead of treating them as valid `0%` KPI days.
- Kept Heatmap relative coloring based on each displayed day compared with its own month average.
- Added weekday header labels `T2` through `CN` above each month block.
- Kept the two-month block layout and added controlled horizontal scrolling for compact widths.

## Preserved Scope

- KPI formulas are unchanged.
- Thresholds and relative Heatmap bands are unchanged.
- Canonical BCVH mappings are unchanged.
- API endpoint, request parameters, database schema, filters, and accepted data sources are unchanged.
- Nationwide-ranking integration was not started.
- Dashboard performance optimization was not started.
- Completed Dashboard and Import tickets were not reopened.

## Remediation

Product Owner runtime evidence showed the Heatmap rendering three month blocks: `05/2026`, `06/2026`, and `07/2026`.

Root cause:

- The backend Heatmap range start used local `Date` construction and then converted that local midnight to ISO.
- In the runtime timezone, the intended `2026-06-01` previous-month start could serialize as `2026-05-31`.
- The frontend grouped every dated Heatmap cell by month, so the dated `2026-05-31` padding/boundary cell produced an extra `05/2026` block.

Correction:

- Heatmap month-window boundaries now use UTC-safe calendar-month construction.
- The backend emits dated cells only inside the intended previous-month-through-latest-data window.
- Weekday alignment padding remains `null` and cannot create an additional month block.
- The frontend two-month grouping behavior, weekday labels, relative bands, and missing/unknown semantics are preserved.

## Validation

- `node --test frontend/src/features/dashboard/components/operatingPatternTabsData.test.js`
  - Result: `PASS`
  - Evidence: `14` tests passed, `0` failed.
- `node --test backend/src/services/timelineService.recovery.test.js`
  - Result: `PASS`
  - Evidence: `4` tests passed, `0` failed.
  - Coverage: source data spanning more than two months; month-end boundaries; December-to-January transition; padding cells not creating an additional month block.
- `git diff --check`
  - Result: `PASS`.

## Product Owner Checklist

Use the normal Dashboard review URL and select the `Heatmap` tab inside `Quy luật vận hành`.

- Confirm there are two month blocks.
- Confirm the previous calendar month block starts on day `01` and ends on the final day of that previous month.
- Confirm the current calendar month block starts on day `01` and ends at the latest available data date, not necessarily today.
- Confirm weekday labels `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `CN` appear above the corresponding date columns.
- Confirm missing/unknown days remain visually unavailable and are not presented as valid KPI performance.
- Confirm the Heatmap remains usable at desktop `100%` zoom, with controlled horizontal scrolling if viewport width is constrained.

## Handoff

This checkpoint remains ready for Product Owner visible UI check after remediation.

Product Owner decision recorded on `2026-07-27`: Checkpoint 003 required remediation because runtime showed an extra `05/2026` Heatmap block. Remediation is technically validated, but Product Owner visible acceptance is still required.

Do not mark Checkpoint 003 or DA-IMPL-008 as `PO PASS` until Product Owner explicitly accepts it.
