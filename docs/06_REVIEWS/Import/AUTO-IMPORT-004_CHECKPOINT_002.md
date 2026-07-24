# AUTO-IMPORT-004 Checkpoint 002 - Live TCT F1.3 Source Walkthrough

- Ticket: `AUTO-IMPORT-004 TCT Source Discovery and Nationwide Ranking Contract`
- Status: `ACTIVE / IMPLEMENTATION`
- Checkpoint status: `COMPLETED - CONTROLLED IMPORT VALIDATED`
- Branch: `codex/auto-import-004`
- Date: `2026-07-20`
- Scope: PO-guided TCT F1.3 source walkthrough and download-contract discovery only.

## Safety Boundary

- Used the Product Owner-authorized TCT browser session.
- Did not inspect, persist, expose, or document credentials, cookies, tokens, CSRF values, session IDs, or browser storage.
- Did not parse into application models.
- Did not import into the database.
- Did not modify Dashboard UI, KPI formulas, ranking rules, schemas, AUTO-IMPORT-002/003 behavior, BCVH mappings, scheduling, queueing, or SSOT.

## Confirmed Live Source

- Source portal: DKCL.
- Module URL/path: `https://dkcl.vnpost.vn/kpi/chat-luong-phat-buu-gui-lien-tinh`.
- Module title: `Chat luong phat buu gui lien tinh`.
- Source update banner: `DU LIEU CAP NHAT DEN NGAY 19/07/2026. THOI GIAN DANH GIA NGAY N-1`.
- Authentication behavior: live walkthrough required an authenticated TCT session. Unauthenticated direct HTTP access to the file-download endpoint did not return a workbook.

## Confirmed Filters

- `Tuy chon GR`: `Tinh` (`TINH`).
- `Tu ngay`: `19/07/2026`.
- `Den ngay`: `19/07/2026`.
- `Tinh Phat`: `Chon tat ca` (`ALL`).
- `Buu cuc Phat`: `Chon tat ca` (`ALL`).
- Reporting-date semantics visible in source: day `N-1`; source update available through `19/07/2026`.

## Confirmed Flow

1. Opened DKCL F1.3 module in the authenticated TCT session.
2. Set/verified GR `Tinh` and date range `19/07/2026..19/07/2026`.
3. Ran `Thong ke`.
4. Confirmed the result table showed province-level rows and `Tong so: 37`.
5. Clicked `Xuat toan bo`.
6. Waited until the green/export-success notification appeared.
7. Opened `Quan ly tep`.
8. Identified the newly generated file-list record.
9. Reused the existing Huế DKCL download implementation path to acquire the workbook locally.
10. Inspected safe workbook metadata only.
11. Deleted the local workbook and verified the path no longer existed.

## Reused Huế Implementation Path

Existing implementation reused from `backend/src/services/dkclHueF13PortalClient.js`:

- Browser/session reuse: `chromium.launchPersistentContext(profileDir, { acceptDownloads: true })`.
- Session isolation: profile directory supplied by configuration.
- Quản lý tệp navigation: `page.goto(`${baseUrl}/files`)`.
- File-row identification: table rows are projected to `{ filename, createdAtText, href }` using the `files-xlsx` action link.
- Newest/exact matching: existing `selectNewestGeneratedFile` logic is available for generated exports; this checkpoint used the already-confirmed exact filename and href.
- Download action: `downloadXlsx({ file, targetDir })` locates `a[href="${file.href}"]`, waits for `page.waitForEvent('download')`, clicks the link, then calls `download.saveAs(targetPath)`.
- Local temp location: `portal-downloads/dkcl/tct/f13/checkpoint-002-temp`.
- Download-completion detection: Playwright download event completion plus successful `saveAs`, XLSX ZIP header check, and file stat.
- Cleanup behavior: local workbook deletion after safe metadata extraction; verified `Test-Path` returned deleted. Portal generated-file deletion was not performed in this checkpoint because PO scope required local workbook cleanup only.

