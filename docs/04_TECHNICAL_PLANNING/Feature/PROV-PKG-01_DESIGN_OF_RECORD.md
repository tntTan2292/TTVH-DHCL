# PROV-PKG-01 — Design of Record (S2)

- Ticket: `PROV-PKG-01`, bước `S2`. Manifest: `docs/10_TICKETS/PROV-PKG-01_MANIFEST.md` (D1–D9, Q1–Q12 đã chốt).
- Nguồn: `docs/06_REVIEWS/Province/PROV-PKG-01_SURVEY_001.md` + `PROV-PKG-01_SURVEY_001_hardcoded_points.csv` (gọi tắt **CSV**), kiểm lại trực tiếp trong mã ngày 2026-11-18.
- Người viết: Claude Code / Opus 5.5, 2026-11-18. Chỉ tài liệu: không sửa mã, không ghi DB.
- Trạng thái: `DRAFT — chờ PO duyệt DoR`. Không đổi SSOT, công thức 4F, ngưỡng hay quy tắc nghiệp vụ. Quy tắc mới phát sinh ghi ở mục 8 (câu hỏi PO).

**Nguyên tắc xuyên suốt:** bản `full` (Huế) phải ra **đúng từng byte** như trước S3 với mọi API trong phạm vi; mọi thay đổi là “đọc giá trị từ cấu hình, giá trị mặc định = Huế”. Bản `province` khác bản `full` chỉ ở (a) giá trị cấu hình trong DB, (b) cờ `QIS_EDITION`, (c) những gì script xuất gói **không chép**.

---

## 1. Module cấu hình tỉnh

### 1.1 Nguồn sự thật và vòng đời

- **Một nguồn:** bảng `system_config` (đã có, `schema.sql:18-29`). Không thêm biến `.env` cho mã tỉnh (tránh hai nơi lệch nhau). `.env` chỉ giữ cờ tiến trình (`QIS_EDITION`) và bí mật (tài khoản DKCL).
- **Module mới** `backend/src/config/provinceConfig.js` (CommonJS):
  - `load(db)` — đọc các khóa ở 1.2 một lần lúc khởi động; gọi trong `startServer()` **ngay sau** `ensureStartupSchemaMigrations()` và **trước** `authSessionStore.restore()`, `startAutoBackfillQueueRuntime`, scheduler, `app.listen`.
  - Getter đồng bộ: `getProvinceCode()`, `getDisplay()`, `formatForPortal(kind)` (1.3), `getRoutePrefix()`, `isLoaded()`.
  - `reload(db)` sau khi quản trị sửa tên hiển thị (không cho sửa mã tỉnh trên giao diện — đổi mã tỉnh là việc của trình cài).
  - **Trước khi `load()`:** bản `full` trả mặc định Huế (`'53'`, tên Huế) — giữ nguyên hành vi của ~120 file test đang `require` trực tiếp các service; bản `province` **ném lỗi** `PROVINCE_CONFIG_NOT_LOADED` (thà dừng còn hơn âm thầm tải dữ liệu Huế).
  - Bản `province` còn kiểm `province_configured = '1'`; chưa có thì tiến trình dừng với thông báo “Chưa chạy install.cmd”.
- Lý do chọn getter thay cho hằng số mức module: các hằng hiện có (`reportIdentity`, `HUE: Object.freeze({... stMaTinhPhat: '53'})`) được đánh giá lúc `require`, trước khi DB mở. S3 đổi chúng thành **getter/hàm** (`get reportIdentity()` hoặc `buildLaneParams(lane)`), không đổi tên khóa, không đổi hình dạng đối tượng mà nơi gọi nhìn thấy.

### 1.2 Khóa `system_config`

| Khóa | Huế (seed, `INSERT OR IGNORE` trong migration S3) | Bản tỉnh | Dùng ở |
|---|---|---|---|
| `default_province_code` | `53` (đã có) | do `install.cmd` ghi | mọi điểm giá trị chạy |
| `default_province_name` | “Bưu điện Tỉnh Thừa Thiên Huế” (đã có, không sửa) | gợi ý “Bưu điện tỉnh …” theo TCT (Q10) | thông báo backend |
| `display_unit_name` (mới) | “Bưu điện thành phố Huế” | tỉnh nhập lúc cài (Q10) | `SharedLayout.jsx:201`, `LoginPage.jsx:62`, `ChangePasswordPage.jsx:88` |
| `display_legal_name` (mới) | “Bưu điện tỉnh Thừa Thiên Huế” (đúng chuỗi `ChangePasswordPage.jsx:280` hiện nay) | = `display_unit_name` | `ChangePasswordPage.jsx:280` |
| `display_short_name` (mới) | “Huế” | tỉnh nhập (ví dụ “Nghệ An”) | “Tỷ lệ Huế”, “★ Huế”, “Huế F1.3”, thông báo “Chưa có dữ liệu xếp hạng của Huế” |
| `display_brand_short` (mới) | “VNPost Huế” | “VNPost ” + `display_short_name` | `Topbar.jsx:37` |
| `unit_leader_label` (mới) | “BĐTP” | “đơn vị” (Q11) | “Vị thứ BĐTP Huế”, “Lãnh đạo BĐTP”, `F12Cumulative12Block.jsx:210` |
| `province_configured` (mới) | `1` | `0` trong DB hạt giống, `install.cmd` đặt `1` | chặn khởi động bản tỉnh chưa cài |
| `unit_catalog_autofill` (mới) | `off` | `on` | mục 2.3 |

Quy tắc S3/S4: mỗi chuỗi hiển thị trong phạm vi được viết lại thành **mẫu + khóa** sao cho với giá trị Huế ra **đúng chuỗi cũ** (kể cả chỗ lệch “thành phố”/“tỉnh”, hoa/thường). Chuỗi nào không ráp được từ các khóa trên thì thêm khóa, không “chuẩn hóa” chuỗi Huế (memory PO: chỉ đổi đúng chỗ được yêu cầu). Mã vai trò `LD_BDTP`, `IT_BDTP` giữ nguyên (Q11).

### 1.3 Ba dạng tham số mã tỉnh

`formatForPortal(kind)` trả về:

| `kind` | Kết quả (Huế) | Điểm dùng (CSV) |
|---|---|---|
| `plain` | `'53'` (chuỗi, không nháy) | `f11PortalClientMethods.js:29,114,116`, `dkclHueF13PortalClient.js:93`, `dkclHueF13SyncService.js:310`, `tctF13BackfillService.js:1030`, `F13DashboardService.js:1174` (`hue_prefix`) |
| `nquoted` | `"N'53'"` | `f12PortalClientMethods.js:118` (`stMaTinhNhan`); `:36` dùng `plain` như hiện nay — S3 giữ đúng từng dòng như cũ |
| `numeric` | `53` (số) | dự phòng cho báo cáo gửi số (F4.2 ngoài phạm vi; S3 vẫn cấp để đủ ba dạng theo D8) |

