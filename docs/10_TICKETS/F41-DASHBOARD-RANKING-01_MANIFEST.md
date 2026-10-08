# F41-DASHBOARD-RANKING-01 — MANIFEST

**Status:** ACTIVE — T0, T1, T2, T3 IMPLEMENTED (2026-10-08); G1 reconciliation on the live database and T4/T5 next. Not closed; no PO UI PASS yet.
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
| T1 | Backend base: F4.1 repository methods, `summary`, `daily-trend`, `ranking/bcvh/overview`, `ranking/bcvh`, F4.1 national rank | Claude Code (Sonnet) | tests + real-DB reconciliation | **IMPLEMENTED 2026-10-08** (live-DB reconciliation pending PO go-ahead) |
| T2 | Backend weekly/monthly: `weeks`, `weekly-comparison`, `weekly-trend`, `months`, `monthly-comparison` | Claude Code (Sonnet) | tests + reconciliation | **IMPLEMENTED 2026-10-08** with T1 (the F1.3 services are reused unchanged) |
| T3 | Frontend foundation: indicator config, fetchers/mappers/bands/labels parameterised, F1.3 default unchanged | Claude Code (Sonnet) | Claude Code (Opus) T8 | **IMPLEMENTED 2026-10-08**, awaiting T8 review |
| T4 | `/f41/dashboard` page | Antigravity | PO UI check (G2) | NOT STARTED (after T1, T3) |
| T5 | `/f41/ranking/bcvh` page | Antigravity | PO UI check (G3) | NOT STARTED (after T2, T3) |
| T6 | Menu group, redirect, roles, navigation tests | Claude Code (Sonnet) | tests | NOT STARTED (after T4) |
| T7 | Import 07/09–07/10 | **PO** | Claude Code row-count check | PO in progress |
| T8 | Independent review of T1–T3 | Claude Code (Opus) | — | NOT STARTED |

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
- Claude Code never self-awards PO UI PASS; UI tickets stop at `READY FOR PO CHECK`.
- Before any backend restart or heavy script on the live database, tell the PO and wait (Proposal Section 6).
- Backend tests: `node --experimental-sqlite --test`; root `test_*.js` suites are run per file and reported separately.

## 7. T1 + T2 record (2026-10-08, Claude Code / Sonnet 5.5)

Backend, read-only, additive (Design of Record Section 11): nine new `/api/f41/*` endpoints (`dashboard/summary`, `dashboard/daily-trend`, `ranking/bcvh`, `ranking/bcvh/overview|weeks|weekly-comparison|weekly-trend|months|monthly-comparison`), F4.1 repository queries, `F41NationalRankService`, `F41RankingService`, `F41RankingController`. The F1.3 `BcvhOverviewService` / `BcvhWeeklyComparisonService` are reused through constructor injection; no F1.3 backend file changed; no schema, index, Import or data write.

Validation (LEVEL 2): `node --experimental-sqlite --test` over the six F4.1 backend test files = **43/43**, on temporary SQLite databases only (never the operational database): all-rows denominator, canonical-6 exclusion of 531120, Thursday-Wednesday weeks, TỔNG CỘNG sums volume, national rank (range, tie-break, missing province/date), daily-trend gaps, summary comparisons, controller status mapping, route list. `oxlint` clean on all touched backend files. Not yet done: the G1 reconciliation against the live database (2026-08-01 = 2.863/4.695 = 60,98%; six units 2.862/4.694 = 60,97%; weekly sums; Hue national rank) because it reads the operational database while the PO is importing; and the live API needs a backend restart. Both wait for the PO go-ahead.

## 8. T3 record (2026-10-08, Claude Code / Sonnet 5.5)

Frontend foundation (Design of Record Section 11): indicator config (F1.3 default, F4.1: URLs, colour bands +10 points, KPI status floors, labels, feature flags `routes` / `lateCash` / `operatingPattern` / `actionCenter` all false), URL rewrite in the shared HTTP client, indicator-aware heatmap band default, route / late-cash / operating-pattern / action-center blocks gated by flag. F1.3 behaviour with no provider is unchanged.

Validation (LEVEL 3): full frontend suite **592/593**; the single failure `src/pages/dataImportBackfillQueue.test.js` is pre-existing (same failure before this ticket, in a file this ticket does not touch) and is the only one. Zero existing tests were edited. 9 new tests (`features/indicator/indicatorConfig.test.js`, `f41ContractParity.test.js`): F1.3 defaults, F4.1 bands 80/70/60 (boundary values), KPI status floors, URL rewrite for every shared endpoint, labels and legend, feature flags, provider activation/cleanup, and that the F1.3 ranking/overview mappers accept the real F4.1 payload shapes. `vite build` clean; `oxlint` 0 errors on touched directories. No browser check by the executor (no live F4.1 API yet).

Review focus for T8 (Opus): the active-indicator module is deliberate module-level state (recharts callbacks cannot take props or hooks); it is set while rendering and cleared on unmount only when still its own. Confirm no F1.3 code path reads it without a provider.

## 9. Open points for the PO (business display decisions, not blocking T4/T5 start)

1. **Rate precision.** The shared tables format rates with one decimal, so the locked `60,98%` would display as `61,0%`. Keep one decimal as in F1.3, or show two decimals for F4.1?
2. **"Không đạt" in the weekly/monthly comparison.** The reused service computes it as volume − Đạt, so for F4.1 it includes rows whose evaluation is blank (2026-08-01: 1.581 + 251 = 1.832). Keep and relabel as "Chưa đạt (gồm chưa có đánh giá)", or show Không đạt and blank separately?
