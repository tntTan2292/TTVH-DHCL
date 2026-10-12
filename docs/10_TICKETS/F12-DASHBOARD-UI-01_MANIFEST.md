# F12-DASHBOARD-UI-01 Manifest

Status: `READY FOR ANTIGRAVITY` (2026-10-12). Screens for F1.2 (thu gom liên tỉnh): Operation Dashboard and Ranking by accepting unit with drill-down to accepting offices, day / week / month / Lũy kế 12. Frontend only.

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
