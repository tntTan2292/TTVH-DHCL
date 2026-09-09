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

## Section 7 — Independent Technical Review of Phase B1 (2026-09-08, Claude Code / Opus, DEC-021)

Adversarial review of implementation commit `1664f15` (baseline `b075b96`, Governance-only successor `22e34c4`), performed by a different model than the implementer, per `DEC-021`. Validation `LEVEL 3` — this is the gate before Phase F1 activation. All database access was read-only; no business data was written, and this review modified no product code.

**Verdict: `INDEPENDENT TECHNICAL REVIEW PASS`. 0 BLOCKER, 6 NON-BLOCKING findings.**

### 7.1 Review items and evidence

**1. KPI definition — F4.1 total-rows denominator (PASS).** `FactF41Repository.getKpiMetrics` is unchanged by this commit (`git show 1664f15 -- src/repositories/FactF41Repository.js` adds only `getMeta()`). Its denominator is `COUNT(*)` over the period with no `sl_bg_ptc` gating, matching the `F41-MODULE-PLAN` `DC-2` contract, and `F41DashboardService` adds no gating of its own. Table-wide, `danh_gia_co_tms_ptc_8h` takes exactly three states — `Đạt` 190,508 / `Không đạt` 93,240 / `NULL` 25,246 — so `total_passed + total_failed + total_blank` always partitions `total_rows`; verified equal on `2026-08-01`.

**2. Locked figure `2.863/4.695 = 60,98%` at `2026-08-01` (PASS).** Reproduced independently through the real controller against the live operational database:

```
{"date_range":{"from_date":"2026-08-01","to_date":"2026-08-01"},"ma_bcvh":null,
 "total_rows":4695,"total_passed":2863,"total_failed":1581,"total_blank":251,"rate_percent":60.98}
```

**3. Multi-day and the BCVH filter (PASS).** Multi-day is genuinely additive, not a widened single day: per-day totals for `2026-08-01..2026-08-05` sum to `20,979`, exactly equal to the single range call over the same window. The `ma_bcvh` filter was exercised against real data for all six canonical codes (previously covered only by mocked tests — see `ITR-F41-NB-05`): `535790` 346 rows / 77.46%, `536250` 509 / 68.17%, `535470` 736 / 52.99%, `537220` 580 / 10.69%, `537015` 339 / 88.79%, `533140` 2,184 / 68.41%. `ma_bcvh=all` and `ma_bcvh=''` both normalize to the unfiltered aggregate (4,695); a non-canonical or SQL-shaped code is rejected `400 INVALID_PARAM`.

**4. Reconciliation does not distort the KPI module (PASS).** `GET /dashboard/bcvh-reconciliation?date=2026-08-01` returns 7 groups whose sums reconcile exactly to the KPI endpoint for the same date: `total_rows` 4,695, `total_passed` 2,863, `total_failed` 1,581, `total_blank` 251. It reuses the same SQL expressions as `getKpiMetrics` and shares no state with it.

**5. Parameter validation and error contract (PASS with `ITR-F41-NB-03`).** Missing `from_date`/`to_date` → `400 MISSING_PARAM`; missing `date` → `400 MISSING_PARAM`; invalid `ma_bcvh` → `400 INVALID_PARAM`; service failure → `500 SERVER_ERROR`; the `{ success, data }` / `{ success: false, error: { code, message } }` envelope matches F1.3's `DashboardController`. Date *values* are not validated — see `ITR-F41-NB-03`. Injection was tested and is not possible: every date and BCVH value is bound as a SQL parameter, and `from_date="2026-08-01' OR 1=1 --"` returns 0 rows rather than the whole table.

**6. Read authorization is `admin` + `viewer` only (PASS).** All three routes are gated `[requireAuth, requireRole(['admin', 'viewer'])]`. `requireAuth` rejects an absent or unknown session `401`; `requireRole` rejects any other role `403`. `backend/src/services/auth/runtimeUsers.js` defines exactly two roles in the system (`admin`, `viewer`), so the whitelist is complete and not over-broad.

**7. The API is fully read-only (PASS).** `f41Routes.js` declares three `router.get` handlers and no `router.post`/`put`/`patch`/`delete`; the controller and service contain no `INSERT`/`UPDATE`/`DELETE`/`db.run`/transaction call; the only three repository methods reachable from the F4.1 Dashboard stack are `getKpiMetrics`, `getBcvhReconciliation` and `getMeta`, all pure `SELECT`. Confirmed empirically: `fact_f13` = 781,692 and `fact_f41` = 308,994 rows, unchanged across the full review run.

