# F41-DASHBOARD-MINIMUM-01 Checkpoint 001

## Section 1 — Activation

Product Owner decision received in chat, not yet recorded in the repository at the time of receipt: **"PO PASS / F41-PHASE-2 CLOSED — kích hoạt F4.1 Dashboard tối thiểu."**

This is treated as two governance actions, both executed in this checkpoint before any code was written:

1. `F41-PHASE-2` (`F4.1 Multi-Indicator Import`), previously `PHASE 2 IMPLEMENTED / READY FOR PO CHECK` (`docs/10_TICKETS/F41-PHASE-2_MANIFEST.md`), is now `CLOSED / PO PASS` on the strength of this instruction. No new code evidence was required for this closure — the ticket was already technically complete and awaiting exactly this PO check.
2. `F41-DASHBOARD-MINIMUM-01` is activated as the successor ticket, scoped exactly to the Product Owner's B1-Backend instruction (see Section 2).

Baseline at activation: `b075b96` on branch `codex/da-impl-006` (working tree otherwise dirty with unrelated, untouched files — see `git status` at session start: `frontend/src/features/networkMap/*`, `.claude/`, `Data QLML/`, and root-level CSV/patch scratch files from other work; none of these are touched by this ticket).

## Section 2 — Scope (locked by the Product Owner instruction)

In scope — Phase B1 Backend only:

- New read-only API surface under prefix `/f41` (mounted at `/api/f41`, consistent with the existing `/api/f13` convention).
- KPI denominator = the entire row set for the period (`COUNT(*)`), not `sl_bg_ptc` — this is the F4.1 contract locked in `F41-MODULE-PLAN` decision 2 and already implemented by `FactF41Repository.getKpiMetrics`.
- Must reproduce, unchanged, the Product Owner-locked figure `2.863 / 4.695 = 60,98%` for `2026-08-01`.
- Multi-day support (a date range, not a single fixed day).
- `admin` and `viewer` both read-authorized.
- Implemented in parallel — must not modify any F1.3 behavior, route, controller, service, repository, or schema.

Out of scope, explicit: frontend, BCVH Ranking, Evidence, Tuyến Ranking, Import, portal sync, and any SSOT change.

## Section 3 — Discovery Before Implementation

`fact_f41` (F41-PHASE-1) and `fact_f41_national` (F41-PHASE-2) already exist in `backend/src/db/schema.sql`, additive and untouched by this ticket. `backend/src/repositories/FactF41Repository.js` already carried `getKpiMetrics(startDate, endDate, filters)` — `COUNT(*)` as `total_rows`, `SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' ...)` as `total_passed`, and `rate_percent = ROUND(total_passed * 100.0 / total_rows, 2)` — built and unit-tested during F41-PHASE-1, but never exposed through any route, controller, or service. This ticket's B1 work is therefore an additive API layer over an already-correct, already-tested query, not a new metric derivation. No SQL in `getKpiMetrics`/`getBcvhReconciliation` was changed.

The only repository addition is `getMeta()` (`MIN`/`MAX ngay_do_kiem` on `fact_f41`, gated to `<= date('now','localtime')` exactly like the equivalent F1.3 `kpiController.getDashboardMeta` query), needed to support genuine multi-day range selection rather than a hardcoded date.

## Section 4 — Implementation

