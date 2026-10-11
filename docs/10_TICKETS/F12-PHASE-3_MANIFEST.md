# F12-PHASE-3 Manifest

Status: `EVIDENCE COMPLETE / IMPLEMENTATION NOT STARTED` (2026-10-11). Portal discovery for the automatic download of F1.2 (HUE detail, TCT summary), done the F1.1 way (`docs/10_TICKETS/F11-PHASE-3_MANIFEST.md` Section 12). Nothing implemented yet; nothing exported, downloaded or imported.

## 1. Ticket Information

- Ticket ID: `F12-PHASE-3`
- Owner: `Claude Code`
- Activation authority: `PO chat 2026-10-11: DKCL is open and signed in, take the evidence yourself, Huế first`
- Plan of record: `docs/06_REVIEWS/Shared/F12-MODULE-PLAN_CHECKPOINT_001.md` Section 10; predecessor `docs/10_TICKETS/F12-PHASE-0-4_MANIFEST.md`
- Does not change Current Ticket.

## 2. Method

Claude in Chrome, the PO's own signed-in Chrome; a new tab in Claude's own tab group. Filters set through the page controls, **Thống kê** pressed (read-only report requests), the network log read (authentication values redacted by the tool). No credential or cookie read on purpose, no export, no download, no Import, no database write. Displayed account: `thanhtp.bdqn` (same as the F1.1 evidence).

## 3. HUE Evidence (2026-10-11)

| Item | Observed value |
| --- | --- |
| Menu entry | `Báo cáo KPI` → **`F1.2_CL thu gom bưu gửi liên tỉnh`** |
| Report route | `https://dkcl.vnpost.vn/kpi/chat-luong-thu-gom-buu-lien-tinh` (slug `thu-gom-buu-lien-tinh`, no `gui`; the export file name says `buu_giay`) |
| Filters on the page | Tùy chọn GR* (`Tỉnh` / `BC` / `KHL`), Tỉnh* (`stMaTinhNhan`, accepting side only — **no Tỉnh phát filter**, unlike F1.1), Bưu cục, BCKT Tỉnh chấp nhận, Dịch vụ, Nhóm SPDV, Sản phẩm DV, Loại dịch vụ, Nhóm loại khách hàng, Mã KHL, Khối lượng, Từ ngày*, Đến ngày* |
| **HUE report request** (GR = `BC`, Tỉnh = 53, others untouched), HTTP 200 | `GET /kpi/chat-luong-thu-gom-buu-lien-tinh?TuyChonGR=BC&stMaTinhNhan=53&stMaBuuCucNhan=NULL&stMaBCKTTinhNhan=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026` |
| Date encoding | screen `dd/mm/yyyy`; report request **`MM/DD/YYYY`** (proved with 09/10: `iFrom=10/09/2026`); detail request `YYYYMMDD` — same as F1.1 |
| HUE result total row, 10/10 | **1.758 / 1.758 / 1.620 / 92.15 % / 138 / 7.85 % / 133 / 1.620 / 1.681 / 63 / 13 / 0 / 1 / 0** — equal to the national file row 53 and to the Huế detail file. The screen has one more column than the export (`Tỷ lệ quá quy định`, `11=10/6`). |
| HUE result total row, 09/10 | 2.015 / 2.015 / 1.834 / 91.02 % / 181 / 8.98 % / **0** / … — the "chưa đủ thông tin" count is 0 for the older day and 133 for 10/10: the portal completes a day after N-1, which supports the 3-day refresh window (PD-F12-11). |
| Detail drill-down | the total cells carry `class="ajax_cell" data-detail="<n>"`; the BĐ10 count (`data-detail="6"`, 1.758) opens the detail |
| **HUE detail request**, HTTP 200 | `GET /kpi/chat-luong-thu-gom-buu-lien-tinh-chi-tiet?stMaTinhNhan=N%2753%27&stMaBuuCucNhan=NULL&iFrom=20261010&iTo=20261010&stMaDichVu=NULL&stNhomLoaiBuuGui=NULL&stLoaiDichVu=NULL&stMaLoaiBuuGui=NULL&stNhomLoaiKH=NULL&stMaBCKTTinhNhan=NULL&stMaKHL=NULL&stPhuongTien=NULL&stKhoiLuong=NULL&name_store=sp_TT_ThuGom_LienTinh_ChiTiet&iDetailReport=6&iTotal=1758` — note the province is sent as `N'53'` (quoted), unlike F1.1 |
| Detail first row | parcel `CB531174172VN`, Thuỷ Xuân 533250, accepted 09/10/2026 18:21:42, BĐ10 TMS 10/10/2026 05:32:36, `1:11`, Đạt — **equal to the first row of the PO's detail file** |
| Export forms (not pressed) | detail: `/export/sp_TT_ThuGom_LienTinh_ChiTiet/all` (fields `Total`, `FilterSelected`) — summary at BC grouping: `/export/sp_TT_ThuGom_LienTinh_BuuCuc/all`. Same mechanism as F1.1 (asynchronous export, "Export file thành công" notification, file in **Quản lý tệp** `/files`). |
| Store identities | detail **`sp_TT_ThuGom_LienTinh_ChiTiet`**; office summary `sp_TT_ThuGom_LienTinh_BuuCuc`; national summary (GR = Tỉnh) still to observe |

