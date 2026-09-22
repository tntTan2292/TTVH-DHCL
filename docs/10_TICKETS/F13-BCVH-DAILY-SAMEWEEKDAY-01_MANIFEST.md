# F13-BCVH-DAILY-SAMEWEEKDAY-01 — Điều hành ngày: thêm cột "Tăng/giảm so với cùng kỳ (tuần trước)"

`IMPLEMENTED / PO UI PASS / CLOSED` (2026-09-22). See Section 7 for closure record.

## 1. Summary

Extend the locked 9-column Operation Dashboard BCVH table (`docs/10_TICKETS/F13-BCVH-MONTHLY-CUMULATIVE-01_MANIFEST.md`, closed `IMPLEMENTED / PO UI PASS / CLOSED`, 2026-09-17) with a 10th column in the **ĐIỀU HÀNH NGÀY** group: **"Tăng/giảm so với cùng kỳ (tuần trước)"**, comparing the anchor date's rate with the rate on the exact same calendar weekday 7 days earlier.

## 2. Product Owner Authorization — received in chat, 2026-09-22

The Product Owner explicitly approved widening the locked 9-column contract to 10 columns, with the following business rules dictated directly:

- Anchor date (`ngày mới nhất`) continues to follow the existing **N-1** rule — unchanged, already correct in `BcvhOverviewService._yesterday()`/`_resolveCeiling()`.
- The new comparison date is **exactly `anchor_date − 7 calendar days`** (same weekday), e.g. if today is Tuesday the anchor is Monday, and the new column compares this Monday against last Monday.
- This is a **different semantic** from the existing "Tăng/Giảm so với ngày trước" column (col 9), which compares against the **previous available fact date** (not necessarily calendar D-1) per the Section 9.3 locked rule of the predecessor ticket. Both columns are kept, side by side.
- Applies to the 6 canonical BCVH rows and the `TỔNG CỘNG` row, same scope as every other column.
- Missing comparison data (no fact row on the week-ago date) displays `—`; no fabricated zero, matching the existing rule for every other delta column.
- The existing "Tăng/Giảm so với ngày trước" column (col 9) is kept unchanged.

This authorization amends Section 9.1 of `F13-BCVH-MONTHLY-CUMULATIVE-01_MANIFEST.md` from 9 to 10 columns for this specific table; it does not reopen any other part of that closed ticket, and it does not touch the F1.3 KPI/SSOT (`danh_gia_2026`).

## 3. Amended column contract (10 columns)

| Order | Group | Column |
| ---: | --- | --- |
| 1 | Identity | STT |
| 2 | Identity | Mã bưu cục |
| 3 | Identity | Tên bưu cục |
| 4 | Lũy kế tháng | Sản lượng đo kiểm |
| 5 | Lũy kế tháng | Tỷ lệ đạt KPI 2026 |
| 6 | Lũy kế tháng | Tăng/giảm so với tháng trước |
| 7 | Điều hành ngày | Sản lượng đo kiểm |
| 8 | Điều hành ngày | Tỷ lệ đạt KPI 2026 |
| 9 | Điều hành ngày | Tăng/Giảm so với ngày trước |
| 10 | Điều hành ngày | **Tăng/giảm so với cùng kỳ (tuần trước)** *(new)* |

## 4. Design of Record (embedded — ticket scope is a single additive column)

### 4.1 Data source

`fact_f13`, filtered by `ngay_do_kiem = anchor_date - 7 days` and `ma_bcvh IN (6 canonical codes)`, covered fully by the existing index `idx_f13_date_bcvh_covering(ngay_do_kiem, ma_bcvh, danh_gia_2026)`. No schema or index change.

### 4.2 Backend

- `backend/src/repositories/FactBuuGuiRepository.js` — `_getBcvhOverviewAggregate('daily', …)`: added a `week_bounds` CTE (`date(bounds.anchor_date, '-7 days') AS week_ago_date`), following the same pattern already used for `prev_bounds`/`prev_anchor_date`. The date is included in the `WHERE` clause and the row projection; parameter count unchanged.
- `backend/src/services/bcvhOverviewService.js` — `getOverview()`: reads `week_ago_date` off the daily rows (falling back to a pure date-math `shiftIsoDate(anchorDate, -7)` when the repository result carries no matching row, e.g. `_emptyOverview`), ensures it is present in the `dailyDates` set (same technique already used for `prevAnchorDate` crossing month boundaries), and threads it into `meta.week_ago_date` via `_buildMeta()`.
- No new API endpoint — reuses the existing `GET /f13/ranking/bcvh/overview` contract additively (`meta.week_ago_date`, `daily[]` rows for that date).

