# DA-IMPL-008 CHECKPOINT 005

## Phase

- Ticket: `DA-IMPL-008`
- Checkpoint: `005 - Dashboard Load Performance`
- Current state: `COMPLETED / PO PASS`
- Technical status: `PASS`
- Runtime status: `LEVEL 2 TARGETED VALIDATION PASS`
- PO UI check required: `Yes`
- PO product status: `PO PASS`

## Product Owner Decision

Product Owner accepted `DA-IMPL-008 CHECKPOINT 003` as `PO PASS` on `2026-07-27`.

Product Owner accepted `DA-IMPL-008 CHECKPOINT 005` as `PO PASS` on `2026-07-27`.

Product Owner authorized Checkpoint 005 for Dashboard load performance only.

## Baseline

Reproducible source-level baseline for initial Dashboard load:

1. `GET /f13/dashboard/meta`
2. After metadata resolves date/filter readiness, five independent surface requests start:
   - `GET /f13/dashboard/kpi`
   - `GET /f13/dashboard/daily-trend`
   - `GET /f13/ranking/bcvh`
   - `GET /f13/dashboard/quality-timeline`
   - `GET /f13/recommendations`

Measured baseline:

- Initial request count: `6`.
- Request sequence: metadata gate first; five surface requests after `dashboardReady`.
- Duplicate identical initial requests: none found.
- Safe parallelization: the five post-metadata requests are already independent effects and can run in parallel.
- Redundant/excessive data: Operating Patterns default tab is `Theo thang`, but the initial `quality-timeline` request returned daily, weekly, monthly, heatmap, and pulse payloads.
- Unnecessary transformations: `quality-timeline` computed/serialized inactive daily, weekly, and heatmap data for the default monthly Operating Patterns view.

## Root Cause

The Operating Patterns card loaded the full `quality-timeline` payload on initial Dashboard load even though the default visible tab uses only monthly data plus the existing pulse text.

The endpoint had no scoped mode parameter, so inactive tabs could not be lazily loaded without changing the request contract.

## Implemented Optimizations

- Added a compatible optional `mode` parameter to `GET /f13/dashboard/quality-timeline`.
- Preserved the existing default behavior: missing or unknown `mode` still returns the full timeline payload.
- Updated Operating Patterns to request `mode=month`, `mode=weekday`, or `mode=heatmap` based on the active tab.
- Initial Dashboard load now keeps the same request count but reduces the default Operating Patterns payload by not returning inactive daily, weekly, or heatmap arrays.
- Backend skips daily payload creation and weekly aggregation work for tab-scoped calls that do not need them.
- Inactive Operating Pattern tab data is loaded only when the user opens that tab.

## Before / After Evidence

Before:

- Initial load request count: `6`.
- `quality-timeline` request: full payload for all Operating Pattern tabs.
- Inactive tab data loaded on first paint.

After:

- Initial load request count: `6`.
- `quality-timeline` request: active-tab scoped through `mode=month` on first paint.
- Inactive `weekday` and `heatmap` payloads are deferred until their tabs are selected.
- Existing full-payload API behavior remains available when `mode` is omitted.

## Preserved Scope

- KPI formulas are unchanged.
- Nationwide ranking behavior from Checkpoint 004 is unchanged.
- API endpoint path and existing default response contract are unchanged.
- Database schema is unchanged.
- Filters and URL context are unchanged.
- Missing-data semantics are unchanged.
- Dashboard visible content and accepted PO PASS behavior are preserved.
- Import operations were not touched.
- No cosmetic UI changes were made.

## Remaining Bottlenecks

- Metadata remains the readiness gate for date normalization and canonical BCVH options.
- `KPI`, `daily-trend`, `BCVH ranking`, `quality-timeline`, and `recommendations` remain separate surface requests.
- No backend query rewrite was performed because the targeted evidence did not prove a database bottleneck.

## Validation

- `node --test frontend/src/features/dashboard/components/dashboardLoadPerformance.test.js`
  - Result: `PASS`
  - Evidence: initial request baseline and Operating Patterns lazy timeline mode are pinned.
- `node --test frontend/src/features/dashboard/components/operatingPatternTabsData.test.js`
  - Result: `PASS`
  - Evidence: `14` tests passed, `0` failed.
- `node --test backend/src/services/timelineService.recovery.test.js`
  - Result: `PASS`
  - Evidence: `5` tests passed, `0` failed.
- `git diff --check`
  - Result: `PASS`.

## Product Owner Checklist

- Open the Dashboard normally and confirm visible Dashboard content is unchanged.
- Confirm the default `Quy luat van hanh` tab still shows `Theo thang`.
- Switch to `Theo thu` and confirm the tab loads correctly.
- Switch to `Heatmap` and confirm the two-month Heatmap behavior remains intact.
- Confirm `Xep hang toan quoc` and date/BCVH filters still behave as accepted.
- Confirm no Import screen, queue, or lifecycle behavior changed.

## Handoff

This checkpoint is completed with Product Owner `PO PASS`.
