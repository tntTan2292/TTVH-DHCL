# F41-DASHBOARD-RANKING-01 — Independent Review 001 (T8)

**Reviewer:** Claude Code (Opus 5.5), independent of the implementer (Sonnet 5.5). **Date:** 2026-10-08.
**Range:** `53667e9..e90e2f4` (T0–T3). Later commits `da830d5..718d87f` are docs-only and were not reviewed.

## Verdict: FAIL (1 BLOCKER, frontend T3) — backend T1/T2 PASS WITH NON-BLOCKING FINDINGS

The backend is correct and was reproduced independently against the live database. The blocker is in the T3 frontend design: the module-level active indicator is set during render. It must be fixed before T4/T5 mount `IndicatorProvider` (no page mounts it today, so F1.3 is not affected yet).

## Findings

| ID | Severity | Where | Finding and reproduction |
| --- | --- | --- | --- |
| T8-F41-B1 | BLOCKER (F1.3 regression path) | `frontend/src/features/indicator/IndicatorContext.js:37`, `api/client.js` interceptor, `f13HeatmapBandCatalog.js:54` | `IndicatorProvider` calls `setActiveIndicator()` during render. React clears it only in an effect cleanup, which runs only for committed renders. A render that never commits leaves F4.1 active permanently. React Router 7.18 wraps every navigation in `React.startTransition` (`chunk-YL5M26XI.js:293`), so an interrupted or superseded navigation, an error boundary or SSR all leave it set. After that, every F1.3 page with no provider has its requests rewritten to `/f41` and is coloured with the 80/70/60 bands. Reproduction (`renderToString` of the provider, no commit): active = `f41`; `rewriteIndicatorUrl('/f13/ranking/bcvh/overview')` → `/f41/ranking/bcvh/overview`; `classifyF13HeatmapRate(75)` → `pink` (F1.3 rule: green). Secondary path: on F4.1 → F1.3 navigation, the F1.3 page's first render reads `f41`, because the F4.1 cleanup runs after the new tree renders. This one self-heals after the first fetch. Suggested fix (Claude Code): do not mutate module state in render. Pass the indicator explicitly, e.g. through context, a fetcher argument or a closure for the recharts callbacks, or give every report route an explicit provider plus `key={indicator.id}`. Add a test for a render that is discarded. |
| T8-F41-NB1 | NON-BLOCKING (UI leak, already in T4/T5 scope) | `BcvhOperationTable.jsx:306,330`; `BcvhWeeklyComparisonBlock.jsx:782,787`; `BcvhWeeklyTrendBlock.jsx:62,112`; `BcvhRankingOverviewBlocks.jsx:58,115`; `BcvhWeeklyComboTrendChart.jsx:142`; `BcvhMonthlyComboTrendChart.jsx:135,256` | These shared blocks render on F4.1 pages and still show "KPI 2026" / "Mục tiêu KPI 2026". That is wrong content for the PO, but the T4/T5 prompt (§3, §60, §88) already makes this sweep a condition of acceptance. It must be fixed before G2/G3. |
| T8-F41-NB2 | NON-BLOCKING (UI leak, T4/T5 scope) | `unifiedBcvhAnalysisTableData.js:116-123`, rendered at `UnifiedBcvhAnalysisTable.jsx:311` | The expanded-row analysis text on F4.1 contains late-cash and route content that F4.1 does not have. Output for a real F4.1 row: `… · Chậm nộp tiền Chưa có dữ liệu BG (Chưa có dữ liệu) · Tuyến tham gia 0: tốt 0, khá 0, trung bình 0, kém 0 · …`. Must be fixed before G3. |
| T8-F41-NB3 | NON-BLOCKING | `F41RankingService.js:85-101` (`rankRows`) | Units are sorted by the rate rounded to 1 decimal, then by volume. The F1.3 SQL `RANK()` and the reused overview service (4 decimals) use the exact ratio. Reproduction: A 6844/10000 = 68.44 %, B 13672/20000 = 68.36 % → F4.1 ranks B #1 and A #2 (F1.3 would rank A #1), and the Operation Dashboard and Ranking tables would disagree. The code comment claims "matching F1.3's SQL RANK()". It happens only on near-ties; no live day was affected (2026-08-01 ranks are correct). |
| T8-F41-NB4 | NON-BLOCKING | `F41RankingService.js:203-209` | `getSummary` awaits `getNationalRankSummary` with no guard. Reproduction: a national-rank service that throws → `summary` rejects (HTTP 500). `getBcvhRanking` already degrades to `null`. DoR §4.3 says "never an error". F1.3 `/dashboard/kpi` behaves the same way (parity). |
| T8-F41-NB5 | NON-BLOCKING (tests) | `F41RankingService.test.js`, `f41ContractParity.test.js` | Mutation runs (monkey-patching SQL, no repo edit): flip Đạt / strict Không đạt / Monday weeks / COUNT(non-blank) / national ASC → each caught by at least one test. But the daily-trend `failed` and the overview monthly `failed` are never asserted (the strict-failed mutation survives test 7). The parity fixture still uses the pre-decision strict values (539 / 1581). |
| T8-F41-NB6 | NON-BLOCKING (pre-existing) | `UnifiedBcvhAnalysisTable.jsx:388` | The expanded-row `colSpan` base is 18, but a row has 20 fixed cells. This was already wrong in F1.3. F4.1 inherits it: 9 vs 11. |
| T8-F41-NB7 | NON-BLOCKING (docs) | Manifest status line, §7 and T1 row; `FactF41Repository.js:198` comment | The manifest still says "G1 pending", which §9 and the Snapshot contradict. The repository header comment says failed = `'Không đạt'`, which the PO decision below it contradicts. The baseline wording "3 server + 1 recovery" does not match what I observed (2 failures, both in the registered `F13-DASHBOARD-RECOVERY-DEFECTS-01`). |

