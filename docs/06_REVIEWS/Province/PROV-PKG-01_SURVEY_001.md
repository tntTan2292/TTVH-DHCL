# PROV-PKG-01 — Khảo sát S1 (chỉ đọc)

- Ticket: `PROV-PKG-01`, bước `S1`. Manifest: `docs/10_TICKETS/PROV-PKG-01_MANIFEST.md` (mục 3, 5).
- Executor: Claude Code, 2026-11-18. Validation `LEVEL 1`: không sửa mã, không ghi DB (đọc `backend/src/db/database.sqlite` bằng `node:sqlite` `readOnly: true`, `node --experimental-sqlite`), không khởi động lại backend.
- Đi kèm: `PROV-PKG-01_SURVEY_001_hardcoded_points.csv` (cùng thư mục, UTF-8 có BOM, mở được bằng Excel).

## 0. Tóm tắt cho CTO

1. Mã tỉnh `53` gắn cứng ở **~25 điểm giá trị chạy trong phạm vi 4F** (lọc cổng DKCL lane tỉnh, mặc định xếp hạng, tiền tố mã tuyến `53%`). `system_config.default_province_code` đã có nhưng chỉ 4 service đọc nó; phần còn lại gắn cứng.
2. Danh mục **6 BCVH của Huế gắn cứng ở 8 file** (4 backend, 4 frontend); không có bảng nào trong DB giữ quan hệ bưu cục → BCVH. Riêng F1.3 file chi tiết DKCL đã mang `ma_bcvh` / `ten_bcvh`.
3. Bảng D2 có **4 chỗ mâu thuẫn**, quan trọng nhất: bảng toàn quốc F1.1/F1.2/F4.1 có khóa ngoại `import_log_id → import_log` (khóa ngoại đang bật) trong khi D2 để `import_log` ngoài gói; `dim_buu_cuc_toan_quoc` không do mã nào tạo hoặc đọc; và `fact_f13`, `fact_f13_national`, `system_config`, `sys_kpi_thresholds` chỉ được tạo từ `schema.sql` (qua `recreate_db.js`), không có trong migration lúc khởi động.
4. Phụ thuộc chéo cần cắt cho `QIS_EDITION=province`: Trang chủ gọi F4.2; import F1.1/F1.3/F4.1 gọi `CauseRefresh` (RCA F1.3); trang ngày F1.3/time-axis nhúng khối F4.2; layout chung nhúng chuông Nhật ký điều hành; `importRoutes` gắn route Hàng tồn.
5. Parser Excel lane tỉnh đọc theo **tiêu đề cột**, không lọc tỉnh. Parser TCT đọc theo vị trí cột nhưng ở phạm vi toàn quốc. Chỉ cổng F4.1 đọc mã đơn vị ở **ô số 5** của dòng tổng hợp. Không có phụ thuộc tỉnh, chỉ có giả định về cấu trúc.
6. Có **7 câu hỏi PO** ở mục 7 về quy tắc riêng của Huế. Phần còn lại là lựa chọn kỹ thuật, để S2 quyết.

## 1. (a) Điểm gắn cứng `53` / `HUE` / “Huế” / `Thừa Thiên`

Phạm vi quét: các file đã track trong `backend/src`, `backend/server.js`, `backend/scripts`, `backend/dkcl-hue-broker.js`, `frontend/src`, `scripts/`, `TTVH_ControlCenter.ps1`, `Start_ControlCenter.bat`. Tổng 587 file; **không quét file test**: có 120 file test/fixture chứa `'53'`/`HUE`/`Huế`, S3 phải cập nhật riêng. Mỗi dòng mã ứng với một dòng CSV. Cột `pham_vi` dùng heuristic theo đường dẫn: F4.2, hàng tồn, mạng lưới, BF Phát, RCA/why/evidence/journey, nhật ký, bưu tá, thu nhập, tin nhắn, `backend/scripts` được tính là `ngoai_pham_vi`.

| Loại | Trong phạm vi | Ngoài phạm vi |
|---|---:|---:|
| giá trị chạy | 92 | 38 |
| chuỗi hiển thị | 54 | 18 |
| tên nội bộ | 397 | 50 |
| chú thích (không chạy; loại thêm ngoài 3 loại yêu cầu) | 56 | 17 |
| **Tổng** | **599** | **123** |

### 1.1 Giá trị chạy trong phạm vi (S3 phải đọc từ cấu hình tỉnh)

