# F12-PHASE-0-4 Manifest

Status: `IMPLEMENTED / TECH PASS / FIRST LIVE LOAD DONE` (2026-10-11). F1.2 reference package (Phase 0), data foundation (Phase 1), Huế manual Import (Phase 2), TCT national lane and national rank (Phase 4). No portal download (Phase 3), no API or screen.

## 1. Ticket Information

- Ticket ID: `F12-PHASE-0-4` (F12-PHASE-0, F12-PHASE-1, F12-PHASE-2, F12-PHASE-4 delivered together, as the plan allows)
- Owner: `Claude Code`
- Activation authority: `PO chat 2026-10-11: "F1.2 là 95% nhé bắt đầu đi"` (target rate PD-F12-12, start of the F1.1-style build)
- Plan of record: `docs/06_REVIEWS/Shared/F12-MODULE-PLAN_CHECKPOINT_001.md` (Sections 2, 9, 10)
- Branch: `codex/da-impl-006`
- Does not change Current Ticket.

## 2. Required Reading

- `docs/06_REVIEWS/Shared/F12-MODULE-PLAN_CHECKPOINT_001.md`
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.2_chat_luong_thu_gom_lien_tinh/` (business rules, measurement, data blueprint)

## 3. Scope

In: reference package; `fact_f12` + `fact_f12_national` (migration `backend/migrate_f12_schema.js`, startup hook in `server.js`, `schema.sql` mirror); readers `f12HueExcelParser.js`, `f12TctExcelParser.js`; registry entry `F1.2` (`PLANNED`, lanes HUE/TCT `MANUAL_ONLY`); `importF12ParsedData` / `importF12NationalParsedData` and the pipeline branches; `F12NationalRankService` (F1.1 service with an F1.2 source); F1.2 option in the manual upload widget; tests; one live load.

Out: portal discovery and automatic download, refresh window (switched on with the automatic lanes, PD-F12-11), `/api/f12`, Dashboard / BCVH Ranking screens, any F1.1/F1.3/F4.1 behaviour change.

## 4. Changes

| Area | Change |
| --- | --- |
| Shared code | `F11NationalRankService` takes an optional rank source (table, unit/name/volume/passed columns, metric); the F1.1 default is unchanged and F1.1 tests still pass. `importProcessor` gains one F1.2 import routine used by both lanes (same transaction contract as F1.1). |
| Reader rules | Header-keyed; 12 required headers; codes as text; back-tick of the BĐ10 number removed; negative elapsed kept; duplicate parcel, unknown rating and a file whose BĐ10 day differs from the file-name day are refused (PD-F12-6). National: grand total = rows, 34 ranked provinces present, office/customer-level exports refused. |
| Frontend | `UploadWidget` option `F1.2`; Data Import Center caption. |

## 5. Validation

- New tests: `f12HueExcelParser.test.js` 9/9, `f12TctExcelParser.test.js` 5/5, `F12NationalRankService.test.js` 3/3, `migrate_f12_schema.test.js` 3/3, `test_f12ImportPipeline.js` 6/6 (incl. the two real files through both lanes: detail = national row 53).
- `F11NationalRankService.test.js` after the refactor: 7/7.
- Backend sweep `node --test --experimental-sqlite`: 530/535. The 5 failures are not F1.2: the 4 known pre-existing ones (live KPI DB/HTTP x3, monthly rank enrichment) and the F1.1 real TCT test, which fails on the uncommitted F1.1 TCT "KXD" change another session is making in `f11TctExcelParser.js` (not touched here). Root `test_*.js`: the only failures are in files unrelated to F1.2 (F1.1 TCT reconciliation for the same reason, scratch scripts, live-DB checks).
- Frontend: `oxlint` on the two changed files shows only two pre-existing warnings.

## 6. First Live Load (2026-10-11)

Migration applied to `backend/src/db/database.sqlite`; the PO's two files were copied (originals in `Downloads` untouched) to `Data DKCL/F1.2-2026.10.10.xlsx` and `Data DKCL/F1.2-TCT-2026.10.10.xlsx` (test fixtures, git-ignored), then copied into `Data DKCL/F1.2/Incoming/{HUE,TCT}/F1.2-2026.10.10.xlsx` and imported with `executeImport` (manual, no force):

- HUE: total 1 758, inserted 1 758 → `fact_f12` 1 758 rows, Đạt 1 620, Không đạt 138, 73 offices, 37 units, **92,15 %**; import_log 2533.
- TCT: total 53, inserted 53 → `fact_f12_national` 53 rows; row 53 = 1 758 / 1 620 / 138, chưa đủ thông tin 133; import_log 2534.
- National rank 10/10: **Huế 8 / 34** (92,2 %).
- Row counts before = after: `fact_f13` 899 517, `fact_f13_national` 9 418, `fact_f41` 1 291 569, `fact_f41_national` 9 384, `fact_f11` 430 125, `fact_f11_national` 22 034.

The running backend must be **restarted** to load the F1.2 registry entry (manual upload of F1.2 files and the folder watcher); the tables already exist.

## 7. Next

- `F12-PHASE-3`: portal discovery + automatic download (HUE detail, TCT summary) — needs the PO evidence pack as for F1.1 (report URL, filter profile, export store names), then the 3-day refresh window and backfill from 2026-01-01.
- `F12-DASHBOARD-RANKING-01` (`/api/f12`, day/week/month/12-month, unit → office, national rank) and `F12-DASHBOARD-UI-01` (Antigravity, Report Block UI Standard, target 95 %, teal family).
- PO UI Check Required: `No` for this ticket (no screen change beyond the upload option).