## Checklist (prompt Section 3)

| # | Item | Result |
| --- | --- | --- |
| 1 | SQL parity with F1.3 twins | PASS. Same CTEs, dates, Thu–Wed weeks and previous-month clamp. Only the table/column names and the F4.1 semantics differ. `COUNT(*)` ≡ `COUNT(ma_bg)` because `ma_bg` is NOT NULL. |
| 2 | GROUP BY alias trap | PASS. `fact_f41` has no `ma_bcvh` / `week_start` / `month_start` / `date` column (PRAGMA checked); GROUP BY names `ma_bc_phat`. |
| 3 | F4.1 semantics, column AN | PASS. Live 2026-08-01: 4.695 / 2.863 / KĐ 1.832 / blank 251; evaluation values are only Đạt / Không đạt / NULL. The parser maps exactly one header to `danh_gia_co_tms_ptc_8h`, which is position 40 = AN. |
| 4 | National rank | PASS (NB4). Independent re-rank: Huế 15/34, 2.863 / 4.684 = 61,12 %. |
| 5 | Reuse boundary | PASS. 0 forbidden files in the diff. |
| 6 | API contract and safety | PASS. All 9 routes are GET behind `requireAuth` + `requireRole(['admin','viewer'])`; placeholders are `?` only; no-store; 400/500 mapping as F1.3. |
| 7 | Ranking / summary logic | PASS (NB3). TỔNG CỘNG 2.862 / 4.694; trend Σ 01–05/08 = 20.979 = range summary. |
| 8 | Performance | PASS. EXPLAIN on live (read-only): monthly 558 ms, daily 289 ms, mtd 199 ms, weekly-trend 718–811 ms, daily-trend 32 ms. Forcing the covering index (`+ma_bc_phat`) saves at most ~15 %; no change recommended. |
| 9 | Tests real | PASS (NB5). 43/43. Backend sweep 443/445 (see commands). |
| 10 | F1.3 unchanged by default | PASS. Frontend 592/593 (only the failure in `dataImportBackfillQueue.test.js`); build clean; oxlint exit 0; no existing frontend test edited. Two backend F4.1 test files received additions only. |
| 11 | Module-level indicator state | **FAIL → B1** |
| 12 | URL rewrite | PASS. Path-only rewrite; `params` and query are preserved; `/f13/dashboard/kpi` → `/f41/dashboard/summary`; non-shared, absolute and non-string URLs pass through. |
| 13 | Leakage | NB1, NB2 (T4/T5 scope). Route, late-cash, operating-pattern and action-center blocks are gated correctly. |
| 14 | Payload compatibility | PASS. Summary has `total_failed = total − passed` and `total_unknown = 0`, so the composition matches; daily-trend has the same item fields; ranking and overview mappers were checked. |
| 15 | Feature flags / colSpan | PASS for the flag deltas (−2 / −7); NB6 is pre-existing. |
| 16 | Governance | PASS with NB7. Commits are by pathspec; no PO PASS claimed. |

