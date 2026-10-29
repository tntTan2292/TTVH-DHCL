# F41-TMS-COMPARE-01 - "Không đo TMS" rate and "chưa có đánh giá Có TMS" share beside the F4.1 rate

Status: BACKEND LIVE; UI IMPLEMENTED AND OPUS-REVIEWED (2026-10-29); READY FOR PO CHECK
Owner: Claude Code (Sonnet) backend; Antigravity (Gemini) UI. Does not change the Current Ticket.

## 1. PO request and decisions (2026-10-29)

Show the evaluation column `Đánh giá (thời gian Không đo TMS PTC 8 giờ)` (`danh_gia_khong_tms_ptc_8h`) beside the F4.1 rate so leaders see TMS scan compliance across the BCVH at a glance. Approved plan:

- Column 1 "Tỷ lệ đạt (không đo TMS)" = Đạt on that column / total rows (same denominator as the main rate, PO-2).
- Column 2 "% chưa có đánh giá Có TMS" = rows with a blank `danh_gia_co_tms_ptc_8h` / total rows.
- Both informational: neutral colour (no band colouring), no target line; ranking and main rate stay on `Có TMS`.
- Phase 1 places: Home, F4.1 Dashboard operation table, F4.1 BCVH Ranking day table. Weekly/monthly comparison blocks are phase 2 (not now). Other indicators unchanged.

Formulas recorded in `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/measurement.md` Section 8.

## 2. Finding that shaped the design (real data, 2026-10-28, 5,329 rows)

`Có TMS` is blank exactly where the TMS scan time is missing (211/211 rows checked); `Không đo TMS` is filled for those rows. The two rates are two measures of the same parcels, so the gap can have either sign per BCVH (e.g. Hương Thủy 71.4 % Có TMS vs 58.5 % Không đo TMS; Thuận Hóa 75.2 % vs 78.0 %). Do not present the new column as an "ideal" or as a target. The blank share also contains parcels without PTC; the label says "chưa có đánh giá", never "không quét TMS".

## 3. Backend delivered

| What | Where |
| --- | --- |
| Counter `n_dat_khong_tms` in `agg_f41_day` (`DEFAULT 0`), added to existing databases at startup; the migration drops the F4.1 day signatures so the read fuse answers from the detail table until the rebuild | `backend/migrate_perf_load_01_agg_schema.js`, `backend/src/db/schema.sql`, `backend/src/services/aggMaintenance.js` |
| `altPassed()` in the SQL source (detail and aggregate forms) | `backend/src/repositories/aggSqlSource.js` |
| F4.1 queries return the two counts: ranking/operation metrics (`dat_khong_tms`, `trong_co_tms`), overview day and month-to-date (`passed_no_tms`, `blank_tms`) | `backend/src/repositories/FactF41Repository.js` |
| Output fields (only when the repository supplies them; other indicators get no extra keys) | `F41RankingService.js` (ranking rows and `meta.total_row`), `bcvhOverviewService.js` (`daily[]`, `mtd[]`), `HomeExecutiveService.js` (`focus_units.items[]`) |

## 4. API contract for the UI (field names are final)

Per BCVH row, F4.1 only: `passed_no_tms` (count), `rate_no_tms` (percent), `blank_tms` (count), `rate_blank_tms` (percent).

| Place | Endpoint / path | Rows |
| --- | --- | --- |
| Home block "Chất lượng các BCVH" | `GET /api/home/executive` -> `indicators[id=f41].focus_units.items[]` | `rate_no_tms`, `rate_blank_tms` (1 decimal) |
| F4.1 Dashboard operation table | `/f41/ranking/bcvh/overview` -> `mtd[]` (month-to-date group) and `daily[]` (day group, filter the shown date) | all four fields (4 decimals) |
| F4.1 BCVH Ranking day table | `/f41/ranking/bcvh` -> `data[]` and `meta.total_row` | all four fields (1 decimal) |

Missing field = show "—", never 0. F1.1, F1.2, F1.3, F4.2 payloads are byte-identical to before.

## 5. UI scope (Antigravity, after the backend is live)

