# F42-PHASE-0-4 Manifest

Status: `IMPLEMENTED / TECH PASS / FIRST LIVE LOAD DONE` (2026-10-26). F4.2 reference package (Phase 0), data foundation (Phase 1), Huế manual Import (Phase 2), TCT national lane and national rank (Phase 4). No portal download (Phase 3), no API or screen.

## 1. Ticket Information

- Ticket ID: `F42-PHASE-0-4` (F42-PHASE-0, F42-PHASE-1, F42-PHASE-2, F42-PHASE-4 delivered together, as the plan allows)
- Owner: `Claude Code`
- Activation authority: `PO chat 2026-10-26: start F42-PHASE-0/1/2/4 (reference package, fact_f42 and fact_f42_national, HUE CSV and TCT XLSX parsers, registry, manual Import, trial load of 10/10 reconciled to 4475/6466)`
- Plan of record: `docs/06_REVIEWS/Shared/F42-MODULE-PLAN_CHECKPOINT_001.md` (Sections 1, 5)
- Branch: `codex/da-impl-006`
- Does not change Current Ticket.

## 2. Required Reading

- `docs/06_REVIEWS/Shared/F42-MODULE-PLAN_CHECKPOINT_001.md`
- `docs/07_REFERENCE/Domains/domain_quality_management/f4.2_chat_luong_phat_giao_buu_ta/` (business rules, measurement, data blueprint)

## 3. Scope

In: reference package; `fact_f42` + `fact_f42_national` (migration `backend/migrate_f42_schema.js`, startup hook in `server.js`, `schema.sql` mirror); readers `f42HueParser.js` (CSV or Excel), `f42TctParser.js`; registry entry `F4.2` (`PLANNED`, lanes HUE/TCT `MANUAL_ONLY`); `importF42ParsedData` / `importF42NationalParsedData` (the F1.2 row-import routine now takes the indicator) and the pipeline branches; `F42NationalRankService`; watcher accepts `F4.2-*.csv`; F4.2 option and `.csv` for F4.2/HUE in the manual upload widget; tests; one live load.

Out: portal discovery and automatic download, `/api/f42`, Dashboard / BCVH Ranking / postman screens, RBAC indicator scope, PERF-LOAD day aggregate, any F1.1/F1.2/F1.3/F4.1 behaviour change.

## 4. Changes

| Area | Change |
| --- | --- |
| Rate | Numerator = rows rated `Đạt`; denominator = every GBT row of the day, blank ratings included (PD-F42-2); portal rating and elapsed time stored as given. |
| HUE reader | Header-keyed (padded headers tolerated); 12 required headers; CSV rows widened by unquoted commas in `Tên KHL` are re-joined by anchoring on the GBT timestamp and verified (114 rows on 10/10); key (parcel, postman, GBT time); file-name day must match the GBT day; unknown rating, malformed elapsed time, missing GBT refuse the file. |
| TCT reader | Postman-level national file; published grand total must equal the sum of all 13 665 rows; rows added up per province and only the 34 ranked provinces are stored (light DB); all 34 must be present; Excel only. |
| Shared code | `importF12RowsIntoTable` gets an `indicator` parameter (default F1.2, unchanged). |
| Frontend | `UploadWidget` option `F4.2` and `.csv` for F4.2/HUE; Data Import Center caption. |

## 5. Validation

- New tests: `f42HueParser.test.js` 14/14 with the real file, `f42TctParser.test.js` 6/6 (the real-file cases skip when the PO files are absent), `F42NationalRankService.test.js` 3/3, `migrate_f42_schema.test.js` 4/4, `test_f42ImportPipeline.js` 6/6 (incl. the two real files through both lanes: detail = national row 53).
- Backend sweep `node --test --experimental-sqlite`: 697/705, 5 skipped, 3 failures = the 3 known pre-existing (KPI normalisation, real single-day TCT F4.1 file, monthly rank enrichment); `test_f12ImportPipeline.js` 6/6, `test_f41ImportPipeline.js`, `test_importProcessor.js` pass.
- Frontend: `oxlint` on the two changed files shows only two pre-existing warnings.

## 6. First Live Load (2026-10-26)

Migration applied to `backend/src/db/database.sqlite`; the PO's two files were copied (originals in `Downloads` untouched) to `Data DKCL/F4.2-2026.10.10.csv` and `Data DKCL/F4.2-TCT-2026.10.10.xlsx` (test fixtures, git-ignored), then copied into `Data DKCL/F4.2/Incoming/{HUE,TCT}/` and imported with `executeImport` (manual, no force):

- HUE: total 6 466, inserted 6 466 → `fact_f42` Đạt 4 475, Không đạt 757, blank 1 234, 128 postmen, 6 BCVH, **69,21 %** = DKCL screen (columns 14 / 17 / 18).
- TCT: total 34, inserted 34 → `fact_f42_national` row 53 = 6 466 / 5 232 / 4 475, 128 postmen.
- National rank 10/10: **Huế 26 / 34** (69,2 %).
- Row counts before = after: `fact_f13` 954 666, `fact_f13_national` 9 928, `fact_f41` 1 401 988, `fact_f41_national` 9 928, `fact_f11` 451 283, `fact_f11_national` 23 149, `fact_f12` 460 413, `fact_f12_national` 15 361.

The running backend must be **restarted** to load the F4.2 registry entry (manual upload of F4.2 files and the folder watcher); the tables already exist.

## 7. Next

- `F42-PHASE-3`: portal discovery + automatic download (HUE detail CSV, TCT national postman report): needs the PO evidence pack (report identity, filter profile, export store names); then refresh window and backfill from 2026-01-01.
- `F42-DASHBOARD-RANKING-01` (`/api/f42`, BCVH day/week/month, postman table per BCVH, national rank, RBAC indicator scope, PERF-LOAD switch) and `F42-DASHBOARD-UI-01` (Antigravity, Report Block UI Standard, target 90 %, own light colour family).
- PO UI Check Required: `No` for this ticket (no screen change beyond the upload option).
