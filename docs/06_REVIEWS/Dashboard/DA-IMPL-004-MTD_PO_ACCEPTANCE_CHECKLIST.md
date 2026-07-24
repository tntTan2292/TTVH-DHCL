# DA-IMPL-004-MTD Product Owner Acceptance Checklist

- Ticket: `DA-IMPL-004-MTD Unified BCVH Monthly Cumulative Columns`
- Status for PO review: `COMPLETED / PO PASS`
- Module: Smart Leadership Dashboard - Unified BCVH Analysis Table
- Page: `/f13/dashboard`
- PO result: Product Owner accepted `PO PASS` on `2026-07-20`.

## Preconditions

- Backend/frontend use the build containing the latest `DA-IMPL-004-MTD` remediation on branch `codex/da-impl-006`.
- Database contains F1.3 Hue operational data for July 2026.
- Product Owner can open `/f13/dashboard`.
- No AUTO-IMPORT, TCT, KPI formula, BCVH mapping, schema, or Route Performance Center behavior is under review in this checklist.

## Acceptance Checklist

| Item | What PO should do | Expected observable business result | PO Result | Comment | Defect ID |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/f13/dashboard`. | The accepted Unified BCVH Analysis Table still appears in the BCVH detail section. |  |  |  |
| 2 | Inspect the table group headers with `to_date=2026-07-19`. | The primary group appears first as `NGÀY ĐÁNH GIÁ — 19/07/2026`; the reference group appears after it as `LŨY KẾ THÁNG — 01/07–19/07/2026`. |  |  |  |
| 3 | Inspect group columns. | `NGÀY ĐÁNH GIÁ` contains `Sản lượng`, `Đạt`, `Tỷ lệ đạt`, `D-1`, `D-7`, `Bổ sung`; `LŨY KẾ THÁNG` contains `Sản lượng`, `Δ SL`, `Tỷ lệ đạt`, `Δ Tỷ lệ`. No visible `Không đạt` column appears in either group. |  |  |  |
| 4 | Confirm the old label is gone. | The table no longer uses the group label `Theo bộ lọc`. |  |  |  |
| 5 | Compare one BCVH with multiple July data days. | The `NGÀY ĐÁNH GIÁ` values equal only the selected/effective final business date; they are not copied from month-to-date values. |  |  |  |
| 6 | Compare the same BCVH month-to-date values. | The `LŨY KẾ THÁNG` values equal the sum from day `01` of the selected month through the effective evaluation date. |  |  |  |
| 7 | Inspect `Δ SL`. | The value compares current month-to-date volume against the same period of the previous month, not the whole previous month; if previous volume is zero or missing, it shows `Chưa có dữ liệu`. |  |  |  |
| 8 | Inspect `Δ Tỷ lệ`. | The value equals current cumulative pass rate minus previous comparable cumulative pass rate; it is not an average of daily rates or BCVH rates. |  |  |  |
| 9 | Inspect total row. | The first cell only says `TỔNG CỘNG`; the row does not place date-period labels inside the BCVH cell. |  |  |  |
| 10 | Verify total-row rates and deltas. | Total-row rates and deltas are recalculated from total pass and total volume for each period; they do not depend on pagination and are not averages of BCVH percentages. |  |  |  |
| 11 | Select a range ending after latest available July data. | Both group headers use the latest available date before the selected end date and append `dữ liệu gần nhất`. |  |  |  |
| 12 | Inspect comparison columns. | `D-1` and `D-7` appear after the `NGÀY ĐÁNH GIÁ` group and their tooltip/heading indicates they compare the evaluation day. |  |  |  |
| 13 | Open `Tùy chọn cột`. | The menu opens by button, includes checkbox controls, has only `Gọn`, `Mặc định`, and `Khôi phục mặc định`; duplicated `Đầy đủ` is removed and `Không đạt` does not appear as a menu option. | PASS | Accepted by PO |  |
| 14 | Switch to `Gọn`. | The table shows only `BCVH`, `Sản lượng ngày`, `Đạt ngày`, `Tỷ lệ đạt ngày`, `D-1`, `D-7`, `Sản lượng lũy kế`, `Tỷ lệ đạt lũy kế`, `Chi tiết`; no horizontal scroll is expected at normal desktop width. |  |  |  |
| 15 | Switch to `Mặc định`. | The mode shows all currently approved visible columns without `Không đạt`; headers, body, and total row remain aligned and group colspan updates without empty gaps. | PASS | Accepted by PO |  |
| 16 | Reload the page after changing column options. | The table preserves the selected column configuration from localStorage; if storage is unavailable, it falls back to `Mặc định`. |  |  |  |
| 17 | Inspect Vietnamese text. | Headers, labels, unavailable text, and `Chi tiết` render proper Vietnamese UTF-8; no mojibake such as `LÅ©y káº¿`, `Tá»· lá»‡`, or `dá»¯ liá»‡u` appears. |  |  |  |
| 18 | Use current sorting/pagination/filter behavior. | Existing sorting, pagination request, dashboard filter context, and row order behavior are unchanged. |  |  |  |
| 19 | Click `Chi tiết` on a BCVH row. | Existing detail-navigation URL/context behavior is unchanged. |  |  |  |
| 20 | Confirm scope boundaries. | No KPI formula, SSOT, schema, BCVH mapping, AUTO-IMPORT, TCT, Route Performance Center, or unrelated Dashboard behavior is changed. |  |  |  |

## PO Result Summary

| Decision | Mark one | Comment |
| --- | --- | --- |
| `PO PASS` | X | Product Owner accepted the ticket with final cleanup removing duplicated `Đầy đủ`. |
| `PO PASS WITH WARNING` |  |  |
| `PO FAIL` |  |  |

Repository governance may record `DA-IMPL-004-MTD = COMPLETED / PO PASS` from the explicit Product Owner decision.
