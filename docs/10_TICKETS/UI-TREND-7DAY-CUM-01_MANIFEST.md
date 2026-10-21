# UI-TREND-7DAY-CUM-01 Manifest

Status: `BACKEND DELIVERED / UI WITH ANTIGRAVITY (2026-10-21)`. Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket; do not treat that as a conflict.

## 1. Ticket Information

- Ticket ID: `UI-TREND-7DAY-CUM-01` — `Xu hướng điều hành tổng hợp: compact header, bigger chart and table, 7-day cumulative rate and national rank, drop the "Theo BCVH" tab`
- Screens: Operation Dashboard of F1.3, F4.1, F1.1, F1.2 (shared block `IntegratedTrendRiskWorkspace.jsx`).
- Executors: backend `Claude Code (Sonnet 5.5)` — done; UI `Antigravity`; independent review `Claude Code (Opus)` after the UI; PO UI check required.
- Authorization: PO in chat 2026-10-21 (screenshot of the 7-day view).

## 2. PO decisions (2026-10-21)

1. The top of the block is too tall and the chart and the evidence table below it too small to read: compact the top, enlarge the chart and the table.
2. Tab "7 ngày so sánh": add the **cumulative rate and the national rank** of the current period and the comparison period.
3. Remove the tab "Theo BCVH" (not needed).
4. Definition (PO, final): the current period is **exactly the 7 days on the chart** (to_date-6 .. to_date); the comparison period is the 7 days ending **to_date-7**, cut by weekday. Example: on a Tuesday, Wed(last week)..Tue(this week) against the 7 days before it; on a Thursday, Fri..Thu. It is **not** the Thursday-Wednesday week of the weekly block. Rate = cumulative (summed passed / summed volume), rank = national rank of that whole range.

## 3. Backend delivered (do not change)

`GET {apiBase}/ranking/bcvh/window-comparison?to_date=YYYY-MM-DD[&ma_bcvh=CODE]` for `/f13`, `/f41`, `/f11`, `/f12` (frontend key `indicatorEndpoint('windowComparison', indicator)`). Response `data`:

```
{ window_days: 7,
  current_range: { from, to }, compare_range: { from, to },
  scope: { type: 'all' } | { type: 'bcvh', ma_bcvh },
  summary: { current: { volume, passed, failed, rate }, compare: { volume, passed, failed, rate },
             rate_delta, volume_delta },            // rate in percent (4 decimals), null when volume is 0
  national_rank: { current: { rank, total } | null, compare: { rank, total } | null } | null }
```

- `national_rank` is `null` (whole field) when a single BCVH is selected, as the header rank of the dashboard; `current`/`compare` are `null` when no national data exists for that range. Show "—", never 0 or an invented rank.
- `to_date` must be the same end date the chart uses: the `to_date` returned by `buildTrendlineRequestParams` (reporting `toDate`, else `latestDate`).
- Code: `bcvhWeeklyComparisonService.compareRollingWindow`; 4 new tests (29/29 in that file); smoke on the real DB for all four indicators (e.g. F1.3 to 2026-10-20: 59.09 % rank 19/34 against 56.83 % rank 24/34).

## 4. UI scope (Antigravity)

Files: `IntegratedTrendRiskWorkspace.jsx`, `integratedTrendRiskData.js`, `qualityTrendlineWindow.js`, `DashboardPage.jsx` (only if the fetch lives there), and their tests.