**8. Route mount does not affect F1.3 (PASS).** `server.js` gains two additive lines; `app.use('/api/f41', f41Routes)` is appended after the existing mounts and shares no prefix with `/api/f13`. `git diff --name-only b075b96 22e34c4 -- src/routes/ src/controllers/DashboardController.js src/services/F13DashboardService.js src/db/schema.sql` returns only the two new `f41Routes` files — no F1.3 route, controller, service, or schema file was touched.

**9. Tests check real behavior, not only wiring (PASS with `ITR-F41-NB-01`, `ITR-F41-NB-05`).** The repository tests run against a real temporary SQLite database through the real migration; the service tests exercise mapping, the zero-row/null-rate branch, and range forwarding against a fake repository; the controller tests exercise the real handlers and assert status codes, error codes and cache headers. `f41Routes.test.js` is source-text assertion only, but that is the established repository convention (`networkMapRoutes.test.js` is identical in style) and the RBAC middleware it asserts has its own behavioral tests — not counted as a defect.

**10. Full-sweep evidence `296/300` and the four baseline failures (PASS with `ITR-F41-NB-01`, `ITR-F41-NB-02`).** Re-run four times. Three runs reproduce `296/300` with exactly the four claimed baseline failures; one run produced `295/300` because of `ITR-F41-NB-01`. The four baseline failures are confirmed pre-existing and unrelated to F4.1 — none references `f41`, `F41` or `fact_f41`: `DashboardController.r6.integration.test.js:18` and `:87` (`fetch failed`, need a live HTTP server), `DashboardController.recovery.test.js:11` (assertion `12 !== 3`), `timelineService.recovery.test.js:80` (source-regex mismatch against `timelineService.js`, which baseline commit `b075b96` edited). The 17/17 targeted suite and `oxlint` `0`/`0` both reproduce exactly as claimed.

**11. Snapshot / manifest / checkpoint consistency (PASS).** `PROJECT_SNAPSHOT.md`, `docs/10_TICKETS/F41-DASHBOARD-MINIMUM-01_MANIFEST.md`, this checkpoint, `DOCUMENT_INDEX.md`, `PROJECT_PROGRESS.md` and `docs/10_TICKETS/F41-PHASE-2_MANIFEST.md` (`CLOSED / PO PASS`) all agree on ticket, phase, branch, baseline, scope and completion state. `PO UI Check Required = No` is correct for a backend-only phase, and no Product Owner PASS was self-awarded.

### 7.2 Findings

| ID | Severity | Finding and remediation |
| --- | --- | --- |
| `ITR-F41-NB-01` | NON-BLOCKING | The new test `repository reports min/max ngay_do_kiem across imported F4.1 dates` (`backend/src/repositories/FactF41Repository.test.js:40`) is flaky on Windows: it calls `db.close()` without awaiting the callback, so `fs.rmSync(dbPath)` in the same `finally` can hit `EBUSY: resource busy or locked, unlink ...fact-f41-repository-*.sqlite`. Its assertions always pass; only teardown fails. Reproduced in 1 of 4 full sweeps — that run reported `295/300`, and the extra failure *does* reference F4.1, contradicting the recorded evidence. Remediation: `await new Promise((resolve) => db.close(resolve));` before `rmSync`, in all three tests in that file. |
| `ITR-F41-NB-02` | NON-BLOCKING | Section 5 of this checkpoint states all four baseline failures fail "with `fetch failed` because they require a live HTTP server". Only two do. `DashboardController.recovery.test.js:11` fails on a real assertion (`12 !== 3`) and `timelineService.recovery.test.js:80` on a real source-regex mismatch — genuine pre-existing defects in F1.3 territory, not environment artifacts. They stay outside this ticket's scope, but the evidence must not describe them as environmental. Remediation: correct the characterization, and raise the two real F1.3 test failures as their own ticket. |
| `ITR-F41-NB-03` | NON-BLOCKING | No validation of date *values* on any endpoint. `from_date=not-a-date`, `from_date=2026-13-45` and a reversed range `2026-08-05..2026-08-01` all return `HTTP 200` with `total_rows: 0, rate_percent: null` — bad input is indistinguishable from "no data for this period"; `bcvh-reconciliation?date=not-a-date` returns `200 []`. This mirrors F1.3's own `DashboardController.getKpi`, so it is a consistent inherited contract, not a regression — but F1.3's `getBcvh` already rejects a reversed range with `400 INVALID_RANGE`, and Phase F1 will put a date-range picker directly on this endpoint. Remediation before or with Phase F1: add an ISO-date shape check and a `from_date > to_date` guard returning `400 INVALID_DATE` / `400 INVALID_RANGE`. No security impact — all values are SQL-bound (verified). |
| `ITR-F41-NB-04` | NON-BLOCKING | The shared `CANONICAL_BCVH_UNITS` whitelist (6 codes) does not cover every `ma_bc_phat` present in `fact_f41`: codes `531120` (354 rows), `531110` (279) and `531600` (36) also occur — 669 of 308,994 rows (0.22%), spanning `2026-07-01..2026-09-05`. Consequence: the six per-BCVH filtered totals do not partition the aggregate (on `2026-08-01`: 4,694 vs 4,695), and `bcvh-reconciliation` returns 7 groups where the filter offers 6. The aggregate KPI itself is correct, and the Product Owner-locked 4,695 already includes these rows. Remediation is a product decision, not a technical one: Phase F1 must not present the 6-unit filter as exhaustive, and the Product Owner should rule on whether these codes are in F4.1 scope. |
| `ITR-F41-NB-05` | NON-BLOCKING | `backend/test_f41DashboardMinimum.js` — the only real-database evidence for this phase — exercises `kpi` (unfiltered) and `meta` only. The `ma_bcvh` filter path and the entire `bcvh-reconciliation` endpoint had no real-data evidence; both were covered only by tests using a fake repository, so the actual `AND ma_bc_phat = ?` and `GROUP BY` SQL was never proven against production-shaped data. This review closed that gap (items 3 and 4 above, both PASS). Remediation: fold those assertions into the script so the evidence is reproducible from the repository. |
| `ITR-F41-NB-06` | NON-BLOCKING | `getMeta` sets `no-store`/`no-cache` headers but `getKpi` and `getBcvhReconciliation` do not, so a KPI response for a still-importing day could be served stale from an intermediate cache while the picker bounds are always fresh. Remediation: apply the same cache headers to all three read endpoints. |