Mã tỉnh được kiểm `^[0-9]{2}$` lúc `load()` và lúc cài; giá trị không đạt → không khởi động. Nhờ vậy `nquoted` và `LIKE '<mã>%'` không mở đường tiêm SQL.

### 1.4 Điểm S3 phải đổi (giá trị chạy trong phạm vi; dòng theo CSV)

| Nhóm | File:dòng | Thay bằng |
|---|---|---|
| Tham số cổng DKCL lane tỉnh | `f11PortalClientMethods.js:29,114,116`; `f12PortalClientMethods.js:36,118`; `dkclHueF13PortalClient.js:93`; `dkclHueF13SyncService.js:310` | `formatForPortal('plain'|'nquoted')` qua hàm dựng tham số |
| `reportIdentity` lane tỉnh | `autoBackfillF11Contract.js:25`, `autoBackfillF12Contract.js:25`, `autoBackfillF13Contract.js:8`, `autoBackfillF41Contract.js:8` | getter ghép `…TINH_PHAT=${code}`; dòng lane TCT (`=ALL`) **không đụng** |
| Mặc định mã tỉnh | `F11NationalRankService.js:21`, `F41NationalRankService.js:20`, `F13DashboardService.js:351`, `kpiController.js:86-95` | `getProvinceCode()`; bỏ truy vấn `system_config` rải rác (giữ hành vi lỗi 500 của `kpiController` khi thiếu khóa) |
| Tỉnh “mình” trong bảng toàn quốc | `tctF13BackfillService.js:1030` | `getProvinceCode()` |
| Tiền tố tuyến | `FactBuuGuiRepository.js:551,610,653,707,764,765,773,778`; `F13DashboardService.js:1174`; `f13RouteClassificationCatalog.js:79` | tham số ràng buộc `? ` = `code + '%'` (không nối chuỗi); `isHueRouteCode()` giữ tên, đọc `getRoutePrefix()` |
| Ngoại lệ đơn vị | `FactF12Repository.js:19` (`531120`); `f13RouteClassificationCatalog.js` (tuyến không phải bưu tá) | bảng đơn vị D9 (mục 2) và bảng ngoại lệ tuyến (2.1) |
| Danh mục 6 BCVH | 8 file (mục 2.5) | API/bộ nhớ đệm danh mục đơn vị |
| Seed | `schema.sql:26` | giữ nguyên (Huế); bản tỉnh do trình cài ghi đè |
| Không đổi | `nationalExcelParser.js:25` (danh sách 34 tỉnh); dòng `ngoai_pham_vi` trong CSV; 120 file test/fixture (D8) | — |

Chuỗi hiển thị trong phạm vi (54 dòng CSV loại “chuỗi hiển thị”, `trong_pham_vi`): backend 6 dòng (thông báo xếp hạng, `dkclSessionPreflightService.js:51` `displayName`, `dkclHueF13BackfillService.js:394`) làm ở S3; frontend làm ở S4 (Antigravity). S4 quét thêm `BĐTP` không kèm “Huế” (khảo sát 1.2 ghi scanner bỏ sót).

---

## 2. Danh mục đơn vị của tỉnh (D9)

### 2.1 Schema (migration mới `migrate_prov_pkg_01_unit_catalog.js`, thêm vào danh sách khởi động)

```sql
CREATE TABLE IF NOT EXISTS province_unit (
    ma_don_vi     TEXT PRIMARY KEY,          -- = ma_bcvh / ma_bc_phat trong fact
    ten_don_vi    TEXT NOT NULL,             -- tên đầy đủ, ví dụ 'BCVH Thuận Hóa'
    ten_ngan      TEXT,                      -- 'Thuận Hóa' (bcvhOverviewData)
    loai          TEXT NOT NULL CHECK (loai IN ('BCVH','PHU','KHL')),
                                             -- BCVH = xếp hạng; PHU = tính vào tổng, không xếp hạng (Q6); KHL = Q7/PD-F12-8
    thu_tu        INTEGER NOT NULL,          -- thứ tự mặc định trên giao diện
    mau           TEXT,                      -- '#2563eb' … (null = bảng màu mặc định)
    ma_phu_thuoc  TEXT,                      -- JSON mảng mã bưu cục thuộc đơn vị (A Lưới: ["535790","535710"])
    nguon         TEXT NOT NULL CHECK (nguon IN ('SEED','AUTO_F13','ADMIN')),
    can_xac_nhan  INTEGER NOT NULL DEFAULT 0,-- 1 = tự điền, quản trị chưa xem
    hieu_luc      INTEGER NOT NULL DEFAULT 1,
    cap_nhat_luc  TEXT NOT NULL,
    cap_nhat_boi  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS province_route_exception (   -- Q8: tuyến 'phát tại quầy' không tính là tuyến bưu tá
    ma_tuyen TEXT PRIMARY KEY, ma_don_vi TEXT NOT NULL, ten_tuyen TEXT,
    phan_loai TEXT NOT NULL, ngay_hieu_luc TEXT, ngay_quyet_dinh TEXT, can_cu TEXT,
    cap_nhat_luc TEXT NOT NULL, cap_nhat_boi TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS province_unit_event (        -- nhật ký sửa của quản trị (ai, lúc nào, trước/sau)
    id INTEGER PRIMARY KEY AUTOINCREMENT, ma_don_vi TEXT, hanh_dong TEXT NOT NULL,
    truoc TEXT, sau TEXT, actor TEXT NOT NULL, created_at TEXT NOT NULL
);
```

### 2.2 Seed Huế (migration, chỉ khi bảng rỗng **và** `default_province_code = '53'`)

- 6 dòng `BCVH` đúng mã/tên của `canonicalBcvhUnits.js`; `thu_tu` theo thứ tự `canonicalBcvhUnits` (A Lưới, Hương Thủy, Hương Trà, Phú Lộc, Thuận An, Thuận Hóa); `ten_ngan` và `mau` theo `bcvhOverviewData.js:6-20`; `ma_phu_thuoc` theo `officeMap.js:17-22`.
- `531120` Khách hàng lớn → `KHL`; `531600` Trần Hưng Đạo, `531110` TT Hành chính công → `PHU` (khảo sát mục 4). Hành vi Huế hiện nay với hai mã `PHU` (“có số, không trong 6 BCVH”) phải giữ nguyên; S3 kiểm bằng golden test (mục 6).
- `province_route_exception`: chép nguyên danh sách `CONFIRMED_NON_POSTMAN_ROUTES` của `f13RouteClassificationCatalog.js`.
- `nguon = 'SEED'`, `cap_nhat_boi = 'migration:prov-pkg-01'`.
- **Thứ tự:** các file hiện xếp 6 BCVH theo thứ tự khác nhau (`officeMap.js` bắt đầu Thuận Hóa; `canonicalBcvhUnits.js` bắt đầu A Lưới). S3 phải rà từng nơi dùng `BCVH_CODES`/`Object.keys(BCVH_BY_CODE)` có xuất thứ tự ra API không; nơi nào thứ tự ra ngoài thì giữ thứ tự cũ bằng sắp xếp tường minh tại chỗ (không đổi `thu_tu` cho vừa một nơi).
- Bảng `HANGTON_OFFICES_BY_*` và `530100` trong `officeMap.js` là của Hàng tồn (ngoài phạm vi): S3 **dời nguyên văn** sang thư mục module Hàng tồn để `officeMap.js` (vào gói, cần cho RBAC) không còn mã bưu cục Huế.

