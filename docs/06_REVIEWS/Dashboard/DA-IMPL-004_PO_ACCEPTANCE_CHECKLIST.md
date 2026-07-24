# DA-IMPL-004 Product Owner Acceptance Checklist

- Ticket: `DA-IMPL-004`
- Status for PO review: `COMPLETED / PO PASS`
- Module: Smart Leadership Dashboard - Unified BCVH Analysis Table
- Branch/build under review: `codex/da-impl-004`
- PO instruction: record `PASS`, `WARNING`, or `FAIL` for each item. Do not mark `PO PASS` unless all required business expectations pass or warnings are explicitly accepted.
- Product Owner final result: `PO PASS` on `2026-07-20`.
- Accepted note: the destination Route Performance Center remains runtime-incomplete by existing scope and is not a DA-IMPL-004 defect.

## Preconditions

- Backend is running on the normal project backend configuration, expected API base `http://localhost:5050/api`.
- Frontend is running from the DA-IMPL-004 build or dev runtime connected to the same backend.
- Test data includes `2026-07-19`; this date returned BCVH ranking rows during PO defect-fix validation.
- Product Owner has access to the dashboard page.
- No browser screenshot or visual-polish approval is required for this technical handoff unless PO chooses to record evidence.

## Page and Filter

Open:

- `/f13/dashboard`

Use filter:

- `from_date`: `2026-07-19`
- `to_date`: `2026-07-19`
- `ma_bcvh`: `Tất cả BCVH` / `all`

Expected business result:

- The dashboard opens normally.
- The module titled `Bảng phân tích BCVH thống nhất` appears in the existing BCVH operation/detail area.
- Other dashboard sections remain present and are not replaced by this ticket.

## Acceptance Checklist

| Item | What PO should do | Expected observable result | PO Result | Comment | Defect ID |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/f13/dashboard`. | Dashboard loads and shows the unified BCVH table in the BCVH detail section. | PASS | Unified BCVH analysis table accepted. |  |
| 2 | Set `from_date=2026-07-19`, `to_date=2026-07-19`, `ma_bcvh=all`. | Table context shows `2026-07-19` to `2026-07-19`; ranking rows are based on the selected date context. | PASS | Date context synchronization accepted. |  |
| 3 | Inspect the first BCVH rows. | Each row shows BCVH name, BCVH code, rank, volume, pass count, fail count, KPI, D-1 comparison, and D-7 comparison where API data exists. | PASS | Unified table rows accepted. |  |
| 4 | Inspect volume/pass/fail/KPI values. | Values match the backend ranking contract for `2026-07-19`, for example technical check returned `BCVH A Lưới` with volume `94`, pass `70`, fail `24`, KPI `74.5%`. | PASS | Field mapping accepted. |  |
| 5 | Inspect prior-period columns. | `So với D-1` and `So với D-7` display signed percentage-point deltas when supplied by the backend. | PASS | Comparison display accepted. |  |
| 6 | Inspect `Chuyển hoàn`. | `Chuyển hoàn` is displayed as `Sản lượng - Đạt - Không đạt`; for `BCVH A Lưới` on `2026-07-19`, expected value is `0`. | PASS | Chuyển hoàn reconciliation accepted. |  |
| 6A | Inspect the total row `Chuyển hoàn`. | Total row follows `Sản lượng = Đạt + Không đạt + Chuyển hoàn`; technical check for `2026-07-19` returned volume `537`, pass `337`, fail `188`, therefore `Chuyển hoàn = 12`. | PASS | Total reconciliation accepted. |  |
| 6B | Inspect terminology in the table. | The table says `Chuyển hoàn`; it does not show `Thiếu`, `unknown`, or `Thiếu/chuyển hoàn` for this quantity. | PASS | Terminology accepted. |  |
| 6C | Inspect remaining unavailable optional data. | Row trend and warning still show `Chưa có dữ liệu` unless an existing authoritative API field supplies them. | PASS | Existing-contract boundary accepted. |  |
| 7 | Confirm no unauthorized warning threshold. | The table does not label warning level based only on local `70/60/50` KPI cutoffs. | PASS | No new threshold accepted. |  |
| 8 | Observe loading behavior by refreshing the page. | While loading, the table area shows `Đang tải bảng phân tích BCVH...`. | PASS | Loading behavior accepted. |  |
| 9 | Use a date with no ranking data, such as `1900-01-01` to `1900-01-01`, if the environment permits. | The table shows an empty state: no BCVH rows are fabricated. | PASS | Empty state accepted. |  |
| 10 | Simulate or encounter an API error, if the environment permits. | The table shows `Không thể tải bảng phân tích BCVH` and a `Thử lại` action. | PASS | Error state accepted. |  |
| 11 | Click `Chi tiết` on a normal BCVH row. | Navigation goes to `/f13/ranking/route` with `from_date`, `to_date`, `interval`, `bcvh_id`, and `bcvh_name` in the URL. | PASS | Detail navigation accepted. |  |
| 12 | Inspect the total row. | The total row is informational and does not behave like a BCVH detail row. | PASS | Total row behavior accepted. |  |
| 13 | Verify route-detail scope. | Route-detail page behavior is unchanged; this ticket only preserves navigation compatibility and does not repair or expand the mock route-detail page. | PASS | Route Performance Center runtime incompleteness accepted as existing scope, not a DA-IMPL-004 defect. |  |
| 14 | Verify dashboard filters remain usable. | Existing date/BCVH filter controls remain available and continue to drive dashboard data refresh. | PASS | Filter behavior accepted. |  |
| 14A | Change the date filter from `2026-07-15` to `2026-07-19`. | The table clears/reloads and then shows row context `2026-07-19`; old `2026-07-15` row context must not remain visible after the reload completes. | PASS | Date context synchronization accepted. |  |
| 15 | Confirm no excluded scope appears. | No TCT, AUTO-IMPORT, KPI formula, BCVH mapping, schema, new threshold, unattended scheduling, or force-replacement behavior is added. | PASS | Scope boundaries accepted. |  |

## PO Result Summary

| Result | Meaning |
| --- | --- |
| `PASS` | The item meets the expected observable business result. |
| `WARNING` | The item is acceptable with a note or deferred follow-up. |
| `FAIL` | The item does not meet the expected observable business result and requires a defect ID. |

## Overall PO Decision

| Decision | Mark one | Comment |
| --- | --- | --- |
| `PO PASS` | X | Unified BCVH analysis table, date context synchronization, Chuyển hoàn reconciliation, and detail navigation accepted. |
| `PO PASS WITH WARNING` |  |  |
| `PO FAIL` |  |  |

Do not mark `PO PASS` in repository governance until the Product Owner has completed this checklist and explicitly accepted the result.
