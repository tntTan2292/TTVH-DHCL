# HOME-BI-01 Manifest

Status: `OPEN - awaiting backend phase B1` (2026-10-13). Executive Home page (Trang chủ điều hành) for the leadership of Bưu điện tỉnh: current quality rate and national rank of the four indicators F1.1, F1.2, F1.3, F4.1.

## 1. Ticket Information

- Ticket ID: `HOME-BI-01`. Parallel workstream; `PROJECT_SNAPSHOT.md` Current Ticket is another ticket, not a conflict.
- Authorization: PO chat 2026-10-13 (decisions in Section 4).
- Executors: backend/data = `Claude Code` (Phase B1); UI/UX = `Antigravity` (Phase U1, after B1 is done); independent review = `Opus`. PO UI check required.
- Product intent: leaders read the page in a few seconds and care about two things only: **the current quality rate** and **the national rank**.

## 2. Required Reading

1. `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` — every block (camera, click-to-order titles, target line, colour family, date filter, undefined-identifier check).
2. `frontend/src/features/indicator/indicatorConfig.js` (targets, colour families, endpoints) and the existing `national-ranking` endpoints of F1.1 / F1.2 (`backend/src/routes/f11Routes.js`, `f12Routes.js`).
3. Precedent for blocks and data: `docs/10_TICKETS/F12-DASHBOARD-UI-01_MANIFEST.md` Sections 3-4.

## 3. Scope — what the page must contain (content only; layout and look are Antigravity's)

1. **Date context:** the data day shown (anchor date, default the latest day with loaded data, i.e. N-1) and, per indicator, whether that day's data is loaded. An unloaded indicator shows an explicit "chưa có dữ liệu", never 0 %.
2. **One card per indicator (F1.1, F1.2, F1.3, F4.1)** with exactly: the **rate**, the **national rank x/34**, the **gap to the indicator's target** (percentage points), and the **change versus the previous day** for both rate and rank. Each card follows its indicator's colour family and its own target line. Nothing else (no volume, no secondary rates, no hour thresholds written on the card).
3. **National rank table — mandatory:** for the selected indicator (switch among the four), the 34 provinces with rank, rate and change versus the previous period; the Huế row is always findable and highlighted. A compact view (top, Huế and its neighbours, bottom) may be offered. Also: **how Huế's rank moved** over time (daily for the last 30 days, monthly from T1 to the current month) and the gap to the province ranked just above.
4. **Trend per indicator, each on its own chart** (own rate line and own target line, last 7 / 30 days). No chart mixes indicators on one axis.
5. **Units to act on, within one indicator at a time:** the lowest-rate BCVH (accepting units for F1.2) of the selected indicator with rate, gap to target and failed count, each linking to that indicator's existing ranking page.
6. Report-block functions of the standard on every block; the period follows the date filter and every title says which day/period it shows.

Out of scope until the PO decides: a unit × indicator matrix, a copy-ready daily message for Viber (the `/dashboard/message` endpoints exist), export to PDF.

## 4. Decisions Already Taken (do not re-ask)

- Targets: F1.1 95 %, F1.2 95 %, F1.3 90 %, F4.1 90 % (read from `indicatorConfig.js`, never hard-coded).
- Each indicator is a different measure: **no cross-indicator comparison, no summing of late parcels, no "bottleneck by stage" block.**
- **One threshold per indicator, shown without any "24h/48h" style label** (F1.1 is 24 h only; there is no 48 h). The rate is the one the indicator's own dashboard shows.
- The national rank table is mandatory (leaders look at current rate and national rank first).
- Roles: admin + viewer, as the other dashboards. Unevaluated = "Không đạt"; accepting offices are never ranked (standard).
- Layout, composition, visual style and chart choices are **left to Antigravity** within the standard and the design tokens in use.

## 5. Phases

- **B1 (Claude Code):** verify that a 34-province ranking and the previous-period rank exist for **all four** indicators (F1.1 and F1.2 have `national-ranking`; F1.3 / F4.1 to be confirmed) and add what is missing; provide one aggregation endpoint for the Home page (rate, rank, gap, previous day, Huế rank history, per-indicator trend, lowest units) following the selected anchor date, reusing the existing services; empty / not-loaded states explicit; cache keyed by anchor date and invalidated on import. The final contract is written in Section 7 when B1 is done.
- **U1 (Antigravity):** the Home page UI per Section 3 on that contract; replaces the content of `pages/DashboardHome.jsx` on `/`; frontend only.

## 6. Exclusions

No change to F1.1 / F1.2 / F1.3 / F4.1 behaviour or tests; no schema or import change in U1; no new colour rules; Antigravity: no browser, screenshot, dev server or login; no self-awarded PO PASS.

## 7. Backend contract and delivery

To be filled when B1 is done.
