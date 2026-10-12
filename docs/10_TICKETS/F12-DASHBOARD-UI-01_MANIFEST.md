# F12-DASHBOARD-UI-01 Manifest

Status: `READY FOR PO CHECK` (2026-10-12). Screens for F1.2 (thu gom liên tỉnh): Operation Dashboard and Ranking by accepting unit with drill-down to accepting offices, day / week / month / Lũy kế 12. Frontend only.

## 1. Ticket Information

- Ticket ID: `F12-DASHBOARD-UI-01`; parent `F12-MODULE-PLAN`; backend `F12-DASHBOARD-RANKING-01` (done, `docs/10_TICKETS/F12-DASHBOARD-RANKING-01_MANIFEST.md`, API in its Section 4).
- Executor: `Antigravity` (UI/UX). Independent review `Opus`. PO UI check required.
- Authorization: PO chat 2026-10-12. Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket, not a conflict.

## 2. Required Reading

1. `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (camera, click-to-order titles, target line, colour family, date filter, undefined-identifier check) — **every block**.
2. `docs/10_TICKETS/F12-DASHBOARD-RANKING-01_MANIFEST.md` Sections 2 and 4.
3. Precedent: `docs/10_TICKETS/F11-DASHBOARD-UI-01_MANIFEST.md` Sections 4-5 and 9, `frontend/src/features/f11/` and `frontend/src/features/indicator/indicatorConfig.js`.

## 3. Scope

- `F12_INDICATOR` in `indicatorConfig.js` (`id: 'f12'`, `moduleLabel: 'F1.2'`, `apiBase: '/f12'`, routes `/f12/dashboard`, `/f12/ranking/bcvh`, `kpi: '/dashboard/summary'`); register it. Colour bands = F1.3 (70 / 60 / 50) as F1.1; **target line 95 %** (`meta.target_rate`); **light teal/cyan colour family** (PD-F12-9), page accent bar and chip as the other indicators.
- Pages `features/f12/F12DashboardPage.jsx`, `F12BcvhRankingPage.jsx` (thin wrappers with `IndicatorProvider`), App routes (replace the "Coming Soon" `pages/F12Quality.jsx` on `/f12`; `/f12` redirects to `/f12/dashboard`), sidebar group "F1.2 Thu gom liên tỉnh" (admin + viewer), navigation tests.
- Reuse the shared blocks through the indicator config exactly as F4.1/F1.1: KPI cards with "Vị thứ toàn quốc x/34", day/week/month selection, daily trend, ranking table, weekly (Thursday–Wednesday) and monthly comparison + trend charts. Features off: routes, late cash, operating pattern, action centre, delivering side. The ranked unit is the **accepting unit** (`bcvh_units`, about 36), not "BCVH": use the wording "Đơn vị chấp nhận" where the shared text says BCVH, only through the indicator's labels.
- **New block A — "Đơn vị / Bưu cục chấp nhận"** (`GET /f12/dashboard/office-table?period&anchor_date`, Ngày / Tuần / Tháng following the selected date): rows = accepting units with rank, volume, rate (F1.3 bands, 95 % marker) and an expand control showing the unit's offices (volume, rate, no rank); the large-customer unit sits in a separate "Khách hàng lớn (không xếp hạng)" row from `unranked`; last row TỔNG CỘNG = `total_row`. Sticky header, search by unit/office name, click-to-order titles, camera button. Empty period: message, not an error.
- **New block B — "Lũy kế 12 tháng"** (`GET /f12/dashboard/cumulative-12?month=YYYY-MM`, default the month of the selected date): column chart of volume + rate line per month with the 95 % target line, the national rank under each month (`Vị thứ x/34`), cumulative figure card, and a unit table (12-month rate, rank, per-month rates coloured with the bands; `null` month shown as "–"). Camera button, click-to-order titles.
- Responsive: tables scroll inside their card; follow existing tokens and components; no new UI library.

## 4. Decisions Already Taken (do not re-ask)

Metric Đạt ≤ 10 h; rate = Đạt / BĐ10 count; accepting side only; ranking excludes the large-customer office (counted in the total, shown apart); national rank by accepting province among 34; weeks Thursday–Wednesday; rolling 12 months; target 95 %; roles admin + viewer.

## 5. Exclusions

No backend, schema or import change; no Evidence or route view; no new colour rules; do not change F1.1/F1.3/F4.1 behaviour (their tests stay green); no browser, screenshot, dev server or login by the executor; no self-awarded PO PASS.

## 6. Validation and PO Check

Technical: frontend lint, build, tests green; tests for `F12_INDICATOR` (bands, target 95, endpoints, features), the two wrappers, navigation, and the data mapping of blocks A and B (empty period, null month, unranked row, total = module total); the static undefined-identifier check of the standard. Stop at `READY FOR PO CHECK` with a short PO checklist: unit table day / week / month with offices expanded, large customer apart, 95 % line, Lũy kế 12 with national rank, camera on a long table and on the chart, narrow screen.

## 7. Delivery Summary (2026-10-12)

- **Configuration & Themes**:
  - Registered `INDICATOR_THEMES.teal` (`#0f766e`, `#14b8a6`, `#0d9488`, `#f0fdfa`, `#ccfbf1`) in `frontend/src/features/indicator/indicatorConfig.js`.
  - Configured `F12_INDICATOR` with `target_rate: 95.0`, floors `70/60/50`, `unitLabel: 'Đơn vị chấp nhận'`, features `{ officeTable: true, cumulative12: true, ... }`.
  - Updated `indicatorLabel` helper to substitute `"BCVH"` with `indicator.unitLabel` dynamically.