## Commands run (real results)

- `node --experimental-sqlite --test` on the 6 F4.1 test files → 43 pass / 0 fail.
- Backend sweep: every `*.test.js` except the 2 `*integration.test.js` files, which log in to the live server on 5050 and were not run so the PO's server was not touched → 445 tests, 443 pass, 2 fail. The failures are `DashboardController.recovery.test.js` and `timelineService.recovery.test.js`, both in `F13-DASHBOARD-RECOVERY-DEFECTS-01`. Neither file changed in the range.
- Mutation runner (scratchpad monkey-patch, no repo edit): see NB5.
- Live database, `OPEN_READONLY` only: service vs raw SQL reconciliation for 2026-08-01, EXPLAIN plus timings. `test_f41RankingReconciliation.js` was **not** run.
- `node --test $(find src -name "*.test.js")` (frontend) → 593 / 592 / 1. `vite build` (output to the scratchpad) → built. `oxlint` on the touched front and back files → exit 0, warnings only in untouched files.
- Repro scripts for B1, NB2, NB3, NB4 (scratchpad); output quoted above.

## Not reviewed

T4/T5 pages (not written), browser runtime, the authenticated live HTTP API, and the docs-only commits after `e90e2f4`.

## Gate

T4/T5 must not mount `IndicatorProvider` until B1 is fixed (Claude Code, a small foundation change). NB1/NB2 are already in the T4/T5 leak-sweep scope and must be clear before G2/G3. Backend T1/T2 needs no change for T4/T5.

## Round 2 (2026-10-08, Claude Code / Opus 5.5)

**Scope:** commits `2a8a574`, `4acec97`, `f264608`, `9ac813e` (after `0dd5a65`). Review only. No product-code edits, the live database was not opened, and the running backend was not touched.

### Verdict: B1 CLOSED — round 2 FAIL (narrow) on one new F4.1-only BLOCKER, T8-F41-B2; T4/T5 may start