| Nhóm | Điểm | Ghi chú |
|---|---|---|
| Lọc cổng DKCL lane tỉnh | `f11PortalClientMethods.js:29,114,116` (`stMaTinhChapNhan`/`stMaTinhPhat='53'`), `f12PortalClientMethods.js:36,118` (`N'53'`, **có nháy**), `dkclHueF13PortalClient.js:93` (F4.1 `stMaTinhPhat:'53'`), `dkclHueF13SyncService.js:310` (F1.3 `provinceCode:'53'`) | Đây là các điểm quyết định “tải chi tiết của tỉnh mình”. F1.2 gửi có nháy, F4.2 gửi không nháy. Cách định dạng của từng báo cáo phải giữ nguyên. |
| Chuỗi định danh hợp đồng backfill | `autoBackfillF11Contract.js:25`, `F12…:25`, `F13…:8`, `F41…:8` (`reportIdentity: '…TINH_PHAT=53'`) | Chuỗi này được lưu vào hàng đợi (`auto_backfill_job.resource_identity` / circuit). Khi tham số hóa, bản Huế phải ra **đúng chuỗi cũ**, nếu không sẽ lệch circuit và lịch sử. |
| Mặc định mã tỉnh | `F11NationalRankService.js:21`, `F41NationalRankService.js:20`, `F13DashboardService.js:351`, `messageGenerationService.js:74` (ngoài phạm vi), `schema.sql:26` | Bốn service này đọc `system_config` trước, `53` chỉ là giá trị dự phòng. |
| Tỉnh “mình” trong bảng toàn quốc | `tctF13BackfillService.js:1030` (`ma_tinh_phat === '53'`) | Đây là bằng chứng hạng của Huế khi backfill TCT. |
| Tiền tố mã tuyến = mã tỉnh | `FactBuuGuiRepository.js:551,610,653,707,764,765,773,778` (`ma_tuyen LIKE '53%'`), `F13DashboardService.js:1174` (`hue_prefix`), `f13RouteClassificationCatalog.js:79` (`startsWith('53')`), `f13v2/CauseAggBuilder.js:48` (ngoài phạm vi) | Dữ liệu cho thấy `fact_f13.ma_tuyen` có nhiều tiền tố khác (`55`, `80`, `41`, `Khong Xac Dinh`, …). Code đang coi “tuyến bưu tá của tỉnh = mã tuyến bắt đầu bằng mã tỉnh”. Xem Q5. |
| Danh mục 6 BCVH | backend: `canonicalBcvhUnits.js`, `auth/access/officeMap.js`, `kpiController.js:226`; frontend: `auth/accessModel.js`, `dashboard/components/bcvhOperationTableData.js` (có cả màu theo BCVH), `dashboard/components/dashboardFilterOptions.js`, `ranking/bcvhOverviewData.js` | Xem mục 4. |
| Ngoại lệ đơn vị của Huế | `FactF12Repository.js:19` (`531120` Khách hàng lớn, không xếp hạng F1.2), `f13RouteClassificationCatalog.js` (danh sách tuyến “phát tại quầy” không tính là bưu tá), `officeMap.js` (`HANGTON_*`, `530100` KTC1; ngoài phạm vi) | Đây là quy tắc nghiệp vụ, xem Q3 và Q4. |
| Không phải điểm của Huế | `nationalExcelParser.js:25` | `'53'` nằm trong danh sách 34 tỉnh xếp hạng toàn quốc, đúng cho mọi tỉnh, không cần đổi. |

### 1.2 Chuỗi hiển thị trong phạm vi (54)