## 4. TCT Evidence (2026-10-11)

| Item | Observed value |
| --- | --- |
| **TCT report request** (GR = `Tỉnh`, Tỉnh = `ALL`), HTTP 200 | `GET /kpi/chat-luong-thu-gom-buu-lien-tinh?TuyChonGR=TINH&stMaTinhNhan=ALL&stMaBuuCucNhan=NULL&stMaBCKTTinhNhan=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026` |
| Total row, 10/10 | **260.522 / 264.219 / 240.092 / 92.16 % / 24.127 / 9.26 % / 14.171 / 240.076 / 249.178 / 11.514 / 1.787 / 785 / 955 / 675** — equal to the grand total of the PO's national file |
| Huế row | 30 / 53 / 1.758 / 1.758 / 1.620 / 92.15 % / 138 / 7.85 % / 133 / 1.620 / 1.681 / 63 / 13 / 0 / 1 / 0 — equal to the file |
| Paging | the screen shows 50 rows per page (2 pages); the export carries all rows (the PO's file has 53 units) |
| Export form (not pressed) | **`/export/sp_TT_ThuGom_LienTinh_Tinh/all`** — store identity `sp_TT_ThuGom_LienTinh_Tinh` |

## 5. Generated Files (Quản lý tệp, read 2026-10-11)

- Huế detail exported by the PO at 22:14: `11-10-2026_22-14-05_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx` (listed in `/files`; not yet in `Downloads`).
- Earlier PO files: `…_21-29-33_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx` (detail), `…_21-29-58_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx` (TCT).
- Name pattern: `DD-MM-YYYY_HH-mm-ss_F1.2_CL_thu_gom_buu_giay_lien_tinh[_chi_tiet](1).xlsx`. As in F1.1 the TCT slug is a prefix of the detail slug, so a match must be anchored to the end (`…lien_tinh(1).xlsx` vs `…lien_tinh_chi_tiet(1).xlsx`).

## 6. Export Verification (PO-authorised, 2026-10-11)

- TCT export pressed once by Claude (PO "đồng ý"): `GET /export/sp_TT_ThuGom_LienTinh_Tinh/all?Total=54&FilterSelected=<redacted>` (`Total=54` = 53 units + the grand total) → file `11-10-2026_22-18-45_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx`, 11.746 B, `/files/544849`.
- Huế detail exported by the PO at 22:14 → `/files/544848`, 217.634 B.
- Both downloaded from **Quản lý tệp** by the file-name link (`/files/<id>`; the `xlsx` button is `/files-xlsx/<id>`). The page's notification panel can cover the right-hand buttons.
- **Cell by cell against the PO's 21:29 files:** detail — headers equal, 1.758 / 1.758 parcels, 0 parcels on one side only, 0 rows with any cell difference; national — 57 / 57 rows, 1.140 cells compared, **0 differences**. So the portal requests above produce exactly the PO's files.

## 7. Still Needed
3. Then: portal client methods, single-date services with reconciliation (HUE total = detail rows; HUE detail = TCT row 53), executors, DRY supervised run, enablement (`AUTOMATED`, refresh window 3 days), backfill from 2026-01-01.
