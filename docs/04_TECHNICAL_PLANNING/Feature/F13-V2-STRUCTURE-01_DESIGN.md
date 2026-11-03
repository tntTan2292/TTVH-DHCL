# F13-V2-STRUCTURE-01 — Design: F1.3 rebuilt on the time axis (new module, old one untouched)

**Status:** `D1-D3 APPROVED BY PO (2026-11-02) / B0-B1 BACKEND DELIVERED`. UI (U1) not started. The old F1.3 module (`/f13/dashboard`, `/f13/ranking/*`) is not changed and is removed only after the PO accepts the new one.
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

URL params: `from`, `to` (Ngày), `week` (Tuần), `month` (Tháng), `bcvh`. **Switching pages (PO decision 2026-11-02, replaces the earlier anchor-conversion rule):** a page never derives its period from the one chosen on another page. Each page opens the **latest period with data**: Ngày = the latest day; Tuần = the week containing the latest day; Tháng = the calendar month containing the latest day (latest day 01/11/2026 → Tuần W44, Tháng 11). The **unit stays selected** across pages (`bcvh` is kept in the URL), unless the PO says otherwise. Backend: `GET /api/f13/v2/period/resolve?kind=latest` gives the three at once; picking a date inside a page still uses `kind=day|week|month`.

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
| `GET /period/resolve?kind=latest\|day\|week\|month&value=…` | `latest` (no value): the latest day with data, the week and the calendar month containing it (what a page opens with). The other kinds convert one picked anchor into the others (clamped to the latest day). Reuses the week logic of `BcvhWeeklyComparisonService`; no second calendar. |
| `GET /day/summary?from=&to=&ma_bcvh=` | One BCVH table for a day or range: volume, passed, failed, rate, late cash, **So sánh (N-1)** and **So sánh (N-7)**. See D1 for ranges. Verified in B0 whether `/ranking/bcvh` already does this for a range; if yes it is wrapped, not rewritten. |

All SQL parameter-bound, read-only, no schema change. Parity is enforced by tests (`routes/f13v2Routes.scope.test.js`), not by a script: for the same inputs the day table equals the old ranking field by field. One deliberate difference: **ranks are among the six canonical BCVH only**; the old ranking lets a stray code (e.g. 531120) take a place and shifts the others down (R1 decision 2026-11-02, the new numbers are the right ones).

## 6. Frontend (Antigravity), constraints

- New folder `frontend/src/features/f13v2/`: shell with the three-tier filter bar, three pages, composition of existing blocks.
- Shared blocks that own their own period switch (`BcvhWeeklyComparisonBlock`, operating pattern, etc.) get **optional controlled props**; without them they behave exactly as today (old module must not change).
- Report-block standard (`report_block_ui_standard.md`) and the short column titles (`features/indicator/columnHeaders.js`) apply; unit tests for every helper; no browser, PO checks the UI.

## 7. Decisions for the PO

| # | Decision | Default proposed |
| --- | --- | --- |
| D1 | Meaning of N-1 / N-7 when the Ngày filter is a **range** of L days | N-1 = the L days right before; N-7 = the same range shifted back 7 days. A single day gives exactly today's N-1 / N-7. |
| D2 | The old "Bảng điều hành BCVH" and "Bảng xếp hạng ngày" are two day tables with overlapping columns | Merge into one table "Bảng BCVH theo ngày"; its lũy kế tháng columns move to Theo tháng. |
| D3 | Tuần → Tháng conversion | Month of the week's Thursday. **Superseded 2026-11-02** for page switching by the "each page opens the latest period" rule (Section 3); it remains only for converting a date the user picks. |

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

## 10. Contract delivered in B0/B1 (backend, 2026-11-02)

B0 finding: the old `/ranking/bcvh` accepts a range for the current figures, but its D-1 / D-7 columns compare with one single day anchored on `to_date`, so it cannot give "the L days before" for a range (D1). `day/summary` therefore has its own service; for one day its figures equal the old ranking's (tested field by field).

All under `/api/f13/v2` (login + role + `requireModule('f13')` + per-scope response cache; body `{ success, data }`):

| Endpoint | Query | `data` |
| --- | --- | --- |
| `GET /layout` | — | `{ indicator, scope:{mode,bcvh}, units:{allow_all,bcvh[]}, pages:[{id,title,path,subtitle,blocks:[{id,title,scope,path?}]}] }` — blocks already filtered for the caller; the UI draws only these. |
| `GET /period/resolve` | `kind=latest` (no value) or `kind=day\|week\|month`, `value` (`YYYY-MM-DD` / `YYYY-Www` / `YYYY-MM`) | `{ kind, value, latest_date, clamped, day, week:{week_id,week_start,week_end,iso_week}, month:{month_id,month_start,month_end} }` — `day` is the anchor day clamped to the latest day with data. |
| `GET /day/summary` | `from`, `to` (`YYYY-MM-DD`, range up to 366 days), `ma_bcvh` (optional) | `{ rows:[{ma_bcvh,ten_bcvh,rank,volume,passed,failed,rate,late_cash:{count,rate},compare:{n1,n7}}], meta:{from_date,to_date,days,has_data,compare:{n1:{from_date,to_date},n7:{...}},total_row} }`; `compare.n1/n7` = `{volume,rate,volume_delta,rate_delta}` (null when the window has no data for that BCVH). |