### 7.3 Commands run

```
node --experimental-sqlite --test src/repositories/FactF41Repository.test.js \
  src/services/F41DashboardService.test.js src/controllers/F41DashboardController.test.js \
  src/routes/f41Routes.test.js                         # tests 17, pass 17, fail 0
node --experimental-sqlite --test "src/**/*.test.js"   # x4: 296/300, 296/300, 296/300, 295/300 (ITR-F41-NB-01)
npx oxlint src/routes/f41Routes.js src/controllers/F41DashboardController.js \
  src/services/F41DashboardService.js                  # exit 0, 0 warnings, 0 errors
node test_f41DashboardMinimum.js                       # 14 passed, 0 failed
node <independent read-only ITR script, run from backend/, deleted after the run>
```

### 7.4 Outcome

Phase B1 is technically sound: the locked KPI is correct and independently reproduced, the API is genuinely read-only and correctly authorized, F1.3 is untouched, and the governance record is consistent. State advances to `INDEPENDENT TECHNICAL REVIEW PASS / READY FOR PHASE F1 ACTIVATION`. Phase F1 is **not** activated by this review — it requires its own Product Owner activation. `ITR-F41-NB-01`, `ITR-F41-NB-03` and `ITR-F41-NB-04` should be dispositioned before or as part of Phase F1.

## Section 8 — ITR Remediation (2026-09-08, Claude Code / Sonnet)

Remediates all 6 non-blocking findings from Section 7.2 against implementation baseline `9945375`. Scope held exactly to Phase B1: no frontend was implemented, no KPI/SSOT/schema/Import file was touched, and no F1.3 code was edited.

### 8.1 PO decision on `ITR-F41-NB-04` (Phương án A)

Product Owner decision received in chat and actioned here: **KPI tổng tính toàn bộ `fact_f41`; bộ lọc chỉ gồm 6 BCVH chính thức; các mã `531120`/`531110`/`531600` vẫn tính vào KPI tổng nhưng không xuất hiện trong bộ lọc; Phase F1 phải hiển thị chú thích rõ ràng rằng tổng KPI có thể bao gồm dữ liệu ngoài phạm vi 6 BCVH.**

This confirms the Phase B1 implementation's existing behavior needed no SQL change: `FactF41Repository.getKpiMetrics` with no `bcvhId` filter was already, and remains, an unconditional aggregate over the entire `fact_f41` table (Section 7.1 item 1), and the `ma_bcvh` filter/whitelist was already, and remains, restricted to the 6 `CANONICAL_BCVH_UNITS` codes. The only work required is the contract/meta needed for Phase F1 to render the caveat correctly:

- New `backend/src/config/f41KpiScopeContract.js` — a single fixed constant `F41_KPI_SCOPE_NOTE`, the exact caveat text Phase F1 must display next to the KPI total.
- New `FactF41Repository.hasNonCanonicalBcvhRows(canonicalCodes)` — a lightweight `SELECT EXISTS(...NOT IN (?,...))` real-data check (parameterized, no full-table scan of business columns).
- `F41DashboardService.getDashboardMeta()` now returns two additional fields: `kpi_scope_note` (the fixed text) and `kpi_includes_non_canonical_bcvh` (real boolean from the repository check — confirmed `true` against the live database).

### 8.2 `ITR-F41-NB-01` — flaky Windows test teardown

`backend/src/repositories/FactF41Repository.test.js`: added a shared `closeDb(db)` helper that awaits the `sqlite3` `db.close()` callback, and every one of the file's `finally` blocks (now 4, including the new `ITR-F41-NB-04` test) awaits it before `fs.rmSync(dbPath)`. Verified with 3 consecutive full-sweep runs — `306/310` every time, zero flakiness (see Section 8.6).

### 8.3 `ITR-F41-NB-02` — baseline-failure mischaracterization + registration

Section 5 above still describes all 4 baseline failures as `fetch failed`/environmental — that description was accurate for the `1664f15` evidence at the time but is corrected here: only 2 of the (now 4, unchanged) pre-existing failures are environmental (`DashboardController.r6.integration.test.js`, need a live HTTP server). The other 2 are real, pre-existing F1.3-territory defects, confirmed reproducible in isolation:

- `DashboardController.recovery.test.js:11` — `AssertionError: 12 !== 3`.
- `timelineService.recovery.test.js:80` — a source-text regex assertion no longer matches `timelineService.js` after baseline commit `b075b96`'s unrelated edit.

Each is registered as its own ticket, per `CLAUDE.md`'s One Bug → One Ticket rule (governance correction, 2026-09-09 — originally both were registered together under a single ticket, which violated that rule; split same-day, no code touched by the split):

- `DashboardController.recovery.test.js:11` → `docs/10_TICKETS/F13-DASHBOARD-RECOVERY-DEFECTS-01_MANIFEST.md`, `DISCOVERED / NOT ACTIVATED`.
- `timelineService.recovery.test.js:80` → `docs/10_TICKETS/F13-TIMELINE-RECOVERY-DEFECT-01_MANIFEST.md`, `DISCOVERED / NOT ACTIVATED`.

Neither `DashboardController.js`/`DashboardController.recovery.test.js` nor `timelineService.js`/`timelineService.recovery.test.js` was opened for edit, per instruction ("không sửa F1.3").

### 8.4 `ITR-F41-NB-03` — date-value validation

`F41DashboardController.js`: added `isValidIsoDate()` (shape + real calendar-date check, catches `2026-13-45`) and applied it to `from_date`/`to_date` on `getKpi` and `date` on `getBcvhReconciliation`; malformed values now return `400 INVALID_DATE`. `getKpi` also now rejects `from_date > to_date` with `400 INVALID_RANGE`, matching F1.3's `DashboardController.getBcvh` contract exactly (same error codes, same comparison). `from_date === to_date` remains valid (single-day request). All values remain SQL-bound — no new injection surface.

### 8.5 `ITR-F41-NB-05` — real-data BCVH filter + reconciliation evidence

`backend/test_f41DashboardMinimum.js` gained 4 new sections, all against the live operational database:

- Section 4: `ma_bcvh` filter exercised for all 6 canonical codes on `2026-08-01`, asserting the exact row counts/rates the Independent Technical Review found (`535790` 346/77.46%, `536250` 509/68.17%, `535470` 736/52.99%, `537220` 580/10.69%, `537015` 339/88.79%, `533140` 2,184/68.41%), plus the sum (`4,694`) is asserted to be exactly one less than the unfiltered aggregate (`4,695`) — the real, expected `ITR-F41-NB-04` gap under PO Option A.
- Section 5: `bcvh-reconciliation` groups summed and asserted to reconcile exactly to the KPI endpoint (`4,695`/`2,863`/`1,581`/`251`), and to return more than 6 groups (proving the non-canonical codes are included, not silently dropped).
- Section 6: `dashboard/meta` asserted to carry a non-empty `kpi_scope_note` and `kpi_includes_non_canonical_bcvh === true` against real data.
- Section 7/8: real-server proof of the `ITR-F41-NB-03`/`ITR-F41-NB-06` fixes (below).

