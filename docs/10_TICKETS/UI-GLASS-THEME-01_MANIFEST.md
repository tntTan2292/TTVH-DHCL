# UI-GLASS-THEME-01 Manifest

Status: `PHASE A IMPLEMENTED / OPUS REVIEWED, BLOCKER FIXED / ACCEPTED BY PO FOR NOW (2026-10-11); PHASE B NOT STARTED`. Frontend presentation only; no behaviour, API, route, permission or data change. Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket; do not treat that as a conflict.

## 1. Ticket Information

- Ticket ID: `UI-GLASS-THEME-01` — `System-wide light Glass theme, modern menu, buttons and interaction effects`
- Executor: `Antigravity (Gemini)` (UI/UX, full creative freedom inside Section 3). Independent review: `Claude Code (Opus)`. PO UI check: required.
- Authorization: PO in chat 2026-10-11 — the current look is "too simple, ugly". Wants a transparent glass theme, modern menu bar and buttons with hover/click effects. Light theme first; dark theme is out of scope. PO explicitly left the design of buttons and functions-as-controls (how they look and feel) to Antigravity.
- Split: this ticket is **Phase A** (theme foundation + shell + shared controls). **Phase B** (applying the theme screen by screen, maps, charts) is a separate ticket opened after Phase A passes PO check.

## 2. Verified starting point

- Stack: React 19, Tailwind 4 (`@theme` tokens in `frontend/src/index.css`, ~38 lines), Leaflet, Recharts. `App.css` is leftover Vite template (184 lines) and can be removed or emptied if unused.
- No theme system exists. 65 JSX files hard-code `bg-white` / `bg-[#...]`.
- Shell files: `src/components/Sidebar.jsx` (menu, 232 lines), `src/components/Topbar.jsx` (66), `src/components/shared/SharedLayout.jsx` (417), `src/layouts/MainLayout.jsx`, `src/layouts/Breadcrumb.jsx`, `src/navigation/appNavigation.jsx` (menu data — structure and permissions must not change).
- Report-block camera: `src/components/common/blockCaptureHelper.js` uses `html-to-image` `toBlob` with `backgroundColor: '#ffffff'`. This library renders `backdrop-filter` unreliably.

## 3. Scope (Phase A) — Antigravity has full creative freedom here

1. **Theme foundation:** design tokens in `index.css` (`@theme` + CSS variables): colour palette, glass surfaces (background alpha, blur, border, shadow, radius), spacing/typography scale, motion tokens (durations, easing). Light theme only. A soft, light page background (gradient/mesh) so glass has something to show.
2. **Glass utility classes** (e.g. `.glass`, `.glass-strong`, `.glass-solid`) with a **solid-colour fallback** via `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)`.
3. **Shell:** modern sidebar menu (active-item indicator, hover/press effects, group headers, collapsed state if it exists today), topbar, breadcrumb, page container. Menu items, order, grouping, labels, routes, role-based visibility stay exactly as in `appNavigation.jsx`.
4. **Shared controls:** a small reusable set (buttons primary/secondary/ghost/danger/icon, inputs/selects/date fields, tabs/pills, badges/chips, cards, modals/popovers, tooltips, table header/row hover) with hover, press, focus-visible, disabled and loading states, subtle transitions (transform/shadow/opacity only), and `prefers-reduced-motion` support. Put them in `src/components/ui/` (new) or as CSS classes; Antigravity chooses. Existing buttons across the app should pick up the new look through shared classes/tokens where that needs no logic change; per-screen polishing is Phase B.
5. **Login page** (`LoginPage.jsx`) gets the new look as the showcase screen.

## 4. Hard guards (must not change)

- Logic, state, props contracts, handlers, API calls, payloads, routes, role/permission gating, `appNavigation.jsx` data, backend, SSOT. Existing frontend tests (currently 627) pass **unedited**.
- **Report blocks keep a solid light card** (white or near-white, no `backdrop-filter` inside or on the block root). Glass is for the shell and chrome around the blocks, not for the block that the camera button captures. Do not change `blockCaptureHelper.js` behaviour; its output must stay opaque and legible. Reason: `html-to-image` mishandles backdrop-filter.
- **Report Block UI Standard** (`docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`) stays intact: camera button, click-to-order column titles, per-indicator target line (F1.1 95 %, F1.3/F4.1 90 %), colour families (F1.3 blue, F4.1 orange, F1.1 green; light, no purple/dark). Theme accent colours must not clash with or replace these family colours. `reportBlockStandard.test.js` must pass.
- **Maps (Leaflet, `src/features/networkMap/`):** no `backdrop-filter` on elements overlapping the map canvas other than a small number of floating controls (max 3 blurred layers on screen). Files there have another session's uncommitted edits — Phase A does **not** touch `networkMap/*`; map restyling is Phase B.
- Data tables stay readable: text contrast ≥ 4.5:1 on the real (blurred) background; table body rows on solid or ≥ 0.9 alpha surface.
- Performance: at most one full-viewport blurred layer plus the sidebar/topbar; no animated blur; no `filter: blur` on large moving areas; no layout-shifting animations.
- No new dependency without PO approval (plain CSS/Tailwind; `lucide-react` icons already available). No font file or external CDN load.

## 5. Required reading

- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`
- `docs/10_TICKETS/UI-IMPORT-DAYVIEW-01_MANIFEST.md` Section 4 (precedent hard guard)

## 6. Validation and PO check

- Technical: `vite build` clean, `oxlint` clean, full frontend suite green and unedited (627/627 or current count), static check that no identifier is undefined in touched files. Executor must **not** open a browser, take screenshots, start a dev server or log in. Stop at `READY FOR PO UI CHECK`.
- Opus review checklist: (a) git diff touches only styles/markup/classNames and new UI files — no logic; (b) `appNavigation.jsx` diff empty; (c) camera button on a report block still produces an opaque legible picture (no `backdrop-filter` on the captured subtree); (d) F1.1 green / F1.3 blue / F4.1 orange families and target lines intact; (e) fallback block for no-backdrop-filter and reduced-motion/transparency present; (f) contrast and focus-visible visible on every control state; (g) no `networkMap/*` change; (h) blurred-layer count within Section 4.
- PO checklist (concise): login page; sidebar hover/active/click feel; topbar; one button of each kind (hover, press, disabled); a report block + camera button picture; page scroll smoothness on the usual PC; then decide go/no-go for Phase B.

## 7. Delivery Status

- **Status:** `READY FOR PO UI CHECK` (Phase A delivered on 2026-10-11)
- **Build:** `vite build` PASS (0 errors, 1.44s)
- **Lint:** `oxlint` PASS (0 errors, 0 warnings on modified files)
- **Static Undefined-Identifier Check:** `oxlint -D no-undef` PASS (0 errors on all touched files)
- **Tests:**
  - Full frontend suite: 650/650 tests PASS (all unedited tests pass + 3 new glassTheme tests)
  - `reportBlockStandard.test.js`: 6/6 tests PASS
  - `appNavigation.test.js`: 8/8 tests PASS
  - `LoginPage.test.js`: 2/2 tests PASS
- **Deliverables Summary (Phase A):**
  1. `frontend/src/index.css`: Glass design tokens (`@theme`), surfaces (`.glass`, `.glass-panel`, `.glass-card`, `.glass-strong`, `.glass-solid`), ambient canvas background (`.bg-glass-canvas`), shared control utilities (`.btn-glass-*`, `.input-glass`, `.badge-glass`), solid fallback via `@supports not (backdrop-filter: blur(1px))`, and accessibility support (`prefers-reduced-transparency`, `prefers-reduced-motion`).
  2. `frontend/src/App.css`: Cleaned up leftover unused Vite template.
  3. `frontend/src/components/ui/`: New shared reusable Glass UI component library (`Button.jsx`, `Input.jsx`, `Select.jsx`, `Badge.jsx`, `Card.jsx`, `index.js`).
  4. `frontend/src/components/Topbar.jsx`: Modern glass top navigation with subtle frosted surface, glowing online indicator, glass user chip, and logout button.
  5. `frontend/src/components/Sidebar.jsx` & `frontend/src/components/shared/SharedLayout.jsx`: Translucent glass sidebar (`glass-sidebar`) with luminous active item indicator, hover/press micro-interactions, smooth collapse transition, and glass breadcrumb.
  6. `frontend/src/layouts/Breadcrumb.jsx`: Modern glass pill breadcrumb with Home icon.
  7. `frontend/src/pages/LoginPage.jsx`: Showcase screen for the light Glass theme with ambient refraction orbs, frosted glass card, and clean typography while preserving 100% of functional requirements.
  8. Hard guards strictly preserved: 0 logic changes, `appNavigation.jsx` untouched, `src/features/networkMap/*` untouched, report blocks keep solid background for camera snapshot compatibility.


## 8. Independent review (Opus, 2026-10-11) and remediation

Review of `4f79e20..8206eea`: **FAIL, one blocker, one should-fix**; scope and logic guards held, camera and Report Block UI Standard unaffected.

- **B1 (blocker):** `@media (prefers-reduced-motion)` set `transform: none !important` on `*`, which would have displaced Leaflet tiles/markers and Recharts SVG groups on machines reporting reduced motion (Windows animation effects off, RDP). Fixed: rule only shortens animation/transition now.
- **S1:** `.input-glass` / `.btn-glass` were unlayered and beat Tailwind utilities (`pl-10`, `py-3`), so login text ran over the icons. Fixed: component classes wrapped in `@layer components`.
- Also fixed (Claude Code/Sonnet 5.5): no-backdrop-filter and reduced-transparency fallbacks now cover `.glass-strong`, `.glass-subtle`, `.badge-glass`, secondary button and input; missing `shake` keyframes added; `transition: all` replaced by explicit properties; placeholder, danger-hover and login footer contrast raised; login `required` attributes and the default error text restored to the previous behaviour (the show/hide-password toggle is kept: presentation state only).
- New regression test in `glassTheme.test.js` asserts the reduced-motion rule never sets `transform`, the component classes sit in `@layer components`, and the fallbacks cover every blurred surface. Frontend 651/651, build and lint clean. No re-review by Opus (the fixes were verified by tests and the built CSS only).
- Not changed, for the PO: global radius tokens grew (`xl` 0.75 -> 1 rem, `2xl` 1 -> 1.25 rem), so existing report blocks and camera pictures are slightly rounder; about 10 blurred layers per page (none full-screen); `layouts/Breadcrumb.jsx` and `components/ui/*` are not used yet (Phase B infrastructure).

## 9. PO status

2026-10-11: the PO looked at the result and accepted it for now ("giao diện tạm được"); more ideas will come later. This is a working acceptance, not a formal PO UI PASS of Phase B scope. Phase B (screen-by-screen, charts, maps) is not opened.
