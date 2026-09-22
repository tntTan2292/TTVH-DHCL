# F13-BCVH-WEEKLY-COMPARISON-01 — So sánh chất lượng theo tuần (BCVH Ranking)

`IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK` (2026-09-22).

## 1. Ticket Information

- Ticket ID: `F13-BCVH-WEEKLY-COMPARISON-01`
- Ticket Name: `BCVH Ranking — bảng điều hành so sánh chất lượng hàng tuần`
- Phase: `Implementation (Backend + Frontend, single delta)`
- Executor: `Claude Code (Sonnet 5)`
- Branch: `codex/da-impl-006`
- Governance Version: `V2 Active`
- Activation authority: Product Owner instruction received in chat, 2026-09-22, requesting a new business requirement (weekly comparison table in BCVH Ranking) following a prior read-only audit of the module, then a second chat message chotting the custom Thu-Wed week definition and authorizing full implementation.
- Does not reopen `F13-BCVH-RANKING-OVERVIEW-01` (`CLOSED / PO PASS`, 2026-08-28) or any other closed ticket. Does not affect `F13-ROUTE-POSTMAN-IDENTITY-01` (Current Ticket, unaffected).

## 2. Product Owner Authorization — received in chat, 2026-09-22

Business requirement (first message): add a weekly quality-comparison table to BCVH Ranking — list every week that has data, let the user pick a "current" week and a "compare" week, compare the 6 currently-displayed BCVH between them.