### 4.3 Frontend

- `frontend/src/features/dashboard/components/bcvhOperationTableData.js`:
  - New exported helper `shiftIsoDate(isoDate, days)` (UTC-safe calendar date math), mirroring the backend helper of the same name.
  - `processBcvhOperationTableData()`: computes `weekAgoDate = meta.week_ago_date || shiftIsoDate(anchorDate, -7)`, looks up each unit's fact row on that date, computes `daily_week_delta_rate = dailyRate - weekAgoRate` (null-safe, same pattern as `daily_delta_rate`), and accumulates it for the `TỔNG CỘNG` row the same way `daily_delta_rate` is accumulated.
- `frontend/src/components/f13/BcvhOperationTable.jsx`:
  - `ĐIỀU HÀNH NGÀY` group header `colSpan` 3 → 4.
  - Colgroup rebalanced: Identity unchanged (`5% / 8% / 17%` = 30%), the 7 metric columns (previously 6 at `11.6667%` each) now each `10%` (Lũy kế tháng 3×10% = 30%, Điều hành ngày 4×10% = 40%) — clean round numbers, no wrapping/clipping, satisfies `UI-DATA-TABLE-READABILITY-01`.
  - New leaf header, two-line: "Tăng/giảm so với" / "cùng kỳ (tuần trước)".
  - New `<td>` in both the `TỔNG CỘNG` row and the 6 canonical rows, using the same `renderDeltaBadge()` component as every other delta column (shared arrow/tone convention, no new UI primitive).
  - `min-w-[860px]` → `min-w-[960px]` for the non-fit horizontal-scroll fallback, proportional to one added column.

### 4.4 Explicitly out of scope

- No change to the F1.3 KPI definition, `danh_gia_2026`, or any frozen SSOT document.
- No change to column 9 ("Tăng/Giảm so với ngày trước") semantics.
- No change to sort order (still `daily_rate` DESC, nulls-last, volume tie-break, `ma_bcvh` tie-break) — the new column is display-only, not a sort key.
- No change to any other Dashboard/BCVH Ranking screen.

## 5. Implementation

Implemented directly per the embedded Design of Record above (single additive column, low risk, fully reusing existing query/service/component patterns) — Claude Code, Sonnet 5, branch `codex/da-impl-006`.

### 5.1 Files changed

- `backend/src/repositories/FactBuuGuiRepository.js` — `week_bounds` CTE added to the `daily` aggregate branch.
- `backend/src/services/bcvhOverviewService.js` — `weekAgoDate` resolution, `dailyDates` inclusion, `meta.week_ago_date` (both `_buildMeta()` and `_emptyOverview()`).
- `backend/src/services/bcvhOverviewService.test.js` — 3 new tests (`week_ago_date` from repository rows, date-math fallback, empty-state null) + 1 existing test (`T8/T9`) updated for the now-larger `daily[]` array + repository-contract source assertions extended.
- `backend/src/repositories/FactBuuGuiRepository.overview.test.js` — 1 new assertion (`week_ago_date` present on real SQLite-executed rows).
- `frontend/src/features/dashboard/components/bcvhOperationTableData.js` — `shiftIsoDate()` helper, `weekAgoDate`/`formattedWeekAgoDate`, `daily_week_delta_rate` on rows and `TỔNG CỘNG`.
- `frontend/src/features/dashboard/components/bcvhOperationTableData.test.js` — 1 new unit test (`shiftIsoDate`), 2 new scenario tests (missing week-ago data → dash; date-math fallback), existing fixture/assertions extended with week-ago data and totals; 2 locked-layout tests (colgroup, leaf header count) updated from 9 to 10 columns.
- `frontend/src/components/f13/BcvhOperationTable.jsx` — colgroup, group header `colSpan`, new leaf header, new `TỔNG CỘNG`/row `<td>`.

### 5.2 Validation

