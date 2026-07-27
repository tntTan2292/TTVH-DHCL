# DA-IMPL-008 CHECKPOINT 002

## Phase

- Ticket: `DA-IMPL-008`
- Checkpoint: `002 - Integrated Trend full-width remediation`
- Current state: `COMPLETED / PO PASS`
- Technical status: `PASS`
- Runtime status: `TARGETED SOURCE/UNIT VALIDATION PASS`
- PO UI check required: `Yes`
- PO product status: `PO PASS`

## Product Owner Decision

Product Owner decided to remove `Ngoại lệ & Rủi ro chính` from both `7 ngày so sánh` and `Theo BCVH`.

All three tabs of `Xu hướng điều hành tổng hợp` must use the full available chart width.

## Implemented Scope

- Removed the `Ngoại lệ & Rủi ro chính` side panel from the integrated trend workspace render path.
- Removed the now-unused Quality Timeline pulse request from the integrated trend workspace.
- Changed the workspace body grid so `30 ngày`, `7 ngày so sánh`, and `Theo BCVH` all use the same full-width chart container.
- Added a targeted regression assertion that the risk panel, Quality Timeline request, and old two-column layout are absent.

## Preserved Scope

- Chart data mapping is unchanged.
- KPI formulas are unchanged.
- D-1 and D-7 comparison widgets are unchanged.
- `7 ngày so sánh` visible evidence rows are unchanged.
- Filters and URL context are unchanged.
- Tooltip, legend, target line, bars, pass-rate line, and below-target markers are unchanged.
- Backend APIs, database schema, SSOT, canonical BCVH mappings, and import behavior are unchanged.

## Validation

- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js`
  - Result: `PASS`
  - Evidence: `24` tests passed, `0` failed.
- `git diff --check`
  - Result: `PASS`.

## Product Owner Checklist

Use the Dashboard URL for the normal DA-IMPL-008 review context.

- Open `Xu hướng điều hành tổng hợp`.
- Select `30 ngày`.
  - Expected: chart uses full available workspace width.
- Select `7 ngày so sánh`.
  - Expected: `Ngoại lệ & Rủi ro chính` is not visible; chart and 7-day evidence use full available workspace width.
- Select `Theo BCVH`.
  - Expected: `Ngoại lệ & Rủi ro chính` is not visible; chart uses full available workspace width.
- Confirm accepted chart behavior remains intact: data, KPI values, comparisons, filters, tooltip, and legend still behave as before.

## Handoff

Product Owner accepted this checkpoint as `PO PASS`.

Next authorized work: `DA-IMPL-008 CHECKPOINT 003 - Full two-month Heatmap and weekday labels`.