## Shared Workflow / Configuration Boundary

Same workflow, TCT-specific configuration:

- Account/session: national/TCT credentials from local environment; no credential values logged.
- Profile: `Data DKCL/BrowserProfiles/TCT`.
- Module: F1.3 nationwide inter-province delivery quality.
- GR: `Tinh`.
- From/to date: `19/07/2026..19/07/2026`.
- Expected file pattern: `F1.3_chat_luong_phat_buu_giay_lien_tinh`.
- Target row: newest confirmed `Quan ly tep` row for `20-07-2026_15-08-23_F1.3_chat_luong_phat_buu_giay_lien_tinh(1).xlsx`.

## Confirmed File-List Record

- File-list navigation path: DKCL header/menu `Quan ly tep` -> `https://dkcl.vnpost.vn/files`.
- New record position: first row in `Quan ly tep`.
- Exact listed filename: `20-07-2026_15-08-23_F1.3_chat_luong_phat_buu_giay_lien_tinh(1).xlsx`.
- Creation/export time displayed: `20/07/2026 - 15:08:24`.
- Listed type/action: `xlsx`.
- File-list action endpoints observed for the row:
  - `https://dkcl.vnpost.vn/files/502999`
  - `https://dkcl.vnpost.vn/files-xlsx/502999`
- Source/module context in filename: `F1.3_chat_luong_phat_buu_giay_lien_tinh`.

## Workbook Artifact Status

- Successfully acquired using the existing Huế Playwright download path, not browser `downloadMedia`.
- Temporary local path: `portal-downloads/dkcl/tct/f13/checkpoint-002-temp/20-07-2026_15-08-23_F1.3_chat_luong_phat_buu_giay_lien_tinh(1).xlsx`.
- File size: `10879` bytes.
- File type: valid `.xlsx` ZIP workbook.
- The workbook was not copied into the repository.
- The workbook was deleted immediately after metadata inspection.
- Cleanup verification: local workbook path no longer existed after inspection.

## Workbook Structure Findings

Workbook:

- Type: `xlsx`.
- Worksheet names: `Worksheet`.
- Sheet range: `A1:V39`.
- Total rows: `39`.
- Total columns: `22`.
- Non-empty rows: `39`.
- Header row: row `1`.
- Formula/index row: row `2`.
- Aggregate total row: row `3`.
- First province/unit data row: row `4`.

Safe column names:

1. `TT`
2. `Mã tỉnh phát`
3. `Tên tỉnh phát`
4. `Mã bưu cục phát`
5. `Tên bưu cục phát`
6. `Mã tuyến`
7. `Tên tuyến`
8. `Loại tuyến`
9. `SL bưu gửi phát thành công/Nộp tiền/CH`
10. `Sản lượng PTC/Nộp tiền`
11. `Sản lượng BG có BĐ10 gán TMS quét xuống KTT phát`
12. `Sản lượng bưu gửi PTC/nộp tiền đúng thời gian QĐ <=14 giờ`
13. `Tỷ lệ bưu gửi PTC/Nộp tiền <=14 giờ`
14. `SL quá quy định (>14 giờ)`
15. `Sản lượng bưu gửi PTC/nộp tiền đúng QĐ theo chi tiêu 2026`
16. `Tỷ lệ bưu gửi PTC/Nộp tiền đúng QĐ theo chi tiêu 2026`
17. `Sản lượng bưu gửi quá quy định theo chi tiêu 2026`
18. `Tỷ lệ bưu gửi quá quy định theo chi tiêu 2026`
19. `SL chưa đủ thông tin đo kiểm`
20. `SL loại trừ`
21. `SL Phát không thành Công`
22. `SL PTC ko xác định`

Safe first province/unit data row:

- Row: `4`.
- Province identity example: `01 - Tổng công ty EMS`.
- Volume/pass/fail/KPI evidence is present in aggregate numeric fields; no row-level shipment identifiers were exposed.