### 2.3 Tự điền cho tỉnh (chỉ khi `unit_catalog_autofill = 'on'`)

- Móc vào cuối lần nhập **F1.3 chi tiết lane tỉnh** thành công (`importProcessor`, sau khi ghi `fact_f13`): `INSERT OR IGNORE` từ `SELECT DISTINCT ma_bcvh, ten_bcvh FROM fact_f13 WHERE ngay_do_kiem = ?` với `loai='BCVH'`, `nguon='AUTO_F13'`, `can_xac_nhan=1`, `thu_tu` = tiếp sau giá trị lớn nhất. **Không bao giờ ghi đè** dòng đã có (quản trị viên sửa thì giữ).
- Mã xuất hiện ở F1.1/F4.1 (`ma_bc_phat`) mà không có trong danh mục: không tự thêm; xử lý theo câu hỏi PO **Q13** (mục 8).
- Bản Huế: `off` → không bao giờ ghi bảng này ngoài seed.

### 2.4 API

| Endpoint | Quyền | Trả về |
|---|---|---|
| `GET /api/meta/edition` | công khai (trang đăng nhập cần) | `{ edition, display_unit_name, display_legal_name, display_short_name, display_brand_short, unit_leader_label }` — **không** mã tỉnh, không danh mục |
| `GET /api/meta/units` | đã đăng nhập | `{ province_code, units: [{ma_don_vi, ten_don_vi, ten_ngan, loai, thu_tu, mau}], route_exceptions: [...] }`, chỉ `hieu_luc=1` |
| `PUT /api/admin/units/:ma` | ADMIN | sửa `ten_don_vi`, `ten_ngan`, `loai`, `thu_tu`, `mau`, `hieu_luc`; ghi `province_unit_event`; đặt `can_xac_nhan=0` |
| `POST/DELETE /api/admin/route-exceptions` | ADMIN | Q8 |

- `buildDashboardMeta().bcvh_units` (`kpiController.js:404`) giữ nguyên hình dạng, lấy từ bộ nhớ đệm danh mục (`loai='BCVH'`, theo `thu_tu`).
- Bộ nhớ đệm: module `backend/src/config/unitCatalog.js`, nạp cùng `provinceConfig.load()`, nạp lại sau mỗi lệnh sửa; trước khi nạp: bản `full` trả seed Huế cứng **trong chính module này** (một chỗ duy nhất còn hằng Huế, để test cũ chạy), bản `province` ném lỗi. Bảng thuộc `responseCache.CONFIG_TABLES` để sửa danh mục làm mới cache.

### 2.5 Thay 8 file gắn cứng

| File | Sau S3 |
|---|---|
| `backend/src/config/canonicalBcvhUnits.js` | `getCanonicalBcvhUnits()` đọc `unitCatalog` (giữ tên hàm, giữ hình dạng `{ma_bcvh, ten_bcvh}`) |
| `backend/src/services/auth/access/officeMap.js` | `BCVH_BY_CODE`, `BCVH_CODES` thành getter từ `unitCatalog`; phần Hàng tồn dời đi (2.2) |
| `backend/src/controllers/kpiController.js:226` | `allowedBcvh` = mã `loai='BCVH'` |
| `backend/src/config/f13RouteClassificationCatalog.js` | đọc `province_route_exception` qua `unitCatalog`; giữ tên hàm xuất |
| `backend/src/repositories/FactF12Repository.js:19` | `LARGE_CUSTOMER_OFFICE` → tập mã `loai='KHL'` (Huế: đúng `531120`) |
| `frontend/src/auth/accessModel.js` | lấy từ `UnitCatalogContext` (gọi `/api/meta/units` sau đăng nhập) |
| `frontend/src/features/dashboard/components/bcvhOperationTableData.js`, `dashboardFilterOptions.js` | như trên; giữ tên/hình dạng xuất qua hook `useUnitCatalog()` |
| `frontend/src/features/ranking/bcvhOverviewData.js` | màu/tên ngắn từ danh mục; `mau = null` → bảng màu mặc định theo `thu_tu`. Màu Huế giữ nguyên (kể cả tím `#7c3aed` đang có — không sửa giao diện Huế trong ticket này) |

Frontend: bản `full` giữ hằng Huế làm giá trị dự phòng khi API chưa trả; bản build `province` (mục 3.3) không có hằng Huế, dự phòng là mảng rỗng + trạng thái “đang tải”. Màn quản trị “Danh mục đơn vị” (bảng sửa được + nhãn “cần xác nhận”) là việc Antigravity ở S4; đây là màn cấu hình, không phải khối báo cáo, nên không áp `report_block_ui_standard.md`.

---

## 3. Cờ `QIS_EDITION = full | province`

### 3.1 Cơ chế

- Backend đọc `process.env.QIS_EDITION` một lần (`backend/src/config/edition.js`, mặc định `full`, giá trị lạ → dừng).
- Mọi điểm bật/tắt đi qua **một cổng mã**: `backend/src/edition/fullModules.js` (mount route, khởi scheduler, migration ngoài phạm vi, móc RCA, nguồn F4.2 cho Trang chủ) và bản rỗng `provinceModules.js` cùng giao diện. `server.js` chỉ gọi `editionModules.mountRoutes(app)`, `editionModules.startSchedulers()`, `editionModules.migrations`. Ở bản chạy thường, `edition.js` chọn file theo cờ; ở bản gói, esbuild thay đường dẫn `fullModules` → `provinceModules` (mục 5.3) nên mã ngoài phạm vi **không có trong khối**, không chỉ bị tắt (D8).
- Các `require` mức đầu file của module ngoài phạm vi trong `server.js:31-57` và các route chuyển vào `fullModules.js`.

### 3.2 Backend bị tắt ở `province`