Add the two columns, only when `indicator.id === 'f41'`, in: `ActionUnitsBlock.jsx` (Home), `BcvhOperationTable.jsx` plus its data mapper `bcvhOperationTableData.js` (one pair per group: month-to-date and day), `UnifiedBcvhAnalysisTable.jsx` plus `unifiedBcvhAnalysisTableData.js` (current-day group only). Headers: "Tỷ lệ đạt (không đo TMS)" and "% chưa có đánh giá Có TMS". Neutral colour, no target line, sortable by clicking the title, included in the picture capture, "—" when missing, keep each table readable at laptop width (shorten nothing else). Follow `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (undefined-identifier check before handover).

Required Reading: this manifest, `report_block_ui_standard.md`, `measurement.md` Section 8.

## 6. Validation done (backend)

- New: `test_aggMaintenance.js` 12/12 (counter stored per day and unit; migration adds the column to an older table, drops only F4.1 signatures, rebuild restores them), `test_aggReadF41.js` 10/10 (every read method equal from detail and aggregate with the new column populated; new exact-count test), `F41RankingService.test.js` / `bcvhOverviewService.test.js` / `HomeExecutiveService.test.js` 53/53 (new fields present for F4.1, absent for the others).
- Unchanged and green: `test_aggReadF13/F11/F12.js`, `test_f41DashboardMinimum.js`, `test_f41HueExcelParser.js`, `test_f41ImportPipeline.js`; 26 other F4.1/Home/ranking/dashboard unit-test files 250/251.
- Real data on a copy of `fact_f41` (2026-09-01..2026-10-28, 297,206 rows): migration, `agg_tool build` + `verify` OK (58 days, 420 keys); ranking and overview answers identical from the detail table and from the aggregate; 2026-10-28 per BCVH equals an independent SQL count (e.g. Hương Thủy 461 Đạt / 151 blank of 788; total 71.5 % Không đo TMS, 8.3 % blank).
- Failures seen and not caused by this change: `DashboardController.recovery.test.js` (F1.3, 12 !== 3 calls) and `test_f41RankingReconciliation.js` sections 4-5 (compares the live database with figures locked when only July-September existed; the database now holds January onward and a re-imported 2026-09-05). Neither touches the F4.1 queries changed here. Not re-run on the previous commit to prove they were already failing.

## 7. Operation steps (done 2026-10-29)

- No backfill job was queued or running; backend restarted at 08:49 (the supervisor started the new process, PID 4688). Startup added `n_dat_khong_tms` and emptied the F4.1 signatures, so reads stayed on the detail table meanwhile.
- `node scripts/agg_tool.js build --indicator F4.1`: 295 days, 2,185 agg rows, 3.6 s. `verify`: OK (1,418,173 detail rows = aggregate, 295/295 days).
- Live check through the services (read only): ranking and overview identical from the detail table and from the aggregate for 2026-10-28; Không đo TMS / chưa có đánh giá Có TMS match Section 6 (e.g. Hương Thủy 58.5 % / 19.2 %). The endpoints were not called with a login (RBAC).

## 7b. UI delivered, Opus review and fixes (2026-10-29)

Antigravity added the columns in `ActionUnitsBlock.jsx`, `BcvhOperationTable.jsx` (+ `bcvhOperationTableData.js`) and `UnifiedBcvhAnalysisTable.jsx` (+ `unifiedBcvhAnalysisTableData.js`). Opus review (review only) found, and Claude Code fixed:

- HIGH: the F4.1 operation table lost its `colgroup` (`table-fixed` then splits 14 / 16 columns equally, "Tên bưu cục" squeezed to about 95 px). Fixed: its own `colgroup` for F4.1 (`f41ColumnWidths`, weights turned into exact percentages), placed after the unchanged original one.
- MEDIUM: the Home block would scroll sideways with the long uppercase headers. Fixed by the PO's standing Home rule (report_block_ui_standard.md, "Home page exception"): short labels "Không đo TMS" and "% chưa ĐG TMS" on Home, the full wording ("Tỷ lệ đạt (không đo TMS)", "% chưa có đánh giá Có TMS") in the tooltip. The Dashboard and Ranking tables keep the full headers of Section 5.
- LOW: the operation-table total took its numerator from the units that carry the figures but its denominator from all units. Fixed: the denominator is the volume of those units only (a unit without the figures is left out, never lowers the rate).

Validation: 67/67 tests (operation-table data incl. a mixed-data case, ranking-table data, `f41Pages.test.js` incl. colgroup and Home label checks, Home, report-block standard, home sort), `vite build` OK, `oxlint -D no-undef` only the known browser globals. Not seen in a browser (layout of the colgroup comes from table-fixed rules, not a screenshot).

## 7c. PO UI check

1. Home, F4.1 tab: block "Chất lượng các BCVH" shows "Không đo TMS" and "% chưa ĐG TMS" (hover shows the full wording); click each title to order; no sideways scroll.
2. F4.1 Dashboard operation table: two extra columns in "Lũy kế tháng" and two in "Điều hành ngày", the unit name column still readable, total row filled; also with "Hiện số tháng trước" on.
3. F4.1 BCVH Ranking day table: two extra columns after "Tỷ lệ" in the current-day group; total row filled; the camera picture includes them.
4. F1.1, F1.2, F1.3, F4.2 tables look as before.

## 7d. PO amendment after the first look (2026-10-29)

PO saw the Home block and asked to remove two columns there as redundant: "% chưa ĐG TMS" and "Không đạt", for F4.1 only. Home F4.1 now shows: BCVH, Tỷ lệ, Không đo TMS, Sản lượng. The other indicators' Home blocks keep "Không đạt". The "% chưa có đánh giá Có TMS" column stays on the F4.1 Dashboard operation table and the BCVH Ranking day table (Section 5); the Home API still sends `rate_blank_tms` (unused there). Section 4/5 above are read with this exception.

## 7e. PO amendment: no "% chưa có đánh giá Có TMS" column anywhere (2026-10-29)

The PO asked to drop the "% chưa có đánh giá Có TMS" column from the tables too (it takes too much room). The F4.1 Dashboard operation table now has one extra column per group ("Tỷ lệ đạt (không đo TMS)" in Lũy kế tháng and in Điều hành ngày; colgroup 12 / 14 columns) and the BCVH Ranking day table one extra column in the current-day group. Together with 7d, the only new figure on screen is the Không đo TMS rate. The backend still computes `blank_tms` / `rate_blank_tms` (kept, no screen reads them) and the data mappers still carry them.

## 7f. Phase 2 requested by the PO: weekly comparison block (2026-10-29)

The PO saw that "Bảng tổng hợp so sánh chất lượng F4.1 theo tuần tại các BCVH" (BCVH Ranking, `BcvhWeeklyComparisonBlock.jsx`) has no Không đo TMS rate. Backend done: `GET /f41/ranking/bcvh/weekly-comparison` (and the month comparison and the 7-day window, same builder) now return, inside `rows[].current`, `rows[].compare`, `total_row.current` and `total_row.compare`, two extra keys: `passed_no_tms` (count) and `rate_no_tms` (percent, 4 decimals, over the period's total rows). The total is the summed count over the summed volume; a unit with no row in the period counts 0. F1.1, F1.2, F1.3, F4.2 payloads have no extra keys. Tests: `bcvhWeeklyComparisonService.test.js`, `F41RankingService.test.js` (week and month), parity from detail and aggregate on a copy of the real data (week 42 vs 41: Hương Thủy 39.2 % vs 48.0 % Không đo TMS).

UI scope (Antigravity): one column "Tỷ lệ đạt (không đo TMS)" in each of the two period groups ("Tuần kỳ này", "Tuần so sánh"; the same block also serves the month comparison), only when `indicator.id === 'f41'`, right after "Tỷ lệ đạt F4.1"; neutral colour, no band colouring, no target line; no new delta column; sortable, in the picture; give the 12-column table (14 with the extra two) its widths explicitly (the block is `table-fixed`, see 7b).

## 8. Residuals

- PO UI check pending (Section 7c).
- Weekly/monthly comparison blocks and the Home cards do not carry the new figures (phase 2 on request).
