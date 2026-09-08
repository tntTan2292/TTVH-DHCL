# F41-DASHBOARD-MINIMUM-01 Manifest

Status: `PHASE B1 (BACKEND) ITR REMEDIATION COMPLETE / READY FOR INDEPENDENT RE-REVIEW (2026-09-08)`. All 6 non-blocking findings from the Independent Technical Review (`ITR-F41-NB-01`..`ITR-F41-NB-06`) remediated by Claude Code (Sonnet) - see Section 8. Phase F1 is not activated.

## 1. Ticket Information

- Ticket ID: `F41-DASHBOARD-MINIMUM-01`
- Ticket Name: `F4.1 Dashboard tối thiểu`
- Phase: `F4.1 Module — Dashboard, Phase B1 (Backend)`
- Owner: `Claude Code (Sonnet)`
- Governance Version: `V2 Active`
- Activation authority: Product Owner decision, received in chat and not yet recorded in the repository at receipt time: `"PO PASS / F41-PHASE-2 CLOSED — kích hoạt F4.1 Dashboard tối thiểu."` Recorded and actioned in this manifest and `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md` Section 1, which also closes `F41-PHASE-2` (`docs/10_TICKETS/F41-PHASE-2_MANIFEST.md`) as `CLOSED / PO PASS`.
- Branch: `codex/da-impl-006`
- Baseline commit: `b075b96`
- Activation date: `2026-09-08`

## 2. Objective

