# F11-PHASE-1 Manifest

Status: `IMPLEMENTED / TECH PASS / READY FOR PO REVIEW (2026-10-09)`. Backend foundation only: table, file reader, blank-evaluation flag, tests. No Import wiring, no watcher, no API, no UI, and no data was loaded into the live database.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Scope](#5-scope)
- [6. Changes Made](#6-changes-made)
- [7. Validation](#7-validation)
- [8. Residual / Notes](#8-residual--notes)
- [9. Next Ticket](#9-next-ticket)
- [10. PO Acceptance Checklist](#10-po-acceptance-checklist)

## 1. Ticket Information

- Ticket ID: `F11-PHASE-1`
- Ticket Name: `F1.1 HUE data foundation`
- Parent: `F11-MODULE-PLAN` (checkpoint Section 13); depends on `F11-PHASE-0`
- Owner: `Claude Code (Sonnet 5.5)`; independent review of DC-1..DC-9 by Opus is still to be requested (DEC-021: the implementer does not self-approve)
- Activation authority: `PO in chat 2026-10-09: "Giờ làm bước 1 và 2 đi"`
- Branch: `codex/da-impl-006`; baseline `9cf7bc6`

## 2. Objective

Give F1.1 a place in the database for the Huế detail rows and a file reader that handles the portal's column drift, and prove with the real 2026-10-07 file that the agreed numbers come out.

## 3. Current Status

- State: `IMPLEMENTED / TECH PASS / READY FOR PO REVIEW`
- PO UI Check Required: `No` (no screen). The Product Owner reviews the numbers in Section 7.

## 4. Required Reading

`docs/07_REFERENCE/Domains/domain_quality_management/f1.1_chat_luong_toan_trinh_noi_tinh/` (`data_blueprint.md`, `measurement.md`, `testing_scenarios.md`) and checkpoint Section 12.

## 5. Scope

In: additive table `fact_f11` with 4 indexes, header-name file reader, file-name date rule, blank-evaluation reason helper, startup registration of the migration, tests. Out: Import pipeline/watcher/registry (Phase 2), portal (Phase 3), TCT table (Phase 4), API/UI, any change to `fact_f13`/`fact_f41`.

## 6. Changes Made

| File | Change |
| --- | --- |
| `backend/migrate_f11_phase1_schema.js` | creates `fact_f11` (55 source columns + system fields, `UNIQUE(ngay_do_kiem, ma_bg)`) and indexes `idx_f11_date`, `idx_f11_date_bcvh_eval`, `idx_f11_bcvh_date`, `idx_f11_date_pair_eval`; idempotent, inserts nothing |
| `backend/src/services/f11HueExcelParser.js` | reads by header name: 52 required (error names the missing one), 3 optional (NULL when absent), unknown extra headers reported; codes as TEXT; date only from file name `F1.1-YYYY.MM.DD.xlsx` (real calendar date) |
| `backend/src/services/f11EvaluationFlags.js` | derived reason for a blank `Đánh giá 2026` (PD-9): `CHUA_PTC`, `PTC_SAU_NGAY_DO_KIEM`, `THIEU_CHI_TIEU_PHUONG`, `KHAC`; read-time only |
| `backend/server.js` | registers the migration in the startup list (table appears at the next backend restart) |
| `backend/src/db/schema.sql` | mirrors the table for fresh databases |
| tests | `migrate_f11_phase1_schema.test.js` (6), `src/services/f11HueExcelParser.test.js` (10 incl. the real-file baseline) |

## 7. Validation

- `node --test migrate_f11_phase1_schema.test.js src/services/f11HueExcelParser.test.js` — **16/16 pass**, the real-file test **not skipped**.
- Real file `Data DKCL/F1.1-2026.10.07.xlsx` (SHA-256 `11aa0168…573d8c`, unchanged before and after), parsed and loaded into a **temporary** database: 2.621 rows, 0 duplicate parcel numbers, Đạt 2.348, Không đạt 240, blank 33 (13 + 1 + 19); module rate **89,58 %**, six BCVH **89,54 %**; all eight per-unit rows equal `measurement.md` §6; the accepting-office × delivering-unit grid sums to 2.621 / 2.348 and to each unit's total; the portal-style evaluated-rows count (2.588) is reproduced separately and not used as the rate.
- Full backend sweep `node --test --experimental-sqlite`: **470/474**. The 4 failures are the known pre-existing ones, none F1.1-related: 3 tests that need a separately running HTTP server (live KPI payload, invalid code 400, normalisation) and 1 source-text assertion in `timelineService.recovery.test.js` (registered as F13-TIMELINE-RECOVERY-DEFECT-01). `server.startupMigrations.test.js` 1/1 and `test_importPipelineRace.js` 1/1 (schema.sql consumers) pass.
- `oxlint` 1.87.0 on the 5 new/changed source files: 0 warnings, 0 errors.
- Live database untouched: no data was inserted; the live table is created only by the next backend start.

## 8. Residual / Notes

- Opus independent review of the data design has not been run yet (planned before Phase 2).
- **Q-15 stays open**: the TCT reference file's Huế row equals the 07/10 detail plus a second block of 1.982 / 1.950 / 1.665 parcels. Either the TCT download spans two days or the Huế detail download covers only part of 07/10 (checkpoint Section 25). It does not affect this phase (the baseline is "the file as given") but it must be settled before Phase 2/3 rely on the Huế detail being the whole day.

## 9. Next Ticket

`F11-PHASE-2` (Import Huế through the Import Center, with a deliberate first load) and `F11-PHASE-3` (read-only portal probe, then automatic download). Both need explicit Product Owner authorization; Phase 2 should wait for the Q-15 answer.

## 10. PO Acceptance Checklist

- Read the numbers in Section 7 against `measurement.md` §6: 89,58 % / 89,54 % and the per-unit rates.
- Confirm that the table, file reader and blank-reason helper may be considered the F1.1 foundation.
