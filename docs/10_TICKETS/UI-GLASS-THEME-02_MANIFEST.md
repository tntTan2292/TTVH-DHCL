# UI-GLASS-THEME-02 Manifest

Status: `READY FOR ANTIGRAVITY (2026-10-11)`. Phase B of `UI-GLASS-THEME-01`. Frontend presentation only. Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket; do not treat that as a conflict.

## 1. Ticket Information

- Ticket ID: `UI-GLASS-THEME-02` — `Apply the light Glass theme to the page content (shared components, pages, tables, filters, popups)`
- Executor: `Antigravity (Gemini)`, full creative freedom inside Section 3. Independent review: `Claude Code (Opus)`. PO UI check: required.
- Authorization: PO in chat 2026-10-11 — Phase A (shell: sidebar, topbar, breadcrumb, login, shared controls; commit `8206eea`, fixes `99997bd`) looks fine but "something is missing": the page content still has the old look. PO asked to do Phase B.
- Starting point: Phase A tokens and classes in `frontend/src/index.css`; not-yet-used controls in `src/components/ui/` (Button, Input, Select, Badge, Card). Phase A review notes: Manifest `UI-GLASS-THEME-01` Section 8.

## 2. Verified starting point

Page content still uses hard-coded `bg-white` / `bg-[#...]` classes (about 65 JSX files) and old buttons/inputs; the new `components/ui/*` controls are imported by no page. Shared building blocks are `components/shared/SharedComponents.jsx`, `components/common/Containers.jsx`, `StateLayouts.jsx`, `SortableTh.jsx`, and the GlobalFilterBar inside `components/shared/SharedLayout.jsx`.

## 3. Scope — Antigravity has full creative freedom here

1. **Shared building blocks first** (largest effect, fewest edits): `SharedComponents.jsx` (KPI card, section header, etc.), `Containers.jsx` (PageContainer), `StateLayouts.jsx` (loading/empty/error), `SortableTh.jsx`, the GlobalFilterBar (date, interval, BCVH selector, search). Restyle them with the glass tokens and the Phase A controls; keep props and behaviour.
2. **Pages and features** (replace old buttons, inputs, selects, tabs, chips, popups, modals and page backgrounds by the Phase A look): Tổng quan điều hành (`DashboardHome`), Bảng điều hành (`features/dashboard`), Phân tích BCVH (`features/ranking`), Phân tích tuyến phát (`features/route`, `RouteRankingPage`), Dữ liệu minh chứng (`features/shipment`), `KpiConfiguration`, `SystemInformation`, `UnauthorizedPage`, the F1.1/F1.2/F1.3/F4.1 entry pages, and the Data Import Center (`DataImportCenter.jsx` + `AutoBackfill*` components: restyle only — their recently redesigned layout, columns and behaviour must stay).
3. **Tables:** header/row hover, zebra or divider, sticky headers where they exist, selected-row state; click-to-order titles stay (Section 4).
4. **Motion and feedback:** hover/press/focus-visible/disabled/loading on every control, skeleton or soft loading states, smooth modal/popover open/close, using transform/opacity/shadow only and honouring `prefers-reduced-motion`.
5. Extend `src/components/ui/` with what is missing (Tabs, Modal/Popover, Tooltip, Table helpers, Toggle, Pagination) and use it.

## 4. Hard guards (must not change)

