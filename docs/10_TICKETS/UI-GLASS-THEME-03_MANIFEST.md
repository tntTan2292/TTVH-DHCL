# UI-GLASS-THEME-03 Manifest

Status: `READY FOR ANTIGRAVITY (2026-10-11)`. Phase C of the light Glass theme: the pages that `UI-GLASS-THEME-02` left in the old look. Frontend presentation only. Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket; do not treat that as a conflict.

## 1. Ticket Information

- Ticket ID: `UI-GLASS-THEME-03` — `Glass theme for the remaining pages: Bảng điều hành, Phân tích BCVH, Phân tích tuyến phát, Trung tâm nạp dữ liệu, filter bar`
- Executor: `Antigravity (Gemini)`, creative freedom inside Section 3. Independent review: `Claude Code (Opus)`. PO UI check: required.
- Authorization: PO in chat 2026-10-11 — finish the pages left over from `UI-GLASS-THEME-02`.
- History: Phase A shell (`8206eea`, fixes `99997bd`); Phase B shared components and entry pages (`1262d13`, review fixes `cdd44c5`). Read `UI-GLASS-THEME-02_MANIFEST.md` Sections 8-9 first: they list what Opus found and what is still undone.

## 2. Starting point

Tokens, glass classes and controls: `frontend/src/index.css`, `src/components/ui/` (Button, Input, Select, Badge, Card, Tabs, Modal, Tooltip, Toggle, Pagination) and the solid shared cards in `components/shared/SharedComponents.jsx`, `components/common/*`. Still in the old look:

- `features/dashboard/*` (Bảng điều hành: page `DashboardPage.jsx`, adapters, `BcvhOperationTable`, trend/risk workspace, operating-pattern card, chart frames, controls)
- `features/ranking/*` (Phân tích BCVH: `BcvhRankingPage`, weekly/monthly comparison, trend charts, overview blocks)
- `features/route/RoutePerformancePage.jsx` (Phân tích tuyến phát — the routed page)
- `pages/DataImportCenter.jsx`, `components/AutoBackfill*.jsx`, `components/UploadWidget.jsx` (Trung tâm nạp dữ liệu)
- the filter bar and layout wrapper inside `components/shared/SharedLayout.jsx` (GlobalFilterBar)

## 3. Scope — creative freedom here

Restyle controls and surrounding chrome: buttons, inputs, selects, date fields, tabs/pills, chips, toggles, pagination, popups/modals/drawers, tooltips, page backgrounds and section headers, table header/row hover/selected states, empty/loading/error states, filter bars and their controls (week/month/interval selectors, BCVH picker, search), control rows above report blocks (they are outside the block). Add hover, press, focus-visible, disabled and loading feedback everywhere. Use the `components/ui/*` pieces **only** where behaviour is identical (same props/handlers/keyboard use); otherwise restyle the existing markup with classes. Class changes are preferred to markup rewrites.

## 4. Hard guards (must not change)

- Logic, state, props, handlers, effects, API calls, payloads, routes, permissions, data helpers, backend. Existing tests (653) pass **unedited**. Display strings stay exactly as they are now; do not add explanatory sentences or rename anything.
- **Report blocks stay solid and un-filtered** (card, table, chart, KPI card, their headers): no `backdrop-filter`/`backdrop-blur-*`, no translucent white, on the block root or any descendant, because the camera button captures them with `html-to-image` and `blockCaptureHelper.js` stays unchanged. **Lesson from review B1/B2:** also no `backdrop-filter`, `transform`, `filter` or `will-change` on any ancestor of a `position: fixed` element (the operating-pattern heatmap tooltip is `fixed` inside `CardContainer`; backdrop-filter makes the ancestor the containing block and misplaces it). Do not add blur to the shared cards again.
- Report Block UI Standard (`docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`) intact: camera button, click-to-order column titles, ordering of units side by side, per-indicator target line (F1.1 95 %, F1.3/F4.1 90 %), colour families (F1.3 blue, F4.1 orange, F1.1 green; light, no purple/dark), follow-the-date-filter. Chart, band (Tốt / Cần chú ý / Cảnh báo / Rủi ro cao) and heatmap colours keep their meaning. `reportBlockStandard.test.js` passes.
- Data Import Center: restyle only; the redesigned layout, columns, indicator matrix, day table, modals' logic and every handler stay (`UI-IMPORT-DAYVIEW-01_MANIFEST.md` Section 4). Another session may edit `DataImportCenter.jsx`/`UploadWidget.jsx`: run `git status` first; if either shows uncommitted changes that are not yours, leave that file for the end and report.
- **Maps out of scope:** `src/features/networkMap/*` stays untouched (uncommitted edits of another session).
- Phase A/B lessons: never set `transform` globally; component CSS in `@layer components`; every new blurred class needs the `@supports not (backdrop-filter)` and `prefers-reduced-transparency` fallback (Tailwind `backdrop-blur-*` already covered by `[class*="backdrop-blur"]`); no animated blur; no `transition: all`; contrast ≥ 4.5:1; focus-visible on every control.
- Blur budget: at most ~6 blurred layers on any page **including** sidebar, topbar, breadcrumb, filter bar and modal backdrops; state the count per page in the delivery note. Table bodies solid.
- No new dependency, font or CDN. No test edits to make tests pass; add tests only for new pure helpers or to lock a guard.

## 5. Required reading

- `docs/10_TICKETS/UI-GLASS-THEME-02_MANIFEST.md` Sections 4, 8 and 9
- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`
- `docs/10_TICKETS/UI-IMPORT-DAYVIEW-01_MANIFEST.md` Section 4

## 6. Validation and PO check

- Technical: `vite build`, `oxlint`, full frontend suite green and unedited, static undefined-identifier check on touched files, plus an added test that the report-block files and any captured subtree carry no `backdrop-blur` and no fixed-position descendant sits under a filtered ancestor. Executor must not open a browser, take screenshots, start a dev server or log in. Stop at `READY FOR PO UI CHECK`.
- Opus review checklist: (a) styling-only diff, no logic/props/text change, no import or variable lost; (b) no `backdrop-filter` in report blocks or above fixed-position elements; (c) Report Block UI Standard and colour families intact, `blockCaptureHelper.js` unchanged; (d) Import Center handlers and layout unchanged; (e) fallbacks cover new blurred classes, blur count per page within budget; (f) contrast and focus-visible; (g) `networkMap/*` untouched, names unchanged, no invented text; (h) any swap to a `components/ui` control keeps identical behaviour.
- PO checklist: Bảng điều hành (cards, heatmap tooltip position, trend chart controls), Phân tích BCVH (weekly/monthly comparison, ordering of columns), Phân tích tuyến phát, Trung tâm nạp dữ liệu (matrix, day table, one modal), the camera-button picture of a block, scrolling smoothness on the usual PC.

## 7. Delivery Status

Not started.