New files (all additive, no existing F1.3/F4.1 file's behavior changed):

- `backend/src/services/F41DashboardService.js` — thin service wrapping `FactF41Repository`; `getDashboardKpi(fromDate, toDate, {bcvhId})`, `getBcvhReconciliation(date)`, `getDashboardMeta()`.
- `backend/src/controllers/F41DashboardController.js` — `getKpi`, `getBcvhReconciliation`, `getMeta`; same `{ success, data }` / `{ success: false, error: { code, message } }` response contract as `DashboardController` (F1.3), same `ma_bcvh` validation against the shared `CANONICAL_BCVH_UNITS` whitelist.
- `backend/src/routes/f41Routes.js` — `GET /dashboard/kpi`, `GET /dashboard/meta`, `GET /dashboard/bcvh-reconciliation`, all gated `requireAuth + requireRole(['admin','viewer'])`. No admin-only or write route exists in this file — Import stays out of scope.

Modified files:

- `backend/src/repositories/FactF41Repository.js` — added `getMeta()` only; `getKpiMetrics`/`getBcvhReconciliation`/`overwriteImport` untouched.
- `backend/server.js` — two additive lines: `require('./src/routes/f41Routes')` and `app.use('/api/f41', f41Routes)`. No existing `app.use` line touched.

## Section 5 — Validation (LEVEL 2)

Repository/service/controller/route tests, all new, all pass:

```
node --experimental-sqlite --test src/repositories/FactF41Repository.test.js \
  src/services/F41DashboardService.test.js \
  src/controllers/F41DashboardController.test.js \
  src/routes/f41Routes.test.js
# tests 17, pass 17, fail 0
```

Full backend regression sweep (`node --experimental-sqlite --test "src/**/*.test.js"`): `300` tests, `296` pass, `4` fail — the 4 failures are pre-existing, unrelated to this ticket: `DashboardController.r6.integration.test.js` (2), `DashboardController.dateFilterRemediation`-adjacent monthly-rank test (1), and one more integration test, all failing with `fetch failed` because they require a live HTTP server that this read-only test run did not start — none reference `f41`, `F41`, `fact_f41`, or any file this ticket touched. This is the same baseline the project snapshot already records elsewhere (e.g. `326/330` on a comparable prior sweep).

Real-database, read-only validation script `backend/test_f41DashboardMinimum.js`, run against the live operational `database.sqlite` (not the isolated test DB), driving the actual new controller:

```
=== F41-DASHBOARD-MINIMUM-01 real-data validation (read-only) ===

1. GET /api/f41/dashboard/kpi?from_date=2026-08-01&to_date=2026-08-01
  ✅ total_rows === 4695 (all rows are the denominator)
  ✅ total_passed === 2863
  ✅ total_failed === 1581
  ✅ total_blank === 251
  ✅ rate_percent === 60.98

2. GET /api/f41/dashboard/meta (multi-day support)
  ✅ min_date / max_date populated (2026-07-01 .. 2026-09-06)
  ✅ bcvh_units carries the 6 canonical F1.3/F4.1 BCVH codes

2b. GET /api/f41/dashboard/kpi?from_date=2026-07-01&to_date=2026-09-06
  ✅ HTTP 200, total_rows >= 4695 (multi-day range genuinely widens the result)

3. Read-only confirmation
  ✅ fact_f13 row count unchanged
  ✅ fact_f41 row count unchanged

=== RESULT: 14 passed, 0 failed ===
```

This is the exact Product Owner-locked figure `2.863 / 4.695 = 60,98%` for `2026-08-01`, reproduced end-to-end through the new `/api/f41/dashboard/kpi` endpoint against the real database already loaded by `F41-PHASE-2`'s controlled import — no new data was written, no existing row was touched.

`oxlint` on the 5 touched/new backend files: `0` warnings, `0` errors (exit code `0`).

F1.3 regression: `backend/server.js`'s only F1.3-relevant change is additive (`f41Routes` mounted after, not instead of, `f13Routes`); no F1.3 route, controller, service, repository, or schema file was opened for edit. The full sweep above includes every existing F1.3 test file unchanged and at its pre-existing pass rate.

## Section 6 — Completion State

`F41-DASHBOARD-MINIMUM-01 Phase B1 (Backend) — IMPLEMENTED / READY FOR INDEPENDENT TECHNICAL REVIEW`. Per `CLAUDE.md` Section 4, Claude Code does not self-award a Product Owner PASS, and per this ticket's own instruction, work stops here — no frontend (Phase F1) was started. Next step is an Independent Technical Review (per `DEC-021`), not a Product Owner UI check, since this phase has no UI surface.
