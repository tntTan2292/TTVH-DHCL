# Report Block UI Standard (F1.1 / F1.3 / F4.1 and every future indicator)

Status: `ACTIVE (2026-10-10)`. Decided by the Product Owner in chat on 2026-10-10 and enforced from then on. Every ticket that adds or changes a report screen (Operation Dashboard, BCVH Ranking, a table, a chart, a card) must deliver the functions below **without being asked again**. A ticket manifest for a report screen lists this file in its Required Reading and its PO check list repeats the items that apply.

## Table of Contents

- [1. The mandatory functions](#1-the-mandatory-functions)
- [2. How they are built (reuse, do not rewrite)](#2-how-they-are-built-reuse-do-not-rewrite)
- [3. Indicator settings](#3-indicator-settings)
- [4. Quality gates before a report screen is handed over](#4-quality-gates-before-a-report-screen-is-handed-over)
- [5. Changing the standard](#5-changing-the-standard)

## 1. The mandatory functions

| # | Function | Rule |
| --- | --- | --- |
| 1 | **Camera button** | Every report block (card, table, chart) has the camera button in its header corner. One click copies a picture of the **whole** block (scrolled-away rows and columns included, 2×, caption with title, indicator, period and time) so it can be pasted into Zalo/Viber/email; a small second button saves a PNG. Works over HTTPS (the LAN address is `https://…:5178`); on plain http it opens a preview to copy with the browser's own "Copy image". **A long table must not make a tall, tiny picture:** the picture of a table with many rows (F1.1 accepting offices, 60+) takes only the top N rows in the order the user chose (choice 15 / 20 / 25 / 30 / all, default 25), without the controls, plus the total row and a caption "top N / total, sorted by …"; the screen is restored afterwards. A block opts in with the `beforeCapture` / `afterCapture` props of the camera button and marks its controls `data-no-capture="true"`. |
| 2 | **Click-to-order column titles** | Every table with numeric columns (volume, passed, failed, rate, increase/decrease, comparison columns…) orders its rows when a column title is clicked; a second click reverses. Text columns (unit name/code) order A→Z. Missing values always go last; equal values keep their order; the TỔNG CỘNG row never moves; the table's own default order is unchanged until the user clicks. The active title shows an arrow. |
| 3 | **Ordering of units shown side by side** | Where several units (BCVH, accepting offices, delivering units) are shown as rows **or columns** (F1.1 accepting office × delivering unit table), the user can order them by **volume** or by **rate**: rows from the column titles, columns from the "Cột bưu cục phát" buttons. "Khác" (other delivering codes) stays last. |
| 4 | **Target line per indicator** | A chart's target line, its legend/label, below-target markers and risk text read the indicator's target: **F1.3 and F4.1 90 %, F1.1 95 %**. Never a fixed 90. |
| 5 | **Colour family per indicator** | The three families must be told apart at a glance without reading the menu: **F1.3 blue, F4.1 orange, F1.1 green** (light tones; **no purple, no dark tones**). The family colour is used for accents only: volume bars and rate line, header bands, active buttons and sort titles, the page accent bar and the F-chip. **Status colours keep their meaning in every family**: green / pink / yellow / red rate bands, red target line, rose rank text. No hard-coded hex or blue/emerald class in a report component: read the theme. |
| 6 | **Follow the date filter** | A table or chart of a report screen shows the period the user selected (filter end date as `anchor_date`); nothing is pinned to "latest data". The title says which day/period is shown. |
| 7 | **National rank where F1.3/F4.1 show it** | "Vị thứ toàn quốc x/34" in the KPI card and in the day / week / month headers. No province table on the F1.1 screens (it will go to the Home page). |
| 8 | **Year view** | The monthly trend block and the BCVH × month heatmap exist for every indicator and run from T1 to the current month of the year. Empty months are empty because the data is not loaded yet, not because the block is missing. |
| 9 | **Unevaluated = "Không đạt"** | A parcel without an evaluation is counted as "Không đạt" in every figure; no separate note about it on the dashboards (the Evidence module will split it later). |
| 10 | **No ranking of accepting offices** | Accepting offices are shown with values and colours, never with rank numbers (PO). |

## 2. How they are built (reuse, do not rewrite)

- Camera: `components/common/BlockCaptureButton.jsx` + `blockCaptureHelper.js` (`html-to-image`). Give it the block's ref, a title and the period (use variables that exist: a missing variable here once broke a whole page).
- Ordering: `components/common/SortableTh.jsx` (title cell with arrow) + `tableSort.js` (`sortRowsBy`, `nextSortState`, `cellFieldValue`). Pure helpers of a table go in their own `.js` module with unit tests (see `features/f11/components/f11PairTableSort.js`).
- Target and colours: `features/indicator/indicatorConfig.js` (`targetRate`, `theme`, `indicatorTargetRate()`, `indicatorTheme()`, `INDICATOR_THEMES`). Components read `indicatorTheme(useIndicator())`; pure helpers take the target as a parameter with the default 90. Tailwind class names of a theme are written out in full in the config so Tailwind generates them; never build a class name with a template (`hover:${…}` is not generated).
- Rate colours: the shared catalogue `components/f13/f13HeatmapBandCatalog.js` (`classifyF13HeatmapRate`, tone classes) with the indicator's bands.
- Page chrome: `PageContainer` takes `accentClassName` and `badge` (the page accent bar and the F-chip).

## 3. Indicator settings

| Indicator | Target line | Colour family | Rate bands (green / pink / yellow) |
| --- | --- | --- | --- |
| F1.3 | 90 % | blue (`#2563EB`, rate line green) | 70 / 60 / 50 |
| F4.1 | 90 % | orange (`#F97316`, rate line blue) | 80 / 70 / 60 |
| F1.1 | 95 % | green (`#22C55E`, rate line sky) | 70 / 60 / 50 (as F1.3, PO) |

To change a tone or a target, change it in `indicatorConfig.js` only.

## 4. Quality gates before a report screen is handed over

1. Frontend tests, build and lint green; F1.3 and F4.1 suites unchanged.
2. **Undefined-identifier check:** `npx oxlint -D no-undef src` and look at the names that are not browser globals (a missing import or variable compiles and passes the unit tests but breaks the page at run time).
3. The default look with no click is unchanged for F1.3 and F4.1 (except the family colours and the page accent).
4. Tests for new pure helpers (ordering, targets), and a source check that every block exposes the camera button and reads the theme (`features/indicator/reportBlockStandard.test.js`).
5. No browser/screenshot/dev server/login by Antigravity; the PO checks the screens. Never self-award PO PASS.

## 5. Changing the standard

Only the Product Owner changes it (chat decision), recorded here with the date and in `PROJECT_PROGRESS.md`. A new mandatory function is added to Section 1 and, if it can be checked by code, to `reportBlockStandard.test.js`.