| Phần | Vị trí hiện tại | Cách tắt |
|---|---|---|
| Route `/api/f42`, `/api/f42/v2` (vòng time-axis `server.js:154-164` có `f42`) | `server.js:154-166` | vòng time-axis lấy danh sách chỉ tiêu từ edition (`full`: 4+F4.2; `province`: f41/f11/f12) |
| `/api/hangton`, `/api/ops-journal`, `/api/network-map` | `server.js:152,168,169` | không mount |
| `/api/import` → `hangtonImportRoutes` | `importRoutes.js:12` | mount có điều kiện |
| `/api/f13/v2` | `server.js:149`, `F13V2Controller.js` | tách router: `f13v2TimeAxisRoutes` (giữ) và `f13v2RcaRoutes` (why/evidence/hành trình/đề xuất quy tắc — chỉ `full`). S4 liệt kê từng endpoint trong commit |
| `/api/f13` endpoint gọi `evidenceQueryService`, `timelineService`, `messageGenerationService` | `f13Routes` | các endpoint đó chỉ mount ở `full` |
| Scheduler Hàng tồn, BF Phát, khởi động bảng nguyên nhân F1.3 | `server.js:206-227, 312-316` | `startSchedulers()` của `provinceModules` không khởi chúng |
| F4.2 trong hàng đợi | `importIndicatorRegistry.js:382-385` | ở `province` registry trả F4.2 `status: 'RETIRED'` (tập hợp trạng thái đã có ở dòng 24); S4 xác nhận màn nhập dữ liệu ẩn hẳn chỉ tiêu `RETIRED` (nếu không thì dùng `PAUSED` và ẩn ở frontend) |
| Migration ngoài phạm vi | `server.js:174-201` | xem 4.2 |

### 3.3 Chỗ trong phạm vi gọi sang module bị bỏ

| Từ | Sang | Cách cắt |
|---|---|---|
| `HomeExecutiveService.js:18,20,125-126,182-186` | `F42RankingService`, `F42NationalRankService` | `ORDER`/`TARGETS` lấy từ edition (`province`: `f11,f12,f13,f41`); nguồn F4.2 cấp qua `editionModules.homeSources`. Bản `full`: mảng giữ nguyên thứ tự cũ |
| `importProcessor.js:261,363,550,611,729`; `FactF41Repository.js:119` | `f13v2/CauseRefresh.notifySourceImported` | thay bằng `editionModules.notifyCauseSourceImported` (`province`: no-op). Giữ nguyên `try/catch` hiện có |
| `F13DashboardService.js:10,1132` | `postmanRankingService` (`network_delivery_point`, `dm_buu_ta`) | bảng vẫn tồn tại (rỗng) nhờ `schema.sql` + migration network (4.2) → trả rỗng; S4 thêm test bản tỉnh trả mảng rỗng, không lỗi |
| `F41RankingService`, `periodResolve` → `bcvhWeeklyComparisonService` | — | **trong phạm vi**, giữ |
| Frontend `App.jsx:161-169,191-195,211-216`; `appNavigation.jsx:38-41,59,68-72,93-97,119,122` | route/menu F4.2, Hàng tồn, Nhật ký, việc của tôi, RCA F1.3, Mạng lưới | S4 (Antigravity): build-time `import.meta.env.VITE_QIS_EDITION === 'province'` loại route/menu; Vite/Rollup bỏ code chết nên module ngoài phạm vi **không vào `dist`** |
| `F13V2DayPage.jsx` → `features/f42/components/F42SixBcvhStripBlock`, `F42PostmanDashboardBlocks` | F4.2 | nhúng qua `React.lazy` sau điều kiện build-time; bản tỉnh không render khối |
| `SharedLayout.jsx` → `ops-journal/api/opsJournalApi` (chuông) | Nhật ký | như trên |
| `AuthContext.jsx` → `f13EvidenceHelpers` → `f13WhyHelpers` | helper RCA | S4 rà: nếu chỉ là hàm thuần dùng chung thì dời hàm sang `shared/`, không kéo module RCA |

`QIS_EDITION=full` không đổi bất kỳ route, menu, scheduler nào — chứng minh bằng test so danh sách route (`app._router` stack) và danh sách menu trước/sau (mục 6.1).

---

## 4. DB hạt giống

### 4.1 Cách dựng (script `scripts/package-province/build-seed-db.js`, chạy trên máy Huế, đọc DB Huế `readOnly`)

1. Tạo `dist-province/staging/data/database.sqlite` mới.
2. Chạy `backend/src/db/schema.sql` một lần (tạo `fact_f13`, `fact_f13_national`, `system_config`, `sys_kpi_thresholds` — các bảng chỉ có ở đây, M4).
3. Chạy **danh sách migration của bản tỉnh** (4.2) theo đúng thứ tự `server.js`.
4. **So schema:** với mỗi bảng có ở cả hai DB, so `pragma_table_info` + `pragma_index_list` giữa DB hạt giống và DB Huế. Khác nhau → dừng, in danh sách (khả năng: migration một lần như `migrate_fact_f13_allow_null_ket_qua.js` đã áp lên DB Huế). Xử lý bằng cách thêm migration đó vào danh sách 4.2 (không sửa tay DB).
5. Chép dữ liệu (4.3), đặt `system_config` (4.4), `PRAGMA integrity_check`, `PRAGMA foreign_key_check`, `VACUUM`.
6. Quét độ phủ (4.5) và quét nhạy cảm DB (5.2).

### 4.2 Danh sách migration của bản tỉnh

Giữ (trong phạm vi hoặc tạo bảng rỗng mà mã trong phạm vi vẫn truy vấn): `network_management_001_phase1..4` (bảng rỗng cho `postmanRankingService`), `f41_phase1/2`, `f11_phase1/4`, `f12`, `auto_backfill_queue`, `auto_backfill_safety`, `auto_backfill_coverage_exception`, `auto_backfill_holiday_calendar`, `f13_route_postman_identity_phase1`, `import_bulk_reimport_all_01`, `import_log_audit_01`, `perf_load_01_agg`, `rbac_01`, **mới:** `prov_pkg_01_unit_catalog`, `prov_pkg_01_system_config_keys`.

Bỏ: `f42`, `hangton_inventory_01`, `hangton_handling_01`, `bf_phat_01`, `ops_journal_01/02`, `f13_why_agg_01`, `f13_evidence_01`, `f13_rule_proposal_01`, `inc_phat_01` (chưa áp cả ở Huế), mọi script `migrate_*` không có trong `server.js`. Danh sách này là **một mảng duy nhất** trong `provinceModules.migrations`, dùng chung cho dựng DB hạt giống và khởi động bản tỉnh (không hai danh sách).

Lưu ý: `schema.sql` vẫn tạo `fact_f42*`, `network_*`, `dm_buu_ta*` rỗng. Chấp nhận (bảng rỗng, không dữ liệu); quét nhạy cảm chứng minh rỗng.

### 4.3 Bảng chép

