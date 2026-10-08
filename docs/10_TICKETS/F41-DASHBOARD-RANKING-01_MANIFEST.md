# F41-DASHBOARD-RANKING-01 — MANIFEST

**Status:** ACTIVE — T0, T1, T2 and T3 IMPLEMENTED, G1 PASSED (2026-10-08); T8 review round 1 = FAIL (B1), fixed in round 2; T4/T5 wait for the T8 re-check. Not closed; no PO UI PASS yet.
**Program ticket** covering the F4.1 Operation Dashboard and BCVH Ranking screens. It is the resumption of `F41-DASHBOARD-MINIMUM-01` Phase F1 (that ticket's Section 12 records the resumption).
**Branch:** `codex/da-impl-006`. **Governance:** V2 Active.

## 1. Authority

Product Owner decisions received in chat on 2026-10-08:

- Request: build F4.1 with two modules like F1.3 (Operation Dashboard and BCVH Ranking): daily summary table, weekly summary table, day / week / month charts.
- Decisions: colour bands as F1.3 but thresholds +10 points (80/70/60); national rank by the published national rate (agreed); scope is tables + day/week/month charts (agreed); weeks Thursday–Wednesday, ISO 8601, as F1.3 (agreed); the PO imports the missing days 07/09–07/10 personally and wants a heads-up before any backend restart or import-affecting step.
- Approval: "Duyệt phương án A, mục tiêu 90%, bắt đầu T0" — Phương án A (shared, parameterised) approved; chart target line stays 90%; T0 started. This also reactivates `F41-DASHBOARD-MINIMUM-01` Phase F1.

## 2. Documents

- Proposal (approved): `docs/04_TECHNICAL_PLANNING/Feature/F41-DASHBOARD-RANKING-01_PROPOSAL.md`.
- Design of Record v1: `docs/04_TECHNICAL_PLANNING/Feature/F41-DASHBOARD-RANKING-01_DESIGN_OF_RECORD.md`.
- Module rules (read-only): `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` (PO-1..PO-10, DC-1..DC-11).
- Predecessor: `docs/10_TICKETS/F41-DASHBOARD-MINIMUM-01_MANIFEST.md` (Phase B1 backend: three read endpoints).

## 3. Scope

In: Operation Dashboard F4.1 (KPI, daily summary table, day charts) and BCVH Ranking F4.1 (single-day table, weekly/monthly comparison table, weekly/monthly charts, collapsed heatmap); menu and routes for both; admin + viewer read.

Out: Tuyến Ranking and all route blocks (no route data), Action Center / Rule Recommendation / Message, "Quy luật vận hành" tab, Evidence, Pareto, Import, any KPI/SSOT/schema change, any F1.3 backend edit.

## 4. Work breakdown and owners

| Ticket | Work | Owner | Review | State |
| --- | --- | --- | --- | --- |
| T0 | Activation record, Design of Record, governance sync, `ITR2-F41-NB-01` | Claude Code (Sonnet 5.5) | PO | **DONE 2026-10-08** |
| T1 | Backend base: F4.1 repository methods, `summary`, `daily-trend`, `ranking/bcvh/overview`, `ranking/bcvh`, F4.1 national rank | Claude Code (Sonnet) | tests + real-DB reconciliation | **IMPLEMENTED 2026-10-08**, G1 live-DB reconciliation PASSED (Section 9) |
| T2 | Backend weekly/monthly: `weeks`, `weekly-comparison`, `weekly-trend`, `months`, `monthly-comparison` | Claude Code (Sonnet) | tests + reconciliation | **IMPLEMENTED 2026-10-08** with T1 (the F1.3 services are reused unchanged) |
| T3 | Frontend foundation: indicator config, fetchers/mappers/bands/labels parameterised, F1.3 default unchanged | Claude Code (Sonnet) | Claude Code (Opus) T8 | **IMPLEMENTED 2026-10-08**; T8 round 2: B1 closed, B2 fixed in round 3 (Section 10) |
| T4 | `/f41/dashboard` page | Antigravity | PO UI check (G2) | NOT STARTED (after T1, T3) |
| T5 | `/f41/ranking/bcvh` page | Antigravity | PO UI check (G3) | NOT STARTED (after T2, T3) |
| T6 | Menu group, redirect, roles, navigation tests | Claude Code (Sonnet) | tests | NOT STARTED (after T4) |
| T7 | Import 07/09–07/10 | **PO** | Claude Code row-count check | PO in progress |
| T8 | Independent review of T1–T3 | Claude Code (Opus) | — | Round 1 FAIL (B1). **Round 2 2026-10-08: B1 CLOSED, F1.3 unchanged, NB3/NB4/NB5 closed, NB7 partly; new T8-F41-B2 (F4.1 monthly heatmap cells on F1.3 bands, `BcvhRankingOverviewBlocks.jsx:185`) blocks G3 only — T4/T5 may start.** `docs/06_REVIEWS/Shared/F41-DASHBOARD-RANKING-01_REVIEW_001.md` |

PO gates: G0 plan approval (passed 2026-10-08); G1 backend reconciliation report (after T2); G2 Operation Dashboard UI; G3 BCVH Ranking UI.

## 5. T0 record (2026-10-08, Claude Code / Sonnet 5.5)

Done:

- Design of Record v1 written (block map F1.3 → F4.1, endpoints, repository contract, national rank rule, indicator config, acceptance criteria).
- `ITR2-F41-NB-01` fixed: `F41DashboardService.getDashboardMeta()` returned `kpi_includes_non_canonical_bcvh: false` when its repository could not answer the question; it now returns `null` (unknown). Test `getDashboardMeta reports kpi_includes_non_canonical_bcvh === null when the repository cannot answer` added. Files: `backend/src/services/F41DashboardService.js`, `F41DashboardService.test.js`.
- `F41-DASHBOARD-MINIMUM-01` manifest Section 12 records the resumption; `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `DOCUMENT_INDEX.md` synced.

Validation (LEVEL 1): `node --experimental-sqlite --test` on `F41DashboardService.test.js`, `F41DashboardController.test.js`, `f41Routes.test.js` → 24/24 pass; `oxlint` exit 0 on both touched code files. The tests use fake repositories only: no database read or write, no server started, no effect on the PO's import.

Not done by design: no endpoint, no schema, no frontend. `ITR2-F41-NB-02` and `-03` (wording defects in paused-ticket documents) remain recorded and untouched.

## 6. Constraints that apply to every ticket

- One ticket, one commit; commit by explicit file list (another session shares this working tree; pre-existing network-map edits and stray root files are not touched).
- Antigravity does not open a browser, take screenshots, run the dev server or log in for T4/T5 (PO instruction 2026-10-08, to save quota): it works from code reading plus tests/build/lint; the PO checks the UI directly. This replaces the "Windows runtime evidence" wording of the Proposal for these two tickets.
- Claude Code never self-awards PO UI PASS; UI tickets stop at `READY FOR PO CHECK`.
- Before any backend restart or heavy script on the live database, tell the PO and wait (Proposal Section 6).
- Backend tests: `node --experimental-sqlite --test`; root `test_*.js` suites are run per file and reported separately.

## 7. T1 + T2 record (2026-10-08, Claude Code / Sonnet 5.5)

Backend, read-only, additive (Design of Record Section 11): nine new `/api/f41/*` endpoints (`dashboard/summary`, `dashboard/daily-trend`, `ranking/bcvh`, `ranking/bcvh/overview|weeks|weekly-comparison|weekly-trend|months|monthly-comparison`), F4.1 repository queries, `F41NationalRankService`, `F41RankingService`, `F41RankingController`. The F1.3 `BcvhOverviewService` / `BcvhWeeklyComparisonService` are reused through constructor injection; no F1.3 backend file changed; no schema, index, Import or data write.

Validation (LEVEL 2): `node --experimental-sqlite --test` over the six F4.1 backend test files = **43/43**, on temporary SQLite databases only (never the operational database): all-rows denominator, canonical-6 exclusion of 531120, Thursday-Wednesday weeks, TỔNG CỘNG sums volume, national rank (range, tie-break, missing province/date), daily-trend gaps, summary comparisons, controller status mapping, route list. `oxlint` clean on all touched backend files. The G1 reconciliation against the live database was run afterwards with the PO's go-ahead: see Section 9.

## 8. T3 record (2026-10-08, Claude Code / Sonnet 5.5)

Frontend foundation (Design of Record Section 11): indicator config (F1.3 default, F4.1: URLs, colour bands +10 points, KPI status floors, labels, feature flags `routes` / `lateCash` / `operatingPattern` / `actionCenter` all false), URL rewrite in the shared HTTP client, indicator-aware heatmap band default, route / late-cash / operating-pattern / action-center blocks gated by flag. F1.3 behaviour with no provider is unchanged.

Validation (LEVEL 3): full frontend suite **592/593**; the single failure `src/pages/dataImportBackfillQueue.test.js` is pre-existing (same failure before this ticket, in a file this ticket does not touch) and is the only one. Zero existing tests were edited. 9 new tests (`features/indicator/indicatorConfig.test.js`, `f41ContractParity.test.js`): F1.3 defaults, F4.1 bands 80/70/60 (boundary values), KPI status floors, URL rewrite for every shared endpoint, labels and legend, feature flags, provider activation/cleanup, and that the F1.3 ranking/overview mappers accept the real F4.1 payload shapes. `vite build` clean; `oxlint` 0 errors on touched directories. No browser check by the executor (no live F4.1 API yet).

Review focus for T8 (Opus): *superseded* — the module-level active-indicator state described in the first version of this record was removed after T8 round 1 (Section 10, Design of Record Section 12); the indicator now travels by React context.

## 9. PO decisions of 2026-10-08 on the two display points, and G1 evidence

PO decisions (chat, 2026-10-08):

1. **Rate precision:** same as F1.3, one decimal (so the locked 60,98% displays as 61,0%).
2. **"Không đạt":** a row without an evaluation is in the denominator and counts as not passed, so the F4.1 dashboard and ranking views label `volume - Đạt` as **Không đạt** (2026-08-01: 1.581 + 251 = 1.832). The later Evidence module will carry the group **Chưa có đánh giá**. Implemented in the F4.1 repository queries (`failed` / `khong_dat_kpi_2026` = rows not `Đạt`) and in `summary` (`total_failed = total - passed`, `total_unknown = 0`, extra `total_blank`). The earlier `/dashboard/kpi` and `/dashboard/bcvh-reconciliation` endpoints keep the strict Không đạt / blank split (not changed).
3. **Metric column:** the evaluation column is **column AN** of the source Excel, `Đánh giá (thời gian Có TMS PTC 8 giờ)` (`danh_gia_co_tms_ptc_8h`). Verified against the real files: AN1 carries that header (neighbours AK..AP are the other four evaluation columns), and the Đạt / Không đạt counts of column AN equal the database on 2026-07-01 (3.898 / 1.198), 2026-08-01 (2.863 / 1.581) and 2026-09-05 (2.533 / 990).

G1 (backend reconciliation against the live database, read-only, PO had paused the import): `node backend/test_f41RankingReconciliation.js` = **9 passed, 0 failed**.

- 2026-08-01 summary 2.863 / 4.695 = 60,98%, Không đạt 1.832, blank 251; ranking six units equal the locked baseline per unit, total 2.862 / 4.694, ranks 1..6; national rank x/34 (Huế 15/34, national-report rate 61,1% from 2.863 / 4.684, independently re-derived).
- 2026-08-01..05: sum of daily-trend = range summary = 20.979.
- Overview anchored 2026-10-06 (data imported meanwhile): month-to-date equals an independent SQL count (27.742 rows); weekly comparison Tuần 40 (01..06/10) TỔNG CỘNG = sum of the six units = independent count, rate 64,2347%, Thursday-start weeks; monthly comparison volume equals an independent count.
- Timings: summary 36 ms, ranking 152 ms, daily-trend 33 ms, overview 2,5 s, weeks 0,4 s, weekly-comparison 0,6 s, weekly-trend 1,1 s, months 0,4 s, monthly-comparison 0,9 s.
- `fact_f41`, `fact_f13`, `fact_f41_national` row counts identical before and after; the script opens the database `OPEN_READONLY`.
- Found and fixed by the run: the ranking endpoint re-sorted rows by volume when called without `sort` (F1.3 always returns rank order and ignores `sort/order`); now rank order always.

Backend restart: the backend was restarted at the PO's request (old PID 32256 stopped, new `node server.js` started from the Claude Code session); the nine routes answer `401` without a session (mounted behind auth) and an unknown path answers `404`. Authenticated HTTP checks are for the T4/T5 UI check.

## 10. T8 independent review and round 2 (2026-10-08)

Round 1 (Claude Code / Opus): **FAIL, 1 blocker + 7 non-blocking**, backend T1/T2 PASS with non-blocking findings; see `docs/06_REVIEWS/Shared/F41-DASHBOARD-RANKING-01_REVIEW_001.md`.

Round 2 (Claude Code / Sonnet 5.5): **B1 fixed** by removing the module-level indicator state altogether (Design of Record Section 12); NB3, NB4, NB5, NB7 fixed; NB1/NB2 remain in the T4/T5 leak sweep; NB6 pre-existing. Validation: backend F4.1 test files 45/45 (two new regression tests); frontend full suite **593/594** (only the pre-existing `dataImportBackfillQueue.test.js` failure), 10 tests in `features/indicator/` including the discarded-render regression; `vite build` and `oxlint` clean; no existing test edited. The running backend (started earlier from the Claude Code session) predates the NB3/NB4 backend change and needs one more restart to load it. T4/T5 stay blocked until the reviewer re-checks B1.

Round 3 (Claude Code / Sonnet 5.5): the reviewer's round-2 report found **T8-F41-B2** — the monthly heatmap cells (`BcvhRankingOverviewBlocks.jsx`) still classified with the F1.3 bands under the F4.1 legend. Fixed: `getApprovedWeekdayBand(rate, backendColor, bands)` takes the bands and the cell passes `indicator.heatmapBands`; new test `monthly heatmap cell colour follows the page indicator`. One existing assertion was adjusted because it pinned the old call text (`BcvhRankingOverviewBlocks.heatmapBand.test.js`: the regex now expects `getApprovedWeekdayBand(m.rate, null, indicator.heatmapBands)`); no other existing test changed. Frontend full suite 594/595 (only the pre-existing `dataImportBackfillQueue.test.js`), build and lint clean. NB7 stale wording ("reconciliation pending", "awaiting review") corrected in the T1, T3 rows and Section 7. Reviewer note for T4/T6: `BcvhRankingPage` keeps its overview fetcher in a `useRef` and an effect with `[]`, so each F4.1 page must be its own route element (as the T4/T5 prompt says); sharing one element between indicators would need `key={indicator.id}`.