Week convention (second message, after an audit found the PO's own examples did not match ISO 8601 Mon-Sun weeks):

- Tuần bắt đầu **Thứ Năm**, kết thúc **Thứ Tư**.
- Tuần 36 = `03/09–09/09/2026`, Tuần 37 = `10/09–16/09/2026`, Tuần 38 = `17/09–23/09/2026`.
- Nếu tuần hiện tại mới có dữ liệu đến `21/09` → hiển thị `17/09–21/09/2026` + ghi chú `Dữ liệu đến ngày 21/09/2026`; khi có thêm dữ liệu ngày 22/23, phạm vi tự cập nhật.
- Dòng `TỔNG CỘNG` = tổng sản lượng/tổng số đạt, không lấy trung bình tỷ lệ.
- Chênh lệch hiển thị theo chênh lệch tuyệt đối (điểm %), như các bảng hiện có.
- Cho phép chọn bất kỳ hai tuần nào trong danh sách.
- Không gộp vào endpoint `/overview`; luồng riêng. Không thêm schema/index nếu chưa đo và chứng minh cần thiết. Giữ nguyên KPI/SSOT, các khối hiện có, các ticket đã đóng.

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-WEEKLY-COMPARISON-01_DESIGN.md` (this ticket's Design of Record — week-boundary math, endpoint contracts, performance measurements)
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-RANKING-OVERVIEW-01_DESIGN.md` (the closed ticket whose conventions this one reuses — denominator definition, absolute percentage-point delta convention, "no alert/warning/risk key" rule)
- `frontend/src/features/ranking/BcvhRankingPage.jsx`, `backend/src/services/bcvhOverviewService.js`, `backend/src/repositories/FactBuuGuiRepository.js` — the existing module this ticket adds to.

## 4. Design of Record

Embedded in a dedicated document (not inline here) because the week-boundary math is the ticket's
central decision and needs worked examples: `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-WEEKLY-COMPARISON-01_DESIGN.md`.

Summary: two new endpoints under the existing `f13Routes.js` (`GET /ranking/bcvh/weeks`,
`GET /ranking/bcvh/weekly-comparison`), a new `bcvhWeeklyComparisonService.js` implementing the
Thursday-start/ISO-numbered week math and the display-truncation rule (never claim data the system
does not have), two new `FactBuuGuiRepository.js` query methods, and a self-contained frontend block
with its own fetch flow, inserted into `BcvhRankingPage.jsx` without touching any existing block.

## 5. Implementation

### 5.1 Files changed

**Backend (modified):**

- `backend/src/repositories/FactBuuGuiRepository.js` — 2 new methods appended after the existing `_getBcvhOverviewAggregate` (`getBcvhWeeksList`, `getBcvhWeeklyComparisonAggregate`); no existing method touched.
- `backend/src/controllers/DashboardController.js` — import + instance of `BcvhWeeklyComparisonService`, 2 new handlers (`getBcvhWeeks`, `getBcvhWeeklyComparison`).
- `backend/src/routes/f13Routes.js` — 2 new `router.get` lines under `allowViewerRead`, next to the existing `/ranking/bcvh/overview` line.

**Backend (new):**

- `backend/src/services/bcvhWeeklyComparisonService.js` — week math (`customWeekStart`, `weekIdFromDate`, `weekBoundsForWeekId`, ISO 8601 numbering algorithm applied to the custom week's Thursday), `listWeeks()`, `compareWeeks()`.
- `backend/src/services/bcvhWeeklyComparisonService.test.js` — 13 tests.
- `backend/src/repositories/FactBuuGuiRepository.weeklyComparison.test.js` — 2 tests, real in-memory SQLite execution of both new SQL methods.

**Frontend (modified):**

- `frontend/src/features/ranking/BcvhRankingPage.jsx` — 1 import + `<BcvhWeeklyComparisonBlock />` inserted after the existing 4 Overview blocks; no existing line inside the `useEffect`/khối 5/`KPICard` region touched.

**Frontend (new):**

- `frontend/src/features/ranking/BcvhWeeklyComparisonBlock.jsx` — self-contained component (own state, own fetch effects, own loading/error/empty rendering).
- `frontend/src/features/ranking/bcvhWeeklyComparisonFetcher.js` — 2 independent fetchers (weeks list, comparison), same race-condition-safe pattern as `bcvhOverviewFetcher.js` but a separate request flow.
- `frontend/src/features/ranking/bcvhWeeklyComparisonData.js` — pure mapper/formatter helpers.
- `frontend/src/features/ranking/bcvhWeeklyComparisonData.test.js` — 8 tests.
- `frontend/src/features/ranking/bcvhWeeklyComparisonFetcher.test.js` — 5 tests.

**Not touched:** `bcvhOverviewService.js`, `bcvhOverviewData.js`, `bcvhOverviewFetcher.js`, `BcvhRankingOverviewBlocks.jsx`, `getBcvhRanking()`, any schema/migration file, any frozen SSOT document.

### 5.2 Validation

- New backend tests: `node --experimental-sqlite --test backend/src/services/bcvhWeeklyComparisonService.test.js` — **13/13 PASS**; `node --experimental-sqlite --test backend/src/repositories/FactBuuGuiRepository.weeklyComparison.test.js` — **2/2 PASS** (real SQLite execution of both new queries, including a deliberately-null `ma_bg` row to prove `COUNT(ma_bg)` semantics and a week not requested to prove no cross-bucket leakage).
- New frontend tests: `node --test frontend/src/features/ranking/bcvhWeeklyComparisonData.test.js` — **8/8 PASS**; `node --test frontend/src/features/ranking/bcvhWeeklyComparisonFetcher.test.js` — **5/5 PASS**.
- Mandatory regression (Design of Record `F13-BCVH-RANKING-OVERVIEW-01` §8.2, still required): `bcvhOverviewService.test.js` **21/21 PASS**; `FactBuuGuiRepository.overview.test.js` (included in the 21); `DashboardController.dateFilterRemediation.test.js` — all green; `BcvhRankingPage.singleDayContract.test.js` + `BcvhRankingPage.defaultDate.test.js` + `bcvhOverviewData.test.js` — **12/12 PASS**, including the source-contract test that scans `BcvhRankingPage.jsx` for the protected khối-5 region.
- Full backend sweep: `node --experimental-sqlite --test` over all `backend/src/**/*.test.js` — **364 tests, 360 PASS, 4 FAIL**, the same 4 pre-existing/environmental failures as project baseline (`live KPI database and HTTP payloads…`, `dashboard KPI invalid code…`, `KPI all and missing ma_bcvh…`, `monthly rank enrichment…` — none F1.3/BCVH-ranking-related), byte-identical failure set before and after this change.
- Full frontend sweep: `node --test` over all `frontend/src/**/*.test.js` — **536 tests, 534 PASS, 2 FAIL**; both failures are in `networkMap`/`dataImportBackfillQueue` suites, pre-existing in the working tree before this ticket started (unrelated, uncommitted work from another in-progress task — see git status at session start), not touched by this ticket.
- Real-database performance (live `backend/src/db/database.sqlite`): `listWeeks()` **~690 ms** (38 weeks with data), `compareWeeks()` **~1.0 s** for two weeks ~9 months apart — no new index added, matches `RISK-PERF-02` in the Design of Record.
- Real-database correctness check against the PO's exact scenario: `weekIdFromDate('2026-09-03'|'09'|'10'|'16'|'17'|'21'|'23')` all resolve to the labeled `2026-W36`/`2026-W37`/`2026-W38` boundaries; the live database's actual `2026-W38` row (data currently ends `2026-09-21`) returns `display_end_date: '2026-09-21'`, `is_in_progress: true`, `data_through_note: '2026-09-21'` — matches the PO's exact worked example.
- `npx oxlint` on all touched/new frontend files — **0 errors, 0 warnings** (1 pre-existing unrelated `no-unused-vars` warning on `BcvhRankingPage.jsx` line 10, confirmed present at `HEAD` before this ticket, not introduced by it). Full-project `npx oxlint` — 0 errors; only pre-existing warnings in files this ticket did not touch.
- `npx vite build` — clean, `1.91s`, no new warnings.
- No Browser/Playwright used, per instruction. No schema, index, KPI, or SSOT change. No production data written (read-only queries only).

### 5.3 Residual / not done at implementation time

- No desktop/phone screenshot evidence was produced (no Browser/Playwright per instruction). PO UI verification is still required — see Section 6.
- `RISK-PERF-02` (Design of Record §6): `getBcvhWeeksList()` scans the full `fact_f13` table by `ma_bcvh` with no year bound; acceptable today (~690 ms, 38 weeks) but will grow linearly with accumulated years of data. No index added pre-emptively, per PO instruction to only add one once measured and proven necessary.
- `RISK-SCOPE-02`: the Thursday-start week definition is local to this feature only; it does not change or alias any other "week" concept elsewhere in the system (D-7 same-weekday comparison in Operation Dashboard, or a future ISO-standard week if one is ever added).

## 6. PO UI Check checklist

1. Open BCVH Ranking (`/f13/ranking/bcvh`), scroll to the new "So sánh chất lượng theo tuần" block below the existing 4 Overview blocks.
2. Confirm the week dropdown lists every week that has data, labeled `Tuần N: dd/mm/yyyy–dd/mm/yyyy`, and that Tuần 36/37/38 (2026) show exactly `03/09–09/09`, `10/09–16/09`, `17/09–23/09`.
3. Confirm the currently in-progress week (if any) shows a truncated range and the note "Dữ liệu đến ngày <ngày thật>", not the planned Wednesday.
4. Pick two arbitrary non-adjacent weeks (e.g. Tuần 1 vs Tuần 38) and confirm the comparison loads for both.
5. Confirm the table shows sản lượng/đạt/tỷ lệ for both weeks per BCVH, plus a signed delta column in điểm % (not a ratio), and that `TỔNG CỘNG` is consistent with summing the 6 rows (not averaging their rates).
6. Confirm the existing khối 5 (bảng xếp hạng ngày) and the 4 Overview blocks above are visually and functionally unchanged.
7. Confirm no text on this block uses the words "cảnh báo"/"alert"/"rủi ro".

`PO UI Check Required = Yes`. Claude Code stops at `READY FOR PO UI CHECK` — this ticket does not self-award PO PASS.
