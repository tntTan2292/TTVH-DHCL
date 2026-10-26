# F42-PHASE-3 Manifest

Status: `IMPLEMENTED / EXPORTS VERIFIED / ENABLED IN THE IMPORT (ACTIVE, AUTOMATED) ON PO INSTRUCTION, FIRST SUPERVISED IMPORT PENDING` (2026-10-26). Portal discovery and adapter for the automatic download of F4.2, done the F1.2 way (`docs/10_TICKETS/F12-PHASE-3_MANIFEST.md`). Two PO-authorised exports were pressed by Claude (Section 5); the DRY probe was replaced by the safeguards of Section 8.

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

## 4. Generated files (Quản lý tệp `/files`)

- The Huế **detail** is listed by Quản lý tệp like the summaries (it appeared a few minutes after the export press; the first read of the list on 2026-10-26 simply came before the PO's own export was listed): `25418_26-10-2026_11-23-08_F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_01.csv`, row with the name link `/files/<id>` (the CSV as exported, `Content-Type: application/csv`, `Content-Disposition` carries the name) and the xlsx button `/files-xlsx/<id>`. The leading number (`25418`, `25427` on the PO's earlier export) is a job id that changes per export; `_01` is a chunk number.
- The postman **summary** is a normal xlsx row: `26-10-2026_15-09-42_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx`; `/files/<id>` and `/files-xlsx/<id>` both return the workbook.
- The list is one account-wide list (it also holds the F1.2 / F1.3 exports of other sessions), so a match must be anchored on the slug and the creation time. The detail slug starts with the summary slug: the TCT match keeps the `(1)` that follows the slug, the HUE match keeps `_chi_tiet_`.
- Generation time: the detail (6 466 rows) was listed within minutes; the national summary (13 666 rows) about a minute after the press. The national report itself answers slowly (about one to two minutes).

## 5. Export verification (PO-authorised, 2026-10-26)

| Export | Request | File | Check |
| --- | --- | --- | --- |
| Huế detail, 10/10, pressed once | `GET /export/sp_Phat_GBT_PTC_ChiTiet_V2/all?Total=6466&FilterSelected=<redacted>` | `25418_26-10-2026_11-23-08_F4.2_..._chi_tiet_01.csv`, `/files/553015`, 2 548 900 B | **SHA-256 identical** to the PO's earlier detail CSV (`c52dda2f…e8d2`, same size): the request produces exactly the PO's file |
| National postman summary, 10/10, pressed once | `GET /export/sp_Phat_GBT_PTC_BuuTa_V2/all?Total=13666&FilterSelected=%7B"TuyChonGR":"BT","stMaTinhPhat":"ALL",...,"iFrom":"2026-10-10","iTo":"2026-10-10","Page":1,"PageSize":50%7D` | `26-10-2026_15-09-42_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx`, `/files/553110`, 1 324 674 B | zip entries compared by CRC: `sheet1.xml`, `sharedStrings.xml` and every other part **equal** to the PO's file; only `docProps/core.xml` (creation time) differs, so **0 cell differences** |

Both files were read inside the browser pane (hash and zip directory only); nothing was saved to disk or deleted on the portal.

## 6. Implementation (2026-10-26, Claude Code/Sonnet 5.5)

The six files of the F1.2 pattern were written as the F1.2 mirror; no F1.1 / F1.2 / F4.1 file was edited except two additive one-liners.

| File | Note |
| --- | --- |
| `backend/src/services/f42PortalClientMethods.js` | Requests equal Sections 3 byte for byte (tests); 29 screen cells; detail province unquoted, `iDetailReport=1`, `iTotal` = GBT; export form read from the response (`template_paginator`), detail Total must equal the summary GBT; own generated-file poll (`pollF42GeneratedFile`: HUE reads the CSV name link, TCT the xlsx button; a detail delivered in several `_NN` chunks is refused) and own download (`downloadF42File` through the page request context, no navigation). State fields `lastF42*`. Request timeout 240 s (the national report is slow). |
| `backend/src/services/autoBackfillF42Contract.js` | Identities `DKCL_F42_HUE_SINGLE_DATE_V1` / `DKCL_F42_TCT_SINGLE_DATE_V1`; HUE match `F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_` (csv), TCT match `F4.2_chat_luong_phat_giao_buu_ta(1)` (xlsx). |
| `backend/src/services/f42SingleDateServices.js` | Exact reconciliation, no tolerance: HUE rows / Đạt / Không đạt = summary GBT / PTC đúng QĐ / quá QĐ (blank ratings are the rest, reported); TCT: the parser already verified the published grand total against all postman rows, here its GBT and Đạt must equal the summary of the screen. HUE saved as `F4.2-YYYY.MM.DD.csv`, TCT as `.xlsx`. |
| `backend/src/services/autoBackfillF42Executors.js` | Created, **not registered** in `autoBackfillExecutors.js`. |
| `backend/probe_f42_single_date.js` | DRY; compares the download with `Data DKCL/F4.2-2026.10.10.csv` / `F4.2-TCT-2026.10.10.xlsx` through the frozen parsers, row by row. |
| `backend/test_f42PortalAdapter.js` | 28 tests: requests, helpers, client over a fake page, services over a fake client with the two real files as the known answer, executors. |