| ID | Result | Evidence |
| --- | --- | --- |
| T8-F41-B1 | **CLOSED** | `activeIndicator.js` is deleted. `grep getActiveIndicator\|setActiveIndicator\|resolveIndicator` finds nothing outside unrelated `AutoBackfill*` code, and the indicator modules have no `let`/`var`. `IndicatorProvider` only returns `Context.Provider`. `api/client.js` is byte-identical to `53667e9` (diff 0 lines), so the global interceptor is gone. `useIndicatorApi()` returns the shared client itself for F1.3; for F4.1 it returns a frozen wrapper, cached per indicator id, which stores no request state. My probe (`renderToString`, axios adapter stubbed, no network) ran in order: (1) a discarded F4.1 provider render → `/f41/...`; (2) a provider-less F1.3 page right after → `f13:base`, `/f13/...`; (3) StrictMode F4.1 → wrapped `/f41`; (4) StrictMode F1.3 → base `/f13`; (5) F1.3 provider nested inside F4.1 → `f13:base`; (6) F1.3 again → `/f13`. After all renders, `classifyF13HeatmapRate(75)` = `band-green` (F1.3). F4.1 → F1.3 → F4.1 is therefore order-independent: there is nothing left to clear. The recharts dots and tooltip are rendered as elements and read `useIndicator()` themselves. |
| F1.3 unchanged | **PASS** | Frontend `node --test $(find src -name "*.test.js")` → 594 tests, 593 pass. The only failure is `src/pages/dataImportBackfillQueue.test.js`, which already failed before this ticket. `vite build` succeeds; `oxlint` exits 0. In `53667e9..9ac813e`, the only frontend `*.test.js` files are the two this ticket added (`indicatorConfig.test.js`, `f41ContractParity.test.js`); no pre-existing test was edited. Every `classifyF13HeatmapRate` call without `bands` is in F1.3-only code (route page, operating pattern), which defaults to the F1.3 bands. |
| T8-F41-NB3 | **CLOSED** | `rankRows` now sorts by the exact ratio. The round-1 repro now gives `533140 (68.44) #1, 537220 (68.36) #2`, and a new regression test covers it. |
| T8-F41-NB4 | **CLOSED** | `summary` wraps the national rank and falls back to `null`. The round-1 repro now prints `summary OK`, and a new test covers it. |
| T8-F41-NB5 | **CLOSED** | Daily-trend and overview-monthly/MTD `failed` are now asserted. The parity fixture uses 690 / 1832. Mutation re-run (in-memory monkey-patch): strict-failed now fails 3 tests (was 2, and the daily-trend test now catches it); the other 4 mutations are still caught. |
| T8-F41-NB7 | **PARTLY CLOSED** | The manifest status line and the repository comment are corrected. Still stale: the manifest T1 row ("live-DB reconciliation pending PO go-ahead") and Section 7 "Not yet done …". Docs only, non-blocking. |
| NB1 / NB2 / NB6 | Unchanged by design | NB1 ("KPI 2026" wording) and NB2 (analysis text) stay in the T4/T5 leak sweep. NB6 is pre-existing. |
| **T8-F41-B2 (new)** | **BLOCKER for G3 (F4.1 only, no F1.3 effect)** | `frontend/src/features/ranking/BcvhRankingOverviewBlocks.jsx:185`: the monthly heatmap cells call `getApprovedWeekdayBand(m.rate)`, which wraps `classifyF13HeatmapRate(rate)` (`f13HeatmapBandCatalog.js:137`) with no `bands` argument, so F4.1 cells are always coloured on the F1.3 bands 70/60/50. The legend of the same block (`:142`) does use the F4.1 80/70/60 thresholds. In round 1 these cells followed the F4.1 bands through the module state, so removing that state lost this one caller. Repro: `getApprovedWeekdayBand(75)` → `band-green`, while `classifyF13HeatmapRate(75, F41_INDICATOR.heatmapBands)` → `band-pink` and the F4.1 legend reads "Tỷ lệ từ 80% trở lên". A 75% month is therefore shown green under a legend saying green ≥ 80%. Fix: pass `indicator.heatmapBands` through to this classification. It is a one-line, shared-code fix with no F1.3 effect. |

### Commands (real results)

- `node --experimental-sqlite --test` on the six F4.1 backend test files → 45/45. The round-2 backend diff touches only `FactF41Repository.js` (one comment line), `F41RankingService.js` and its test, so no F1.3 backend file changed.
- Round-1 scratch repros: re-run, results quoted above. Mutation runner: 5/5 mutations caught.
- Frontend: full suite 594/593/1, `vite build` succeeded, `oxlint` exit 0.
- Probe for B1: discarded render, StrictMode, F1.3 ↔ F4.1, nested providers; results quoted above.

### Gate

T4/T5 may start. B2 must be fixed and NB1/NB2 cleared before the PO checks G2/G3. Routing note for T4/T6: `BcvhRankingPage` keeps its overview fetcher in a `useRef` and several effects have `[]` dependencies. Mount the F4.1 pages as their own route elements, as the T4/T5 prompt does, and do not switch the indicator on a mounted page instance. If one shared element is ever reused for both indicators, add `key={indicator.id}`.
