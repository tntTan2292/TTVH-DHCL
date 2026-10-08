# F41-DASHBOARD-RANKING-01 — T8 Independent Review (Claude Code / Opus) — Executor Prompt

You are **Claude Code (Opus)**, the independent reviewer required by `DEC-021`. You did not write this code; the implementer was Claude Code (Sonnet 5.5). Your job is to find defects, not to confirm. Work in `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, branch `codex/da-impl-006`.

## 0. Read first (in this order, nothing else is required)

1. `CLAUDE.md` (auto-loaded) and `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` (Current Ticket = `F41-DASHBOARD-RANKING-01`).
2. `docs/10_TICKETS/F41-DASHBOARD-RANKING-01_MANIFEST.md` (Sections 4, 7, 8, 9).
3. `docs/04_TECHNICAL_PLANNING/Feature/F41-DASHBOARD-RANKING-01_DESIGN_OF_RECORD.md` (Sections 1-2 principles and locked rules, 4 backend, 5 national rank, 11 as built).
4. Only if a rule is in doubt: `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` Sections 3, 8, 9 (PO-1..PO-10, DC-1..DC-11).

## 1. What is under review (frozen range)

Review exactly the diff `d09303f..e90e2f4` on top of `53667e9` (use `git diff 53667e9..e90e2f4 --stat`), in particular:

| Commit | Content |
| --- | --- |
| `d3a0479` + `d418656` | **T1/T2 backend.** `FactF41Repository.js` (new queries), `F41NationalRankService.js`, `F41RankingService.js`, `F41RankingController.js`, `f41Routes.js`, tests, `backend/test_f41RankingReconciliation.js` |
| `e115c09` | **T3 frontend.** `frontend/src/features/indicator/*` (new), `api/client.js`, `f13HeatmapBandCatalog.js`, `DashboardPage.jsx`, `BcvhRankingPage.jsx`, `UnifiedBcvhAnalysisTable.jsx`, `unifiedBcvhAnalysisTableData.js`, `BcvhRankingOverviewBlocks.jsx`, `BcvhWeeklyComparisonBlock.jsx`, `BcvhOperationTable.jsx`, `bcvhOperationTableData.js` |
| `d09303f`, `917eb48`, `e90e2f4` | T0 and documentation |

Out of scope for this review: T4/T5 pages (not written), Import, networkMap files, the pre-existing failing test `frontend/src/pages/dataImportBackfillQueue.test.js`, and the other uncommitted files in the working tree.

## 2. Hard constraints

- **Review only.** Do not change product code, tests, schema or data. If you find a defect, report it; do not fix it. The only files you may create/edit are the review document (Section 5) and one status line in the manifest's T8 row.
- **Do not restart the backend or touch the running server** (a backend started by Claude Code is running on port 5050 and the Product Owner is importing data). Do not write to `backend/src/db/database.sqlite`. Read-only access is allowed; if you want to run `node backend/test_f41RankingReconciliation.js` (read-only, ~10 s), do it **once**, and say so in the report. Prefer the temporary-database unit tests.
- Another AI session shares this working tree and has uncommitted edits (networkMap files, root `*.patch`, `export_*.js`, `exports/`, `tmp_check_*`). Do not touch, stage or revert them. Commit only your own files, by explicit pathspec.
- Never self-award PO PASS. Never use `--force`, never skip hooks.
- Backend tests need `node --experimental-sqlite --test`. Root `backend/test_*.js` files are run per file.
- Use LEVEL 3 validation (this ticket touches closed F1.3 frontend code). Run commands for real and quote their output; do not accept the implementer's numbers.

## 3. What to verify (each item: PASS / FINDING with evidence)

### Backend (T1/T2)
1. **SQL parity with the F1.3 twins.** Compare every new method in `FactF41Repository.js` with its `FactBuuGuiRepository.js` twin (`getBcvhOverviewMonthly/Daily/Mtd`, `getBcvhWeeksList`, `getBcvhMonthsList`, `getBcvhWeeklyTrendAggregate`, `getBcvhWeeklyComparisonAggregate`, `getDailyTrendData`, `getBcvhOperationMetricsBetween`): same row shape, same date logic (Thursday-Wednesday weeks, anchor/prev/week-ago dates, previous-month windows), only the table/column names and the F4.1 semantics differ.
2. **The GROUP BY alias trap.** `fact_f41` has no real `ma_bcvh`; verify every `GROUP BY` names a real column and no alias can resolve to a different column (a past defect, `F13-ROUTE-POSTMAN-IDENTITY-01` B1, was exactly this).
3. **F4.1 semantics.** Volume = `COUNT(*)` (all rows, blank evaluations stay in the denominator); passed = `danh_gia_co_tms_ptc_8h = 'Đạt'`; **PO decision 2026-10-08: "Không đạt" in the F4.1 views = volume − passed (blank counts as not passed)**; only the 6 canonical BCVH in ranking/overview/weekly/monthly, whole table in `summary`/`daily-trend` (PO-2, PO-6, DC-6, DC-7). The metric column is **Excel column AN** = `Đánh giá (thời gian Có TMS PTC 8 giờ)`; confirm `f41HueExcelParser.js` maps that header and nothing else to `danh_gia_co_tms_ptc_8h`.
4. **National rank** (`F41NationalRankService.js`, Design of Record Section 5): rate = `SUM(sl_ptc_8h_co_tms)/SUM(sl_ptc_nop_tien_ch)`, tie-break volume then unit code, province from `system_config.default_province_code` (default `53`), `tl_*` text columns never used, result shape accepted by the reused F1.3 services, failures degrade to `null`/unavailable, never throw.
5. **Reuse boundary.** `git diff 53667e9..e90e2f4 --name-only` must show **no** edit to `F13DashboardService.js`, `FactBuuGuiRepository.js`, `DashboardController.js`, `f13Routes.js`, `bcvhOverviewService.js`, `bcvhWeeklyComparisonService.js`, `timelineService.js`, or `server.js`. Any difference is a finding.
6. **API contract and safety.** `F41RankingController.js` / `f41Routes.js`: every route behind `requireAuth` + `requireRole(['admin','viewer'])`; GET only; date validation (shape and calendar validity) and `from_date <= to_date`; invalid BCVH → 400; SQL fully parameter-bound (look for string interpolation of request input — the `IN (${placeholders})` lists must contain only `?`); `no-store` headers; error codes/status mapping; the three pre-existing endpoints (`/dashboard/kpi`, `/meta`, `/bcvh-reconciliation`) unchanged in behaviour.
7. **Ranking and summary logic** (`F41RankingService.js`): ranks (competition ranking), D-1/D-7 deltas and `comparisons`, month-to-date and previous-month windows (clamp to month end), `TỔNG CỘNG` = sum of volumes then rate, `summary.total_failed = total − passed` with `total_unknown = 0`, `total_blank`, pagination, empty-data days.
8. **Performance.** Run `EXPLAIN QUERY PLAN` (read-only, on a copy/temporary database or the live one without writing) for the daily/monthly/mtd queries; note any `date(ngay_do_kiem)` expression that defeats `idx_f41_date_bcvh_eval`. Measured timings by the implementer: overview ~2.5 s, weekly-trend ~1.1 s on ~450k rows; judge whether that is acceptable and whether a no-schema-change improvement exists. Do not add an index (schema change is out of scope).
9. **Tests are real.** `node --experimental-sqlite --test` over `F41RankingService.test.js`, `F41RankingController.test.js`, `f41Routes.test.js`, `F41DashboardService.test.js`, `F41DashboardController.test.js`, `FactF41Repository.test.js` (expected 43/43). Then the full backend sweep; compare failures **by name** with the baseline recorded in the manifest/snapshot (4 known pre-existing failures: 3 need a running server, 1 is `F13-DASHBOARD-RECOVERY-DEFECTS-01`). Mutation-test at least two assertions mentally or by temporary local edit that you revert immediately (for example flip Đạt/Không đạt) to prove the tests would catch it — leave no edit behind.

### Frontend (T3)
10. **F1.3 unchanged by default.** Run `cd frontend && node --test $(find src -name "*.test.js")` (expected 592/593, the one failure being `dataImportBackfillQueue.test.js`, pre-existing) and `npx vite build`, `npx oxlint`. Confirm **no existing test file was edited** (`git diff 53667e9..e90e2f4 --name-only -- '*.test.js'` should list only new test files).
11. **Module-level active-indicator state** (`activeIndicator.js`, `IndicatorContext.js`) — the deliberate design. Try to break it: StrictMode double render, route change F1.3 → F4.1 → F1.3 (provider unmount/mount ordering), a F1.3 page mounted without a provider after an F4.1 page, concurrent mounts, recharts callbacks, SSR/test environments. Report any path where F1.3 could read F4.1 settings or the reverse.
12. **URL rewrite in `api/client.js`** (`rewriteIndicatorUrl`): correct with `baseURL`, query strings, `params` objects (not only inline query), non-string URLs, absolute URLs, and only the ten shared report endpoints; `/f13/dashboard/kpi` → `/f41/dashboard/summary` for F4.1 only.
13. **Leakage of F1.3-only content into F4.1.** Grep the shared components that F4.1 pages will render (`DashboardPage`, `UnifiedCommandSummary`, `IntegratedTrendRiskWorkspace`, `BcvhOperationTable`, `BcvhWeeklyComparisonBlock`, `BcvhWeeklyTrendBlock`, the weekly/monthly combo charts, `BcvhRankingOverviewBlocks`, `UnifiedBcvhAnalysisTable`) for: hard-coded `70/60/50` thresholds, "F1.3", "KPI 2026", "Chậm nộp tiền", route/tuyến wording or links to `/f13/...`, `Mục tiêu` (target stays 90 for both, PO decision). List every remaining leak with file:line; decide which are blockers for T4/T5.
14. **Payload compatibility.** Confirm the F1.3 mappers accept the real F4.1 payloads (`mapBcvhRankingResponse`, `processOverviewData`, `UnifiedCommandSummary` fed by `/dashboard/summary`, the daily-trend normalizer). Compare the F4.1 `summary` shape with what `UnifiedCommandSummary` / `dashboardKpiCards.js` read.
15. **Feature flags** (`routes`, `lateCash`, `operatingPattern`, `actionCenter`) hide complete blocks without leaving empty columns/headers or a wrong `colSpan`.

### Governance
16. Snapshot / Manifest / Design of Record / Progress / Document Index are mutually consistent; no governance rule broken (one ticket one commit, commits by pathspec, no PO PASS claimed).

## 4. Severity

`BLOCKER` = wrong numbers, F1.3 regression, security/auth flaw, data write, or a leak that would put wrong content in front of the PO. `NON-BLOCKING` = quality, test gap, wording, performance that is acceptable. Verify each finding yourself with a reproduction before you list it; drop anything you cannot reproduce.

## 5. Deliverable

1. Create `docs/06_REVIEWS/Shared/F41-DASHBOARD-RANKING-01_REVIEW_001.md`: verdict `INDEPENDENT REVIEW PASS` / `PASS WITH NON-BLOCKING FINDINGS` / `FAIL`; one table row per item of Section 3 (PASS or finding id `T8-F41-B1..` / `T8-F41-NB1..`), the exact commands you ran with real output summaries, files reviewed, and what you did not review.
2. Update only the **T8 row** of the table in `docs/10_TICKETS/F41-DASHBOARD-RANKING-01_MANIFEST.md` Section 4 with the verdict and a link to the review file. Do not edit the Snapshot (the coordinator syncs it).
3. Register the review file in `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` (one row), commit by explicit pathspec (those three files), push to `origin/codex/da-impl-006`.
4. Final message to the coordinator = a short **Technical Execution Report**: verdict; BLOCKER list with file:line and reproduction; NON-BLOCKING list; the commands you ran with real results; anything you could not verify; whether T4/T5 (Antigravity) may start. No `Phân tích kết quả` / `Phương án` / prompts for other executors.