Two additive one-liners outside the table: `dkclHueF13PortalClient.js` mixes in the F4.2 methods (as F1.2 does), `importIndicatorRegistry.js` maps `F42_PORTAL_REQUEST_TIMEOUT` to `TRANSIENT`. Registry unchanged (`PLANNED` / `MANUAL_ONLY`).

Validation: `test_f42PortalAdapter.js` 28/28; `test_f42ImportPipeline.js` 6/6; `test_f12PortalAdapter.js` 24/24; backend sweep 697/705, 5 skipped, the same 3 known failures.

Not verified (needs the live portal and the PO's supervised run): that the real detail and report responses carry the export forms in `template_paginator` exactly as F1.2 (the live DOM showed both forms after the detail opened, and the service stops on any mismatch); that the national request finishes inside the 240 s timeout; the TCT screen layout assumptions (29 cells, total row first) were read from the live page (Section 3) but not through the Node parser.

## 7. Next

PO supervised DRY run: stop the backend, close the DKCL window of the lane, then `node probe_f42_single_date.js HUE 2026-10-10` and `node probe_f42_single_date.js TCT 2026-10-10`. After PASS: register the executors in `autoBackfillExecutors.js`, set `ACTIVE` / `AUTOMATED` with `portalAdapter` = `F42_EXECUTOR_IDENTITIES` and `refreshWindowDays: 3` in the registry, restart the backend, one supervised Auto Backfill over a few days, then the backfill from 2026-01-01. Open: how many rows a detail export holds before the portal splits it into `_02` chunks (the adapter refuses a chunked export and reports it); the busiest days may need a chunk-aware reader.

## 8. Enablement in the Import (PO instruction 2026-10-26: "dựng vào Import như các F kia luôn")

The supervised DRY probe of Section 7 could **not** be run by Claude: the live backend holds the TCT browser profile (`BrowserProfiles/TCT.lock`) and the HUE window, and a second Chromium on the same profile is exactly what the lock forbids; stopping both sessions would force the PO to sign in again (captcha). On the PO's instruction the lanes were enabled instead, with these safeguards in place of the DRY run:

- the two exports of 10/10 were already proven identical to the PO's files (Section 5);
- the service imports **nothing** unless the file reconciles exactly with the portal summary (Sections 6), a chunked export is refused, and the F1.2 refresh/replace rules apply (an existing day asks for confirmation);
- the first real run is done by the PO from the Data Import Center on a day that is not loaded yet (for example 25/10 as the new day D-1), and its result is read before any backfill.

Done: registry F4.2 `ACTIVE`, HUE and TCT `AUTOMATED` with `portalAdapter` = `F42_EXECUTOR_IDENTITIES` (`verified: true`), `refreshWindowDays: 3`; `registerF42AutoBackfillExecutors` added to `autoBackfillExecutors.js`; the Import Center screens that list the indicators now include F4.2 (history filter, day view slots and label "Phát giao bưu tá", anchor-day targets, "5 chỉ tiêu" texts: `autoBackfillUiHelpers.js`, `AutoBackfillSmartDayView.jsx`, `AutoBackfillOperatorPanel.jsx`, `AutoBackfillImportHistory.jsx`). Coverage, queue, scheduler and the "Log ngày mới" grid are registry-driven and pick F4.2 up by themselves.

Validation: backend sweep 697/705, 5 skipped, the same 3 known failures; `test_f42ImportPipeline.js` 6/6 (registry assertions now ACTIVE / AUTOMATED / 3 days), `test_f42PortalAdapter.js` 28/28, F1.2 adapter 24/24, F1.3 executors 19, F4.1 executors 32, queue 45, coverage 17, safety 11, refresh window 6, anchor run 5, parallel lanes 14, daily log 8; `test_autoBackfillQueueController.js` (2) and `test_autoBackfillCoverageController.js` (1) fail with and without this change (verified by stashing the two registry files): not related. Frontend 775/775, `vite build` passes, `oxlint` only pre-existing warnings. The backend was restarted (no run active, DKCL sessions reattached from the saved sessions) and the log shows `[ImportWatcher]` watching `Data DKCL/F4.2/Incoming`.

PO UI Check Required: **Yes** for the Import Center (a fifth indicator column in the day view and the new F4.2 option; layout not seen on screen). The screen change is data-driven only; Antigravity should look at the day-view width if the fifth column is cramped.

Next: PO runs the first F4.2 import from the Import Center and reports; then backfill from 2026-01-01 (to be run in portions, see the chunk risk in Section 7); then `F42-DASHBOARD-RANKING-01` (`/api/f42`) and `F42-DASHBOARD-UI-01` (Antigravity).