- Tên đơn vị cứng trên khung giao diện: `SharedLayout.jsx:201` “Bưu điện thành phố Huế”, `LoginPage.jsx:62`, `ChangePasswordPage.jsx:88,280` (dòng 280 lại ghi “Bưu điện tỉnh Thừa Thiên Huế”), `Topbar.jsx:37` “VNPost Huế”.
- Khối xếp hạng toàn quốc: `NationalRankingBlock.jsx` (7 chỗ: “Vị thứ BĐTP Huế”, “Tỷ lệ Huế”, “★ Huế”, chế độ `hue_focus`), `IntegratedTrendRiskWorkspace.jsx:96,115`. Thông báo backend “Chưa có dữ liệu xếp hạng của Huế …” ở `F11NationalRankService.js:78`, `F13DashboardService.js:435,452`, `F41NationalRankService.js:63`.
- Màn nhập dữ liệu: `DataImportCenter.jsx` (khoảng 20 chỗ “Huế F1.3”, “Mở đăng nhập Huế”), `AutoBackfillOperatorPanel.jsx`, `AutoBackfillIndicatorMatrix.jsx`, `AutoBackfillSmartDayView.jsx`, `ImportDailyLogPanel.jsx`, `dkclSessionStripModel.js:4`; backend `dkclSessionPreflightService.js:51` (`displayName:'Huế'`), `dkclHueF13BackfillService.js:394`.
- Tên tỉnh trong DB: `system_config.default_province_name` = “Bưu điện Tỉnh Thừa Thiên Huế”, trong khi giao diện dùng “Bưu điện thành phố Huế”. Có hai cách gọi cho cùng một đơn vị (xem Q7).
- “BĐTP” (Bưu điện thành phố) là cách gọi riêng của Huế. Nó có ở tên vai trò (`roles.js` `LD_BDTP`, `IT_BDTP`; nhãn “Lãnh đạo BĐTP”), F1.2 (`F12Cumulative12Block.jsx:210`) và màn RCA (ngoài phạm vi). Scanner không đếm các chuỗi “BĐTP” không kèm chữ “Huế”. S4 cần quét thêm `BĐTP`.

### 1.3 Tên nội bộ (397 trong phạm vi)

Gồm `dkclHue*`, `F41_HUE_*`, khóa lane `'HUE'` (lưu trong `import_log.source_lane`, `auto_backfill_job.source_lane`, thư mục `Data DKCL/<F>/Incoming|Processed|Error/HUE`, `Data DKCL/BrowserProfiles/HUE`), biến môi trường `DKCL_HUE_*`, `PORTAL_HUE_*`, cờ `is_hue`. Theo D1, nhóm này **giữ nguyên tên**. Riêng `is_hue` (`F11NationalRankService.js:202`, `HomeExecutiveService.js`) đã được tính từ `system_config`, nên tự đúng với tỉnh khác.

### 1.4 Khác

- `scripts/qis-supervisor.ps1:45-54` có đường dẫn Node tuyệt đối (`C:\Users\Admin\nodejs_portable_v22\…`, `D:\Setup\…`). Trình cài D5 phải thay bằng tìm Node trên máy.
- `opsJournal/pl06Document.js:7` và `opsJournalHelpers.js:632` có họ tên người ký thật (ngoài phạm vi, nhưng là dữ liệu cá nhân trong mã nguồn, xem mục 5).

## 2. (b) Đồ thị phụ thuộc module

Phương pháp: duyệt bao đóng `require`/`import` tĩnh từ từng gốc (script tạm, không ghi vào repo).

### 2.1 Backend: điểm khởi động (`server.js`)

| Phần | Vị trí | Ngoài phạm vi? |
|---|---|---|
| Route `/api/f42`, `/api/f42/v2` | `server.js:154-166` | Có |
| Route `/api/hangton`, `/api/ops-journal`, `/api/network-map` | `server.js:152,168,169` | Có |
| Route `/api/f13/v2` (gồm why / evidence / hành trình / đề xuất quy tắc **và** time-axis F1.3) | `server.js:149`, `F13V2Controller.js` | Một phần: phải tách theo từng endpoint |
| `/api/import` → `hangtonImportRoutes` | `importRoutes.js:12` | Phần hàng tồn |
| Scheduler Hàng tồn | `server.js:206-218` (tự tắt khi không có `.hangton.env`) | Có |
| Scheduler BF Phát (WinSCP) | `server.js:221-227` (chỉ tắt bằng `BF_PHAT_SCHEDULE_ENABLED=false`) | Có |
| Khởi động lại bảng nguyên nhân F1.3 | `server.js:312-316` (mặc định tắt) | Có |
| Lane F4.2 HUE/TCT trong hàng đợi | `importIndicatorRegistry.js:382-385` (`F4.2` ACTIVE), `autoBackfillExecutors.js` → `autoBackfillF42Executors.js` | Có. Lịch tự động chạy mọi chỉ tiêu ACTIVE, nên phải chuyển F4.2 sang PAUSED/RETIRED khi chạy bản tỉnh. |
| Migration lúc khởi động | `server.js:174-201`: network ×4, hangton ×2, ops_journal ×2, bf_phat, f13 why/evidence/rule… | Có thể giữ (chỉ tạo bảng rỗng) |

### 2.2 Backend: chỗ 4F / Trang chủ gọi sang module bị bỏ

