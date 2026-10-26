# F42-PHASE-3 Manifest

Status: `PORTAL DISCOVERY DONE (report and detail requests, export identities) / EXPORT OF THE HUE DETAIL NOT YET OBSERVED / ADAPTER NOT IMPLEMENTED` (2026-10-26). Portal discovery for the automatic download of F4.2, done the F1.2 way (`docs/10_TICKETS/F12-PHASE-3_MANIFEST.md`). Nothing exported, downloaded, imported or written to the database.

## 1. Ticket Information

- Ticket ID: `F42-PHASE-3`
- Owner: `Claude Code`
- Activation authority: `PO chat 2026-10-26: automatic download for F4.2 like F4.1; the TCT account can also fetch Huế, so one sign-in is enough at this step`
- Plan of record: `docs/06_REVIEWS/Shared/F42-MODULE-PLAN_CHECKPOINT_001.md` Section 5; predecessor `docs/10_TICKETS/F42-PHASE-0-4_MANIFEST.md`
- Does not change Current Ticket.

## 2. Method

Built-in browser pane of the Claude app. The pane was already signed in to DKCL (displayed account `muoimv.bdtth`, national province list, so TCT scope); the PO did not need to sign in again. Filters set through the page controls (the select boxes through their own change event), dates through the page date picker, **Thống kê** pressed (read-only report requests), the network log read (authentication values redacted by the tool). No credential or cookie read, no export, no download, no Import, no database write.

## 3. Evidence (2026-10-26, data day 2026-10-10)

| Item | Observed value |
| --- | --- |
| Menu entry | `Báo cáo KPI` → **`F4.2_Chất lượng phát giao bưu tá`** |
| Report route | `https://dkcl.vnpost.vn/kpi/chat-luong-phat-giao-buu-ta` |
| Filters | Tùy chọn GR* (`TuyChonGR`: only `BT` = Bưu tá), Tỉnh thành* (`stMaTinhPhat`, delivering side, `ALL` or a code), BC phát (`stMaBuuCucPhat`), Mã KHL, Dịch vụ, Nhóm SPDV, Loại bưu gửi, Loại dịch vụ (`stLoaiDichVu`), Nhóm loại KH (`stNhomLoaiKH`), Địa bàn (`stDiaBan`), Phạm vi (`stPhamVi`), Phạm vi tỉnh (`stPhamViTinh`), Từ ngày*, Đến ngày* (read-only fields set by the date picker). The page says the data is updated to N-1 (25/10/2026 on 26/10). |
| **HUE report request** (GR = Bưu tá, Tỉnh = 53, others untouched), HTTP 200 | `GET /kpi/chat-luong-phat-giao-buu-ta?TuyChonGR=BT&stMaHuyenPhat=&stMaTinhPhat=53&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&stDiaBan=NULL&stPhamVi=NULL&stPhamViTinh=NULL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026` (date `MM/DD/YYYY` as in F1.1 / F1.2) |
| HUE total row | **6.466 / 5.232 / 80,92 % / 4.475 / 69,21 % / 757 / 0 / 207 / 37 / 15,48 % / 1 / 193 / 72 / 34 / 6.669 / 169**: columns 14, 15, 16, 17, 18, 19 (>11,5 h), 20 (PKTC), 21 (chuyển hoàn), 22 (chờ chuyển hoàn), 23, 24 (VTN), 25 (chuyển tiếp), 26 (phát hoàn), 27 (loại trừ), 28, 29 = the Huế row of the national file and the Huế detail file |
| Screen paging | postman rows are shown 100 at a time (101 body rows incl. the total); the export carries all (Huế summary export `Total=132` = 131 postmen + total) |
| Detail drill-down | the total cells are `class="ajax_cell" data-detail="<n>"`; the GBT count (`data-detail="1"`, 6.466) opens the detail; 2 = phát thành công, 3 = đúng QĐ, 4 = quá QĐ, 6 chuyển hoàn, 7 chờ chuyển hoàn, 8 VTN, 9 chuyển tiếp, 10 phát hoàn, 12 loại trừ, 13 GBT chưa loại trừ, 14 chưa có thông tin |
| **HUE detail request**, HTTP 200 | `GET /kpi/chat-luong-phat-giao-buu-ta-chi-tiet?stMaTinhPhat=53&stMaBuuCucPhat=NULL&stMaBuuTa=NULL&iFrom=20261010&iTo=20261010&stMaDichVu=NULL&stNhomLoaiBuuGui=NULL&stLoaiDichVu=NULL&stMaLoaiBuuGui=NULL&stNhomLoaiKH=NULL&stDiaBan=NULL&stMaKHL=NULL&stKhoiLuong=NULL&name_store=sp_Phat_GBT_PTC_ChiTiet_V2&iDetailReport=1&iTotal=6466` (province sent unquoted, detail date `YYYYMMDD`) |
| **TCT report request** (GR = Bưu tá, Tỉnh = `ALL`), HTTP 200, slow (read after a wait) | `GET /kpi/chat-luong-phat-giao-buu-ta?TuyChonGR=BT&stMaHuyenPhat=&stMaTinhPhat=ALL&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&stDiaBan=NULL&stPhamVi=NULL&stPhamViTinh=NULL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026` |
| TCT total row | **516.597 / 455.120 / 88,1 % / 393.197 / 76,11 % / 61.923 / 0 / 31.503 / 9.636 / 19,95 % / 1.644 / 27.503 / 29.639 / 77.203 / 617.150 / 30.932** = the grand total row of the PO's national file |
| Export forms (not pressed) | detail: **`/export/sp_Phat_GBT_PTC_ChiTiet_V2/all`** (`Total=6466`, `FilterSelected` JSON); postman summary: **`/export/sp_Phat_GBT_PTC_BuuTa_V2/all`** (`Total=132` for Huế, **`Total=13666`** for the national run = 13 665 postman rows + total) |
| Store identities | detail `sp_Phat_GBT_PTC_ChiTiet_V2`; postman summary `sp_Phat_GBT_PTC_BuuTa_V2` (same store for Huế and national, the province filter differs) |