1. **Compact the top.** Replace the card title/subtitle block and the info strip (badge, "Chỉ hiển thị một câu chuyện xu hướng chính", "Mốc dưới mục tiêu hiển thị bằng marker") with one slim header row: title, the tab switch, camera and download buttons. Remove the subtitle and the two explanatory phrases. Fold the four D-1 / D-7 comparison cards (`LeadershipComparisonGrid`) into a compact strip (one line per card or small chips); keep every number they show today.
2. **Bigger chart and table.** Increase the chart height (now `h-[280px] lg:h-[300px]`) substantially, gaining the space freed above, and make the "Bằng chứng so cùng kỳ 7 ngày" table larger and easier to read (bigger numbers, per-day cells). Keep the chart/table readable at laptop width; the page may scroll.
3. **Tab "7 ngày so sánh": add the cumulative panel.** Next to or above the chart, a compact two-row block: "Giai đoạn này (dd/mm–dd/mm)" and "Giai đoạn so sánh (dd/mm–dd/mm)", each with cumulative rate, volume, national rank "x/34", and the delta (rate in points, rank movement as ↑/↓ n hạng, sign convention as the existing cards). Use `current_range` / `compare_range` from the response for the date labels. Loading/error of this request must not blank the chart (show "—").
4. **Remove "Theo BCVH".** Delete the tab, `buildBcvhModeRows`, the `by-bcvh` branches (component, `buildIntegratedTrendRows`, `buildTrendlineRequestParams`) and update the assertions that pin them (`integratedTrendRiskData.test.js` labels list, `qualityTrendlineWindow.test.js`, `dashboardStaleKpiRecovery.test.js` `by-bcvh` check). Tab list becomes `30 ngày`, `7 ngày so sánh`. Selecting a single BCVH in the global filter is unaffected.
5. The 30-day tab keeps working; the block must still follow the global date filter.

## 5. Must not change (hard guard)

Backend and the endpoint contract above; the data of the 30-day tab; D-1 / D-7 values and their sources (`kpiData.comparisons`); the F1.3 blue / F4.1 orange / F1.1 green colour families, the per-indicator target line (F1.1 95 %, F1.3/F4.1 90 %), the camera capture (`BlockCaptureButton` + `cardRef` must still wrap the whole visible block, including the new panel) and click-to-order behaviour of other blocks. Standard: `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (Required Reading). Run the undefined-identifier check (`oxlint` / `no-undef`) before handover.

## 6. Validation and PO check

- Technical: frontend tests, `vite build`, `oxlint` clean; new pure helper for the panel (formatting of rate, rank "x/34", delta and the "—" cases) with unit tests.
- Executor must not open a browser, screenshot, start a dev server or log in. Stop at `READY FOR PO UI CHECK`.
- PO checklist: top is thin; chart and table clearly bigger; "7 ngày so sánh" shows cumulative rate and rank for this period and the comparison period with the right dates (the 7 days on the chart, and the 7 days before them on the same weekdays); no "Theo BCVH" tab; works on F1.3, F4.1, F1.1, F1.2; picking one BCVH hides the rank; camera button captures the new layout.

## 7. Delivery Status

- Backend: delivered 2026-10-21 (commit fead084).
- UI round 1 (Antigravity): compact header, taller chart, cumulative widget, "Theo BCVH" tab removed. PO rejected the look on sight: the block needed 3 scrolls at 100 %, and the "Giai đoạn này / Giai đoạn so sánh" widget made it bigger.
- UI round 2 (Claude Code/Sonnet 5.5, PO instruction 2026-10-21): the widget is replaced by two text lines above the chart ("Kỳ hiện tại (dd/mm–dd/mm): x% - r/34", "Kỳ so sánh (…): x% - r/34"; the rank is left out when a single BCVH is picked or there is no national data); D-1/D-7 cards become one compact row each (heading "So sánh điều hành" and the "Hôm nay" tag dropped, every number kept); the evidence table is compact; the chart height follows the viewport (`clamp(200px, 100vh - 440px, 460px)`; 30-day with zoom bar `100vh - 520px`) so the block fits one screen at 100 % zoom. Two source-pin assertions updated (heading, "Hôm nay", `space-y-2`). Frontend 608/608, build and oxlint clean. Not checked in a browser.
- Independent Opus review: pending. PO UI check: pending (needs a backend restart for the cumulative lines).

## 8. Round 3 (PO 2026-10-21): UI back to Antigravity

PO verdict on round 2: the chart looks too short (also on the 30-day tab, which round 2 shrank by the viewport clamp; the old look was better), the two cumulative lines do not stand out and sit awkwardly. PO: UI is Antigravity's work, not Claude Code's.

1. **Chart first.** Restore a generous chart height in both tabs (30-day: at least its original 300 px; 7-day: at least about 320 px at 100 % zoom) and drop the viewport clamp `CHART_HEIGHT_FIXED/ZOOM`. Make room by shrinking everything else instead: D-1/D-7 into one thin strip, evidence table as a compact table, legend tightened. The chart must be fully visible on one screen at 100 % zoom; the whole block may need one scroll, never three.
2. **Cumulative figures must stand out and sit smartly.** "Kỳ hiện tại: x% - r/34" and "Kỳ so sánh: x% - r/34" (data unchanged, model `sevenDayRollingComparisonData.js`): large bold numbers, colours matching the chart series (current = indicator colour, compare = grey), shown inside the chart area in a spot that covers no bar, no line and no data label (for example a reserved band at the top of the plot, aligned with the target-line label), not as a separate row that adds height. Keep the date range small and secondary.
3. Keep everything else of Section 4-5 (hard guard, no backend change, camera capture covers the whole block). Do not reintroduce the removed widget. Same technical validation and stop at `READY FOR PO UI CHECK`.

PO confirmation (2026-10-21): the content changes Antigravity made in round 3 were requested by the PO and are accepted as scope: the "Không đạt" row is removed from the "Bằng chứng so cùng kỳ 7 ngày" cells, and a "Chênh lệch" (rate delta, current period minus comparison period) chip is shown next to the two cumulative figures.

## 9. Opus review of round 3 (2026-10-21): BLOCKER, fixes go to Antigravity

Frontend `features/**` 608/608, but `src/components/**` 58/59: `glassTheme.test.js` (UI-GLASS-THEME-03) fails because the cumulative chips use `backdrop-blur-xs` inside the camera-captured block. Run BOTH `node --test "src/features/**/*.test.js"` and `node --test "src/components/**/*.test.js"` before handover.