| Bảng | Cách chép | Ghi chú |
|---|---|---|
| `fact_f11_national`, `fact_f12_national`, `fact_f41_national` | toàn bộ dòng, **`import_log_id = NULL`** (M1) | không chép `import_log` |
| `fact_f13_national` | toàn bộ dòng | không có `import_log_id` |
| `auto_backfill_holiday_calendar` | chỉ các dòng ngày nghỉ toàn quốc (Q9): bỏ dòng có lý do chứa `Test`; danh sách ngày cuối cùng in trong báo cáo S5 để CTO duyệt | không chép `…_event`; nếu mã đòi có event cho mỗi dòng lịch thì sinh một event `actor='qis-package'`, `reason='Ngày nghỉ toàn quốc đóng sẵn'` |
| `system_config` | không chép; dựng từ `schema.sql` + migration rồi đặt giá trị 4.4 | |
| `sys_kpi_thresholds` | không chép; giữ 4 dòng do `schema.sql` tạo | kiểm: bảng **không còn được đọc** (chỉ có trong `responseCache.CONFIG_TABLES` để tính dấu vân cache). Không dọn bản nhân ba ở Huế (ngoài phạm vi) |
| `province_unit`, `province_route_exception` | **rỗng** (bản tỉnh tự điền) | migration seed Huế chỉ chạy khi mã = `53`; DB hạt giống đặt mã placeholder trước khi chạy migration này (4.4) |
| Mọi bảng khác | rỗng | `fact_f11/12/13/41/42`, `agg_*`, `agg_day_sig`, `agg_state`, `import_log`, `auto_backfill_*` (trừ lịch nghỉ), `qis_*`, `dm_buu_ta*`, `network_*`, `f13_*`, `hangton_*`, `ops_journal_*` |

`fact_f42_national` không chép (M3). `dim_buu_cuc_toan_quoc` không tồn tại trong DB hạt giống (M2).

### 4.4 `system_config` trong DB hạt giống

`default_province_code = '00'` (placeholder hợp lệ về dạng nhưng không phải tỉnh), `province_configured = '0'`, `unit_catalog_autofill = 'on'`, các khóa hiển thị rỗng, `enable_national_ranking = 'true'` (Q3). Thứ tự trong script: đặt `'00'` **trước** bước 3 để migration seed Huế (2.2) không chạy.

### 4.5 Quét độ phủ M1 (bắt buộc ở S5)

Chạy logic độ phủ hàng đợi (`autoBackfillCoverageService` + `autoBackfillCompletionPolicies.js:81-87`) ở chế độ chỉ đọc trên DB hạt giống cho 4 lane TCT (F1.1, F1.2, F1.3, F4.1), khoảng 01/01/2026 → ngày dựng gói. Kết quả phải: tập ngày “thiếu” trên DB hạt giống **bằng** tập ngày thiếu trên DB Huế cùng khoảng (thường rỗng). Nếu DB hạt giống thiếu thêm ngày do `import_log_id = NULL` → chuyển sang phương án chép các dòng `import_log` lane TCT được tham chiếu (sau khi rà cột `actor`, thay bằng `'qis-package'`) và ghi lý do trong báo cáo S5.

---

## 5. Gói, quét nhạy cảm, bảo vệ D7, cài đặt

### 5.1 Bố cục gói và allowlist

```
QIS-Tinh-<phiên bản>.zip
├─ install.cmd, start-qis.cmd, update.cmd, HUONG-DAN-CAI-DAT.pdf (1 trang)
├─ app\                       ← phần chương trình: cài đè toàn bộ khi cập nhật (D7 lớp 4)
│  ├─ node\node.exe           ← Node 22.12.0 portable (đúng phiên bản Huế)
│  ├─ server\qis-server.js    ← khối backend gộp + làm rối
│  ├─ server\qis-admin.js     ← khối riêng cho “tạo quản trị đầu tiên” (từ seed-rbac-users --admin-only)
│  ├─ server\node_modules\    ← chỉ các gói ngoài khối (5.3)
│  ├─ web\                    ← frontend/dist bản province, không source map
│  ├─ browsers\               ← Chromium của Playwright đúng revision
│  ├─ tools\qis-supervisor-province.ps1
│  └─ integrity.json, integrity.sig
├─ data\database.sqlite       ← DB hạt giống (chỉ chép lần cài đầu; cập nhật không đụng)
└─ config\.env.example
```

- Script `scripts/package-province/build.js` lắp gói từ **allowlist** trong `scripts/package-province/allowlist.json` (đường dẫn nguồn → đích). Không dùng `git archive`, không copy thư mục repo. File không có trong allowlist không bao giờ vào gói. `docs/`, `CLAUDE.md`, `README_AI.md`, `.claude/`, `.agents/`, test, script dev, `*.md` → không có trong allowlist (D7 lớp 2).
- Đầu ra: `dist-province/` (thêm vào `.gitignore` ở commit S3a).

### 5.2 Quét nhạy cảm (chạy cuối `build.js`; thất bại → không tạo zip; Opus review riêng)

Quét **thư mục staging cuối cùng** (sau làm rối, sau build web), không quét repo:

1. **Tên file cấm:** `User QIS.xlsx`, `*.xls*`, `*.docx`, `*.html` ngoài `app\web\index.html`, `*.log`, `*.patch`, `.env` (chỉ cho `.env.example`), `*.map`, `*.sqlite` ngoài `data\database.sqlite`, thư mục `Data DKCL`, `BrowserProfiles`, `uploads`, `storage`, `backups`, `RCA F1.3`, `graphify-out`, `.claude`, `docs`.
2. **Nội dung text (mọi file trong `app\` trừ `browsers\`, `node\`):** `Huế`, `Hue` (whole word, ngoài khóa nội bộ trong danh sách cho phép: `dkclHue`, `HUE` lane, `DKCL_HUE_`, `PORTAL_HUE_`, `is_hue`, `hue_prefix`, `hue_focus`), `Thừa Thiên`, `BĐTP`, regex mã bưu cục Huế `\b53\d{4}\b` và `\b53\d{2,6}\b` dạng mã tuyến; danh sách họ tên lấy động từ `dm_buu_ta.ho_ten` + `qis_user.ho_ten` của DB Huế (chỉ so khớp, không ghi ra báo cáo — báo cáo chỉ ghi số lần khớp và file); mẫu bí mật (`PORTAL_.*=\S+`, `password\s*[:=]\s*['"][^'"]+`, chuỗi giống token dài > 32 ký tự base64/hex ngoài `integrity.*`).
3. **DB hạt giống:** danh sách bảng + số dòng, khẳng định mọi bảng ngoài danh sách 4.3 có 0 dòng; `fact_*_national` không có giá trị `ma_bc_*` dạng `53\d{4}`; `system_config` đúng 4.4; `qis_user`, `qis_session` = 0 dòng.
4. Kết quả ghi `dist-province/scan-report.json` + bản đọc được cho PO (S6 tiêu chí 5). Mọi khớp chưa được cho phép = thất bại.

### 5.3 Bảo vệ D7

**Lớp 1 — chỉ giao bản đóng gói.**
- Frontend: `vite build` với `VITE_QIS_EDITION=province`, `build.sourcemap = false`, minify mặc định. Source map **không** sinh cho gói.
- Backend: `esbuild` gộp `server.js` → `qis-server.js` (`platform=node`, `format=cjs`, `target=node22`), plugin thay `src/edition/fullModules` → `provinceModules`, `define` `process.env.QIS_EDITION` không dùng (cờ vẫn đọc runtime để một khối không chạy nhầm `full`: khối province bỏ qua giá trị `full`). **Ngoài khối** (`external`): `sqlite3`, `koffi` (native `.node`), `playwright`, `playwright-core` (tự tìm file trình duyệt/driver theo đường dẫn gói), `bcryptjs` có thể gộp. Migration và `schema.sql` được gộp (đọc `schema.sql` bằng `fs` → đổi sang chuỗi nhúng qua loader `text` của esbuild).
- Làm rối: `javascript-obfuscator` trên khối, cấu hình thận trọng: `renameGlobals:false`, `stringArray:true` (+`stringArrayEncoding:['base64']`), `transformObjectKeys:false` (khóa JSON/cột SQL phải giữ), `controlFlowFlattening:false` (hiệu năng), `selfDefending:false`, `sourceMap:false` cho gói nhưng **sinh source map riêng** lưu ở `dist-province/private/` để Huế đọc log lỗi (không vào zip).
- **Rủi ro Playwright đã kiểm:** có 31 lời gọi `.evaluate(` trong `src/` (phần lớn là `rule.evaluate` không liên quan; các lời gọi trình duyệt nằm ở `dkclHueF13PortalClient.js`, `f42PortalClientMethods.js` (bị bỏ), `dkclDetailTimeoutEvidence.js`). Hàm truyền vào `page.evaluate`/`waitForFunction` được Playwright **tuần tự hóa bằng `toString()`** và chạy trong trang DKCL: nếu bộ làm rối thay chuỗi trong thân hàm bằng lời gọi bộ giải mã `stringArray` thì trong trang sẽ `ReferenceError`. Biện pháp: S5 bao các hàm đó bằng `/* javascript-obfuscator:disable */ … /* javascript-obfuscator:enable */`, có test tĩnh liệt kê mọi lời gọi `page.evaluate|waitForFunction|addInitScript|$eval|$$eval` trong khối và khẳng định nằm trong vùng tắt; S6 chứng minh bằng một lần tải DKCL thật.
- `loadPlaywright()` (`dkclHueF13PortalClient.js:229-233`) thử `../frontend/node_modules/playwright` trước: gói không có thư mục đó nên rơi về `require('playwright')` — đúng; launcher đặt `PLAYWRIGHT_BROWSERS_PATH=app\browsers`.
- **`.exe`:** không làm ở S5. Node 22 SEA chỉ nhúng một script CJS, native addon (`sqlite3`, `koffi`) và Playwright vẫn phải nằm ngoài, nên `.exe` không thêm bảo vệ đáng kể so với khối làm rối + kiểm hash, nhưng thêm rủi ro build. Ghi là residual, xét lại sau S6.
- **`node:sqlite`:** runtime dùng `sqlite3` (native); `node:sqlite` chỉ dùng trong test và trong `build-seed-db.js` (chạy trên máy Huế với `--experimental-sqlite`, không vào gói). Không ảnh hưởng gói.

**Lớp 2 — không giao tài liệu/bản đồ cho AI:** bằng allowlist (5.1) + quét (5.2 mục 1); esbuild `legalComments:'none'`, minify bỏ chú thích.

**Lớp 3 — kiểm nguyên vẹn lúc khởi động.**
- `integrity.json`: SHA-256 của **mọi file trong `app\`** trừ `app\browsers\` (rất lớn; thay bằng hash của file `INSTALLATION`/`.revision` và `chrome.exe`) — gồm khối, `node_modules` ngoài khối, `web\`, `tools\`, `node.exe`. Không gồm `data\`, `config\`.
- `integrity.sig`: chữ ký **Ed25519** của `integrity.json`. Khóa bí mật nằm trên máy phát hành của Huế (`%USERPROFILE%\.qis-release\signing-key.pem`, không trong repo, không trong gói); khóa công khai nhúng trong khối (đã làm rối).
- Đầu `qis-server.js` (trước mọi `require` khác): kiểm chữ ký, rồi hash từng file; sai/thiếu → ghi `logs\integrity-failure.log` (file nào), in “Bản cài đã bị thay đổi. Liên hệ Bưu điện thành phố Huế để cài lại.”, thoát mã 78; supervisor thấy mã 78 thì **không khởi động lại** (tránh vòng lặp) và để lại thông báo. Ngân sách thời gian kiểm: < 5 s (S5 đo; nếu vượt thì chỉ hash khối + `web\` + file `.node` mỗi lần, phần còn lại hash nền sau khởi động và dừng tiến trình nếu sai).
- `qis-admin.js` dùng cùng bộ kiểm.
- Thừa nhận: người sửa được khối cũng xóa được bộ kiểm; mục tiêu D7 là “rất khó, không đáng công”, không phải tuyệt đối.

**Lớp 4 — cập nhật:** `update.cmd` dừng dịch vụ, đổi tên `app\` → `app.old\`, giải nén `app\` mới, chạy kiểm nguyên vẹn bằng `app\node\node.exe app\server\qis-server.js --verify-only`, thành công thì xóa `app.old\` và khởi động (migration của bản mới tự chạy trên `data\database.sqlite`); thất bại thì đổi lại `app.old\`. `data\` và `config\` không bao giờ bị ghi đè.

**Lớp 5:** việc của PO (thỏa thuận sử dụng).

### 5.4 `install.cmd` (PowerShell bên dưới, tiếng Việt, không đòi kỹ năng kỹ thuật)

1. Kiểm Windows x64, quyền ghi thư mục cài, cổng `5050` trống (dùng lại logic `scripts/check-qis-lan-ports.ps1`).
2. Kiểm nguyên vẹn (`--verify-only`).
3. Lần cài đầu: chép `data\database.sqlite` (nếu đã có thì **không** ghi đè và bỏ qua bước 4, chỉ cho sửa tài khoản DKCL).
4. Hỏi: mã tỉnh (2 chữ số; hiện tên tỉnh tương ứng lấy từ `fact_f13_national`/`fact_f11_national` để người cài xác nhận), tên đơn vị (gợi ý “Bưu điện tỉnh <tên>”, Q10), tên ngắn. Ghi `system_config` bằng `qis-admin.js --set-province` (một giao dịch), đặt `province_configured='1'`.
5. Hỏi tài khoản DKCL (tên đăng nhập, mật khẩu nhập ẩn, mã HRM) → `config\.env` (`PORTAL_HUE_USERNAME/PASSWORD/HRM_CODE` — tên khóa nội bộ giữ theo D1), cùng `QIS_EDITION=province`, các đường dẫn dữ liệu trỏ vào `data\` (`DKCL_HUE_PROFILE_DIR`, `DKCL_TCT_PROFILE_DIR`, thư mục tải/xử lý, `DKCL_SESSION_STORE_PATH`, đường dẫn DB). S5 phải liệt kê đủ 16 chỗ `process.cwd()` trong `src/` + `server.js` và cấp biến môi trường cho mọi đường dẫn dữ liệu (nếu không, `app\` bị cài đè sẽ xóa hồ sơ trình duyệt/dữ liệu). **Mở rộng mã cần ở S3/S4:** DB vận hành hiện cố định `src/db/database.sqlite` (`src/config/db.js` chỉ cho đổi khi test) → thêm `QIS_DB_PATH` (mặc định như cũ).
6. Tạo **quản trị viên đầu tiên**: dùng lại luồng `seed-rbac-users.js --admin-only --apply` (đóng trong `qis-admin.js`): hỏi tên đăng nhập (mặc định `admin`) và mật khẩu (nhập hai lần, ẩn, kiểm chính sách mật khẩu hiện có); mật khẩu chỉ truyền qua biến môi trường của tiến trình con, không ghi file, không in.
7. Đăng ký tự khởi động: tác vụ Task Scheduler “QIS” lúc người dùng đăng nhập chạy `tools\qis-supervisor-province.ps1` (bản rút gọn của `scripts/qis-supervisor.ps1`: chỉ một tiến trình backend, Node lấy từ `app\node\`, bỏ mọi đường dẫn tuyệt đối `C:\Users\Admin\…`, `D:\Setup\…`). Backend bản tỉnh phục vụ luôn `app\web` (S4 thêm `express.static` + fallback SPA khi `QIS_SERVE_WEB` trỏ thư mục) → một cổng, không cần Vite. HTTPS LAN tự ký: tùy chọn (Q1), không làm mặc định.
8. Mở trình duyệt `http://localhost:5050`, hướng dẫn: đăng nhập QIS → Nhập dữ liệu → “Mở đăng nhập DKCL” (DKCL có captcha, phải đăng nhập tay một lần cho mỗi lane). Sau lần đăng nhập DKCL đầu tiên, hệ thống tự xếp hàng tải bù chi tiết **tháng hiện tại và tháng trước** (Q2) — S4 thêm một tác vụ một lần, đánh dấu bằng khóa `system_config.initial_backfill_queued`.

---

## 6. Kế hoạch test

### 6.1 Hồi quy Huế (bắt buộc trước khi S3, S4 được duyệt)

| Test | Cách | Tiêu chí |
|---|---|---|
| T1 `reportIdentity` | test đơn vị: với `load()` mã `53` và với trạng thái chưa `load()` (bản `full`), so **đúng từng byte** 8 chuỗi của 4 contract (4 lane tỉnh + 4 lane TCT) với hằng chụp lại trong test từ commit gốc `3662965e` | `===` cho cả 8; thêm kiểm `Buffer.compare` để loại khác biệt Unicode/khoảng trắng |
| T2 Tham số cổng | snapshot đối tượng tham số F1.1/F1.2/F1.3/F4.1 lane `HUE` (gồm `N'53'` của F1.2) | bằng nhau sâu, cùng kiểu dữ liệu (chuỗi vs số) |
| T3 SQL tiền tố tuyến | chạy các truy vấn `FactBuuGuiRepository` (551…778) trên fixture có tuyến `53…`, `55…`, `Khong Xac Dinh` | kết quả trước = sau |
| T4 Danh mục đơn vị | `getCanonicalBcvhUnits()`, `buildDashboardMeta()`, `BCVH_BY_CODE`, `allowedBcvh`, `LARGE_CUSTOMER_OFFICE`, `isConfirmedNonPostmanRoute` trước/sau | bằng nhau sâu, **cùng thứ tự** |
| T5 Golden 4F một ngày mẫu | script `backend/scripts/prov-pkg-golden.js` gọi **tầng service** (không HTTP, không đăng nhập — memory RBAC): Trang chủ điều hành, F1.1/F1.2/F1.3/F4.1 ngày–tuần–tháng (ranking BCVH, tuyến, so sánh tuần), xếp hạng toàn quốc, `buildDashboardMeta`, cho ngày mẫu **2026-11-15** và kỳ chứa nó. Chạy với `NODE_ENV=test`, `QIS_TEST_DB_PATH` = **bản sao đông cứng** của DB Huế (tạo một lần bằng `VACUUM INTO` vào `backend/src/db/backups/prov-pkg-golden.sqlite`, đã bị `.gitignore` chặn `*.sqlite`). Xuất JSON chuẩn hóa (khóa sắp xếp), bỏ danh sách trường thời gian sinh (`generated_at`, `computed_at`… liệt kê trong script) | SHA-256 của từng payload trên commit gốc = trên commit S3 = trên commit S4 (`QIS_EDITION=full`) |
| T6 Route/menu `full` | so danh sách route Express (method + path) và cây menu `appNavigation` trước/sau | giống hệt |
| T7 Bộ test hiện có | backend `node --experimental-sqlite --test` (memory: thiếu cờ → `# fail 1` giả), **cộng** từng file `test_*.js` gốc chạy riêng (memory: sweep bỏ sót); frontend test hiện có | không test nào đổi trạng thái so với commit gốc (lỗi sẵn có ghi rõ là sẵn có) |
| T8 Chuỗi hiển thị Huế | test frontend render `SharedLayout`, `LoginPage`, `ChangePasswordPage`, `Topbar`, `NationalRankingBlock` với cấu hình Huế | đúng chuỗi cũ |

### 6.2 Bản tỉnh (mã khác 53, dùng `46`)

| Test | Tiêu chí |
|---|---|
| P1 `provinceConfig` mã `46` | 4 `reportIdentity` lane tỉnh chứa `TINH_…=46`, lane TCT không đổi; tham số cổng `'46'` / `"N'46'"` |
| P2 Chưa `load()` ở `province` | ném `PROVINCE_CONFIG_NOT_LOADED`; `province_configured='0'` → không khởi động |
| P3 Mã tỉnh sai dạng (`'4'`, `"46' OR 1=1"`) | `load()` từ chối |
| P4 Tiền tố tuyến | fixture có tuyến `46…` và `53…`: chỉ `46…` là tuyến bưu tá |
| P5 `tctF13BackfillService` | chọn đúng dòng `ma_tinh_phat='46'` |
| P6 Trang chủ | `ORDER` không có F4.2; khối xếp hạng toàn quốc đánh dấu `is_hue` cho tỉnh 46 (tên cờ nội bộ giữ) |
| P7 Tự điền danh mục | nhập fixture F1.3 chi tiết tỉnh 46 → `province_unit` có các `ma_bcvh` với `can_xac_nhan=1`; nhập lần hai không ghi đè dòng quản trị đã sửa; `full` không ghi |
| P8 Route bị tắt | `province`: `/api/f42*`, `/api/hangton`, `/api/ops-journal`, `/api/network-map`, endpoint RCA trả 404; route 4F/Trang chủ/nhập dữ liệu/quản trị còn |
| P9 Registry | F4.2 không vào lịch tự động, không hiện trên màn nhập |
| P10 DB hạt giống | 4.1 bước 4 (so schema) sạch; 4.5 độ phủ bằng Huế; 5.2 mục 3 sạch |
| P11 Khối làm rối | khởi động khối trên DB hạt giống + cấu hình 46 bằng Node của gói; gọi `/api/meta/edition`, Trang chủ, xếp hạng toàn quốc qua HTTP **trên cổng cách ly** (memory: 5051, không đụng 5050 đang chạy) |
| P12 Nguyên vẹn | sửa 1 byte trong khối / trong `web\` / xóa một file `.node` → thoát mã 78, log đúng file; `data\`, `config\` đổi thì vẫn chạy |
| P13 Thật (S6, Antigravity) | cài sạch, mã khác 53, đăng nhập DKCL tay, tải một ngày → có chi tiết 4F và danh mục đơn vị của tỉnh đó; tuyến `LIKE '<mã>%'` đúng (D8) |

---

## 7. Chia commit và rủi ro

### 7.1 Commit

| Bước | Commit | Executor | Nội dung | Kiểm |
|---|---|---|---|---|
| S3a | `chore(prov-pkg): ignore and untrack sensitive files` | Claude Code / Sonnet | `.gitignore` += `User QIS.xlsx`, `graphify-out/`, `backend/uploads/`, `dist-province/`; `git rm --cached` danh bạ `.xls` + 3 bản đồ HTML (Q12) | `git ls-files` không còn; file trên máy còn |
| S3b | `feat(prov-pkg): province config module` | Sonnet | `provinceConfig.js`, migration khóa mới (seed Huế), `load()` trong `startServer`, `QIS_DB_PATH`, T1-T2 + P1-P3 (chưa thay điểm dùng) | T7 |
| S3c | `feat(prov-pkg): read province code from config` | Sonnet | thay điểm 1.4 (cổng, contract, mặc định, tiền tố tuyến, TCT rank), chuỗi hiển thị backend | T1-T3, T5, T7, P1, P4, P5 |
| S3d | `feat(prov-pkg): province unit catalogue` | Sonnet | bảng D9, seed Huế, `unitCatalog`, API, backend 4 file, dời bảng Hàng tồn khỏi `officeMap` | T4, T5, T7, P7 |
| S3e | `feat(prov-pkg): frontend reads unit catalogue` | Sonnet (dữ liệu, không đổi bố cục) | 4 file frontend + `UnitCatalogContext` | T4, T8, frontend tests |
| — | **Opus review độc lập S3** (khác phiên thực hiện) | Opus | | T5 hash khớp |
| S4a | `feat(prov-pkg): QIS_EDITION backend gate` | Sonnet | `edition.js`, `fullModules`/`provinceModules`, tách `/api/f13/v2`, registry F4.2, Home `ORDER`, móc CauseRefresh, `express.static` cho `QIS_SERVE_WEB`, tác vụ tải bù lần đầu | T5, T6, T7, P6, P8, P9 |
| S4b | `feat(prov-pkg): province edition UI` | Antigravity (không mở browser) | menu/route build-time, lazy F4.2/Nhật ký, chuỗi hiển thị theo `/api/meta/edition`, màn Danh mục đơn vị | T6, T8; PO không cần xem ở S4 |
| S5a | `feat(prov-pkg): seed database builder` | Sonnet | `build-seed-db.js`, so schema, chép, độ phủ | P10 |
| S5b | `feat(prov-pkg): package builder and sensitive scan` | Sonnet | allowlist, esbuild + obfuscator + vùng tắt Playwright, build web, integrity + chữ ký, quét 5.2 | P11, P12; **Opus review riêng bước quét** |
| S5c | `feat(prov-pkg): installer` | Sonnet | `install.cmd`, `update.cmd`, supervisor bản tỉnh, `qis-admin.js`, hướng dẫn 1 trang | chạy cài thử vào thư mục tạm trong `dist-province/` trên máy Huế (cổng 5051) |

Mỗi commit kèm cập nhật tài liệu theo quy định (snapshot/progress/manifest khi bước đóng); commit theo pathspec (memory: phiên khác dùng chung index).

### 7.2 Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | Tham số hóa làm lệch `reportIdentity` → hàng đợi Huế coi là tài nguyên mới, mất circuit/lịch sử | Cao | T1 byte-exact; Opus review S3 |
| R2 | Thứ tự BCVH đổi khi chuyển sang bảng → bảng/biểu đồ Huế đổi thứ tự | Trung bình | T4 so thứ tự; T5 golden |
| R3 | Golden T5 không ổn định (trường thời gian, cache) → báo khác giả | Trung bình | DB bản sao đông cứng; danh sách trường loại trừ nằm trong script, review cùng S3 |
| R4 | Làm rối phá hàm chạy trong trang DKCL | Cao | vùng tắt + test tĩnh + S6 tải thật |
| R5 | esbuild không gộp được `require` động / đọc file bằng đường dẫn tương đối (`schema.sql`, migration, `process.cwd()`) | Trung bình | 16 điểm `process.cwd()` liệt kê ở S5; P11 khởi động khối thật |
| R6 | Đường dữ liệu nằm trong `app\` → cập nhật xóa hồ sơ DKCL/DB | Cao | biến môi trường trỏ `data\`; P12 + thử `update.cmd` ở S5c |
| R7 | Migration một lần đã áp ở Huế nhưng không có trong danh sách → schema tỉnh khác Huế | Trung bình | 4.1 bước 4 so schema |
| R8 | Cổng F4.1 tỉnh khác trả cấu trúc dòng khác (ô 5 = mã BCVH) | Trung bình | chỉ phát hiện ở S6 (manifest cấm thử cổng trước); lỗi parser hiện ra rõ, không ghi sai |
| R9 | Tỉnh khác: bưu cục phát ≠ BCVH (giả định khảo sát mục 4) | Trung bình | Q5 đã chốt “luôn là BCVH”; Q13 cho mã lạ |
| R10 | Bộ kiểm nguyên vẹn chậm khởi động hoặc bị gỡ | Thấp | ngân sách < 5 s; chấp nhận theo D7 |
| R11 | Mất khóa ký Ed25519 → không phát hành bản cập nhật được | Trung bình | S5 ghi hướng dẫn sao lưu khóa cho PO (ngoài repo) |
| R12 | `node_modules` native (`sqlite3`, `koffi`) không chạy trên máy tỉnh (thiếu VC++ runtime) | Trung bình | S6 trên máy sạch; `install.cmd` kiểm và báo rõ |
| R13 | Hai phiên cùng sửa `server.js`/`importProcessor.js` (dòng INC-PHAT song song) | Trung bình | commit theo pathspec, rebase trước mỗi commit S3/S4 |

---

## 8. Câu hỏi PO mới

- **Q13 (đơn vị lạ ở F1.1/F4.1).** Ở tỉnh khác, nếu F1.1/F4.1 có mã bưu cục phát không có trong danh mục đơn vị (danh mục tự điền từ F1.3), QIS xử lý thế nào? *Mặc định CTO đề xuất:* vẫn hiện số và tính vào tổng tỉnh, không xếp hạng (như đơn vị phụ Q6), tự thêm vào danh mục với nhãn “cần xác nhận” để quản trị viên tỉnh phân loại. Bản Huế không đổi (không bật tự điền).

Không có quy tắc nghiệp vụ mới nào khác: các lựa chọn còn lại trong tài liệu là kỹ thuật (nguồn cấu hình, cách đóng gói, cách kiểm).