- **Pages & Routing**:
  - `frontend/src/features/f12/F12DashboardPage.jsx`: thin wrapper providing `F12_INDICATOR`.
  - `frontend/src/features/f12/F12BcvhRankingPage.jsx`: thin wrapper providing `F12_INDICATOR`.
  - `frontend/src/App.jsx`: `/f12` redirect to `/f12/dashboard`, `/f12/dashboard` & `/f12/ranking/bcvh` with `[ROLE_ADMIN, ROLE_VIEWER]`.
  - `frontend/src/navigation/appNavigation.jsx` & `frontend/src/components/Sidebar.jsx`: Added sidebar group `F12_GROUP` ("F1.2 – Thu gom liên tỉnh").
- **Block A: Đơn vị / Bưu cục chấp nhận (`F12OfficeTableBlock.jsx`)**:
  - Endpoints: `GET /f12/dashboard/office-table?period&anchor_date`.
  - Features: Day / Week / Month toggles, drill-down expand/collapse per unit to show underlying offices (unranked), separate "Khách hàng lớn (không xếp hạng)" row from `unranked`, sticky footer `TỔNG CỘNG` from `total_row`, camera button (`BlockCaptureButton`), click-to-sort headers (`SortableTh`), text search, friendly empty state.
- **Block B: Lũy kế 12 tháng (`F12Cumulative12Block.jsx`)**:
  - Endpoints: `GET /f12/dashboard/cumulative-12?month=YYYY-MM`.
  - Features: Month picker, 4 summary metric cards, ComposedChart (volume bar + rate line + 95% target ReferenceLine + `Vị thứ x/34` beneath each month label), unit 12-month summary & monthly rate matrix table with F1.3 threshold badges (`null` as "–"), camera button, click-to-sort headers, search.
- **Shared Integration**:
  - Conditionally integrated in `DashboardPage.jsx` when `indicator.features.officeTable` and `cumulative12` are enabled.
  - Ranking button label and page titles generalized via `indicatorLabel`.
- **Validation**:
  - Frontend test suite: **667/667 passing** (`node --test "src/**/*.test.js"`).
  - Backend test suite: **9/9 passing** (`F12RankingService.test.js`).
  - Lint: `npx oxlint` passed with 0 errors/0 warnings; undefined identifier check clean.
  - Build: `npx vite build` succeeded with 0 errors.
- **Next Stage**: Independent review by `Opus`, followed by PO UI verification.

## 7. Delivery Summary (2026-10-12, Antigravity)

See the commit `cc8fa0e`; blocks A (office table) and B (rolling 12 months), `F12_INDICATOR`, pages, routes, menu.

## 8. Review fixes and PO delta of 2026-10-12

- Opus round 1 (C1, C2 and details) and round 2 (S1-S4): the shared screens take the unit list from the indicator metadata (`indicator.dynamicUnits`, `BcvhUnitsContext`); see `docs/10_TICKETS/F12-DASHBOARD-RANKING-01_MANIFEST.md` Section 8. S1 (total label of the monthly trend), S2 (comparison table header "06 BƯU CỤC VẬN HÀNH" and series colours), S3 (unit filter `isCanonicalBcvhCode(value, codes)`, no extra `ma_bcvh=all` redirect) and S4 (wording "đơn vị chấp nhận" through `indicatorLabel`, menu "Phân tích đơn vị chấp nhận") fixed.
- **PO delta (screenshot of the Dashboard operations table):** the table lists every **accepting office** (not the 37 units, not "6 BCVH"): columns "Mã bưu cục chấp nhận" and "Tên bưu cục chấp nhận" (source columns `Mã BC nhận tin/chấp nhận`, `Tên BC nhận tin/chấp nhận`); the group header is "BƯU CỤC CHẤP NHẬN" without the "6 BCVH" note; title "…TẠI CÁC BƯU CỤC CHẤP NHẬN"; the table has a vertical scroll with a sticky header; the camera takes the top N rows in the order the user chose ("Ảnh chụp lấy": Top 15 / 20 / 25 / 30 / Tất cả, default 20) plus the total row, with the line "Ảnh chụp: top N / total bưu cục chấp nhận, sắp theo …", as the F1.1 office table. Data: `GET /api/f12/ranking/offices/overview` (all accepting offices, large-customer office included so the total equals the module total).
- Open (PO to decide): the naming "đơn vị chấp nhận" for the 37-unit ranking pages and menu (S4); the unit-level blocks A and B keep the unit names from the data.
