# DA-IMPL-005 PO Acceptance Checklist - Operating Pattern Tabs

- Ticket: `DA-IMPL-005`
- Final status: `COMPLETED / PO PASS`
- Scope: Operating Pattern card only.
- Do not use this checklist to evaluate unrelated Dashboard modules or approve Route Performance Center, AUTO-IMPORT, TCT, KPI formulas, business thresholds, or backend schema changes.

## Preconditions

| Item | Expected condition |
| --- | --- |
| Backend | Current project backend running with `GET /api/f13/dashboard/quality-timeline` available. |
| Frontend | Current project frontend running from branch `codex/da-impl-005` or equivalent build containing DA-IMPL-005. |
| Page | Open Dashboard điều hành chất lượng F1.3. |
| Test date | Use `to_date = 2026-07-19`. |
| Date context | Use any valid `from_date` such as `2026-07-13`; changing `from_date` should only change visible context for this card, not the timeline API calculation. |
| BCVH filters | Test `Toàn mạng`; optionally test one BCVH such as `536250`. |
| Permissions | Operator must be able to open the Dashboard page and use date/BCVH filters. |

## Acceptance Checklist

| Item | Action | Expected observable business result | PASS / WARNING / FAIL | Comment | Defect ID |
| --- | --- | --- | --- | --- | --- |
| 1 | Open Dashboard điều hành chất lượng F1.3. | A single card named `Quy luật vận hành` is visible in the Dashboard flow after the integrated trend/risk area. | PASS | Product Owner accepted the card as the Operating Pattern surface. |  |
| 2 | Set `to_date = 2026-07-19` and `ma_bcvh = Toàn mạng`. | The card context shows the selected date context and `Toàn mạng`. | PASS | Product Owner accepted data contracts and filter context. |  |
| 3 | Confirm tabs. | Exactly three tabs are present in this order: `Theo tháng`, `Theo thứ`, `Heatmap`. No extra operating-pattern tabs appear. | PASS | Product Owner accepted tab order. |  |
| 4 | Confirm default tab. | `Theo tháng` is selected by default. | PASS | Product Owner accepted default tab. |  |
| 5 | Inspect `Theo tháng`. | A YTD combo chart is visible. Columns show monthly shipment volume; the line shows monthly pass rate. Months appear from January through the selected month. Current month is marked `Lũy kế đến ngày dd/MM/yyyy`. | PASS | Product Owner accepted monthly management view. |  |
| 5A | Inspect monthly summary. | Summary shows highest-volume month, lowest-volume month, best pass-rate month, lowest pass-rate month, and current-month cumulative volume/pass rate. | PASS | Product Owner accepted grounded monthly summary. |  |
| 6 | Click `Theo thứ`. | The card changes to a weekday combo chart. X-axis runs from `T2` to `CN`; columns show shipment volume; line shows pass rate. The `Theo tháng` content is no longer rendered in the card body. | PASS | Product Owner accepted weekday combo view. |  |
| 6A | Inspect weekday legend. | Legend shows approved F1.3 bands: `Xanh KPI từ 70% trở lên`, `Hồng KPI từ 60% đến dưới 70%`, `Vàng KPI từ 50% đến dưới 60%`, `Đỏ KPI dưới 50%`. | PASS | Product Owner accepted approved warning legend. |  |
| 7 | Click `Heatmap`. | The card changes to daily heatmap cells. Each cell shows actual date `dd/MM` and actual KPI percentage. Colors are relative to the KPI average of the corresponding month, not TCT target compliance. Weekly and monthly content are no longer rendered in the card body. | PASS | Product Owner accepted heatmap management view. |  |
| 7A | Inspect Heatmap month sections. | Each displayed calendar month is separated with a header such as `Tháng 06/2026` or `Tháng 07/2026`, and each section shows `Từ dd/MM/yyyy đến dd/MM/yyyy`. Month boundaries are visually obvious. | PASS | Product Owner accepted heatmap month separation. |  |
| 8 | Switch tabs repeatedly. | Only one selected mode is visible at a time; the Dashboard outside this card does not reload or change unexpectedly. | PASS | Product Owner accepted one-mode-only behavior. |  |
| 9 | Inspect legends. | `Theo tháng` explains columns and line. `Theo thứ` shows the approved warning-color legend. `Heatmap` shows `So sánh với KPI trung bình tháng`. Monthly mode does not expose raw technical keys such as `quality-timeline.monthly.avg_kpi`. | PASS | Accepted with UI/UX follow-up for crowding/overlap, not a blocker for this ticket. |  |
| 10 | Inspect grounded summary. | Summary text states counts or observations grounded in existing response data and selected filter context. It does not invent causes or new business rules. | PASS | Product Owner accepted grounded summary behavior. |  |
| 10A | Inspect Heatmap management summary. | Heatmap shows `KPI trung bình tháng`, `Ngày tốt nhất`, `Ngày thấp nhất`, number of days higher than average, and number of days lower than average. | PASS | Product Owner accepted heatmap summary; responsive refinement deferred. |  |
| 11 | Change BCVH filter to a valid BCVH such as `536250`. | The card reloads using that BCVH context and displays the selected BCVH code/context. | PASS | Product Owner accepted filter propagation. |  |
| 12 | Change only `from_date` while keeping `to_date = 2026-07-19`. | The card visible context updates, but the operating-pattern API behavior remains anchored on `to_date`; no new date-range semantics are implied. | PASS | Product Owner accepted filter context behavior. |  |
| 13 | Check empty or partial data if available in PO environment. | The card keeps the selected tab visible and shows `Chưa có dữ liệu` for unavailable mode values instead of fabricating values. | PASS | Accepted as part of data-contract handling. |  |
| 14 | Simulate or observe API error if available in PO environment. | The card shows a clear error state for `Quy luật vận hành` with a retry action; the rest of Dashboard remains usable. | PASS | Accepted as part of data-contract handling. |  |
| 15 | Compare Dashboard behavior outside the card. | Command Summary, Integrated Trend/Risk, BCVH table, and other existing Dashboard surfaces remain available and are not redesigned by this ticket. | PASS | Product Owner accepted preservation of surrounding Dashboard behavior. |  |

## Expected Overall Result

Product Owner can determine operating patterns from one card with three tabs, can switch among monthly, weekday, and heatmap modes without seeing multiple pattern charts at once, and can understand that DA-IMPL-005 preserved approved data contracts and filter context.

## PO Final Result

| Result | Selected |
| --- | --- |
| PASS | Selected |
| WARNING |  |
| FAIL |  |

PO comment:

DA-IMPL-005 received Product Owner `PASS` for:

- Tab order and default.
- `Theo tháng` management view.
- `Theo thứ` combo view.
- Heatmap management view and month separation.
- Data contracts and filter context.

Accepted UI/UX follow-up items, not blockers for this ticket:

- At normal desktop zoom 100%, Heatmap is too wide/tall and currently requires reducing browser zoom to approximately 50% to view the full content.
- Chart legend, explanatory text, and labels can overlap or become visually crowded.
- Future DA-IMPL UI/UX completion phase must address responsive Heatmap layout at 100% browser zoom, month blocks adapting to viewport width, controlled scrolling or compact cell sizing, non-overlapping chart legends and labels, improved spacing, typography, information density, and desktop usability without requiring browser zoom changes.

Defect IDs, if any:

- None blocking DA-IMPL-005 closure.
