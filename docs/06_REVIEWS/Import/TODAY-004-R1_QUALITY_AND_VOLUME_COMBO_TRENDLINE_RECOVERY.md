# TODAY-004-R1 Quality and Volume Combo Trendline Recovery

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-004-R1 Quality and Volume Combo Trendline Recovery` |
| Source Ticket | `TODAY-004 Volume Trendline` |
| PO Result Source | `PO FAIL` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `READY FOR PO CHECK` |
| Current Manifest | `docs/10_TICKETS/TODAY-004-R1_MANIFEST.md` |
| Responsible PO Finding | `POF-TODAY-004-01` |

## PO Finding Summary

The Product Owner rejected the two-chart presentation that showed Quality Delivery Rate Trendline and Volume Trendline as separate sections.

The accepted recovery direction is one professional 30-day combo chart that presents total shipment volume and quality rate together.

## Recovery Scope

- Replace the two separate trendline chart sections with one combo trendline.
- Use one `GET /api/f13/dashboard/daily-trend` request.
- Normalize one dataset in the dashboard orchestration layer.
- Render total shipment volume as bars against the left Y-axis.
- Render quality rate as a line against the right Y-axis.
- Preserve the 90% quality target line.
- Present the chart title and tooltip labels in Vietnamese for PO review.
- Display quality rate and target variance with no more than two decimal places.
- Preserve the rolling 30-day window, optional BCVH filter, and missing-date gaps.
- Preserve unrelated dashboard surfaces and backend contracts.

## Validation Evidence

- Technical validation: `PASS`
  - `node --test src/features/dashboard/components/qualityTrendlineWindow.test.js src/features/dashboard/components/comboTrendlineData.test.js`
  - `cmd /c npm run build`
  - `cmd /c npm run lint`
- Runtime validation: `PASS`
  - `GET http://localhost:5050/api/f13/dashboard/daily-trend?from_date=2026-06-16&to_date=2026-07-15` returned `200`
  - response contained 30 daily rows with `total_volume`, `passed`, `failed`, `quality_rate`, and `data_available`
- Browser validation: `PASS`
  - authenticated browser session opened `http://localhost:5178/f13/dashboard`
  - rendered one `Sản lượng và chất lượng phát – 30 ngày` chart title
  - rendered one Recharts surface, 30 teal volume bars, one dark-blue linear quality line, and the dashed red `Mục tiêu 90%`
  - rendered Vietnamese axis labels: `Sản lượng (bưu gửi)` and `Tỷ lệ chất lượng (%)`
  - rejected separate `Quality Delivery Rate Trendline` and standalone `Volume Trendline` sections were absent
- PO validation: `PO UI ACCEPTANCE REQUIRED`

## Completion Rule

This recovery is not closed until:

- build and tests pass
- browser runtime validation passes
- PO recheck is available
- PO confirms PASS

`TODAY-005` must remain inactive until all applicable `TODAY-004-R1` PO and closure gates pass.