| Từ (trong phạm vi) | Gọi sang (ngoài phạm vi) | Hệ quả khi tắt |
|---|---|---|
| `HomeExecutiveService.js:125-126,182-186` | `F42RankingService`, `F42NationalRankService`; thẻ F4.2 nằm trong `ORDER` dòng 20 | Trang chủ phải bỏ F4.2 khỏi `ORDER`/`TARGETS`, không chỉ ẩn trên giao diện |
| `importProcessor.js:261,363,550,611,729`; `FactF41Repository.js:119` | `f13v2/CauseRefresh.notifySourceImported` | Có `try/catch`, và việc làm mới còn chặn bởi `QIS_F13_CAUSE_REFRESH`. Kéo theo `JourneyService`, `CauseAggBuilder`, `CauseClassifier`, `f13CauseConfig` |
| `F13DashboardService.js:10,1132` | `postmanRankingService` (`network_delivery_point` + `dm_buu_ta`) | Bảng rỗng thì trả rỗng; cần kiểm ở S4 |
| `f13Routes` → `DashboardController`, `kpiController` | `evidenceQueryService`, `timelineService`, `messageGenerationService` | Route F1.3 cũ có endpoint ngoài phạm vi |
| `FactBuuGuiRepository.js` | `evidenceReasonSql` | Dùng chung, giữ |
| `F41RankingService`, `periodResolve` | `bcvhWeeklyComparisonService` | **Trong phạm vi** (so sánh tuần của 4F); scanner nhận nhầm vì tên có chữ “weekly” |

### 2.3 Frontend

- `App.jsx:161-169,191-195,211-216`: route `f42/*`, `hangton/*`, `ops-journal*`, `my-tasks`, `f13/v2/{hanh-trinh,why,evidence,de-xuat-quy-tac}`, `network-map/*` (kể cả `postman-catalog`).
- `navigation/appNavigation.jsx:38-41,68-72,93-97,119,122`: các nhóm menu tương ứng, cộng các mục trong `TIME_AXIS_INDICATORS` có F4.2.
- Nhúng chéo: `F13V2DayPage.jsx` (được dùng lại cho time-axis F1.1/F1.2/F4.1 qua `IndicatorProvider`) import `features/f42/components/F42SixBcvhStripBlock`, `F42PostmanDashboardBlocks`. `SharedLayout.jsx` import `ops-journal/api/opsJournalApi` (chuông thông báo). `AuthContext.jsx` → `f13EvidenceHelpers` → `f13WhyHelpers` (phụ thuộc helper, chưa chắc có lời gọi API).
- `pages/DashboardHome.jsx`: bao đóng không chạm module ngoài phạm vi, nhưng hiển thị 5 thẻ theo dữ liệu backend (gồm F4.2).

## 3. (c) Kiểm chứng bảng D2 (DB thật, chỉ đọc, 2026-11-18)