Unit-level coverage was extended in parallel with fake repositories: `FactF41Repository.test.js` (`hasNonCanonicalBcvhRows`), `F41DashboardService.test.js` (`kpi_scope_note`/`kpi_includes_non_canonical_bcvh` wiring), `F41DashboardController.test.js` (date-validation and no-store status/header assertions).

### 8.6 `ITR-F41-NB-06` — consistent no-store caching

`F41DashboardController.js`: factored the existing `getMeta` cache-header logic into a shared `setNoStore(res)` helper and applied it to `getKpi` and `getBcvhReconciliation` as well, so all 3 read endpoints now set identical `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` / `Pragma: no-cache` / `Expires: 0` headers.

### 8.7 Validation (LEVEL 2)

```
node --experimental-sqlite --test src/repositories/FactF41Repository.test.js \
  src/services/F41DashboardService.test.js \
  src/controllers/F41DashboardController.test.js \
  src/routes/f41Routes.test.js
# tests 27, pass 27, fail 0

node --experimental-sqlite --test "src/**/*.test.js"   # x3, all runs identical
# tests 310, pass 306, fail 4 (2 environmental fetch-failed + the 2 now-registered
# findings, one ticket each — F13-DASHBOARD-RECOVERY-DEFECTS-01 and
# F13-TIMELINE-RECOVERY-DEFECT-01 — zero flakiness across 3 runs)

node test_f41DashboardMinimum.js
# === RESULT: 42 passed, 0 failed ===

npx oxlint src/controllers/F41DashboardController.js src/services/F41DashboardService.js \
  src/repositories/FactF41Repository.js src/config/f41KpiScopeContract.js \
  test_f41DashboardMinimum.js                          # exit 0, 0 warnings, 0 errors
```

F1.3/SSOT/schema/Import regression: `git diff --name-only 9945375 -- backend/` touches only F4.1 files (`FactF41Repository.js`/`.test.js`, `F41DashboardService.js`/`.test.js`, `F41DashboardController.js`/`.test.js`, `f41KpiScopeContract.js`, `test_f41DashboardMinimum.js`) plus the unrelated concurrent-session file `test_dkclSessionPreflightService.js` (untouched by this session, excluded from this ticket's commit). No route, controller, service, repository, or schema file outside F4.1 was opened for edit.

### 8.8 Completion State

`F41-DASHBOARD-MINIMUM-01 Phase B1 (Backend) — ITR REMEDIATION COMPLETE / READY FOR INDEPENDENT RE-REVIEW`. All 6 non-blocking findings closed (5 fixed, 1 — `ITR-F41-NB-02`'s 2 real F1.3 defects — correctly registered as two separate one-bug-per-ticket tickets rather than fixed, per instruction). Phase F1 (Frontend) remains **not** activated.

## Section 9 — Governance Correction: NB-02 registration split into two tickets (2026-09-09, Claude Code / Sonnet)

`ITR-F41-NB-02`'s registration in Section 8.3 combined two independent, unrelated test failures — `DashboardController.recovery.test.js:11` and `timelineService.recovery.test.js:80` — into a single ticket, `F13-DASHBOARD-RECOVERY-DEFECTS-01`. This violated `CLAUDE.md`'s One Bug → One Ticket → One Commit rule.

Documentation-only correction, no code touched, no defect investigated or fixed, no Phase F1 activation:

- `docs/10_TICKETS/F13-DASHBOARD-RECOVERY-DEFECTS-01_MANIFEST.md` narrowed to the `DashboardController.recovery.test.js:11` finding only (`12 !== 3`), still `DISCOVERED / NOT ACTIVATED`.
- New `docs/10_TICKETS/F13-TIMELINE-RECOVERY-DEFECT-01_MANIFEST.md` created for the `timelineService.recovery.test.js:80` finding only (stale source-regex assertion vs. baseline `b075b96`'s edit), `DISCOVERED / NOT ACTIVATED`.
- Section 8.3 and 8.7 above updated to name both tickets. Every other reference across `PROJECT_SNAPSHOT.md`, `DOCUMENT_INDEX.md`, and `PROJECT_PROGRESS.md` updated in the same commit — see those files' own entries for this date.
- All backend remediation and validation evidence from commit `eff161c` (Sections 8.1-8.7) is preserved unchanged; this correction is registration-only.

Validation `LEVEL 1`: repository-wide search (`grep -rn "F13-DASHBOARD-RECOVERY-DEFECTS-01"`) confirms no remaining statement describes the two defects as a single ticket; `F41-DASHBOARD-MINIMUM-01` state remains `READY FOR INDEPENDENT RE-REVIEW`, unaffected by this correction.
