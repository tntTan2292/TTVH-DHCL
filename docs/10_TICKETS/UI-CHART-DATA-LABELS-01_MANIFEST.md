# UI-CHART-DATA-LABELS-01 Manifest

Status: `IMPLEMENTED / TECH PASS / READY FOR ANTIGRAVITY VISUAL TUNING + PO UI CHECK (2026-10-03)`. Frontend-only; no backend, API, SSOT or KPI change.

## 1. Ticket Information

- Ticket ID: `UI-CHART-DATA-LABELS-01`
- Name: `UI — Hiển thị data label trên biểu đồ điều hành để chụp ảnh gửi lãnh đạo`
- Requested by: Product Owner, chat 2026-10-03 (the 7-day "Xu hướng điều hành" chart shows values only in the hover tooltip, so a screenshot carries no numbers).
- Executors: Claude Code (logic, wiring, tests) -> Antigravity (owns final label placement/visual tuning and screenshot evidence) -> PO UI check.
- Branch: `codex/da-impl-006`. Runs in parallel with `AUTO-IMPORT-015` (awaiting PO check); touches no shared files.
- PO UI Check Required: `Yes`.

## 2. PO Decisions (2026-10-03)

1. Volume-label placement (bar bottom vs top) is decided by Antigravity as UI owner. Claude Code shipped a default (`insideBottom`, one switch: `LABEL_STYLE.volumePosition` in `chartDataLabels.js`).
2. 30-day charts keep the original fixed frame and gain mouse-wheel zoom so labels become readable when zoomed in.
3. Scope: all charts in one pass (audit P0-P3).

## 3. Chart Inventory and Result

| Chart | File | Change |
| --- | --- | --- |
| Xu hướng điều hành (7 ngày so sánh / 30 ngày / Theo BCVH) | `features/dashboard/components/IntegratedTrendRiskWorkspace.jsx` | Labels on volume bars, quality-rate line, comparison bars and comparison line; below-target rate labels in orange; 30-day mode zoomable; bars widened (`barCategoryGap` 34% -> 22%). |
| Quy luật vận hành (Theo thứ / Theo tháng) | `OperatingPatternTabsCard.jsx` | Same labels; month tab zoomable. |
| Xu hướng nhiều BCVH (Ranking, 2 uses) | `features/ranking/BcvhMultiSeriesTrendChart.jsx` | End-of-line labels per series (stacked when close); every-point labels when <=2 series and <=10 visible points; zoomable. |
| Quality Timeline cũ: 30 ngày, theo tháng | `components/f13/QualityTimelinePanel.jsx` | Rate labels; both zoomable. "Theo thứ" already had labels, unchanged. |
| Sparkline tuyến | `features/route/RoutePerformancePage.jsx` | Min/max/last labels (1 decimal). |
| Doughnut phân bố tuyến | `UnifiedBcvhAnalysisTable.jsx` | Not changed: 64px table cell, numbers already in the table. |
| `QualityVolumeCombo…`, `SamePeriodComparison…`, `QualityDelivery…` Adapters, `f13/TrendChart` | — | Not imported outside tests (dead code); not changed. |

## 4. Design

- `chartDataLabels.js` (pure, tested): label selection (<=10 visible points: all; otherwise min, max, last), end-of-line stacking, zoom/pan window math, formatters (vi-VN volume, `xx,xx%` rate).
- `ChartLabelRenderers.jsx`: Recharts `label` renderers with a white halo so text stays legible over bars and lines.
- `ChartZoomFrame.jsx`: wheel zoom anchored at the cursor, drag to pan, double-click or "Đặt lại zoom" to reset, hint "Lăn chuột để phóng to". The page still scrolls normally at full view (only zoom-in is captured).
- Naming note: `ChartLabelRenderers.jsx` must not be renamed to `chartDataLabels.jsx` — Windows case-insensitive resolution collides with `chartDataLabels.js`.

## 5. Technical Validation (Claude Code)

- `node --test chartDataLabels.test.js`: 13/13.
- Frontend dashboard + ranking + components + route test files: 357/357.
- `vite build` clean; `oxlint`: 0 errors (2 fast-refresh warnings in `ChartLabelRenderers.jsx`, pre-existing unrelated warnings elsewhere).
- Runtime check with a temporary mock-data harness (removed): 7-day labels render on all four series; 30-day view shows 3 rate labels at 16/40 visible points and all 7 at 7/40; reset button works; wheel-down at full view is not prevented; Ranking chart end labels render for 6 series. No login was used.
- Not verified: the built-in browser screenshots were unreliable, so no visual evidence is claimed. Overlaps to inspect: "Mục tiêu 90%" caption vs the last rate label (top-right); rate label vs comparison-rate label when the two lines are close.

## 6. Next Steps

1. Antigravity: screenshot every mode on desktop (>=1280px) and mobile; tune placement/size via `LABEL_STYLE` and the `renderRateLabel` offsets; fix any overlap.
2. PO UI Check: 7-day chart screenshot readable without hovering; 30-day wheel zoom shows all labels; Ranking chart; Quy luật vận hành tabs.