| Bảng | Số dòng | Mã tỉnh trong dữ liệu | Nguồn ghi / tạo | Kết luận so với D2 |
|---|---:|---|---|---|
| `fact_f11_national` | 29 006 | 58 mã tỉnh, `ma_bc_*` rỗng, 315 ngày 01/01–17/11 | lane TCT; `migrate_f11_phase4` + `schema.sql` | Khớp D2 (**Có**), nhưng có **khóa ngoại `import_log_id`**, xem M1 |
| `fact_f12_national` | 16 580 | 53 mã tỉnh, 313 ngày | lane TCT; `migrate_f12` | Như trên |
| `fact_f13_national` | 10 710 | 34 tỉnh, 315 ngày | lane TCT; **chỉ `schema.sql`** | Có; không có `import_log_id` |
| `fact_f41_national` | 10 710 | 34 `ma_don_vi`, `ma_bc` rỗng | lane TCT; `migrate_f41_phase2` | Có; khóa ngoại `import_log_id` (M1) |
| `fact_f42_national` | 7 854 | từ 01/04 | lane TCT F4.2 | **Không có trong D2** (M3): F4.2 bị bỏ, nên Không |
| `dim_buu_cuc_toan_quoc` | 6 800 | `ma_tinh` (Huế 81 BC, Nghệ An 419 BC); cột `ma_bc, ten_bc, ma_tinh, ten_tinh, nguon, cap_nhat_luc`; `nguon` = “F1.1 toan quoc 02-11-2026” | **Không có mã nào tạo, ghi hay đọc bảng này** (chỉ manifest nhắc tới) | M2 |
| `fact_f11` / `fact_f12` / `fact_f13` / `fact_f41` | 487 107 / 498 621 / 1 034 247 / 1 519 936 | 100 % `53` | lane HUE | Khớp D2 (Không). `fact_f13` chỉ được tạo từ `schema.sql` |
| `agg_f11_day`, `agg_f12_day`, `agg_f13_day`, `agg_f41_day` | 39 904 / 20 620 / 32 865 / 2 328 | 100 % mã đơn vị `53…`; không có cột tỉnh | dựng từ `fact_*` của Huế | **Xác nhận: không chứa phần toàn quốc**, D2 đúng (Không). `agg_day_sig` (theo `fact_max_id` của Huế) và `agg_state` cũng Không |
| `system_config` | 3 | `default_province_code=53`, `default_province_name`, `enable_national_ranking=true` | **chỉ `schema.sql`** | Có, đặt lại hai khóa tỉnh |
| `sys_kpi_thresholds` | 12 | — | **chỉ `schema.sql`** | 4 mức (70/60/50/0) **lặp 3 lần** (id 1–12): dữ liệu seed bị nhân bản. Mức 70/60/50 khác chỉ tiêu 95/90 của `HomeExecutiveService`. S2 cần rà xem bảng này còn được đọc không |
| `auto_backfill_holiday_calendar` (+event) | 6 / 6 | — | migration | Lý do ghi “Migrated from PO exception(s)…: Test” / “Lễ tết”: lịch do PO Huế nhập. Xem Q6 |
| `import_log` | 5 027 (TCT 2 142) | — | mọi lane | D2: Không. **Mâu thuẫn M1** |
| Bảng Huế không có trong D2 | `f13_analysis_log`, `f13_rule_proposal_decision`, `f13_cause_run/day` (thuộc `f13_cause_*`), `dm_buu_ta_conflict/event`, `network_import_*`, `hangton_option_group/reason_map`, `qis_user_bcvh/indicator`, `ops_journal_*` | — | — | Tất cả Không (schema rỗng) |

**Mâu thuẫn với D2 / D3:**

- **M1. Khóa ngoại quốc gia → `import_log`.** `fact_f11_national`, `fact_f12_national`, `fact_f41_national` (và `fact_f42_national`) có `import_log_id REFERENCES import_log`. Cột cho phép NULL nhưng 100 % dòng có giá trị (1 174 id khác nhau). `PRAGMA foreign_keys = ON` ở `src/database/sqlite.js:13` và `autoBackfillQueueStore.js:117`. S2 chọn một trong hai: (i) chép kèm các dòng `import_log` lane TCT được tham chiếu (đã kiểm: `file_name` dạng `F1.1-2026.11.15.xlsx`, không lộ tài khoản; cột `actor` cần rà); hoặc (ii) đặt `import_log_id = NULL` trong DB hạt giống. Cả hai cách đều không ảnh hưởng độ phủ: `autoBackfillCompletionPolicies.js:81-87` coi “có dữ liệu đã ghi + toàn vẹn” là SUCCESS, không cần log hay file đã xử lý. Tỉnh mới sẽ **không tải lại** lịch sử toàn quốc. Tuy vậy, cần kiểm chứng ở S5 bằng một lần quét độ phủ trên DB hạt giống.
- **M2. `dim_buu_cuc_toan_quoc` là bảng mồ côi.** Không có migration hay `schema.sql` nào tạo nó, cũng không có mã nào đọc hay ghi. Hướng D3 (“DB trống từ migration”) sẽ không có bảng này. D4 (lấy danh mục bưu cục của tỉnh từ bảng này) chưa có đường mã nào. Bảng cũng không có cột BCVH. S2 phải quyết định: thêm migration và nguồn cập nhật, hoặc suy danh mục từ dữ liệu chi tiết.
- **M3. `fact_f42_national` chưa có trong D2.** Đề xuất: Không, vì F4.2 bị bỏ.
- **M4. D3 “tạo DB trống bằng migration hiện có” chưa đủ.** `fact_f13`, `fact_f13_national`, `system_config`, `sys_kpi_thresholds` chỉ được tạo từ `src/db/schema.sql`, chạy qua `recreate_db.js` (thủ công). Migration lúc khởi động (`server.js:174`) không tạo bốn bảng này. DB hạt giống phải chạy `schema.sql` trước, rồi đến migration. Ngoài ra, `schema.sql`/migration còn khai báo các bảng không có trên DB thật (`inc_*` của INC-PHAT chưa áp dụng, `fact_f13_new`), nên S2 cần chốt danh sách migration được vào gói.

