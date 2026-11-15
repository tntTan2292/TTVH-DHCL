# F13-RETIRE-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-RETIRE-01` (gap G6 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `Retire the old F1.3 pages: redirect their links to the v2 pages and delete the dead code`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **Executor: Claude Code / Sonnet 5.5** (frontend only). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- Status: `READY FOR PO CHECK` (executed 2026-11-15; was blocked until the other session committed, §4 start check passed). `PO UI Check Required = Yes` (the PO checks the redirects).

## 2. Survey (Opus, 2026-11-15)

Old F1.3 routes in `frontend/src/App.jsx`:

| Path | Today | G6 |
|---|---|---|
| `/f13/ranking/bcvh` | renders `BcvhRankingPage` (F1.3) | redirect to `/f13/v2/tuan`, keeping the period and BCVH (same pattern as `LegacyTimeAxisRedirect` of F1.1 / F1.2 / F4.1 / F4.2) |
| `/f13/ranking/route` | renders `RoutePerformancePage` | redirect to `/f13/v2/why` (Phân tích nguyên nhân: routes with their causes), keeping the period, BCVH and route |
| `/f13/dashboard`, `/f13/evidence`, `/f13/ranking/shipment`, `/f13/ranking/route/violations` | already redirects | keep as they are |
| `/f13/pareto`, `/f13/message` | placeholders | keep (not F1.3 data pages) |

Code that becomes dead or is dead already:
- `features/route/RoutePerformancePage.jsx` and its 6 tests. Its helpers `routePeriodData`, `routeRankingFilters` and `routeRankingCalculations` are deleted unless something else still imports them. `routeViolationEvidenceData` stays if a redirect still uses it.
- `features/shipment/ShipmentPerformancePage.jsx`: no route renders it.
- `features/ranking/RouteRankingPage.jsx`: nothing imports it.
- `components/Sidebar.jsx`: the real sidebar is `SharedLayout.jsx`.

Links that point to the old paths and must point to the new pages directly (no redirect hop):
- `features/dashboard/components/TopListAdapter.jsx`;
- `unifiedActionCenterData.js` and `UnifiedBcvhAnalysisTable.jsx` / `unifiedBcvhAnalysisTableData.js`;
- `auth/roles.js`, `navigation/urlPreservation.js`;
- `features/indicator/indicatorConfig.js` (`routes.ranking` of F1.3).

**Kept (not dead):**
- `features/ranking/BcvhRankingPage.jsx` is shared by F1.1, F1.2, F4.1 and F4.2 (`F11/F12/F41/F42BcvhRankingPage`). F4.1 stays untouched, as the plan says.
- **All backend `/api/f13/ranking/*` endpoints.** The v2 pages call `/f13/ranking/bcvh/weeks` and `/months`, the month page and the F4.2 strip call `/bcvh/overview`, and `UnifiedBcvhAnalysisTable` and `BcvhRankingPage` call `/f13/ranking/bcvh`. No backend change in G6.

## 3. Scope for the executor

1. Redirects as in §2, with a test per old path: target path and kept parameters.
2. Point every link listed in §2 straight at the new pages.
3. Delete the dead files of §2. Before deleting a file, grep for every import of it; delete its tests with it.
4. No change to `BcvhRankingPage.jsx`, to F1.1 / F1.2 / F4.1 / F4.2 pages, or to any backend file.
5. Checks:
   - `npx oxlint -D no-undef` on the changed files;
   - the frontend test files that import a changed file, and the whole `node --test` frontend sweep before and after, reporting the counts (deleted tests explained);
   - `npm run build`;
   - grep showing no `/f13/ranking/route` and no `/f13/ranking/bcvh` **page** link left (API calls `/f13/ranking/bcvh/...` stay).

## 4. Blocker before the executor starts

The shared working tree holds 30 uncommitted files from another session (F1.3 heatmap / dashboard / ranking, changed 2026-11-12), including `UnifiedBcvhAnalysisTable.jsx`, `unifiedBcvhAnalysisTableData.js`, `RouteRankingPage.jsx` and `BcvhRankingPage.jsx`, which G6 touches or deletes. The PO said on 2026-11-15 that this work is finished. **That session must commit and push it first.** The executor starts only when `git status` shows no modified tracked file outside `.claude/skills/`, `graphify-out/`, `.graphifyignore` and `User QIS.xlsx`, and stops and reports otherwise.

## 5. Change log

- 2026-11-15: created by Claude Code / Opus 5.5 after F13-PARCEL-CARD-01 closed (PO: "Lập G6 ngay").

## 6. Result (Claude Code / Sonnet 5.5, 2026-11-15)

- Redirects: `/f13/ranking/bcvh` -> `/f13/v2/tuan` (existing `LegacyTimeAxisRedirect`); `/f13/ranking/route` -> `/f13/v2/why` (new `LegacyF13RouteRedirect` + `translateLegacyF13RouteSearch`, keeps from/to, bcvh, route). Tests: `urlPreservation.test.js` (one per path) and `App.role-routing.test.js` (route wiring). Note: the Tuần page reads `week`, not from/to, so the period carries only into `/f13/v2/why`.
- Links repointed: `TopListAdapter`, `unifiedActionCenterData`, `UnifiedBcvhAnalysisTable`, `unifiedBcvhAnalysisTableData`, `indicatorConfig` (F13 `routes.ranking`), `urlPreservation` (`F13_CROSS_MODULE_PATHS`), `auth/roles.js` (old viewer prefixes removed; `/f13/v2` already covers them).
- Deleted (24 files): `components/Sidebar.jsx`; `features/ranking/RouteRankingPage.jsx`; `features/shipment/ShipmentPerformancePage.jsx` + 6 tests (contract, evidenceStatus, groupPaginationRemediation, phase2, remediation, searchRemediation); `features/route/RoutePerformancePage.jsx` + 6 tests (blackReturned, dateResolution, delayedCash, delayedCashWidget, postman, volumeReconciliationTooltip); `routePeriodData.js`, `routeRankingFilters.js`, `routeRankingCalculations.js` + their 3 tests.
- Kept: `BcvhRankingPage.jsx`, F1.1/1.2/4.1/4.2 pages, all backend, `routeViolationEvidenceData.js`, `shipmentPerformanceData.js` (+test; now only test-referenced, not in the §2 list), `buildBackToRouteRankingLink` (no caller; its output still works through the redirect).
- Tests: sweep 997 -> 841 (156 removed with the deleted files and the dead-Sidebar test), 0 fail. Edited tests: App.role-routing, appNavigation (Sidebar test removed), glassTheme, roles, shipmentModel.retired, indicatorConfig, unifiedActionCenterData, unifiedBcvhAnalysisTableData, f41Pages.
- `npm run build` OK; `oxlint -D no-undef` on changed files: only browser globals (`window`, `URLSearchParams`), pre-existing.
