# F11-DASHBOARD-UI-01 Manifest

Status: `DELIVERED / REVIEWED / READY FOR PO CHECK (2026-10-10)`; see Sections 9-10 for the PO delta and the review. Screens for F1.1 (toàn trình nội tỉnh): Operation Dashboard and BCVH Ranking plus the accepting-office × delivering-BCVH table; operations table follows the date filter for all three indicators; camera button on the report blocks. The province/city table of Section 4.2 was removed by PO decision (it will go to the Home page later). Frontend only.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Required Reading](#3-required-reading)
- [4. Scope](#4-scope)
- [5. Decisions Already Taken (do not re-ask)](#5-decisions-already-taken-do-not-re-ask)
- [6. API Contract](#6-api-contract)
- [7. Exclusions](#7-exclusions)
- [8. Validation and PO Check](#8-validation-and-po-check)
- [9. Delta of 2026-10-10 (PO decisions after the first review)](#9-delta-of-2026-10-10-po-decisions-after-the-first-review)

## 1. Ticket Information

- Ticket ID: `F11-DASHBOARD-UI-01` — `F1.1 Operation Dashboard and BCVH Ranking screens`
- Parent: `F11-MODULE-PLAN` Section 25.5; backend `F11-DASHBOARD-RANKING-01` (`docs/10_TICKETS/F11-DASHBOARD-RANKING-01_MANIFEST.md`)
- Executor: `Antigravity` (UI/UX, responsive, visual). Independent review afterwards: `Opus`. PO UI check: required.
- Authorization: PO in chat 2026-10-10: "Số liệu phải quan sát được tại Dashboard đến BCVH, Bưu cục chấp nhận và đầu thành phố để lãnh đạo quan sát được nhanh, áp dụng các tiêu chí đã sử dụng tốt ở F1.3 và F4.1".
- This is a parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket; do not treat that as a conflict, read this manifest directly.

## 2. Objective

Leaders must see the F1.1 picture in one screen: Huế overall, each of the 6 BCVH, every accepting office against each delivering BCVH, and Huế against the other provinces/cities — fast, with the same colours, weeks, comparisons and wording they already know from F1.3/F4.1.

## 3. Required Reading

1. `docs/10_TICKETS/F11-DASHBOARD-RANKING-01_MANIFEST.md` Sections 3-4 (metric rules, pair-table rules).
2. `docs/07_REFERENCE/Domains/domain_quality_management/f1.1_chat_luong_toan_trinh_noi_tinh/measurement.md` and `business_rules.md`.
3. The F4.1 precedent: commits `2cac417` and `465d471` (pages, wrappers, navigation) and `frontend/src/features/indicator/indicatorConfig.js`.

## 4. Scope

### 4.1 Same as F4.1 (reuse, do not rewrite)

- `F11_INDICATOR` in `indicatorConfig.js` (`id: 'f11'`, `moduleLabel: 'F1.1'`, `apiBase: '/f11'`, routes `/f11/dashboard`, `/f11/ranking/bcvh`, `kpi: '/dashboard/summary'`); register it in `INDICATORS`. **Colour bands = F1.3 (floors 70 / 60 / 50)** (PO: "quy tắc màu theo F1.3"). Routes/late-cash/operating-pattern/action-center features all `false`.
- Pages `features/f11/F11DashboardPage.jsx` and `F11BcvhRankingPage.jsx` (thin wrappers with `IndicatorProvider`), App routes, sidebar group "F1.1" (Operation Dashboard, BCVH Ranking) for admin and viewer, `/f11` → `/f11/dashboard`, navigation tests.
- KPI cards incl. **"Vị thứ toàn quốc x/34"** and the day-over-day / week-over-week comparisons; daily trend; BCVH ranking table; weekly (Thursday–Wednesday) and monthly comparison and trend charts; day/week/month selection exactly as the shared Dashboard does.
- Wording: module name F1.1; no F1.3-specific text (KPI 2026 wording of F1.3, late cash, route text). A row without an evaluation is counted as "Không đạt" in every figure; where space allows show a small note with the number of "chưa có đánh giá" (`total_blank` of the summary).

### 4.2 ~~New block A — "Tỉnh/thành phố"~~ — SUPERSEDED by Section 9, item C (block removed from F1.1)

- Data: `GET /f11/dashboard/national-ranking` for the selected range. 34 rows: rank, province name (strip the "Bưu điện Tỉnh/Thành phố" prefix for display), rate (coloured with the F1.3 bands), volume, "Không đạt" count, rank movement against the previous day with data (arrow + number; none when `movement` is null).
- **Huế (`is_hue`) is always visible and highlighted** (pinned/sticky or clearly marked even when scrolled), because leaders look for it first. Default view: Top 5, Huế and its two neighbours, Bottom 5; one control expands to all 34. Sortable by rank/rate/volume. Caption must state the rule: the rate is the published national KPI-2026 rate by delivering province (field `metric_label`); it never replaces the Huế figure in the cards.
- When `available` is false show the `message`, not an error.

### 4.3 New block B — "Bưu cục chấp nhận" (shown only for F1.1, e.g. `features.pairTable`)

- Data: `GET /f11/dashboard/pair-table?period=day|week|month&anchor_date=<selected end date>` (Ngày / Tuần Thứ Năm–Thứ Tư / Tháng switch following the Dashboard's selected date). Rows = accepting offices, columns = the 6 BCVH + "Khác" + "Tổng"; last row = "TỔNG CỘNG" (equals the module total of the same period).
- Each cell: rate coloured with the F1.3 bands, volume small beneath; `null` cell = "–" (no parcels, not 0 %). A cell with 0 % because of unevaluated parcels is a valid red cell.
- Built for fast reading with up to ~70 offices: sticky header and first column, search by office name/code, sort by total volume (default) or by lowest rate (puts weak offices first), a legend of the colour bands, horizontal scroll on narrow screens without breaking the page. **No rank numbers for offices** (PO: no ranking by accepting office) — only values and colours.
- Clicking a BCVH column header filters/highlights that BCVH (optional, only if it stays simple).

### 4.4 Responsive and quality bar

Desktop first for leaders, but usable on a tablet/phone width (tables scroll inside their card, KPI cards wrap). Follow the existing design tokens and components; no new UI library.

## 5. Decisions Already Taken (do not re-ask)

Colours F1.3; weeks Thursday–Wednesday; national rank by delivering province among 34, label "Vị thứ toàn quốc x/34"; blank evaluation = Không đạt in all dashboard figures; no ranking by accepting office; no route block; roles admin + viewer; day/week/month for the pair table; the 6 official BCVH only in ranking/overview (other delivery codes appear in "Khác" and in module totals).

## 6. API Contract (`/api/f11`, read-only, `{ success, data }`)

| Endpoint | Notes |
| --- | --- |
| `GET /dashboard/meta` | `min_date`, `max_date`, `bcvh_units[6]`, `kpi_scope_note`, `kpi_includes_non_canonical_bcvh` |
| `GET /dashboard/summary?from_date&to_date[&ma_bcvh]` | module KPI + `national_rank` + `comparisons.d1/d7` (same shape as `/f41/dashboard/summary`) |
| `GET /dashboard/daily-trend`, `/ranking/bcvh`, `/ranking/bcvh/{overview,weeks,weekly-comparison,weekly-trend,months,monthly-comparison}` | identical to `/api/f41` |
| `GET /dashboard/national-ranking?from_date&to_date` | `{ available, total, period_start, period_end, previous_period, metric_label, tie_behavior, items[{ rank, ma_tinh, ten_tinh, volume, passed, failed, rate, previous_rank, movement, is_hue }] }` |
| `GET /dashboard/pair-table?period&anchor_date` or `from_date&to_date` | `{ meta{period, from_date, to_date, days_with_data, has_data, office_count}, columns[{ma_bcvh, ten_bcvh}] (7, last `OTHER`/"Khác"), rows[{ma_chap_nhan, ten_chap_nhan, cells{<ma_bcvh>: {volume, passed, failed, blank, rate} \| null}, total{…}}], total_row{ten_chap_nhan, cells, total} }` |

Real data exists for 2026-10-07 only until the first Auto Backfill run; tests and layout must also handle empty periods.

## 7. Exclusions

No backend, schema or import change; no Evidence/violation-stage view; no route ranking; no new colour rules; do not touch F1.3/F4.1 behaviour (their tests must stay green); no PO UI acceptance or self-awarded PASS.

## 8. Validation and PO Check

- Technical: frontend lint, build and tests green; add tests for `F11_INDICATOR` (colour floors, endpoints, features), the two wrappers, navigation, and the two new blocks' data mapping (empty / null cell / Huế flag / unavailable message). F1.3 and F4.1 suites unchanged.
- No browser, screenshot, dev server or login by the executor; the PO checks the screens.
- Stop at `READY FOR PO CHECK` with a short PO checklist: Huế in the province table, BCVH colours, pair-table day/week/month, empty cells, narrow screen.

## 9. Delta of 2026-10-10 (PO decisions after the first review)

Authority: PO in chat 2026-10-10. Items A-E are corrections/extensions of the delivered screens; item F is a new shared feature. Applies to **F1.3, F1.1 and F4.1** unless stated.

**A. Unevaluated parcels are simply "Không đạt".** Remove the "chưa có đánh giá" note added to the "Bưu gửi cần xử lý" card (revert the `total_blank` change in `dashboardKpiCards.js` and its test). No separate note about unevaluated parcels anywhere on the dashboards.

**B. The daily operations table follows the date filter (all three indicators).** `components/f13/BcvhOperationTable.jsx` currently calls `/f13/ranking/bcvh/overview` with no parameters, so it always shows the latest day ("SỐ LIỆU GẦN NHẤT") and ignores the Dashboard date filter. Send the filter's end date as `anchor_date` (the API already accepts it for F1.3, F4.1 and F1.1; the server uses the latest day with data on or before it, never later than yesterday; no backend change) and refetch when it changes. The title line must say which day the table shows ("ĐẾN NGÀY dd/mm/yyyy"); drop the fixed words "SỐ LIỆU GẦN NHẤT" and, when the chosen day has no data and an earlier day is shown, say so in the title. National rank in the day / month-to-date / month headers follows the same anchor (it is already part of the same response). With the default filter (latest day) the table must look exactly as before. The BCVH Ranking page already follows its date and is not part of this item.

**C. Remove the 34-province table from F1.1.** Delete `F11ProvinceRankingBlock`, its data helper, the `provinceRanking` feature flag, the mount in `DashboardPage.jsx` and their tests. Keep the server endpoint `/api/f11/dashboard/national-ranking` (it will feed the Home page later; the PO said it is a good table and will be **placed on the Home page later**, not now). "Vị thứ toàn quốc x/34" stays exactly where F1.3/F4.1 have it: KPI card and the day / week / month headers.

**D. Pair-table corrections.** Use the shared colour catalogue (`f13HeatmapBandCatalog`: `classifyF13HeatmapRate(rate, indicator.heatmapBands)`, `F13_HEATMAP_TONE_CLASS`, legend from `buildMonthlyHeatmapLegend(indicator)`) instead of the hand-written thresholds and colour classes in `f11PairTableData.js` and the block legend. Remove the unused imports and the unstable `useMemo` dependency warnings in the F1.1 files, and the unused `F11Quality` import in `App.jsx`.

**E. Camera button — capture a whole block as an image (all three indicators, Dashboard and BCVH Ranking pages).**
- A small reusable component (e.g. `components/common/BlockCaptureButton.jsx` + a capture helper) with a camera icon in the header corner of every report block: KPI summary, operations table, trend and combo charts, weekly/monthly comparison and trend blocks, BCVH ranking tables, the pair table. One click captures the **entire** block, including parts hidden by scrolling (tables with a maximum height or horizontal scroll, sticky headers, the table "fit" scaling), on a white background at 2× resolution.
- The image carries a caption line: block title, indicator (F1.1/F1.3/F4.1), the date or period shown, and the generation time. The camera button itself and other controls are not in the image.
- Two actions behind one click or a tiny menu: **copy to clipboard** (to paste straight into Zalo/Viber/mail) and **save as PNG** with a readable file name (e.g. `F1.1_Bang-dieu-hanh_2026-10-07.png`). If the browser blocks image clipboard (plain-http addresses), fall back to saving the PNG and say so in a short message. Visible busy state while capturing and a clear error message if it fails.
- Everything happens in the browser: no upload, no server call, no new API.
- New dependency approved by the PO on 2026-10-10: `html-to-image` (MIT). Add it to `frontend/package.json` and the lock file with an exact version; no other new package.
- Tests: the capture helper (file name, caption, fallback decision) and that each block exposes the button; F1.3/F4.1 existing suites stay green.

Validation, exclusions and PO check as in Section 8 (no browser/screenshot/dev server/login by the executor; stop at `READY FOR PO CHECK`; PO checklist must include: date filter changes the operations table, no 34-province table in F1.1, camera on a long table and on a chart, clipboard paste and PNG save).

## 10. Delivery and review (2026-10-10)

Status: `READY FOR PO CHECK` (Antigravity delivered; reviewed by Claude Code, a different executor). Delivered: F1.1 Dashboard and BCVH Ranking pages, pair table (shared colour catalogue), operations table following the date filter for F1.3/F1.1/F4.1, province table removed from F1.1, blank note removed, camera button (`BlockCaptureButton` + `blockCaptureHelper`, `html-to-image` 1.11.13) on the dashboard and ranking blocks.

Review findings fixed by the reviewer: (1) **blocking** — the dashboard trend request used `buildTrendlineRequestParams` but its import had been deleted, which would have broken the trend chart of every indicator at run time (the build and lint do not catch it); import restored. (2) the legacy test that pinned the operations table to the latest day was updated to the PO's new rule. (3) a deleted code comment restored. Frontend 615/615, build and lint clean for the new code.

Open points for the PO check / a short follow-up: the capture helper sizes the image from the visible width of the block, so a very wide table on a narrow window may lose its right edge (needs a look in the browser); the caption is built with `innerHTML` from app-generated text (low risk, to be switched to text nodes).

**Follow-up 2026-10-10 (PO: the camera saved a file, then could not be pasted into Viber).** The system is opened through the plain-http address http://10.47.33.24:5178, where a page cannot write an image to the clipboard. Version 2 copied the picture as web content with the classic copy command; Viber (and other chat apps) ignore that, so nothing could be pasted. Version 3 (now): one click on the camera copies a real PNG with the Clipboard API where the browser allows it (https or localhost); on plain http it opens a small window showing the picture with the instruction to right click it and choose "Sao chép hình ảnh" (the browser's own command gives a real picture on any address), plus "Lưu tệp PNG" and "Đóng". A file is saved only when the user asks (the small download button or the window button). Checked on the real browser pane at the http address: the window opens and shows the complete picture (hidden scroll rows included, camera button not in the image, 2x size). Pasting into Viber itself was not possible to test from the pane. Lasting fix to consider: serve the system over https so one click copies directly for everyone. Frontend 619/619, build ok.

## 11. Follow-up 2026-10-10: F1.1 target line 95 %, and a run-time defect found on the way

**PO decision:** the chart target line of F1.1 is **95 %** (F1.3 and F4.1 stay at 90 %). The target is now a setting of the indicator (`targetRate` in `indicatorConfig.js`: F1.3 90, F4.1 90, F1.1 95; `indicatorTargetRate()`), read by every live chart and label: the dashboard trend chart (line, legend, below-target markers and risk text), the weekly and monthly combo charts (line, tooltip, small multiples, series variance), the monthly and weekly trend block legends and the daily-trend rows. Helpers keep 90 as their default, so F1.3/F4.1 are unchanged. The legacy F1.3-only dashboard page keeps its fixed 90. Tests: `features/indicator/targetRate.test.js` (per-indicator value, default 90, 92 % on target at 90 but below at 95, series/variance, every live file imports and uses the setting).

**Run-time defect found by a static check and fixed:** the camera button of `BcvhWeeklyComparisonBlock` was given `selectedMonth`/`selectedWeek`, which do not exist, so the block would have thrown at render (BCVH Ranking page of every indicator). It now uses `monthSelection.current` / `selection.current`; a regression test guards it. Neither the build, the lint nor the unit tests catch an undefined identifier, so `oxlint -D no-undef` (ignoring browser globals) is now part of the review routine. The same check also shows two older undefined names outside this work: `getApiErrorDetail` in `pages/DataImportCenter.jsx` (error messages only, since Wave 3) and `setLoadingMeta` in `networkMap/postmanCatalog/PostmanCatalogPage.jsx` (other session); reported, not touched.

## 12. Follow-up 2026-10-10: click-to-order, colour families, standing standard

PO decisions (chat 2026-10-10): (1) the column titles of the tables are order buttons (volume, rate, increase/decrease...) in every indicator; (2) F1.1 can order accepting offices and delivering units by volume or by rate; (3) the 12-month view as F1.3 (T1 to the current month of 2026); (4) the three families get different, light colours (no purple, no dark tones); (5) all of it becomes a standing standard: `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`.

Delivered by Claude Code (the same files carry all four, so one executor):

- **Click-to-order:** `components/common/SortableTh.jsx` + `tableSort.js` (nulls last, stable, text A→Z, flip on second click, total row fixed, default order untouched until a click) applied to the operations table (all volume/rate/increase-decrease titles, code and name), the BCVH ranking table (current day, late cash, D-1 and D-7 groups), the BCVH × month heatmap (by unit name or by a month's rate) and the F1.1 table. The weekly/monthly comparison table already had it.
- **F1.1 accepting office × delivering unit:** rows ordered from the title (name) and from **SL**/**TL** buttons under every delivering unit and under "Tổng cộng"; the delivering-unit columns ordered by volume or rate (`Mặc định / Sản lượng / Tỷ lệ đạt`), "Khác" always last; a caption names the active order. Helpers in `features/f11/components/f11PairTableSort.js` with tests.
- **Colour families:** `INDICATOR_THEMES` in `indicatorConfig.js`: F1.3 blue, F4.1 orange, F1.1 green (light tones; the rate line contrasts with the bars: green / blue / sky). Applied to the volume bars and rate lines of every live chart and legend, the header bands and totals of the tables, active buttons and sort titles, the camera window, the dashboard button, the KPI "Bản tin" strip, and a page accent bar plus an F-chip next to the page title. Status colours (rate bands, target line, rank text) are unchanged. The fixed dark blue `#003E7E` is gone from the report components.
- **12 months:** the monthly trend block and the heatmap already exist for F4.1 and F1.1 (months T1 to the current month, as F1.3). What is missing is data: F4.1 has data from April and F1.1 only from October, so earlier months are empty until the Auto Backfill loads them.
- **Standard + guard:** `report_block_ui_standard.md` (ten mandatory functions, how to build them, indicator settings, quality gates), a pointer in `CLAUDE.md`, and `features/indicator/reportBlockStandard.test.js` (camera button on every block, sortable titles on every table, theme use, no fixed dark blue, three distinct light families, date-filter anchor).

Validation: frontend tests, build and lint green; `oxlint -D no-undef` shows no undefined names of this work. The look cannot be checked from the pane (self-signed HTTPS): PO UI check required. Checklist: the page accent bar and F-chip colour per indicator (blue / orange / green); chart bars and legend colours; clicking a title in the operations table, BCVH ranking table, heatmap and the F1.1 table (arrow, order, total row stays); F1.1 "Cột bưu cục phát" buttons and SL/TL; the default order with no click unchanged.