## 4. (d) Nguồn danh mục BCVH của Huế

- **Không có bảng nào trong DB** giữ quan hệ bưu cục → BCVH. Danh mục 6 BCVH (533140 Thuận Hóa, 536250 Hương Thủy, 535470 Hương Trà, 537220 Phú Lộc, 537015 Thuận An, 535790 A Lưới) **gắn cứng ở 8 file**: `backend/src/config/canonicalBcvhUnits.js`, `backend/src/services/auth/access/officeMap.js`, `backend/src/controllers/kpiController.js:226`, `backend/src/config/f13RouteClassificationCatalog.js`; `frontend/src/auth/accessModel.js`, `features/dashboard/components/bcvhOperationTableData.js` (kèm màu), `dashboardFilterOptions.js`, `features/ranking/bcvhOverviewData.js`. Thứ tự cũng khác nhau giữa các file.
- **F1.3:** file chi tiết DKCL đã mang `ma_bcvh`/`ten_bcvh` (`fact_f13`: 6 BCVH chính cùng `531600` Trần Hưng Đạo, `531110` TT Hành chính công, `531120` Khách hàng lớn, đều số lượng nhỏ).
- **F1.1 / F4.1:** không có cột BCVH. Ở Huế, `ma_bc_phat` **chính là mã BCVH** (`fact_f41`: 6 mã chính chiếm > 99 %; cộng thêm `531110`, `531120`, `531600`, `530100`). Cổng F4.1 lane tỉnh trả dòng `[stt, "53", tên tỉnh, "5375", "BCVH Thuận Hóa", "533140", …]` (`dkclHueF13PortalClient.js:106`), tức cấp “huyện” ↔ BCVH.
- **F1.2:** theo `ma_bc_chap_nhan`, xếp hạng theo đơn vị có trong dữ liệu (`getRankedUnits`), trừ `531120`.
- Hệ quả cho D4: phương án “tự suy từ dữ liệu chi tiết” khả thi cho F1.3, và cho F1.1/F4.1 **nếu ở tỉnh khác bưu cục phát cũng là BCVH**. Đây là giả định cấu trúc tổ chức, xem Q1.

## 5. (e) Dữ liệu nhạy cảm và file cấm

**Đang nằm trong git** (gói xuất từ `git archive` hoặc copy thư mục đều sẽ kéo theo):

| File | Rủi ro |
|---|---|
| `2026.09.17 - DB Buu ta.xls` (commit `5cc012f8`) | Danh bạ bưu tá Huế (họ tên). **Cấm vào gói**, và nên cân nhắc gỡ khỏi git. Việc gỡ khỏi lịch sử git là quyết định của PO |
| `Ban_do_mang_diem_phuc_vu_BDTP_Hue.html`, `Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html`, `ban_do_duong_giao_thong_bcvh_postman_06_2026.html` | Bản đồ mạng lưới / bưu tá Huế |
| `backend/backend.err.log`, `backend/backend.out.log` | Log chạy thật |
| `backend/test.xlsx`, `screencapture-*.png`, `*.patch`, `antigravity_da_impl_006_local_*`, `patch*.js`, `export_*.js`, `generate_pages.js`, `test_startQueue.js` (gốc repo) | Rác hoặc dữ liệu thật, không thuộc gói |
| `backend/node_modules/**` (7 853 file được track) | Không nhạy cảm, nhưng là tiền đề cho “node_modules đóng sẵn” ở D5. Cần kiểm xem có module native (`bcrypt`) build theo máy không |
| `.claude/launch.json`, `.agents/skills/**`, `skills-lock.json` | Công cụ AI, không thuộc gói |
| Mã nguồn có họ tên thật | `backend/src/services/opsJournal/pl06Document.js:7` (người ký PL06), `frontend/src/features/ops-journal/opsJournalHelpers.js:632-637`, `opsJournalMockData.js` (dữ liệu mẫu; cần rà tên). Tất cả ngoài phạm vi; nếu S4 không xóa file mà chỉ tắt bằng cờ thì tên vẫn nằm trong gói |

