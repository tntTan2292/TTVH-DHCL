# TODAY-006 Restore and Preserve Existing Dashboard Charts

## 1. Purpose

Record the implementation and validation for restoring the approved Operation Dashboard analysis surfaces while preserving the TODAY-003 through TODAY-005 contracts.

## 2. Scope

- Restore runtime KPI cards.
- Restore the monthly heatmap and weekly frequency chart through the approved timeline surface.
- Restore the ranking table surface.
- Preserve the accepted 30-day combo chart and 7-day same-period comparison chart.

## 3. Validation Notes

- KPI cards now map from `/api/f13/dashboard/kpi` runtime values.
- The legacy timeline panel is rendered on `/f13/dashboard`, which restores the daily, weekly, monthly, and heatmap views from the approved contract.
- The BCVH ranking surface is rendered on `/f13/dashboard` through the existing ranking adapter.
- The shared `/api/f13/dashboard/daily-trend` request remains the single data source for the accepted chart pair.

## 4. Result

- Technical status: `PASS`
- Runtime status: `PASS`
- PO product status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 5. Evidence

- Frontend unit tests validate KPI mapping and preserved dashboard contracts.
- The dashboard page keeps one shared daily-trend request for the accepted charts.
- Existing BCVH and dashboard runtime endpoints remain unchanged.

## 6. Follow-Up

- Await explicit PO PASS before closure.
- Do not activate `TODAY-007` until `TODAY-006` is closed.
