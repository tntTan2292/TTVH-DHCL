# DA-IMPL-004-MTD Manifest

- Ticket ID: `DA-IMPL-004-MTD`
- Ticket Name: `Unified BCVH Monthly Cumulative Columns`
- Parent ticket: `DA-IMPL-004 Unified BCVH Analysis Table`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED / PO PASS`
- Technical Status: `PASS`
- Runtime Status: `TECHNICAL PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Activation authority: Product Owner request to add monthly cumulative values to the accepted Unified BCVH Analysis Table.
- Activation date: `2026-07-20`
- Implementation branch: `codex/da-impl-006`
- Relationship to `DA-IMPL-006`: supplemental DA-IMPL-004 table enhancement completed before `DA-IMPL-006` Checkpoint 002; handoff returns to `DA-IMPL-006` Checkpoint 002.

## Objective

Add a clearly separated month-to-date group to the existing Unified BCVH Analysis Table:

- `NGÀY ĐÁNH GIÁ — dd/MM/yyyy`: `Sản lượng`, `Đạt`, `Tỷ lệ đạt`, `D-1`, `D-7`, `Dữ liệu bổ sung`.
- `LŨY KẾ THÁNG — dd/MM–dd/MM/yyyy`: `Sản lượng`, `Δ SL`, `Tỷ lệ đạt`, `Δ Tỷ lệ`.

The calculation uses the month of the active dashboard end date and preserves sorting, pagination, filter context, comparison columns, and the `Chi tiết` action.

## Approved Business Rules

- Month-to-date period is based on the selected filter end date.
- Start date is always day `01` of that month.
- Cutoff date is the selected filter end date when data exists.
- If the selected filter end date is later than available data, use the latest available business-data date before it in the same month.
- The selected filter start date is not used for month-to-date calculation.
- Missing dates are not fabricated as zero rows.
- No data after the selected filter end date may be used.
- Per BCVH cumulative volume is the sum of shipments from day `01` through the cutoff date.
- Per BCVH cumulative pass rate is cumulative pass divided by cumulative volume times `100%`.
- The total row must be recalculated from summed cumulative pass and summed cumulative volume.
- Evaluation-day values must come from the effective final selected business date only, not from month-to-date values.
- If the selected end date is later than available data, both month-to-date and evaluation-day labels use the latest available date before the selected end date in the same month.
- Total row label is only `TỔNG CỘNG`; period labels belong in grouped table headers.
- Do not average daily percentages or average BCVH percentages.
- `Không đạt` must not be visible in the table, any preset, or the column-options menu.
- Display order is `BCVH`, `NGÀY ĐÁNH GIÁ`, `LŨY KẾ THÁNG`, `Chi tiết`.
- `NGÀY ĐÁNH GIÁ` is the primary operational analysis group; `LŨY KẾ THÁNG` is reference-only.
- Month-to-date comparison period is day `01` of the previous month through the same comparable day, not the full previous month.
- `Δ SL` is `(current cumulative volume - previous comparable cumulative volume) / previous comparable cumulative volume * 100`.
- `Δ Tỷ lệ` is current cumulative pass rate minus previous comparable cumulative pass rate.
- If the previous comparable period is missing or has zero volume, show `Chưa có dữ liệu`.

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/10_TICKETS/DA-IMPL-004_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-004_MANIFEST.md)
- [docs/06_REVIEWS/Dashboard/DA-IMPL-004_UNIFIED_BCVH_ANALYSIS_TABLE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-004_UNIFIED_BCVH_ANALYSIS_TABLE.md)
- [frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx)
- [frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js)
- [backend/src/controllers/DashboardController.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/controllers/DashboardController.js)
- [backend/src/services/F13DashboardService.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/F13DashboardService.js)
- [backend/src/repositories/FactBuuGuiRepository.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/repositories/FactBuuGuiRepository.js)
- [backend/src/routes/f13Routes.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/routes/f13Routes.js)

## Scope

- Extend the existing `GET /api/f13/ranking/bcvh` response with monthly cumulative fields, comparable previous-month cumulative fields, and evaluation-date metadata.
- Extend the existing Unified BCVH Analysis Table mapper and component to display separate month-to-date and evaluation-day groups with column visibility controls.
- Add focused tests for month-to-date cutoff, same-period previous-month comparison, evaluation-day binding, total-row recalculation, labels, column options, and no zero-filled missing dates.
- Create technical evidence and PO acceptance checklist.

## Exclusions

- No KPI formula changes.
- No SSOT changes.
- No database schema changes.
- No BCVH mapping changes.
- No AUTO-IMPORT changes.
- No TCT changes.
- No Route Performance Center changes.
- No Dashboard redesign or unrelated dashboard changes.
- No change to existing table sorting, pagination, filter context, or `Chi tiết` action.
- PO PASS recorded only from explicit Product Owner decision.

## Evidence Locations

- Technical evidence: `docs/06_REVIEWS/Dashboard/DA-IMPL-004-MTD_TECHNICAL_REVIEW.md`
- PO checklist: `docs/06_REVIEWS/Dashboard/DA-IMPL-004-MTD_PO_ACCEPTANCE_CHECKLIST.md`
- Manifest: `docs/10_TICKETS/DA-IMPL-004-MTD_MANIFEST.md`

## PO Acceptance Boundary

Product Owner explicitly accepted this ticket as `PO PASS` on `2026-07-20`. Final accepted adjustment: remove the duplicated `Đầy đủ` preset so `Tùy chọn cột` keeps only `Gọn`, `Mặc định`, approved optional column checkboxes, and `Khôi phục mặc định`.

## Next Ticket Handoff

Return to `DA-IMPL-006 Unified Action Center` Checkpoint 002 unless Product Owner changes priority.

## Current Blockers

- None.
