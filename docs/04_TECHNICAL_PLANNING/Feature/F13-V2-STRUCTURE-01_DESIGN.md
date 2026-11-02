# F13-V2-STRUCTURE-01 — Design: F1.3 rebuilt on the time axis (new module, old one untouched)

**Status:** `DESIGN FOR PO APPROVAL` (2026-11-02). Nothing is implemented. The old F1.3 module (`/f13/dashboard`, `/f13/ranking/*`) is not changed and is removed only after the PO accepts the new one.
**Author:** Claude Code (Sonnet 5.5). Backend: Claude Code. UI: Antigravity. Review: Opus (independent).
**Manifest:** `docs/10_TICKETS/F13-V2-STRUCTURE-01_MANIFEST.md`.

## 1. Why

Today F1.3 is split in "Bảng điều hành" and "Phân tích BCVH". Month figures are in both, and each indicator puts its monthly block in a different place (PO review 2026-11-02). PO decision: one module per indicator, menu by **time axis**, the same for every indicator, so a user knows from the menu alone which blocks a page holds.

## 2. Menu and pages (F1.3)

| Menu item | Route | Blocks (all existing data, none invented) |
| --- | --- | --- |
| Theo ngày | `/f13/v2/ngay` | Tổng quan điều hành · Bảng BCVH theo ngày (one table, see D2) · Xu hướng 7–30 ngày · Quy luật vận hành theo thứ · Trung tâm hành động |
| Theo tuần | `/f13/v2/tuan` | So sánh BCVH theo tuần (with national rank) · Diễn biến chất lượng theo tuần |
| Theo tháng | `/f13/v2/thang` | So sánh BCVH theo tháng (lũy kế, cùng kỳ / cả tháng trước) · Xu hướng theo tháng + heatmap tháng · Quy luật vận hành theo tháng + heatmap ngày |
| Chuyên đề | existing pages | Phân tích tuyến phát (`/f13/ranking/route`) · Năng lực và chất lượng tuyến · Dữ liệu minh chứng (`/f13/evidence`) — linked, not rebuilt in this ticket |

The menu shows a one-line sub-title under each item listing its blocks. The group is called **"F1.3 (mới)"** and is visible to ADMIN only during the trial.

Generic by construction: pages take an indicator config like F4.1/F1.1 do, so F1.1/F1.2/F4.1/F4.2 join later with the same three pages. Only F1.3 is switched on now.

## 3. Filters — three tiers

| Tier | Filter | Rule |
| --- | --- | --- |
| Page | **Time anchor** | Ngày: free range from–to (PO 2026-11-02, so a specific period can be compared). Tuần: one week (Thursday–Wednesday, ISO number of its Thursday). Tháng: one month. One anchor serves every block of the page; blocks have no own Day/Week/Month switch. |
| Module | **Unit** (+ search) | "Tất cả BCVH" or one BCVH; shared by the three pages, kept in the URL. |
| Block | view options only | Sort, top-N for the camera, show/hide columns, cùng kỳ vs cả tháng trước, compare-period pick, 7/14/30-day window. They never change which rows or which period the data covers. |

URL params: `from`, `to` (Ngày), `week` (Tuần), `month` (Tháng), `bcvh`. Anchor conversion between pages is done by the backend (Section 5.2): the day range's end date → the week containing it → the month of that week's Thursday; the other way: the week/month → its last day with data (Ngày shows that single day).

## 4. Permissions (unchanged principle, made explicit)

- Authorisation stays per module: `access.modules.f13.mode` = `all` | `bcvh` | `none`; routes under `/f13/` are gated by prefix (`canAccessPath`), data by the existing backend scope middleware. The split into pages was never an authorisation boundary, so merging pages removes nothing.
- The new risk is **block placement**. Every block carries a scope tag, held in one server-side registry:
  - `city` — hidden for `bcvh` mode (Trung tâm hành động, recommendations, city total, national rank, cross-BCVH comparison).
  - `unit` — shown; the existing backend scoping keeps only the user's BCVH rows and drops totals and ranks.
  - `drill` — route / postman / evidence, available for the user's own BCVH.
