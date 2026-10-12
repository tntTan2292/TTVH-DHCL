# F12-PHASE-3 Manifest

Status: `IMPLEMENTED / SUPERVISED DRY RUN PASSED (PO accepted) / ENABLED, BACKEND RESTART AND FIRST AUTO BACKFILL PENDING` (2026-10-12; evidence 2026-10-11). Portal discovery for the automatic download of F1.2 (HUE detail, TCT summary), done the F1.1 way (`docs/10_TICKETS/F11-PHASE-3_MANIFEST.md` Section 12). Nothing implemented yet; nothing exported, downloaded or imported.

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

## 7. Implementation Handoff (PO decision 2026-10-12: Antigravity implements, Claude Code reviews)

Mirror F1.1 Phase 3 (`docs/10_TICKETS/F11-PHASE-3_MANIFEST.md` Sections 13-16) file by file; change only what Sections 3-6 above say is different for F1.2.

| New file | Mirror of | F1.2 differences |
| --- | --- | --- |
| `backend/src/services/f12PortalClientMethods.js` | `f11PortalClientMethods.js` | route `/kpi/chat-luong-thu-gom-buu-lien-tinh` (+ `-chi-tiet`); HUE `TuyChonGR=BC&stMaTinhNhan=53`, TCT `TuyChonGR=TINH&stMaTinhNhan=ALL` (no Tỉnh phát); detail sends `stMaTinhNhan=N'53'`, `iDetailReport=6`, `iTotal` = the BĐ10 total; stores `sp_TT_ThuGom_LienTinh_ChiTiet` / `sp_TT_ThuGom_LienTinh_Tinh`; summary rows have 21 cells on screen (one more than the export: `Tỷ lệ quá quy định`); TCT screen is paged (50 rows), use the export total |
| `backend/src/services/autoBackfillF12Contract.js` | `autoBackfillF11Contract.js` | file match `…_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx` vs `…lien_tinh(1).xlsx`, anchored at the end |
| `backend/src/services/f12SingleDateServices.js` | `f11SingleDateServices.js` | reconcile HUE: rows / Đạt / Không đạt of the workbook = the summary total row exactly; TCT: the parser already checks the grand total and the 34 provinces; save as `F1.2-YYYY.MM.DD.xlsx`; parsers `parseF12HueExcel` / `parseF12TctExcel` |
| `backend/src/services/autoBackfillF12Executors.js` | `autoBackfillF11Executors.js` | not registered until the supervised run passes |
| `backend/probe_f12_single_date.js` | `probe_f11_single_date.js` | DRY; reference files `Data DKCL/F1.2-2026.10.10.xlsx` and `Data DKCL/F1.2-TCT-2026.10.10.xlsx` |
| `backend/test_f12PortalAdapter.js` | `test_f11PortalAdapter.js` | requests equal Sections 3-4 byte for byte; the two real files as the known answer |

Guards: registry stays `PLANNED` / `MANUAL_ONLY` until the PO's supervised DRY run passes; do not edit any F1.1 file (another session has uncommitted F1.1 changes); no browser, no portal access, no dev server for Antigravity — the supervised run is done by the PO; one commit, pathspec only.

Done when: `test_f12PortalAdapter.js` green, F1.2 tests (26) and F1.1/F4.1/F1.3 executor tests unchanged, backend sweep no new failure; then Claude Code review, PO supervised run (HUE, TCT, 10/10), enablement (`ACTIVE`, `AUTOMATED`, `refreshWindowDays: 3`), backfill from 2026-01-01.

## 8. Implementation (2026-10-12, Claude Code/Sonnet 5.5; PO: "cứ làm phase 3 đi, khỏi quan tâm KQ của Antigravity")

PO took the build back from Antigravity (no Antigravity code existed in the repository, branches, worktrees or stashes). The six files of Section 7 were written as the F1.1 mirror; no F1.1 file was edited.

| File | Note |
| --- | --- |
| `backend/src/services/f12PortalClientMethods.js` | Requests equal Sections 3-4 byte for byte; 21 screen cells; BD10 count = iTotal; generic HTML helpers imported from `f11PortalClientMethods.js` (not edited). State fields `lastF12*`. |
| `backend/src/services/autoBackfillF12Contract.js` | HUE match `F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet`, TCT match `…lien_tinh(1)` (cannot select a detail file). |
| `backend/src/services/f12SingleDateServices.js` | Exact reconciliation, no tolerance: HUE rows / Đạt / Không đạt = BD10 count / Đạt / Quá quy định of the summary total row; TCT total / quét TMS / Đạt / Quá QĐ of the workbook sum = summary total row; `chưa đủ thông tin` reported. File saved as `F1.2-YYYY.MM.DD.xlsx`. |
| `backend/src/services/autoBackfillF12Executors.js` | Created, **not registered** in `autoBackfillExecutors.js`. |
| `backend/probe_f12_single_date.js` | DRY; references `Data DKCL/F1.2-2026.10.10.xlsx`, `F1.2-TCT-2026.10.10.xlsx`. |
| `backend/test_f12PortalAdapter.js` | 24 tests incl. the two real files as the known answer. |