Errors: 400 `MISSING_PARAM` / `INVALID_DATE` / `INVALID_RANGE` / `RANGE_TOO_LONG` / `INVALID_BCVH` / `INVALID_KIND` / `INVALID_WEEK_ID` / `INVALID_MONTH_ID`; 403 `OUT_OF_SCOPE`.
BCVH-mode accounts: `rows` holds their own BCVH only; `meta.total_row` and every `rank` are removed; an unknown or foreign `ma_bcvh` is 403.

The other blocks use the existing `/api/f13/...` endpoints unchanged (Section 5.1). Files: `backend/src/services/f13v2/{blockRegistry,periodResolve,DaySummaryService}.js`, `controllers/F13V2Controller.js`, `routes/f13v2Routes.js`, mount in `server.js`; tests `services/f13v2/f13v2Units.test.js` (13) and `routes/f13v2Routes.scope.test.js` (10, scope leak + parity). The backend needs a restart to serve the new routes.

## 11. Review R1 (Opus, 2026-11-02) and remediation

R1 found 5 blockers, no scope leak. Backend ones fixed by Claude Code, UI ones handed to Antigravity (prompt in chat, tracked in the manifest).

| # | Finding | Owner | State |
| --- | --- | --- | --- |
| B1 | `day/summary` on a long range loaded every fact row and exhausted the heap (crash at ~305 days) | Backend | **Fixed**: late cash is streamed (`eachFailedFactBetween`, 4 columns, failed rows only). Synthetic 604k rows / 304 days: 1.5 s, peak 358 MB. |
| B2 | Unit filter hardcoded wrong codes; Tuần/Tháng ignored `bcvh` | UI | Open |
| B3 | Month page called `/f13/months` (404); correct is `/f13/ranking/bcvh/months` | UI | Open |
| B4 | Weekly block always draws the weekly trend block (twice on Tuần, stray on Tháng) | UI | Open |
| B5 | Compare period fixed to `options[1]`; invalid `?week=` empties the filter | UI | Open |
| R-rank | `rank` differs from the old ranking | Backend | Decided: canonical only (Section 5.2), test added |
| R-total | TỔNG CỘNG had no `late_cash.rate` | Backend | **Fixed** (summed late / summed failed), parity test with the old total row |
| R-D3 | Day→month used the day's own month; text said Thursday | Design | Superseded by the PO rule "each page opens the latest period" (Section 3); `kind=latest` added |
| R-tests | Mutants M8 (N-1 window value), M10 (total mixing N-1/N-7), M15 (tie-break) survived | Backend | **Fixed**: value assertions, total-window assertions, tie-break and canonical-only tests |

Remaining R1 recommendations (menu "Chuyên đề" reaching only one block, leftover period pickers in the comparison block, Ngày page pattern tabs, camera caption, colour thresholds, scoped units for BCVH accounts) go to the UI fix round.

## 12. PO decisions of 2026-11-02 (after R1)

1. **Ranking:** only the six BCVH (A Lưới, Hương Thủy, Hương Trà, Phú Lộc, Thuận An, Thuận Hóa); every other code (e.g. 531120) is left out. The old F1.3 module is unchanged, so the two versions can show different ranks on days that have a stray code.
2. **Page switching:** no period is carried between Ngày / Tuần / Tháng; each opens the latest period with data (Section 3). The selected unit is kept.
UI consequence for U1: remove the day→week→month conversion on page links; each page defaults its anchor from `period/resolve?kind=latest`; the filter bar keeps `bcvh` only.
3. **Day table (PO UI check, replaces D2):** the first table of Theo ngày is the table the PO sends every day, "BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH" (`BcvhOperationTable`, unchanged, block `day.operation`, scope `city`). It shows the filter's end date and that month to date. As on the old Bảng điều hành, a BCVH-mode account does not get it; it keeps the own-row "Bảng BCVH theo ngày" (`day.table`, new scope `own`).
4. **Trung tâm hành động removed from Theo ngày** (PO: still too mechanical compared with how the PO actually runs operations). The old F1.3 Bảng điều hành is not changed.
5. **Range comparison table (`day.range`, scope `unit`):** drawn only when the filter holds two days or more, below the operation table, in the same look. A range is compared with its **same period** (cùng kỳ), not N-1 / N-7: the same dates back by as many months as the range touches (01/11-15/11 -> 01/10-15/10; 01/09-15/10 touches 2 months -> 01/07-15/08), a day the earlier month does not have becomes its last day (31/03 -> 28/02). `day/summary` gives it as `compare.same_period` on each row and the total, and `meta.compare.same_period`. A BCVH-mode account sees its own row and no total.
6. **Late cash no longer shown (PO 2026-11-03):** TCT no longer measures the handover time. Data: the handover time starts to equal the delivery time from 14/09/2026; late parcels fall from 8,000-16,000 a month (January-August) to 4,388 in September and 140 in October. Off in `F13_INDICATOR.features.lateCash` (BCVH analysis page) and in the own-row day table. The raw column, the rule and the API fields stay. The route and evidence pages still show it until Chuyên đề is rebuilt.
7. **Chuyên đề menu fix (2026-11-03):** the menu draws two levels under a group, so the third level had no link and opened nothing. The three blocks are listed directly under F1.3 (mới).