- Logic, state, props contracts, handlers, API calls, payloads, routes, permissions, data helpers and backend. Existing frontend tests (651) pass **unedited**. Display strings stay as they are now (UI-VN-LABELS-01 names must not revert).
- **Report blocks stay solid**: white/near-white card, no `backdrop-filter` on the block root or inside the captured subtree (the camera button uses `html-to-image`; `blockCaptureHelper.js` unchanged). Glass is for the page, filters, panels and popups around the blocks. A block's capture must stay opaque and legible.
- **Report Block UI Standard** (`docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`) intact: camera button, click-to-order column titles and ordering of units, per-indicator target line (F1.1 95 %, F1.3/F4.1 90 %) and colour family (F1.3 blue, F4.1 orange, F1.1 green; light, no purple/dark), follow-the-date-filter. Chart colours, band colours (Tốt / Cần chú ý / Cảnh báo / Rủi ro cao) and heatmap colours keep their meaning; theme accents must not clash. `reportBlockStandard.test.js` passes.
- **Maps are out of scope**: do not touch `src/features/networkMap/*` (another session has uncommitted edits there). Map restyling becomes a later ticket after those edits are committed.
- **Lessons from the Phase A review:** never set `transform` globally (Leaflet and Recharts position with transform); component CSS goes in `@layer components` so Tailwind utilities can override it.
- Readability and performance: text contrast ≥ 4.5:1 on real backgrounds; table bodies on solid or ≥ 0.9 alpha surfaces; at most ~6 blurred layers per page (count them; filter bar, sidebar and topbar already use some); no animated blur; fallbacks for no-backdrop-filter and reduced-transparency must cover every new blurred class.
- No new dependency, no font/CDN. Do not edit tests to make them pass; add tests only for new pure helpers.

## 5. Required reading

- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`
- `docs/10_TICKETS/UI-GLASS-THEME-01_MANIFEST.md` Sections 4 and 8
- `docs/10_TICKETS/UI-IMPORT-DAYVIEW-01_MANIFEST.md` Section 4 (hard guard of the Import Center)

## 6. Validation and PO check

- Technical: `vite build`, `oxlint`, full frontend suite green and unedited, static undefined-identifier check on touched files. Executor must not open a browser, take screenshots, start a dev server or log in. Stop at `READY FOR PO UI CHECK`.
- Opus review checklist: (a) diff is styling/markup only, no logic or props change, no import or variable removed by mistake; (b) no `backdrop-filter` inside any report block / captured subtree, `blockCaptureHelper.js` unchanged; (c) Report Block UI Standard and colour families intact; (d) no global `transform`, no unlayered component CSS, Tailwind utilities still win; (e) fallbacks cover every new blurred class, blurred-layer count per page within Section 4; (f) contrast and focus-visible on each control state; (g) Import Center layout and behaviour unchanged; (h) `networkMap/*` untouched, UI-VN-LABELS names unchanged.
- PO checklist: one page of each indicator, a table with ordering, a filter bar, a popup/modal, the Import Center, the camera-button picture of a report block, smooth scrolling on the usual PC.

## 7. Delivery Status

Status: `READY FOR PO UI CHECK (2026-10-11)`.
- Phase B implementation completed by Antigravity (Gemini).
- Extended `src/components/ui/` with `Tabs.jsx`, `Modal.jsx`, `Tooltip.jsx`, `Toggle.jsx`, `Pagination.jsx`.
- Shared building blocks restyled with glass theme: `SharedComponents.jsx`, `Containers.jsx`, `StateLayouts.jsx`, `SortableTh.jsx`, `GlobalFilter.jsx`.
- Pages & Features updated: `DashboardHome.jsx`, `RouteRankingPage.jsx`, `ShipmentEvidenceSummary.jsx`, `ShipmentEvidenceDetail.jsx`, `KpiConfiguration.jsx`, `SystemInformation.jsx`, `UnauthorizedPage.jsx`, `F11Quality.jsx`, `F12Quality.jsx`, `F41Quality.jsx`, `F13Dashboard.jsx`, `F13Pareto.jsx`, `F13RCA.jsx`.
- Hard guards verified:
  1. No logic, props contract, API, or handler changes.
  2. 651/651 tests pass unedited (`node --test`).
  3. Report blocks keep solid opaque backgrounds; zero backdrop-filter inside captured subtrees (`blockCaptureHelper.js` unchanged).
  4. Report Block UI Standard and indicator colour families intact (F1.1 green, F1.3 blue, F4.1 orange).
  5. `src/features/networkMap/*` untouched.
  6. No global transforms; component styles inside `@layer components`.
  7. Fallbacks cover every glass class for `@supports not (backdrop-filter)` and `@media (prefers-reduced-transparency)`.
  8. Blur layer count per viewport ≤ 4 (within ≤ 6 limit).
- Build & Lint: `vite build` succeeded with exit code 0; `oxlint` (via `npm run lint`) reported 0 errors.