Implement Phase B1 (Backend) only of the F4.1 Dashboard tối thiểu: a read-only API under `/f41` exposing the already-locked KPI (`2.863/4.695 = 60,98%` for `2026-08-01`, total-rows denominator), with multi-day support and `admin`+`viewer` read access, in parallel with F1.3 (no F1.3 behavior change). Stop at `READY FOR INDEPENDENT TECHNICAL REVIEW` — no Product Owner PASS is self-awarded.

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md` (this ticket's evidence)
- `docs/10_TICKETS/F41-PHASE-2_MANIFEST.md` and `docs/06_REVIEWS/Shared/F41-PHASE-2_CHECKPOINT_001.md` — the closed predecessor; `fact_f41`/`fact_f41_national` schema and the real F4.1 HUE data this ticket reads.
- `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` — source of record for the total-rows denominator contract (`DC-2`) and the `60,98%` reconciliation baseline.

## 4. Scope

In scope:

- `GET /api/f41/dashboard/kpi` — KPI for a date range (`from_date`/`to_date`, both required), optional `ma_bcvh` filter against the shared canonical BCVH whitelist. Denominator = all rows.
- `GET /api/f41/dashboard/meta` — min/max available `ngay_do_kiem` in `fact_f41` plus the canonical BCVH unit list, for the frontend date picker (multi-day support).
- `GET /api/f41/dashboard/bcvh-reconciliation` — per-BCVH breakdown for one date.
- `admin` and `viewer` both read-authorized on all three.

Out of scope:

- Frontend (Phase F1, not started).
- BCVH Ranking, Evidence, Tuyến Ranking (F4.1 has none — no route column exists in the source, per `F41-MODULE-PLAN` discovery).
- Import, portal sync.
- Any SSOT or schema change — `fact_f41`/`fact_f41_national` are read-only in this ticket; only an additive `getMeta()` repository method was added, no new table/column.

## 5. Validation

Required and performed — Level 2 (new API contract for the module):

- Repository/service/controller/route unit tests: `17/17` pass.
- Full backend regression sweep: `296/300` pass; `4` pre-existing, unrelated `fetch failed` integration-test failures (require a live server this run did not start) — none reference F4.1.
- Real, read-only validation against the live operational database (`backend/test_f41DashboardMinimum.js`): reproduces `2.863/4.695 = 60,98%` for `2026-08-01` end-to-end through the new endpoint; multi-day range `2026-07-01..2026-09-06` confirmed non-degenerate; `fact_f13`/`fact_f41` row counts confirmed unchanged before/after (read-only, no writes).
- `oxlint`: `0`/`0` on the 5 touched files.
- F1.3 regression: `server.js`'s only change is additive (new route mount after the existing ones); no F1.3 file opened for edit; full sweep includes all existing F1.3 tests unaffected.

## 6. Completion State

Phase B1 (Backend) implemented. Full evidence in `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md`. Final state: `PHASE B1 (BACKEND) IMPLEMENTED / READY FOR INDEPENDENT TECHNICAL REVIEW`. Phase F1 (Frontend) is not started and requires its own activation.

## 7. Independent Technical Review of Phase B1 (2026-09-08, Claude Code / Opus, DEC-021)

Reviewed implementation commit `1664f15` (baseline `b075b96`; `22e34c4` is Governance-only), by a different model than the implementer, per `DEC-021`. Validation `LEVEL 3`, justified as the gate before Phase F1 activation. Read-only throughout — no business data written, no product code changed by the review. Full evidence: `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md` Section 7.

**Verdict: `INDEPENDENT TECHNICAL REVIEW PASS / READY FOR PHASE F1 ACTIVATION`. 0 BLOCKER, 6 NON-BLOCKING.**

All eleven required review items PASS: the F4.1 total-rows denominator is intact and `getKpiMetrics` genuinely unchanged; `2.863/4.695 = 60,98%` for `2026-08-01` was reproduced independently end-to-end; multi-day is truly additive (per-day sum `20,979` equals the range call for `2026-08-01..2026-08-05`) and the `ma_bcvh` filter was exercised against real data for all six canonical codes; `bcvh-reconciliation` reconciles exactly to the KPI endpoint (4,695 / 2,863 / 1,581 / 251) and does not distort the KPI module; the error contract matches F1.3 and every parameter is SQL-bound (injection tested, not possible); read access is `admin` + `viewer`, which is every role the system defines; the API is `GET`-only with no write path and `fact_f13`/`fact_f41` row counts were unchanged across the whole review; the `/api/f41` mount is additive and no F1.3 file was touched; the tests exercise real behavior beyond wiring; and Snapshot / Manifest / Checkpoint / `DOCUMENT_INDEX.md` / `PROJECT_PROGRESS.md` are mutually consistent.

Findings (details and exact remediation in checkpoint Section 7.2):

- `ITR-F41-NB-01` — the new `getMeta` repository test is flaky on Windows (`db.close()` not awaited before `fs.rmSync`, `EBUSY`); reproduced in 1 of 4 full sweeps, where the sweep reported `295/300` with an F4.1-referencing failure, contradicting the recorded evidence.
- `ITR-F41-NB-02` — checkpoint Section 5 describes all four baseline failures as `fetch failed`/environmental; only two are. The other two are real pre-existing F1.3 test failures and need their own ticket.
- `ITR-F41-NB-03` — no date-*value* validation: garbage, impossible and reversed date ranges return `200` with `total_rows: 0` instead of `400`. Consistent with F1.3's `getKpi`, but should be fixed before Phase F1 puts a date picker on this endpoint.
- `ITR-F41-NB-04` — the 6-code canonical BCVH whitelist does not cover 669 of 308,994 real `fact_f41` rows (codes `531120`/`531110`/`531600`), so filtered totals do not partition the aggregate (4,694 vs 4,695 on `2026-08-01`). Product Owner decision required on scope; Phase F1 must not present the filter as exhaustive.
- `ITR-F41-NB-05` — the real-database evidence script never exercised the `ma_bcvh` filter or `bcvh-reconciliation`; this review closed that gap, and the assertions should be folded into the script.
- `ITR-F41-NB-06` — `no-store` cache headers are set on `meta` but not on `kpi`/`bcvh-reconciliation`.

Full-sweep evidence verified by re-running four times: `296/300` with exactly the four claimed baseline failures in three runs, `295/300` in one (`ITR-F41-NB-01`). Targeted suite `17/17` and `oxlint` `0`/`0` reproduce exactly as claimed.

Phase F1 (Frontend) is **not** activated by this review and still requires its own explicit Product Owner activation. `ITR-F41-NB-01`, `ITR-F41-NB-03` and `ITR-F41-NB-04` should be dispositioned before or as part of Phase F1.

## 8. ITR Remediation (2026-09-08, Claude Code / Sonnet)

Full evidence: `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md` Section 8. Baseline `9945375`. Scope held exactly to Phase B1 — no frontend, no KPI/SSOT/schema/Import change, no F1.3 file edited.

- **PO decision on `ITR-F41-NB-04` (Phương án A):** KPI tổng tính toàn bộ `fact_f41` (already the existing behavior — no SQL change needed); bộ lọc chỉ gồm 6 BCVH chính thức (already the existing whitelist); `531120`/`531110`/`531600` vẫn tính vào KPI tổng nhưng không xuất hiện trong bộ lọc; Phase F1 phải hiển thị chú thích. Implemented: new `backend/src/config/f41KpiScopeContract.js` (fixed caveat text), new `FactF41Repository.hasNonCanonicalBcvhRows()`, and `dashboard/meta` now returns `kpi_scope_note` + `kpi_includes_non_canonical_bcvh` (real, confirmed `true` against live data).
- **`ITR-F41-NB-01` fixed:** `FactF41Repository.test.js` now awaits `db.close()` before `fs.rmSync` in all 4 tests. Verified with 3 consecutive full-sweep runs, zero flakiness.
- **`ITR-F41-NB-02` fixed (registered, not fixed):** checkpoint Section 5's mischaracterization corrected; the 2 real F1.3 defects registered as `docs/10_TICKETS/F13-DASHBOARD-RECOVERY-DEFECTS-01_MANIFEST.md`, `DISCOVERED / NOT ACTIVATED` — no F1.3 file touched.
- **`ITR-F41-NB-03` fixed:** `F41DashboardController.js` validates `from_date`/`to_date`/`date` (shape + calendar validity) → `400 INVALID_DATE`, and rejects `from_date > to_date` → `400 INVALID_RANGE` (matches F1.3's `getBcvh` contract).
- **`ITR-F41-NB-05` fixed:** `backend/test_f41DashboardMinimum.js` gained real-data assertions for the `ma_bcvh` filter (all 6 canonical codes) and `bcvh-reconciliation` (reconciles exactly to the KPI endpoint), plus unit-level coverage in the 3 fake-repository test files.
- **`ITR-F41-NB-06` fixed:** `no-store`/`no-cache`/`Expires:0` now applied consistently to all 3 read endpoints via a shared `setNoStore()` helper.

Validation LEVEL 2: targeted suite `27/27` pass; full sweep `306/310` pass, stable across 3 consecutive runs (4 failures = 2 environmental + the 2 now-registered `F13-DASHBOARD-RECOVERY-DEFECTS-01` findings); real-DB read-only script `42/42` pass; `oxlint` `0`/`0` on all touched files; `git diff --name-only 9945375 -- backend/` confirms only F4.1 files touched (plus the pre-existing, untouched, unrelated `test_dkclSessionPreflightService.js`).

Final state: `PHASE B1 (BACKEND) ITR REMEDIATION COMPLETE / READY FOR INDEPENDENT RE-REVIEW`. Phase F1 (Frontend) is not activated.
