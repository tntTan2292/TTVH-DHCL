# F11-PHASE-4 Manifest

Status: `IMPLEMENTED / TECH PASS / FIRST LIVE LOAD DONE / READY FOR PO REVIEW (2026-10-09)`. TCT national lane for F1.1: file reader, table, manual Import, and the national rank service (by delivering province, PD-17). No portal download, no dashboard screen yet.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Scope](#4-scope)
- [5. Changes Made](#5-changes-made)
- [6. Validation](#6-validation)
- [7. First Live Load](#7-first-live-load)
- [8. Residual / Notes](#8-residual--notes)
- [9. Next Ticket](#9-next-ticket)
- [10. PO Acceptance Checklist](#10-po-acceptance-checklist)

## 1. Ticket Information

- Ticket ID: `F11-PHASE-4` — `F1.1 Import (TCT lane) and national rank`
- Parent: `F11-MODULE-PLAN` (checkpoint Section 13 and 25.4); depends on `F11-PHASE-2`
- Owner: `Claude Code (Sonnet 5.5)`
- Authorization: `PO in chat 2026-10-09: "làm TCT trước"`; decisions PD-15..PD-17, Q-16
- Branch `codex/da-impl-006`; baseline `4339ff4`

## 2. Objective

Bring the TCT F1.1 national file into the system and compute "Vị thứ toàn quốc x/34" for Huế by the rule the PO set: group every row by **delivering province**, add numerators and denominators of all its rows, then compute the rate and rank (only the 34 national provinces/cities).

## 3. Current Status

- State: `IMPLEMENTED / TECH PASS`, first live load done and verified.
- PO UI Check Required: `No` for this ticket (no screen). The rank appears on screens in the Dashboard ticket.

## 4. Scope

In: table `fact_f11_national` (additive migration, startup-registered, mirrored in `schema.sql`), file reader, registry TCT lane (manual), import function and pipeline branch, `F11NationalRankService`, tests, one live load. Out: portal download (Phase 3), screens and API (Dashboard ticket), accept-side ranking (PD-15: none).

## 5. Changes Made

| File | Change |
| --- | --- |
| `backend/migrate_f11_phase4_schema.js` | `fact_f11_national`: 29 source columns (counts INTEGER, published percentages kept as raw text), `UNIQUE(ngay_do_kiem, ma_tinh_chap_nhan, ma_tinh_phat)`, indexes by date and by delivering province |
| `backend/src/services/f11TctExcelParser.js` | reads the real layout (header, sub-header, legend, grand-total row first); verifies the header anchors (drift → error naming the column); skips the grand-total row but **refuses the file if the total differs from the sum of the rows**; codes as text; duplicate province pair → error; all **34 ranked codes must be present as a delivering province** (row count not checked); date only from the file name |
| `backend/src/services/F11NationalRankService.js` | twin of `F41NationalRankService` (same methods/result shape): `getNationalRankSummary`, `getNationalRanksForDates`; **groups by `ma_tinh_phat`, sums `sl_dung_chi_tieu` / `sl_theo_chi_tieu` over all rows first**, ranks only the 34 frozen codes, ties by volume then code, label "Tỷ lệ KPI 2026 theo báo cáo toàn quốc" |
| `importIndicatorRegistry.js`, `importProcessor.js` (`importF11NationalParsedData`), `importPipeline.js` | TCT lane of F1.1 (manual); same transaction contract as F4.1/TCT |
| `server.js`, `src/db/schema.sql` | startup registration and fresh-database mirror |
| tests | `f11TctExcelParser.test.js` (9), `F11NationalRankService.test.js` (7), `migrate_f11_phase4_schema.test.js` (4), `test/f11TctFixture.js`, 3 new TCT tests in `test_f11ImportPipeline.js` |

## 6. Validation

- F1.1 suites together: **50/50 pass, 0 skipped** (real files present): TCT Huế row equals the Huế detail on the evaluated-rows view (co thông tin phát 2.621, theo chỉ tiêu 2.588, đúng 2.348, quá 240, ≤ 24 h 2.400, five elapsed bands 2.400 / 72 / 72 / 5 / 22).
- Rank on the real file (sandbox and live): **Huế 4th of 34, 90,7 %** (2.348 / 2.588); top five Cao Bằng, Quảng Trị, Lạng Sơn, Huế, Điện Biên; **Hà Nội 12th** (13 rows added: 30.036 / 25.787 = 85,85 %), **TP Hồ Chí Minh 18th**, Lai Châu last; the 34 ranked provinces cover 181.003 of 181.427 evaluated parcels. A synthetic test proves the PD-17 rule: a province whose own row is 90 % but whose second row is 70 % ranks at 80 %, not 90 %.
- Regression: F4.1/F1.3 import tests pass; full backend sweep **496/500**, the 4 failures are the known pre-existing ones (3 need an HTTP server, 1 timeline source-text assertion). `oxlint` 0 on all new files.

## 7. First Live Load

One-off observed run (2026-10-09): migration created `fact_f11_national`; the PO's single-day TCT file (SHA-256 `2bab3064…03cb9a`, from Downloads) was **copied** to `Data DKCL/F1.1/Incoming/TCT/F1.1-2026.10.07.xlsx` and imported through the pipeline (manual lane, no force): `total=84, inserted=84, skipped=0`. `fact_f11_national` = 84 rows; the Huế row (53 → 53) = Huế detail (2.621 / 2.588 / 2.348 / 240). `F11NationalRankService` on the live database: rank 4/34, 90,7 %, volume 2.588, passed 2.348. Other fact tables unchanged (`fact_f13` 891.465, `fact_f13_national` 9.350, `fact_f41` 847.008, `fact_f41_national` 6.460, `fact_f11` 2.621); `import_log` +1. The processed copy now sits in `Data DKCL/F1.1/Processed/TCT/F1.1-2026.10.07.xlsx` and is the reference for the real-file tests. The Downloads original is untouched. No backup taken (new table + one log row).

## 8. Residual / Notes

- Backend restart needed for the running server to know the F1.1 lanes and the new table at startup.
- The TCT rate is the **published** national rate (rows not yet evaluable are outside its denominator); the Huế dashboard rate counts them as 0 Đạt (PD-9): 90,7 % vs 89,58 % for 07/10. Both are correct and must be labelled apart on screens.
- Delivery codes outside the 34 (district centres, Bình Dương) are stored but not ranked (Q-16).
- The stray 16-byte `Data DKCL/F1.1/Incoming/TCT/test.xlsx` will now be picked up by the watcher at the next restart (the TCT lane exists): it will fail the file-name rule and be moved to `Error/TCT` with one error line; no data effect. The PO may delete it beforehand.

## 9. Next Ticket

`F11-PHASE-3` (portal probe and automatic download, needs the PO's session) and `F11-DASHBOARD-RANKING-01` (Dashboard, BCVH Ranking, pair table; Antigravity for screens, Opus review).

## 10. PO Acceptance Checklist

- Confirm "Huế 4th of 34, 90,7 %" for 07/10 and that Hà Nội 12th / Hồ Chí Minh 18th (rows added first) matches your own calculation.
- Restart the backend when convenient.
