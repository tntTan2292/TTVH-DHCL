# F41-DASHBOARD-MINIMUM-01 Manifest

Status: `PHASE B1 (BACKEND) IMPLEMENTED / READY FOR INDEPENDENT TECHNICAL REVIEW (2026-09-08)`.

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
