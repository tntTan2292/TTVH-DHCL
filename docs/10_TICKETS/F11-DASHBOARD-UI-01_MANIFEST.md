# F11-DASHBOARD-UI-01 Manifest

Status: `READY FOR ANTIGRAVITY (2026-10-10)`. Screens for F1.1 (toàn trình nội tỉnh): Operation Dashboard and BCVH Ranking, plus two blocks leaders need to see at a glance: the **province/city table** and the **accepting-office × delivering-BCVH table**. Backend is done (`F11-DASHBOARD-RANKING-01`); this ticket is frontend only.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Required Reading](#3-required-reading)
- [4. Scope](#4-scope)
- [5. Decisions Already Taken (do not re-ask)](#5-decisions-already-taken-do-not-re-ask)
- [6. API Contract](#6-api-contract)
- [7. Exclusions](#7-exclusions)
- [8. Validation and PO Check](#8-validation-and-po-check)

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

### 4.2 New block A — "Tỉnh/thành phố" (shown only for F1.1, behind a new feature flag, e.g. `features.provinceRanking`)

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