- `node --experimental-sqlite --test backend/src/services/bcvhOverviewService.test.js` — `11/11 PASS`.
- `node --experimental-sqlite --test backend/src/repositories/FactBuuGuiRepository.overview.test.js` — `1/1 PASS` (real in-memory SQLite execution of the amended SQL, confirms the added CTE is syntactically and semantically correct).
- `node --experimental-sqlite --test` (full backend sweep) — `397/401 PASS`, the same 4 pre-existing/environmental failures as the project baseline (`live KPI database and HTTP payloads…`, `dashboard KPI invalid code…`, `KPI all and missing ma_bcvh…`, `monthly rank enrichment…` — none reference F1.3/BCVH overview), byte-identical failure set before and after.
- `node --test backend` (default invocation, no `--experimental-sqlite`) — `382/389 PASS`; the additional 3 failures are the known `node:sqlite`-dependent suites requiring the flag (see project memory), not regressions.
- `node --test frontend/src/features/dashboard/components/bcvhOperationTableData.test.js` — `17/17 PASS`.
- `node --test frontend/src/features/dashboard/components/*.test.js` (full directory) — `134/134 PASS` (unchanged total from the predecessor ticket's baseline, since this ticket's new tests live in the same suite already counted).
- `npx oxlint` on all 7 touched files — `0 errors` (7 pre-existing, unrelated `no-unused-vars` warnings on lines this ticket did not touch).
- `npx vite build` — clean, `1.22s`, no new warnings besides the pre-existing chunk-size notice.
- No Browser/Playwright used. No schema, index, KPI, or SSOT change. No production data touched (code-only change).

### 5.3 Residual / not done at implementation time

- No desktop/phone screenshot evidence was produced by Claude Code (no Browser/Playwright per instruction); the Product Owner performed their own UI inspection directly — see Section 7 for the resulting PASS and closure.
- State at the end of implementation: `IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK`, superseded by Section 7.

## 6. PO UI Check checklist

1. Open the Operation Dashboard BCVH table (`BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH`).
2. Confirm the `ĐIỀU HÀNH NGÀY` group now spans 4 columns with the new "Tăng/giảm so với cùng kỳ (tuần trước)" header as the last column, 2-line wording, no wrapping/clipping/overlap on desktop and mobile Fit mode.
3. Confirm the value compares the anchor date (already N-1, e.g. "NGÀY 21/09/2026" if today is 22/09) against the same weekday 7 days earlier, with the same ↑/↓/→/— arrow-and-tone convention as every other delta column.
4. Confirm column 9 ("Tăng/Giảm so với ngày trước") is unchanged in position and value.
5. Confirm `TỔNG CỘNG` row's new column is consistent with the 6 unit rows (aggregate, not an average of rates).

## 7. Product Owner UI Check — PASS / Closure (2026-09-22)

Product Owner instruction received in chat: explicit confirmation that the Product Owner personally checked the Operation Dashboard BCVH table UI against the Section 6 checklist and it **PASSED** ("PO đã trực tiếp kiểm tra giao diện và xác nhận PASS cho ticket F13-BCVH-DAILY-SAMEWEEKDAY-01").

- **Accepted implementation commit:** `f4a06ea` (Claude Code, Sonnet 5, branch `codex/da-impl-006`) — see Section 5.1 for the full file list.
- **Technical validation basis for closure** (unchanged from Section 5.2, re-stated here as the closure record):
  - `node --experimental-sqlite --test backend/src/services/bcvhOverviewService.test.js` — `11/11 PASS`.
  - `node --experimental-sqlite --test backend/src/repositories/FactBuuGuiRepository.overview.test.js` — `1/1 PASS`.
  - Full backend sweep `node --experimental-sqlite --test` — `397/401 PASS`, same 4 pre-existing/environmental failures as project baseline, none F1.3-related.
  - `node --test frontend/src/features/dashboard/components/bcvhOperationTableData.test.js` — `17/17 PASS`; full dashboard component directory — `134/134 PASS`.
  - `npx oxlint` — `0 errors` on all 7 touched files; `npx vite build` — clean.
- **PO scope confirmed accepted:** the 10-column `ĐIỀU HÀNH NGÀY` layout (4 columns, no wrapping/clipping/overlap on desktop and mobile Fit mode), the new "Tăng/giảm so với cùng kỳ (tuần trước)" column comparing the anchor date against the same calendar weekday 7 days earlier, column 9 ("Tăng/Giảm so với ngày trước") unchanged, and the `TỔNG CỘNG` row consistent with the 6 unit rows.
- Governance closure only — no product code changed in this closure step, no Browser/Playwright used.

**Final state: `IMPLEMENTED / PO UI PASS / CLOSED`.** No further work is authorized under this ticket; any later change requires a new ticket or explicit reopening. Does not affect `F13-ROUTE-POSTMAN-IDENTITY-01` (Current Ticket, unaffected) or any other ticket.
