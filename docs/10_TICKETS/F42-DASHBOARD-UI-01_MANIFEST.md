# F42-DASHBOARD-UI-01 Manifest

Status: `READY FOR PO CHECK` (2026-10-27). Screens for F4.2 (chất lượng phát giao bưu tá): Operation Dashboard, BCVH Ranking and the postman blocks. Frontend only.

## 1. Ticket Information

- Ticket ID: `F42-DASHBOARD-UI-01`; parent `F42-MODULE-PLAN`; backend `F42-DASHBOARD-RANKING-01` (done, reviewed by Opus, API in its Section 4).
- Executor: `Antigravity` (UI/UX). Independent review `Opus` (after phases A+B and after phase D). PO UI check required.
- Authorization: PO chat 2026-10-27 (plan approved with one change, Section 4). Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket, not a conflict.
- Phases: **A** frame, **B** postman table (this prompt); **C** backend `F42-POSTMAN-API-01` (Claude Code, **done 2026-10-27**: `GET /f42/dashboard/postman-trend`, manifest `F42-POSTMAN-API-01_MANIFEST.md`); **D** postman trend block on the screen (click a postman name opens the daily rate chart with the 90 % line) and the F4.2 Home card (backend side of the card still to do, after the access work of another session lands), separate prompt after A+B.

## 2. Required Reading

