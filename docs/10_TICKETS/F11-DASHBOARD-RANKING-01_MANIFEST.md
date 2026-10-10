# F11-DASHBOARD-RANKING-01 Manifest

Status: `BACKEND IMPLEMENTED / TECH PASS (2026-10-10)`; screens (Antigravity), independent review and PO UI check still to do. Read APIs for the F1.1 Operation Dashboard, BCVH Ranking and the accepting-office × delivering-BCVH pair table. No screen yet, no Evidence, no portal.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Design of Record](#3-design-of-record)
- [4. Changes Made (backend, T1/T2)](#4-changes-made-backend-t1t2)
- [5. Validation](#5-validation)
- [6. Open Items](#6-open-items)
- [7. Next Steps](#7-next-steps)

## 1. Ticket Information

- Ticket ID: `F11-DASHBOARD-RANKING-01` — `F1.1 Operation Dashboard + BCVH Ranking + pair table`
- Parent: `F11-MODULE-PLAN` (checkpoint Section 25.5); depends on `F11-PHASE-1/2/4`
- Owner: backend `Claude Code (Sonnet 5.5)`; screens `Antigravity`; independent review `Opus` (a model other than the implementer)
- Authorization: PO in chat 2026-10-08/09 ("Dashboard + BCVH Ranking như F1.3/F4.1, thêm bảng cặp, ngày/tuần/tháng, hiển thị toàn bộ, giao diện giao Antigravity"; PO: "tiếp tục nhé" 2026-10-10)
- Branch `codex/da-impl-006`; baseline `bbb6008`

## 2. Objective

Give F1.1 the same reading surface as F1.3/F4.1 — KPI cards with national rank "Vị thứ toàn quốc x/34", daily trend, six-BCVH ranking (day/week/month, comparisons), overview — plus the pair table PO asked for (accepting office in rows, delivering BCVH in columns, for a day, a Thursday–Wednesday week or a month, all offices).

## 3. Design of Record

- Metric (PD-9): volume = every row, passed = `danh_gia_2026 = 'Đạt'`, a blank evaluation counts as not passed and stays in the denominator; the blank count is reported separately (`total_blank`) for the later Evidence module.
- Module total (summary, daily trend, pair-table grand total) covers every row; ranking/overview/weekly/monthly cover the 6 canonical BCVH (PD-11). The six-unit total is therefore legitimately lower than the module total (07/10: 89,5 % vs 89,58 %).
- Reuse, not copy: `F11RankingService extends F41RankingService`, constructor-injected with `FactF11Repository` and `F11NationalRankService`; the shared `BcvhOverviewService` / `BcvhWeeklyComparisonService` run unchanged. `FactF11Repository` is generated from the F4.1 repository with the metric column swapped.
- National rank = published national rate by delivering province, rows added before the rate, 34 provinces (PD-17), computed by `F11NationalRankService` (Phase 4).
- Pair table (PD-8/PD-13): rows = every accepting office found in the data (name from the data, sorted by volume desc), columns = 6 canonical BCVH + `Khác` (every other delivery code, e.g. 531110/531120, so row totals and the grand total equal the module total). Each cell has volume, passed, failed, blank and rate (rate always computed from the summed counts, never averaged). Period: `period=day|week|month` + `anchor_date` (week = Thursday–Wednesday as F1.3, month = calendar month) or explicit `from_date`/`to_date`. An empty cell (no parcels) is `null`, not 0 %.
- Roles (Q-8): `admin` + `viewer` read, as `/api/f41`. Not asked of the PO again unless he wants it different.
- Not in this ticket: route ranking (Q-5a), accept-side ranking (PD-15), Evidence, Import UI.

## 4. Changes Made (backend, T1/T2)

| File | Role |
| --- | --- |
| `backend/src/repositories/FactF11Repository.js` | read queries over `fact_f11` (KPI, meta, overview daily/monthly/MTD, weeks/months lists, weekly trend/comparison, per-BCVH metrics, daily trend, latest import) + `getPairGrid`, `getDaysWithData` |
| `backend/src/services/F11RankingService.js` | the F4.1 service over the F1.1 stack + `getPairTable` and `resolvePeriod` |
| `backend/src/controllers/F11RankingController.js` | HTTP layer, 400 for bad parameters, no-store |
| `backend/src/routes/f11Routes.js`, `backend/server.js` | `/api/f11`: `dashboard/summary`, `dashboard/daily-trend`, `dashboard/pair-table`, `ranking/bcvh`, `ranking/bcvh/{overview,weeks,weekly-comparison,weekly-trend,months,monthly-comparison}` (same shapes as `/api/f41`) |
| `backend/src/services/F11RankingService.test.js` | 8 temp-DB tests (pair table day/week/month/empty/invalid, reconciliation with the module total, blank-as-not-passed, six-unit vs module total, controller) |
| `backend/src/services/F11RankingRealBaseline.test.js` | the PO's real 07/10 file loaded into a temp DB: 2.621 / 2.348 / 273 (240 + 33 blank) / 89,58 %, pair-grid sums |

## 5. Validation

- New tests 9/9; the F4.1 ranking and F1.1 national-rank suites are unchanged and pass (27/27 together with the new ones); routes load; lint clean.
- Read-only smoke on the real database (07/10): summary 2.621 / 2.348 / 89,58 %, national rank 4/34, BCVH ranking Thuận Hóa 95,1 % first … Phú Lộc 72,7 % sixth, six-unit total 89,5 %, week pair table 67 accepting offices with grand total = module total, overview returns monthly/daily/mtd/routes/meta.
- Backend must be restarted for `/api/f11` to exist (PO decides the time).

## 6. Open Items

- Q-5a (route ranking) and Q-9..Q-12 stay non-blocking. The pair table currently returns every accepting office (67 for 07/10); screen handling (sticky header, search, sort, export) is Antigravity's.
- Independent Opus review of the Design of Record and queries before the PO UI check.

## 7. Next Steps

1. Frontend: `F11_INDICATOR` config, pages `/f11/dashboard` and `/f11/ranking/bcvh` (+ pair table, day/week/month switch), navigation group — Antigravity, short prompt per `CODEX_PROMPT_STANDARD`.
2. Opus review; PO UI check (`READY FOR PO CHECK`).
3. Evidence ticket after the PO trains the violation stages.