Fixes required (round 4, Antigravity):
1. **Blocker:** remove `backdrop-blur-xs` from both chips. Use solid backgrounds (no alpha, no blur): chip 1 the theme soft background + theme border, chip 2 `bg-slate-100`.
2. Figures in `theme.text` (dark shade), not `theme.primary` (too pale for F1.1 green and F4.1 orange); keep the dot in the primary colour.
3. **Overlay must never cover bars, lines, labels, the target label or the 100 % tick:** right edge `right-[94px]` (plot edge), force one row (`flex-nowrap`, shorten/hide the date range and the "Chênh lệch" chip on narrow widths, below `sm` move the figures out of the chart), and reserve the band by measuring the overlay (ResizeObserver) and using it as the chart top margin; with the 95 % target (F1.1/F1.2) the band must also clear the target label.
4. Show "—" instead of hiding the figures while loading or on error (no layout jump).
5. Window-comparison fetch: reset the stored data to null when `to_date`, indicator or BCVH changes (and on `success:false`), so a previous payload (for example the national rank) is never shown for a new selection.

Accepted as is: "Không đạt" row removed and the "Chênh lệch" chip (PO), chart heights 340/360 and 320/340, hook order, no undefined identifiers.

Clarification to Section 9 item 3 (PO screenshot of F1.2, 2026-10-21): with the 95 % target and rates near 95-100 % the chips sit on the "Mục tiêu 95" label and on the rate data labels (95.05 %, 94.36 %, 93.xx %), which are drawn ABOVE their points. The reserved band must therefore clear the data labels too: chip band height + about 16 px of label room above the 100 % line (or the target label and the near-100 % labels must be moved below the band). Check F1.1/F1.2 (target 95 %) explicitly, not only F1.3/F4.1 (90 %).