**Chưa track và chưa bị `.gitignore` chặn** (rủi ro lỡ commit hoặc lỡ copy): `User QIS.xlsx` (tài khoản QIS), `graphify-out/`, `backend/uploads/` (hiện rỗng). Đã bị chặn: `.env`, `backend/.hangton.env`, `Data DKCL/`, `DataFKCL/`, `Data BF Phat/`, `Data QLML/`, `exports/`, `backend/storage/`, `*.sqlite` (gồm `src/db/backups/*.sqlite`), `logs/`, `backend/diagnostics/`, `backend/incident_evidence/`, `backend/network_map_archive/`, `BrowserProfiles/`.

**Trong DB:** tài khoản (`qis_user*`, `qis_session`, `qis_auth_event`), họ tên bưu tá (`dm_buu_ta*`, `fact_f42`, `fact_bf_phat`, `network_delivery_point`), dữ liệu bưu gửi (`fact_f1x`, `fact_f41`, `f13_cause_parcel`, `hangton_snapshot_item`). D3 chỉ chép các bảng “Có” nên đã loại được nhóm này. Bước quét nhạy cảm (S5) vẫn nên tìm `53\d{4}` trong cột mã đơn vị của các bảng toàn quốc: hiện `ma_bc_*` đều rỗng, chỉ có dòng tổng hợp của tỉnh 53, và đó là dữ liệu công khai toàn quốc.

**Bí mật nằm ngoài DB:** `.env` (`PORTAL_HUE_USERNAME/PASSWORD/HRM_CODE`, `QIS_ADMIN_*`, `QIS_INITIAL_PASSWORD`, `BF_PHAT_WINSCP_SESSION`), `backend/.hangton.env`, kho phiên DKCL (`DKCL_SESSION_STORE_PATH`), hồ sơ trình duyệt `Data DKCL/BrowserProfiles/{HUE,TCT}`.

## 6. (f) Parser Excel: có phụ thuộc tỉnh không?

| Parser | Cách đọc | Phụ thuộc tỉnh |
|---|---|---|
| `excelParser.js` (F1.3 chi tiết tỉnh) | Theo **tiêu đề** (`'Mã tỉnh phát' → ma_tinh_phat`, …) | Không |
| `f11HueExcelParser.js`, `f12HueExcelParser.js` | Theo tiêu đề; quét tiêu đề trong N dòng đầu | Không. Chỉ có chữ “HUE” trong thông báo lỗi |
| `f41HueExcelParser.js` | Theo tiêu đề, **và bắt buộc đúng `EXPECTED_COLUMN_COUNT` cột** (dòng 102) | Không theo tỉnh. Nếu báo cáo của tỉnh khác có số cột khác thì sẽ lỗi; khả năng thấp vì cùng một báo cáo |
| `f42HueParser.js` | CSV, có thuật toán gộp ô lệch | Ngoài phạm vi |
| `f11TctExcelParser.js`, `f12TctExcelParser.js` (`[1,'ma_tinh_chap_nhan']`…), `f41TctExcelParser.js`, `nationalExcelParser.js` | **Theo vị trí cột**, phạm vi toàn quốc; điều kiện đủ là “có đủ 34 tỉnh xếp hạng” | Không; giống nhau cho mọi tỉnh |
| Cổng F4.1 (`dkclHueF13PortalClient.js:109-115`) | JSON theo vị trí: ô 5 = mã BCVH (lane tỉnh), ô 1 = mã tỉnh (TCT), ô 10 = tổng sản lượng | Phụ thuộc vào cấu trúc nhóm “BC” của cổng, không phụ thuộc mã tỉnh. Cần chứng minh ở S6 với tỉnh khác (manifest cấm thử cổng trước) |

Kết luận (f): **không parser nào lọc hay giả định mã tỉnh**. Điểm phụ thuộc tỉnh duy nhất nằm ở tham số gửi lên cổng (mục 1.1).

## 7. Câu hỏi PO (quy tắc có vẻ riêng Huế; không tự quyết)