Two one-line edits outside the table, both additive: `dkclHueF13PortalClient.js` mixes in the F1.2 methods (as F1.1 does), `importIndicatorRegistry.js` maps `F12_PORTAL_REQUEST_TIMEOUT` to `TRANSIENT`. Registry unchanged (`PLANNED` / `MANUAL_ONLY`).

Validation: `test_f12PortalAdapter.js` 24/24; `test_f12ImportPipeline.js` 6/6; F1.3/F4.1 executor suites 19/19 and 32/32, refresh window 6/6, queue 45/45; backend sweep 530/535 with the same 5 failures as before (3 live KPI, 1 monthly rank, 1 F1.1 real TCT, caused by another session's uncommitted `f11TctExcelParser.js`). `test_f11PortalAdapter.js` has the same single F1.1 real-TCT failure, not related to this ticket.

Not verified (needs the live portal): the 21-cell screen layout was read from the evidence figures (Section 3-4 total rows), the detail-total cell position (`BD10 đóng đi`, index 7) and that the grand-total row has no number; the supervised run will confirm or refuse them (the service stops on any mismatch).

Residuals: (1) polling interval default 3 s, same as the other session's working-copy value of F1.1 (HEAD has 30 s). (2) The F1.1 poll-interval and KXD changes remain uncommitted by the other session.

Next: PO supervised DRY run — stop the backend, close the DKCL window of the lane, then `node probe_f12_single_date.js HUE 2026-10-10` and `node probe_f12_single_date.js TCT 2026-10-10`. After PASS: register the executors, set `ACTIVE` / `AUTOMATED` and `refreshWindowDays: 3`, backfill from 2026-01-01.

## 9. Supervised DRY Run and Enablement (2026-10-12)

PO ran `probe_f12_single_date.js` for HUE and TCT, 2026-10-10, from `backend`, DRY mode.

| Lane | Portal summary | Workbook | Reconciliation |
| --- | --- | --- | --- |
| HUE | 1.732 / 1.597 Đạt / 135 Không đạt, 92,21 %, chưa đủ 17 | 1.732 rows, 1.597 / 135 | exact |
| TCT | 265.028 / TMS 265.330 / 240.057 Đạt / 25.273 quá QĐ, chưa đủ 7.439, export Total 54 | 53 rows, same sums | exact |

The comparison with the PO's 11/10 files said DIFFERENT, which is the portal's own revision of 10/10 over the two days, not an adapter fault: HUE 26 parcels dropped and none added, 1 rating changed, STT renumbered, `Mã/Tên tỉnh phát` filled on 355 rows, `chưa đủ thông tin` 133 -> 17; the probe compares by row position, so 26 missing rows shift every later row (17.118 cell differences). Headers identical. The screen layout assumptions of Section 8 (21 cells, BD10 count at index 7, unnumbered total row) held on the live portal.

PO decision: PASS (chat 2026-10-12 "Đồng ý pass").

Enablement (same commit): `importIndicatorRegistry.js` F1.2 `ACTIVE`, lanes `AUTOMATED` with `portalAdapter` = `F12_EXECUTOR_IDENTITIES` (`verified: true`), `refreshWindowDays: 3` (PD-F12-11); `autoBackfillExecutors.js` registers `registerF12AutoBackfillExecutors`. Tests 24/24 and 6/6 (registry assertions updated), F1.3 19, F4.1 32, refresh window 6, queue 45, coverage 16, safety 11, controllers 4 + 12. Backend sweep 527/535: the earlier 5 plus 3 route-ranking tests that call the live API at 127.0.0.1:5050 and fail only because the backend is stopped for the probe.

Next: PO restarts the backend (loads the F1.2 registry, executors and F1.2 tables), runs one supervised F1.2 Auto Backfill over a few days, then the backfill from 2026-01-01. Then `F12-DASHBOARD-RANKING-01` and `F12-DASHBOARD-UI-01`.

