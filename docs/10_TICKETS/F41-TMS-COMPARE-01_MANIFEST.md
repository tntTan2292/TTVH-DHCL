# F41-TMS-COMPARE-01 - "Không đo TMS" rate and "chưa có đánh giá Có TMS" share beside the F4.1 rate

Status: BACKEND IMPLEMENTED (2026-10-29); UI (Antigravity) NOT STARTED
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

## 7. Operation steps (PO restarts, Claude Code runs the rest)

1. Backend restart (pauses the backfill; PO presses Tiếp tục Run afterwards if it was running). Startup adds the column; until step 2 the F4.1 read stays on the detail table, so nothing shows a wrong zero.
2. `node scripts/agg_tool.js build --indicator F4.1` then `verify` (days rebuilt one by one, safe beside imports).

## 8. Residuals

- UI not built yet; the new fields are not shown anywhere until the Antigravity step.
- Weekly/monthly comparison blocks and the Home cards do not carry the new figures (phase 2 on request).