- **Q1 (BCVH).** Ở tỉnh khác, đơn vị dùng để xếp hạng có luôn là “BCVH” (bưu cục phát = BCVH, như 6 BCVH của Huế) không, hay có cấp khác (huyện/cụm)? Danh sách BCVH của tỉnh lấy từ dữ liệu DKCL là đủ, hay tỉnh phải tự khai báo?
- **Q2 (BCVH phụ).** Ở Huế, `531600` Trần Hưng Đạo, `531110` TT Hành chính công, `531120` Khách hàng lớn có dữ liệu nhưng không nằm trong 6 BCVH. Với tỉnh khác, đơn vị kiểu này được xử lý thế nào: không xếp hạng, gộp vào BCVH, hay để tỉnh khai báo?
- **Q3 (F1.2).** Quy tắc PD-F12-8 “Khách hàng lớn `531120` tính vào tổng nhưng không xếp hạng” có áp dụng cho tỉnh khác (mỗi tỉnh tự khai báo bưu cục KHL), hay chỉ riêng Huế?
- **Q4 (F1.3 tuyến).** Danh sách tuyến “phát tại quầy / phát tại bưu cục” không tính là tuyến bưu tá (`f13RouteClassificationCatalog.js`, PO duyệt 2026-07-28) là riêng Huế. Với tỉnh khác: để trống, hay cho tỉnh tự khai báo?
- **Q5 (F1.3 tuyến).** Code coi “tuyến bưu tá của tỉnh” là mã tuyến bắt đầu bằng mã tỉnh (`LIKE '53%'`). Quy ước này có đúng cho mọi tỉnh không? Đây là quy ước mã của TCT, PO xác nhận hoặc để S6 kiểm.
- **Q6 (lịch nghỉ).** Sáu ngày trong `auto_backfill_holiday_calendar` (17–19/02/2026 Tết, …) là ngày nghỉ toàn quốc, dùng chung cho mọi tỉnh, hay là ngoại lệ riêng Huế? Một số dòng ghi lý do “Test”.
- **Q7 (tên hiển thị).** Tên đơn vị trên giao diện của tỉnh lấy theo `system_config.default_province_name` (dạng của TCT: “Bưu điện Tỉnh …”) hay tỉnh tự nhập? Hiện Huế đang dùng hai dạng: “Bưu điện thành phố Huế” và “Bưu điện Tỉnh Thừa Thiên Huế”. Cách gọi “BĐTP” và tên vai trò `LD_BDTP` có cần đổi thành “BĐT” cho tỉnh khác không?

Ghi chú: quy tắc ngày N-1, giờ chạy tự động 07:30 (`AUTO_IMPORT_TIMES`), ngưỡng 95/90 % là quy tắc chung của 4F, không thấy dấu hiệu riêng Huế. `f13CauseConfig.DIRECT_HANDOVER_BCVH ['535470']` là quy tắc riêng Huế nhưng nằm trong RCA (ngoài phạm vi).

## 8. Gợi ý kỹ thuật cho S2 (không ràng buộc)

1. Module cấu hình tỉnh cần cấp ít nhất: `provinceCode`, chuỗi định dạng mã cho từng báo cáo (`'53'`, `N'53'`, `53`), `provinceDisplayName`, danh mục BCVH (thay 8 file), danh sách ngoại lệ (KHL, tuyến không phải bưu tá).
2. `reportIdentity` phải sinh ra đúng chuỗi cũ khi mã tỉnh là `53`. Thêm test so sánh đúng từng byte.
3. Frontend nên lấy danh mục BCVH và tên tỉnh từ một API (đã có `buildDashboardMeta().bcvh_units`), thay cho 4 file gắn cứng.
4. DB hạt giống: chạy `schema.sql`, rồi các migration trong danh sách đã chốt, rồi chép 4 bảng `*_national` (trừ F4.2) cùng `system_config` và lịch nghỉ. Xử lý M1, M2.
5. `QIS_EDITION=province`: đặt F4.2 thành PAUSED/RETIRED trong registry, bỏ F4.2 khỏi `HomeExecutiveService.ORDER`, chặn mount route và scheduler hàng tồn / BF Phát / nhật ký / mạng lưới, tách endpoint `/api/f13/v2`.

## 9. Lệnh đã chạy (tóm tắt)

- `git grep` theo các mẫu `\b53\b`, `'53[0-9]{2,4}'`, `HUE`, `Huế|Thừa Thiên|BĐTP`, `process.env.*`, `CREATE TABLE`, `dim_buu_cuc_toan_quoc`.
- `node --experimental-sqlite` mở `database.sqlite` với `readOnly: true`: liệt kê bảng và số dòng, `pragma_table_info`, `pragma_foreign_key_list`, phân bố `ma_tinh`/tiền tố mã đơn vị, khoảng ngày của bảng toàn quốc, nội dung `system_config`/`sys_kpi_thresholds`/lịch nghỉ.
- Script tạm (ngoài repo) duyệt bao đóng `require`/`import` từ các route, `autoBackfillQueueRuntime`, `DashboardHome`, `F13V2DayPage`, `SharedLayout`; một script quét sinh ra CSV.