1. `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (camera, click-to-order titles, target line, colour family, date filter, undefined-identifier check) — **every block**.
2. `docs/10_TICKETS/F42-DASHBOARD-RANKING-01_MANIFEST.md` Sections 2, 4 and 8 (metric, API shapes, RBAC).
3. Precedent: `docs/10_TICKETS/F12-DASHBOARD-UI-01_MANIFEST.md` Sections 3 and 7, `frontend/src/features/f41/`, `frontend/src/features/f12/` and `frontend/src/features/indicator/indicatorConfig.js`.

## 3. Scope

### Phase A — frame

- `F42_INDICATOR` in `indicatorConfig.js` (`id: 'f42'`, `moduleLabel: 'F4.2'`, `unitLabel: 'BCVH'`, `apiBase: '/f42'`, routes `/f42/dashboard`, `/f42/ranking/bcvh`, `kpi: '/dashboard/summary'`, `nationalRanking: '/dashboard/national-ranking'`, `postmanTable: '/dashboard/postman-table'`); register it where the other indicators are registered.
- **Target 90 %** (`meta.target_rate`). **Colour bands (PO 2026-10-27): green >= 90, pink 80-90, yellow 70-80, red < 70** (`heatmapFloors [90, 80, 70]`, same for `kpiStatusBands`). **Own light colour family**: not purple, not dark, distinct from blue (F1.3), orange (F4.1), green (F1.1), teal (F1.2) and from the status colours (pink, yellow, red); Antigravity picks it (PD-F42-7). Page accent bar and F-chip as the other indicators.
- Features off: routes, late cash, operating pattern, action centre. Feature on: `postmanTable`.
- Pages `features/f42/F42DashboardPage.jsx`, `F42BcvhRankingPage.jsx` (thin wrappers with `IndicatorProvider`), App routes for `/f42/dashboard` and `/f42/ranking/bcvh` (`[ROLE_ADMIN, ROLE_VIEWER]`; `/f42` redirects to the dashboard), sidebar group "F4.2 – Chất lượng phát giao bưu tá" with "Bảng điều hành" and "Phân tích BCVH", navigation tests.
- **User management page:** F4.2 in `INDICATOR_LIST` of `pages/UserManagementPage.jsx` (code `F4.2`, label "F4.2 – Phát giao bưu tá"; the backend already knows the code).
- Reuse through the indicator config exactly as F4.1: KPI cards with "Vị thứ toàn quốc x/34", day / week / month selection, daily trend, BCVH ranking table, weekly (Thursday–Wednesday) and monthly comparison and trend, heatmap, camera, click-to-order, date filter.
- New small block on the Dashboard: **"6 BCVH hôm nay"** strip: the six BCVH ordered by rate (or volume, user choice), coloured by the bands, with the 90 % marker, from the existing ranking/overview data.

### Phase B — postman table (`GET /f42/dashboard/postman-table`)

- Block **"Bưu tá theo BCVH"** on the Dashboard: Ngày / Tuần / Tháng following the selected date (`anchor_date`); one section per BCVH (volume, passed, failed, rate, postman count) that expands to its postmen (volume, passed, failed, rate, rank inside the BCVH); last row TỔNG CỘNG = `total_row`. About 128 postmen a day: vertical scroll with sticky header, search by postman name or code, filter "dưới mục tiêu 90 %", click-to-order titles (text columns A→Z, numeric, missing last), camera button (top-N rule of the standard for the long table, default 25).
- A BCVH-mode user receives only their own block and no `total_row`: show exactly what comes back, never compute a total or rank across BCVH on the client.
- Block **"Bưu tá cần chú ý"** derived from the same payload (no extra call): postmen under the target with the most failed parcels, top 10, per BCVH or all (the table's scope), with a short note that unrated parcels count as "Không đạt".
- Empty period: message, not an error. Postmen with volume 0 are not listed (Q-F42-3).

## 4. Decisions Already Taken (do not re-ask)

Metric: rate = Đạt / every GBT row, unrated rows count as "Không đạt"; target 90 %; ranking unit = the six BCVH; postmen only, no office-delivery block; national rank over 34 provinces; week Thursday–Wednesday; roles admin + viewer + RBAC by `f42` module. **PO 2026-10-27: colour bands 90 / 80 / 70** (not 80 / 70 / 60 as F4.1). A one-row "Đạt" shortfall of Huế against the portal summary is accepted (backend).

## 5. Exclusions

No backend, schema or import change; no Evidence or violation view; no per-postman trend or Home card in this prompt (phase D); do not change F1.1 / F1.2 / F1.3 / F4.1 behaviour (their tests stay green); no new UI library; no browser, screenshot, dev server or login by the executor; no self-awarded PO PASS.

## 6. Validation and PO Check

Technical: frontend lint, build and tests green; tests for `F42_INDICATOR` (bands 90/80/70, target 90, endpoints, features), the two wrappers, navigation, the user-page indicator list, the data mapping of the postman blocks (empty period, scoped user without `total_row`, rank inside BCVH, blank counted as not passed) and the static undefined-identifier check of the standard. Stop at `READY FOR PO CHECK` with a short PO checklist: menu and colour family, KPI and national rank, 6-BCVH strip, postman table day / week / month with a BCVH expanded, search and filter, camera on the long table, "cần chú ý" list, a scoped BCVH user sees only their block, narrow screen.

## 7. Delivery Summary (Phases A + B)

- **Phase A — Frame & Indicator Config:**
  - Registered `INDICATOR_THEMES.sky` (Sky blue `#0284C7`, accentBar `bg-sky-400`, chip `bg-sky-100 text-sky-900 border-sky-300`, button `bg-sky-600 text-white`). Distinct from blue (F1.3), orange (F4.1), green (F1.1), teal (F1.2) and status bands; not dark, not purple.
  - Configured `F42_INDICATOR` (`targetRate: 90`, `heatmapFloors: [90, 80, 70]`, `kpiStatusBands: [90, 80, 70]`, routes `/f42/dashboard` & `/f42/ranking/bcvh`, endpoints `/dashboard/summary`, `/dashboard/national-ranking`, `/dashboard/postman-table`).
  - Added thin wrappers `features/f42/F42DashboardPage.jsx` and `features/f42/F42BcvhRankingPage.jsx` with `IndicatorProvider`.
  - Added routes in `App.jsx` (`/f42` redirect to `/f42/dashboard`, `/f42/dashboard` and `/f42/ranking/bcvh` with `[ROLE_ADMIN, ROLE_VIEWER]`).
  - Added sidebar group `F4.2 – Chất lượng phát giao bưu tá` with "Bảng điều hành" and "Phân tích BCVH", indicator dot (`bg-sky-400`), and pinned default in `Sidebar.jsx` and `appNavigation.jsx`.
  - Added F4.2 access rules in `accessModel.js`.
  - Added `{ code: 'F4.2', label: 'F4.2 – Phát giao bưu tá' }` to `INDICATOR_LIST` in `pages/UserManagementPage.jsx`.
  - Added block **"6 BCVH hôm nay"** (`F42SixBcvhStripBlock.jsx`): 6 canonical BCVH cards ordered by rate or volume (user choice), status bands 90/80/70, 90 % target marker, camera button (`BlockCaptureButton`), date filter sync.