- `GET /api/f13/v2/layout` returns pages and blocks **already filtered for the caller**; the UI renders only what it receives, so UI and backend cannot disagree.
- `ADMIN`/`LEADER` (TTVH, BĐTP): all three levels. `bcvh` mode: own BCVH only, unit list without "Tất cả", drill into own routes. F1.2 is unchanged (no `bcvh` mode).
- Trial gate: `/f13/v2` is admin-only until the PO accepts; the data endpoints keep their normal scope either way.

## 5. Backend (additive, no existing contract changes)

### 5.1 Reused as they are
`/api/f13/dashboard/kpi`, `/dashboard/daily-trend`, `/ranking/bcvh` (day table incl. late cash), `/ranking/bcvh/weeks`, `/weekly-comparison`, `/weekly-trend`, `/months`, `/monthly-comparison`, `/overview` (monthly trend + heatmap), operating-pattern feeds, route and evidence endpoints.

### 5.2 New under `/api/f13/v2` (`allowViewerRead`, scope middleware)

| Endpoint | Purpose |
| --- | --- |
| `GET /layout` | Pages and blocks for the caller (id, page, title, scope tag), from `backend/src/services/f13v2/blockRegistry.js`. |
| `GET /period/resolve?kind=day\|week\|month&value=…` | Converts the anchor between day / week / month (rules in Section 3) and returns the latest day with data. Reuses the week logic of `BcvhWeeklyComparisonService`; no second calendar. |
| `GET /day/summary?from=&to=&ma_bcvh=` | One BCVH table for a day or range: volume, passed, failed, rate, late cash, **So sánh (N-1)** and **So sánh (N-7)**. See D1 for ranges. Verified in B0 whether `/ranking/bcvh` already does this for a range; if yes it is wrapped, not rewritten. |

All SQL parameter-bound, read-only, no schema change. Parity script: for the same inputs, new pages' numbers equal the old pages' numbers (ngày, tuần, tháng) before review.

## 6. Frontend (Antigravity), constraints

- New folder `frontend/src/features/f13v2/`: shell with the three-tier filter bar, three pages, composition of existing blocks.
- Shared blocks that own their own period switch (`BcvhWeeklyComparisonBlock`, operating pattern, etc.) get **optional controlled props**; without them they behave exactly as today (old module must not change).
- Report-block standard (`report_block_ui_standard.md`) and the short column titles (`features/indicator/columnHeaders.js`) apply; unit tests for every helper; no browser, PO checks the UI.

## 7. Decisions for the PO

| # | Decision | Default proposed |
| --- | --- | --- |
| D1 | Meaning of N-1 / N-7 when the Ngày filter is a **range** of L days | N-1 = the L days right before; N-7 = the same range shifted back 7 days. A single day gives exactly today's N-1 / N-7. |
| D2 | The old "Bảng điều hành BCVH" and "Bảng xếp hạng ngày" are two day tables with overlapping columns | Merge into one table "Bảng BCVH theo ngày"; its lũy kế tháng columns move to Theo tháng. |
| D3 | Tuần → Tháng conversion | Month of the week's Thursday (same rule as the ISO week number). |

## 8. Phases and gates

| Phase | Owner | Output | Gate |
| --- | --- | --- | --- |
| B0 | Claude Code | API contract note: what `/ranking/bcvh` does for ranges, final shapes of the 3 endpoints | PO decisions D1–D3 |
| B1 | Claude Code | `f13v2` backend + tests (scope: a `bcvh` account never receives a `city` block or a city total) + parity script | Backend tests green |
| U1 | Antigravity | Menu, filter shell, three pages | build, lint, tests; `READY FOR PO UI CHECK` |
| R1 | Opus | Independent review: scope leaks, parity, old module untouched | No blocker |
| PO | Product Owner | UI acceptance; then decision to retire the old F1.3 pages (redirects from old paths) | PO PASS |
| Next | — | Same template for F1.1, F1.2, F4.1, F4.2 | After F1.3 accepted |

## 9. Out of scope

Any change to the old F1.3 module, the other indicators, Home, Hàng tồn, the database or the Import; rebuilding Chuyên đề pages; new business rules.