Field presence:

| Field | Finding |
| --- | --- |
| Province/unit identity | Present: `Mã tỉnh phát`, `Tên tỉnh phát`. |
| Reporting date/period | Not embedded as a dedicated workbook column; source screen/filter supplied `19/07/2026..19/07/2026`. |
| Source update timestamp | Not embedded as a dedicated workbook column; source screen banner supplied update through `19/07/2026`. |
| Volume | Present through `SL bưu gửi phát thành công/Nộp tiền/CH` and related production columns. |
| Pass/PTC | Present through `Sản lượng PTC/Nộp tiền` and PTC-on-time columns. |
| Fail/late/non-success | Present through `SL quá quy định (>14 giờ)`, `Sản lượng bưu gửi quá quy định theo chi tiêu 2026`, and `SL Phát không thành Công`. |
| Returned quantity | Present only as embedded `CH` in combined column `SL bưu gửi phát thành công/Nộp tiền/CH`; no standalone `Chuyển hoàn` column observed. |
| KPI/pass rate | Present through `Tỷ lệ ...` columns. |
| Nationwide rank | Not present as an explicit workbook column. |
| Total ranked units | Not present as an explicit workbook column. |

## SSOT Ranking Contract Confirmed Before Import

Authority used:

- Product Owner confirmation in `AUTO-IMPORT-004`: nationwide F1.3 ranking is governed by the existing SSOT using exactly `34` provinces/cities, not all `37` source rows.
- DA-IMPL-002 PO PASS evidence: national rank source table `fact_f13_national`; province match `system_config.default_province_code` default `53`; ranking metric `tl_ptc_dung_qd_ct`; direction descending; tie behavior metric descending then `sl_bg_ptc` descending; no shared-tie grouping.
- F1.3 business rule SSOT: Dashboard Tổng công ty is the reference source and KPI formulas must not be recalculated.

Approved ranked population (`34`):

`10`, `16`, `18`, `20`, `22`, `24`, `25`, `27`, `29`, `30`, `33`, `36`, `38`, `39`, `43`, `44`, `46`, `48`, `52`, `53`, `55`, `57`, `60`, `63`, `65`, `67`, `70`, `81`, `84`, `87`, `88`, `89`, `90`, `97`.

Excluded source rows:

| Source row | Reason |
| --- | --- |
| Workbook formula/index row, `Mã tỉnh phát = 2` | Formula/index row, not a province/city ranked unit. |
| `01 - Tổng công ty EMS` | Administrative/source row outside the approved 34-unit ranked population. |
| `15 - Bưu điện Trung tâm Long Biên` | Non-ranked center row outside the approved 34 province/city population. |

Ranking semantics:

- Primary metric: `tl_ptc_dung_qd_ct`.
- Direction: descending.
- Secondary/tie-breaker: `sl_bg_ptc` descending.
- Tie-rank behavior: no shared-tie grouping; row order after the secondary sort determines rank position.
- Aggregate/administrative rows: excluded from `fact_f13_national` ranked population.
- Date/period semantics: one source reporting date from the operator-selected `Từ ngày..Đến ngày`; controlled import date `2026-07-19`.

## Controlled Import Evidence - 2026-07-19

Controlled import used the confirmed flow: `Xuất toàn bộ` -> green export success notification -> `Quản lý tệp` -> exact workbook row -> Playwright `download.saveAs` -> temporary workbook validation -> atomic import pipeline.

Implementation changes:

- `backend/src/services/nationalExcelParser.js` now exposes and applies the approved 34-unit ranked population.
- Parser exclusion evidence is returned for rows outside that population.
- No Dashboard UI, KPI formula, schema, AUTO-IMPORT-002/003, BCVH mapping, TCT scope, scheduling, credential/session persistence, or force-replacement behavior was changed.

Downloaded artifact:

- Exact DKCL file-list filename: `20-07-2026_15-08-23_F1.3_chat_luong_phat_buu_giay_lien_tinh(1).xlsx`.
- File size: `10879` bytes.
- Type: valid `.xlsx`.
- Sheet: `Worksheet`.
- Range: `A1:V39`.
- Rows/columns: `39` rows, `22` columns.
- Header row: `1`.
- Formula/index row: `2`.
- Parser result: `34` imported ranked units, `3` excluded source rows.
- Local temporary workbook cleanup: deleted immediately after handoff/inspection; path verification returned not present.
- The original downloaded workbook was not committed to the repository.

Import/database result:

- Standardized import filename: `F1.3-2026.07.19.xlsx`.
- Import source: `DKCL_TCT_CONTROLLED_2026_07_19`.
- Import result: `success=true`, `total=34`, `inserted=34`, `skipped=0`, `errors=0`.
- `fact_f13_national` for `2026-07-19`: `34` rows, `34` distinct `ma_tinh_phat`.
- Excluded rows imported: none for `2`, `01`, or `15`.
- Import log: latest `SUCCESS`, `total_records=34`, `error_records=0`, `skipped_records=0`.
- Processed file location: `Data DKCL/F1.3/Processed/TCT/F1.3-2026.07.19.xlsx`.

Hue evidence:

| Field | Value |
| --- | --- |
| Province code | `53` |
| Province name | `Bưu điện Tỉnh Thừa Thiên Huế` |
| Business date | `2026-07-19` |
| Volume `sl_bg_ptc` | `2399` |
| Pass `sl_ptc_dung_qd_ct` | `1261` |
| Fail/late `sl_qua_qd_ct` | `1050` |
| KPI `tl_ptc_dung_qd_ct` | `0.5256` (`52.56%`) |
| Returned/non-success field available | `sl_phat_ktc = 159` |
| Rank | `24/34` |

Dashboard API/runtime evidence:

- `GET /api/f13/dashboard/kpi?from_date=2026-07-19&to_date=2026-07-19&ma_bcvh=all`
- Result summary: `total_bg=2399`, `total_passed=1261`, `total_failed=1050`, `total_unknown=88`, `passed_rate=52.6`, `failed_rate=43.8`.
- National rank: `available=true`, `rank=24`, `total=34`, `period=2026-07-19`, `province_code=53`, metric `tl_ptc_dung_qd_ct`, metric value `0.5256`, volume `2399`.

## Validation

- `node backend\test_nationalExcelParser.js` - PASS.
- `node backend\test_dkclHueF13SyncService.js` - PASS, `84` passed / `0` failed.
- `node backend\test_dkclHueF13BackfillService.js` - PASS, `35` passed / `0` failed.
- `node --test backend\src\services\F13DashboardService.recovery.test.js backend\src\controllers\DashboardController.recovery.test.js` - PASS, `5` tests passed.
- `node --check backend\src\services\nationalExcelParser.js` - PASS.
- `node --check backend\test_nationalExcelParser.js` - PASS.
- API/runtime check against `localhost:5050` - PASS.

## Proposed Next Checkpoint

Checkpoint 003 should prepare PO comparison evidence for the imported TCT date:

- Open Dashboard module `/f13/dashboard`.
- Use filter `Từ ngày = 19/07/2026`, `Đến ngày = 19/07/2026`, `BCVH = Tất cả`.
- Compare the national-rank card against morning TCT figures: Huế `24/34`, KPI `52.56%`, volume `2399`.
- Do not change Dashboard UI, KPI formulas, ranking rules, schemas, scheduling, AUTO-IMPORT-002/003 behavior, or SSOT.

## Blockers Requiring PO / Governance Action

None for the controlled one-date import. The source workbook still does not supply explicit rank or total-ranked-unit columns, so the accepted Dashboard rank contract calculates rank from the imported 34-unit population.