- **Phase B — Postman Table & Attention Block:**
  - Created pure helpers `features/f42/components/f42PostmanTableHelpers.js` (search by name/code with diacritic stripping, below target filter, sort, derive attention postmen, period header).
  - Block **"Bưu tá theo BCVH"** (`F42PostmanTableBlock.jsx`): Ngày / Tuần / Tháng switcher, accordion per BCVH with summary pills, postmen table with sticky headers, `SortableTh` click-to-sort, search input, filter `< 90%`, `BlockCaptureButton` with top-N (15, 20, 25, 30, all; default 25), `total_row` footer (only if returned from backend, never cross-ranked or totaled on client).
  - Block **"Bưu tá cần chú ý"** (`F42PostmanAttentionBlock.jsx`): top 10 postmen under target with most failed parcels, note on blank ratings counted as unpassed, camera button.
  - Container **`F42PostmanDashboardBlocks.jsx`**: single fetch to `GET /f42/dashboard/postman-table`, feeds both blocks with no redundant network calls.
  - Mounted blocks in `DashboardPage.jsx` gated by `features.sixBcvhStrip` and `features.postmanTable`.

- **Technical Validation:**
  - Build: `vite build` PASS (0 errors).
  - Lint: `oxlint` PASS (0 errors).
  - Test suite: 814/814 tests PASS across frontend. F1.1, F1.2, F1.3, F4.1 suites intact and green.
  - Undefined-identifier check: 0 undefined variables in `src/features/f42`.

## 8. PO UI Checklist (Ready for PO Check)

1. **Menu & Colour Family:** Check sidebar group "F4.2 – Chất lượng phát giao bưu tá" with sky blue indicator dot; page accent bar and F4.2 chip in sky blue family (distinct from F1.3 blue, F4.1 orange, F1.1 green, F1.2 teal).
2. **KPI & National Rank:** KPI cards with "Vị thứ toàn quốc x/34", day/week/month selection, daily trend, BCVH ranking table.
3. **"6 BCVH hôm nay" Strip:** 6 cards with 90/80/70 colour bands, 90 % target marker, toggle sort by rate or volume, camera button.
4. **Postman Table ("Bưu tá theo BCVH"):**
   - Toggle Ngày / Tuần / Tháng.
   - Click to expand/collapse each BCVH.
   - Postmen table with volume, passed, failed (including unrated/blank), rate, and internal rank.
   - Search by postman name or code.
   - Filter "Dưới mục tiêu 90 %".
   - Click column titles to sort (text A→Z, numbers desc/asc).
   - Sticky table header and vertical scrolling.
   - Camera button with Top-N selector (choice: 15 / 20 / 25 / 30 / Tất cả, default 25).
5. **"Bưu tá cần chú ý" Block:** Top 10 postmen under 90% with the highest failed count, note on unrated parcels counting as "Không đạt", camera button.
6. **Scoped BCVH User:** Scoped BCVH user sees only their own block without `total_row` and without cross-BCVH calculations.
7. **User Management:** Check `F4.2 – Phát giao bưu tá` is available in indicator list on `/admin/users`.
8. **Narrow Screen:** Responsive layout for cards, tables, and controls.

## 9. Next

Opus review of A+B, then PO UI check. In parallel `F42-POSTMAN-API-01` (Claude Code), then phase D.