## 4. Generated files (Quản lý tệp `/files`, read 2026-10-26)

- Postman summary (the PO's national file): `26-10-2026_10-28-05_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx` listed at 10:28:18, link `/files/<id>` (`/files-xlsx/<id>` for the button), same mechanism as F1.2 (asynchronous export, then the list).
- The Huế detail the PO downloaded is a **CSV named `25427_26-10-2026_10-22-38_F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_01.csv`** and **does not appear in Quản lý tệp** (the list holds only `.xlsx` rows, 34 rows read). So the detail is delivered by another mechanism than the summary (direct download with a numeric prefix, and a `_01` suffix, which suggests one file per chunk). This is the open point of Section 5.
- Name pattern of the summary: `DD-MM-YYYY_HH-mm-ss_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx`; the detail slug `…_chi_tiet_01.csv` starts with the summary slug, so a match must be anchored to the end.

## 5. Open points (need the PO)

1. **Observe the detail export once.** One export of the Huế detail (10/10, 6.466 rows) pressed by Claude, with the PO's authorisation, to see how the file is delivered (direct download or a different list), its exact name, whether it is split into chunks (`_01`, `_02`...) and the `25427` prefix (looks like an account or job id). Without it the HUE adapter cannot be written without guessing.
2. Alternative that needs no detail export: take Huế from the **postman summary** (the national export filtered to Tỉnh 53) and keep the detail CSV as a manual lane. The summary reconciles exactly (Huế row = detail) but has no parcel rows, so the per-parcel table (`fact_f42`) would not be filled automatically. Recommended only if the detail delivery turns out not to be automatable.
3. TCT: the national export (`Total=13666`) is a normal `/files` export; one more export pressed by Claude, with the PO's authorisation, would confirm that the request produces exactly the PO's file (the F1.2 test: cell by cell).

## 6. Implementation handoff (after Section 5)

Mirror `docs/10_TICKETS/F12-PHASE-3_MANIFEST.md` Section 7 file by file (`f42PortalClientMethods.js`, `autoBackfillF42Contract.js`, `f42SingleDateServices.js`, `autoBackfillF42Executors.js`, `probe_f42_single_date.js`, `test_f42PortalAdapter.js`), changing what Section 3-4 says is different: route `/kpi/chat-luong-phat-giao-buu-ta`, `TuyChonGR=BT`, delivering province `stMaTinhPhat` (53 for HUE, `ALL` for TCT), 29-column screen with 100 rows per page (use the export total), detail store `sp_Phat_GBT_PTC_ChiTiet_V2` with `iDetailReport=1`, summary store `sp_Phat_GBT_PTC_BuuTa_V2`, reconcile HUE rows / Đạt / Không đạt with the summary total (columns 14 / 17 / 19) and TCT with the grand total (516.597 / 393.197 on 10/10). Registry stays `PLANNED` / `MANUAL_ONLY` until the PO's supervised DRY run passes; then `ACTIVE` / `AUTOMATED` with `refreshWindowDays: 3`, and the backfill from 2026-01-01.
