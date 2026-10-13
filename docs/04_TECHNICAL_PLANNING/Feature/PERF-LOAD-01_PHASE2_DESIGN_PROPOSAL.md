# PERF-LOAD-01 Phase 2 — Bảng tổng hợp tính sẵn (Design Proposal v1)

| Trường | Giá trị |
| --- | --- |
| Ticket | PERF-LOAD-01, Phase 2 (Phase 1 đã giao: commit `a0d8884`) |
| Trạng thái | **DESIGN PROPOSAL — chờ PO/CTO duyệt, chưa viết code** |
| Tác giả | Claude Code (Sonnet 5.5) |
| Duyệt thiết kế | PO/CTO (thay đổi schema); Opus review độc lập **sau khi triển khai** (đã thống nhất) |
| Mức rủi ro | Cao (thêm nguồn số liệu thứ hai, đụng đường ghi import) |
| Không đổi | Công thức nghiệp vụ, SSOT, giao diện, ý nghĩa mọi con số |

## 1. Mục tiêu và tiêu chí đạt

**Mục tiêu:** các khối gom theo kỳ (ngày/tuần/tháng/12 tháng, xếp hạng, so sánh) đọc từ bảng nhỏ thay vì quét 0,4–1,3 triệu dòng chi tiết.

| Chỉ số | Hiện tại (đo 2026-10-13) | Mục tiêu Phase 2 |
| --- | --- | --- |
| F4.1 overview tháng | 7 700–8 900 ms | < 150 ms |
| F1.3 overview tháng / xu hướng tuần 12 tháng | 2 000 / 2 400 ms | < 100 ms |
| Danh sách tuần/tháng (mỗi loại) | 750–1 150 ms | < 50 ms |
| Trang Phân tích BCVH, lần tải đầu | ≈ 8–13 s (cộng dồn) | < 1,5 s |

**Bất biến bắt buộc (hard):** với mọi phương thức repository được chuyển, kết quả từ bảng tổng hợp **giống hệt từng giá trị** kết quả từ bảng chi tiết, trên toàn bộ lịch sử thật.

**Ngoài phạm vi:** drill-down/bằng chứng (`evidence*`, `getRouteRankingFacts`, `getRoutePeriodDailyFacts` cho rule engine cần dòng chi tiết), các bảng `fact_*_national` (nhỏ: 0,5–22 nghìn dòng), `ruleEngineService`/`timelineService`/`messageGenerationService` (đọc trực tiếp bảng chi tiết; để Wave sau nếu cần), đổi giao diện, Phase 3–4.

## 2. Cơ sở thiết kế (đã khảo sát)

1. Mọi khối nặng đều là `GROUP BY ngày × đơn vị` rồi cộng lại theo tuần/tháng. Chỉ cần lưu mức **ngày × đơn vị** (và thêm tuyến cho F1.3, cặp chấp nhận–phát cho F1.1).
2. Kích thước thực tế (nhóm khóa phân biệt): F1.3 ngày×BCVH×tuyến **29 190**; F4.1 ngày×BCVH **2 050**; F1.1 ngày×cặp **35 238**; F1.2 ngày×huyện×bưu cục **657**. Tổng ≈ 67 nghìn dòng, so với 2,66 triệu dòng chi tiết (nhỏ hơn ~40 lần).
3. Điểm ghi duy nhất: các hàm `import*ParsedData` trong `backend/src/services/importProcessor.js`, mỗi hàm có sẵn một giao dịch `BEGIN…COMMIT`. Ghi chi tiết có hai kiểu: `DELETE theo ngày` (force reimport) hoặc `INSERT OR IGNORE` không xóa (nhập bổ sung vào ngày đã có).
4. Ngữ nghĩa số liệu khác nhau giữa chỉ tiêu; phải giữ nguyên:

| Chỉ tiêu | Khối lượng | Đạt | Không đạt | Ghi chú |
| --- | --- | --- | --- | --- |
| F1.3 (`fact_f13`) | `COUNT(ma_bg)` | `danh_gia_2026='Đạt'` | `='Không đạt'` | thêm `thoi_gian_nop_tien` không rỗng; `loai_tuyen_phat` |
| F4.1 (`fact_f41`) | `COUNT(*)` | `danh_gia_co_tms_ptc_8h='Đạt'` | khối-lượng − Đạt (dashboard) hoặc `='Không đạt'` (KPI, reconciliation) | cột trống tách riêng |
| F1.1 (`fact_f11`) | số dòng **đã đánh giá** (`IN ('Đạt','Không đạt')`) | `='Đạt'` | `='Không đạt'` | số dòng thô và dòng trống báo riêng (DEC F11-DENOMINATOR-FIX) |
| F1.2 (`fact_f12`) | `COUNT(*)` | `danh_gia='Đạt'` | khối-lượng − Đạt | bưu cục 531120 (khách lớn) tính vào tổng, tách khỏi xếp hạng |

Vì vậy bảng tổng hợp lưu **số đếm thô theo từng trạng thái** (`n_rows`, `n_dat`, `n_khong_dat`, `n_blank`, …) chứ không lưu tỉ lệ hay "failed" đã diễn giải. Mỗi truy vấn tự ghép lại đúng công thức hiện có từ các số đếm này. Các biến thể suy ra được: `failed_all = n_rows − n_dat`, `evaluated = n_dat + n_khong_dat`, `other = n_rows − n_dat − n_khong_dat − n_blank`.

## 3. Mô hình dữ liệu

Cột khóa cho phép NULL để giữ nguyên các điều kiện `IS NOT NULL` hiện có; tính duy nhất bảo đảm bằng chỉ mục biểu thức trên `COALESCE`.

```sql
-- F1.3: ngày × BCVH × tuyến
CREATE TABLE IF NOT EXISTS agg_f13_day (
  ngay_do_kiem  TEXT NOT NULL,
  ma_bcvh       TEXT,
  ma_tuyen      TEXT,
  ten_bcvh      TEXT,           -- MAX(ten_bcvh) của nhóm
  ten_tuyen     TEXT,           -- MAX(ten_tuyen)
  loai_tuyen_phat TEXT,         -- MAX(loai_tuyen_phat)
  n_rows        INTEGER NOT NULL,   -- COUNT(*)
  n_bg          INTEGER NOT NULL,   -- COUNT(ma_bg)
  n_dat         INTEGER NOT NULL,
  n_khong_dat   INTEGER NOT NULL,
  n_blank       INTEGER NOT NULL,   -- danh_gia NULL hoặc TRIM = ''
  n_nop_tien    INTEGER NOT NULL    -- thoi_gian_nop_tien không rỗng
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agg_f13_day
  ON agg_f13_day(ngay_do_kiem, COALESCE(ma_bcvh,''), COALESCE(ma_tuyen,''));
CREATE INDEX IF NOT EXISTS idx_agg_f13_day_bcvh ON agg_f13_day(ma_bcvh, ngay_do_kiem);

-- F4.1: ngày × BCVH phát
CREATE TABLE IF NOT EXISTS agg_f41_day (
  ngay_do_kiem TEXT NOT NULL, ma_bc_phat TEXT, ten_bc_phat TEXT,
  n_rows INTEGER NOT NULL, n_dat INTEGER NOT NULL,
  n_khong_dat INTEGER NOT NULL, n_blank INTEGER NOT NULL
);
-- UNIQUE (ngay_do_kiem, COALESCE(ma_bc_phat,'')) + index (ma_bc_phat, ngay_do_kiem)

-- F1.1: ngày × (BC chấp nhận, BC phát)
CREATE TABLE IF NOT EXISTS agg_f11_day (
  ngay_do_kiem TEXT NOT NULL, ma_bc_chap_nhan TEXT, ma_bc_phat TEXT,
  ten_bc_chap_nhan TEXT, ten_bc_phat TEXT,
  n_rows INTEGER NOT NULL, n_dat INTEGER NOT NULL,
  n_khong_dat INTEGER NOT NULL, n_blank INTEGER NOT NULL
);
-- UNIQUE (ngay_do_kiem, COALESCE(ma_bc_chap_nhan,''), COALESCE(ma_bc_phat,'')) + index (ma_bc_phat, ngay_do_kiem)

-- F1.2: ngày × (huyện nhận, BC chấp nhận)
CREATE TABLE IF NOT EXISTS agg_f12_day (
  ngay_do_kiem TEXT NOT NULL, ma_huyen TEXT, ma_bc_chap_nhan TEXT,
  ten_huyen TEXT, ten_bc_chap_nhan TEXT,
  n_rows INTEGER NOT NULL, n_dat INTEGER NOT NULL,
  n_khong_dat INTEGER NOT NULL, n_blank INTEGER NOT NULL
);
-- UNIQUE (ngay_do_kiem, COALESCE(ma_huyen,''), COALESCE(ma_bc_chap_nhan,'')) + index (ma_huyen, ngay_do_kiem)
```

Cột tên chỉ lấy từ cột có thật trong từng bảng chi tiết (đã đối chiếu `schema.sql`): F1.3 `ten_bcvh/ten_tuyen`; F4.1 `ten_bc_phat`; F1.1 `ten_bc_chap_nhan/ten_bc_phat`; F1.2 `ten_huyen/ten_bc_chap_nhan`. Truy vấn đặt bí danh `ten_bcvh` ở đầu ra như hiện nay.

**Kiểm tra bất biến độ lệch (`agg_state`):**

```sql
CREATE TABLE IF NOT EXISTS agg_state (
  indicator TEXT PRIMARY KEY,   -- 'F1.3' | 'F4.1' | 'F1.1' | 'F1.2'
  last_full_build_at TEXT,
  last_verified_at TEXT,
  last_verify_ok INTEGER
);
```

## 4. Đường ghi: giữ bảng tổng hợp luôn đúng

**Nguyên tắc:** "dựng lại đúng ngày vừa ghi", không cộng dồn. Một hàm duy nhất, idempotent:

```
rebuildAggForDate(run, indicator, ngay_do_kiem):
    DELETE FROM agg_x_day WHERE ngay_do_kiem = ?
    INSERT INTO agg_x_day SELECT ... FROM fact_x WHERE ngay_do_kiem = ? GROUP BY <khóa>
```

- Gọi **trong cùng giao dịch**, ngay trước `COMMIT`, ở 4 hàm: `importParsedData` (F1.3), `importF41ParsedData`, `importF11ParsedData`, `importF12RowsIntoTable` (chỉ khi `table === 'fact_f12'`). Các bảng `*_national` không có agg.
- Chạy được cho cả `INSERT OR IGNORE` bổ sung lẫn force reimport vì luôn tính lại từ chi tiết của ngày đó (≈ vài nghìn dòng, vài chục ms).
- **Lỗi dựng agg làm import thất bại và ROLLBACK** (đã có sẵn). Đây là chủ ý: lệch âm thầm nguy hiểm hơn import lỗi rõ ràng. (Câu hỏi mở Q1.)
- `FactBuuGuiRepository.overwriteImport` và `FactF41Repository.overwriteImport` là đường ghi cũ; hiện không có nơi gọi ngoài test. Cùng gọi `rebuildAggForDate` để không tạo lỗ hổng nếu ai đó dùng lại.
- Tập lệnh sửa/nhập thủ công (`reimport_data.js`, `repair_*`, `recreate_db.js`) không đi qua `importProcessor`: sau khi chạy phải chạy `rebuild`. Ghi vào manifest và hướng dẫn vận hành; công cụ `verify` (mục 6) bắt được lệch.

## 5. Đường đọc: chuyển từng phương thức, có cầu chì

### 5.1 Ánh xạ phương thức

| Repository | Phương thức chuyển sang agg | Giữ nguyên trên bảng chi tiết |
| --- | --- | --- |
| Tất cả bốn | `getKpiMetrics`, `getBcvhOverview{Monthly,Daily,Mtd}`, `getBcvhWeeksList`, `getBcvhMonthsList`, `getBcvhWeeklyTrendAggregate`, `getBcvhWeeklyComparisonAggregate`, `getBcvhOperationMetricsBetween`, `getDailyTrendData`, `getMeta`, `getLatestImportMeta`/min-max date, `getDaysWithData` | `hasNonCanonicalBcvhRows` (EXISTS, nhanh), `getBcvhReconciliation` (một ngày, nhanh) |
| F1.3 | `getBcvhRanking`, `getBcvhOperationMetricsByDate`, `getLatestBcvhDataDateInRange`, `getBcvhOverviewRoutes`, `getRouteRanking` (khối lượng theo tuyến cho một ngày) | `getRouteRankingFacts`, `getRoutePeriodDailyFacts`, `getRoutePeriodPreviousMonth`, `getRouteScopeReconciliation` (có `loai_tuyen_phat`/phạm vi 53%; xem Q3), toàn bộ `evidence*`, `getParetoData` |
| F1.1 | `getPairGrid` | — |
| F1.2 | `getOfficeList`, `getOfficeOperationMetricsBetween`, `getOfficeOverviewAggregate`, `getOfficeGrid`, `getMonthlyUnitGrid`, `getDaysByMonth`, `getRankedUnits`, `hasLargeCustomerRows` | — |

### 5.2 Quy tắc dịch SQL (bắt buộc dùng đúng một bảng quy đổi)

| Biểu thức hiện tại | Trên agg |
| --- | --- |
| `COUNT(*)` | `SUM(n_rows)` |
| `COUNT(ma_bg)` (F1.3) | `SUM(n_bg)` |
| `SUM(CASE WHEN dg='Đạt' THEN 1 ELSE 0 END)` | `SUM(n_dat)` |
| `SUM(CASE WHEN dg='Không đạt' …)` | `SUM(n_khong_dat)` |
| `SUM(CASE WHEN dg='Đạt' THEN 0 ELSE 1 END)` | `SUM(n_rows) - SUM(n_dat)` |
| `SUM(CASE WHEN dg IS NULL OR TRIM(dg)='' …)` | `SUM(n_blank)` |
| F1.1 `EVALUATED_COUNT` | `SUM(n_dat + n_khong_dat)` |
| `SUM(CASE WHEN ngay BETWEEN a AND b THEN <đếm> …)` | `SUM(CASE WHEN ngay BETWEEN a AND b THEN <cột n_*> ELSE 0 END)` |
| `COUNT(DISTINCT ngay_do_kiem)` | không đổi (dòng agg tồn tại ⇔ có dòng chi tiết cùng ngày/khóa) |
| `MAX(ten_*)` | `MAX(ten_*)` trên agg (MAX của các MAX = MAX) |
| `WHERE ma_bcvh IN (…)`, `IS NOT NULL`, `LIKE '53%'`, `RANKED_OFFICES` | giữ nguyên chữ vì cột khóa còn trong agg |

Cấu trúc CTE, tên cột kết quả, thứ tự `ORDER BY` và các hàm làm tròn **không đổi**, để các service bên trên (BcvhOverviewService, BcvhWeeklyComparisonService, ranking) không phải sửa.

### 5.3 Cầu chì chọn nguồn đọc

Module `backend/src/services/aggReadPolicy.js`:

- Chế độ theo chỉ tiêu: `QIS_AGG_READ_F41|F13|F11|F12` ∈ `off | shadow | on` (mặc định toàn bộ **`off`** khi mới giao code; mặc định chung `QIS_AGG_READ`).
- `shadow`: trả kết quả từ bảng chi tiết, đồng thời tính bằng agg và so sánh sâu; ghi `console.warn` + đếm lệch (có giới hạn tần suất). Dùng khi chạy thử thực tế.
- `on`: đọc từ agg **chỉ khi** bất biến nhẹ đạt: `SUM(n_rows)` của agg = `COUNT(*)` của bảng chi tiết (kiểm tra nền mỗi 5 phút và sau mỗi lần import commit; kết quả được nhớ). Nếu không đạt: tự động quay về bảng chi tiết và ghi cảnh báo. Quay lại `off` chỉ cần đổi biến môi trường và khởi động lại backend.
- Cache phản hồi của Phase 1 vẫn đứng trước tầng này; vân tay của nó thêm `MAX(rowid)` của bốn bảng `agg_*` để chắc chắn bốc hơi khi agg đổi.

## 6. Triển khai và vận hành

1. **Sao lưu trước:** `VACUUM INTO` ra `src/db/backups/` (dừng nhập, WAL đã bật); ghi băm/kích thước vào manifest.
2. **Migration** `migrate_perf_load_01_agg_schema.js` theo khuôn `migrate_f12_schema.js`: `CREATE … IF NOT EXISTS`, idempotent, gọi từ `ensureStartupSchemaMigrations` trong `server.js`; cập nhật `src/db/schema.sql`. Chỉ tạo bảng, **không điền dữ liệu lúc khởi động**.
3. **Công cụ** `backend/scripts/agg_tool.js`:
   - `build [--indicator X] [--from D] [--to D]`: dựng theo từng ngày, mỗi ngày một giao dịch ngắn (WAL không chặn đọc), in tiến độ; chạy lại an toàn.
   - `verify [--indicator X]`: đối chiếu cho **mọi ngày**: `SUM(n_*)` từng cột từ agg = `GROUP BY` từ chi tiết, cùng tập khóa; in danh sách ngày lệch; cập nhật `agg_state`.
   - `rebuild`: xóa agg của chỉ tiêu rồi `build`.
   Ước tính dựng đầy đủ: một lượt quét 2,66 triệu dòng, khoảng 3–6 phút (số đo `GROUP BY` thử: F1.3 2,2 s cho riêng nhóm khóa).
4. **Thứ tự bật:** migration → `build` → `verify` (phải 0 lệch) → `shadow` một ngày làm việc (xem log lệch) → `on` từng chỉ tiêu theo thứ tự F4.1, F1.3, F1.1, F1.2.
5. **Khởi động lại backend** cần thiết cho migration/biến môi trường; không cần dừng nhập nếu `build` chạy theo ngày (đã đồng thời an toàn với import vì mỗi ngày dựng lại đều đúng).

## 7. Kế hoạch kiểm chứng

| # | Kiểm chứng | Cách làm |
| --- | --- | --- |
| V1 | Đối chiếu dữ liệu thật | Test chạy **cả hai cài đặt** của từng phương thức trên `database.sqlite` thật (hoặc bản sao), nhiều điểm neo (mọi cuối tháng, mọi thứ Tư, ngày cuối cùng, ngày không có dữ liệu), nhiều tập `canonicalCodes`; `assert.deepStrictEqual` trên toàn bộ mảng dòng. |
| V2 | Đường ghi | Test với DB tạm: import mới; force reimport thay thế; nhập bổ sung `INSERT OR IGNORE` (có dòng trùng); import lỗi giữa chừng ⇒ ROLLBACK, agg không đổi; 2 import cùng ngày liên tiếp. Sau mỗi bước `agg == GROUP BY(fact)`. |
| V3 | Bất biến | `SUM(n_rows)` = `COUNT(*)`, `COUNT(DISTINCT ngày)` bằng nhau; cầu chì tự quay về chi tiết khi cố tình làm lệch. |
| V4 | Hồi quy | Toàn bộ suite hiện có của repository/service/controller F1.1–F4.1 + ranking reconciliation giữ nguyên kết quả (chạy ở chế độ `on` và `off`). |
| V5 | Hiệu năng | Script đo trước/sau trong manifest; đạt bảng mục 1. |
| V6 | Dữ liệu đặc thù | Giá trị biên: đánh giá rỗng/NULL, BCVH NULL, tuyến rỗng, ngày có một nửa dữ liệu, đơn vị đổi tên, 531120. |

## 8. Rủi ro và biện pháp

| Rủi ro | Mức | Biện pháp |
| --- | --- | --- |
| Agg lệch với chi tiết (bug dựng, đường ghi bỏ sót, sửa tay DB) | Cao | Dựng "lại đúng ngày" thay vì cộng dồn; cùng giao dịch; `verify` toàn lịch sử; cầu chì `SUM(n_rows)`; `shadow`; công cụ `rebuild`. |
| Dịch sai công thức (đặc biệt F1.1 mẫu số, F4.1 hai kiểu "failed") | Cao | Bảng quy đổi duy nhất (5.2); V1 đối chiếu sâu; Opus review tập trung vào đây. |
| Import chậm lại hoặc fail vì thêm bước dựng | Thấp | Dựng chỉ một ngày (vài nghìn dòng); lỗi ⇒ rollback có chủ ý (Q1). |
| Khóa DB khi `build` đầu | Trung bình | Theo ngày, giao dịch ngắn, WAL; chạy ngoài giờ cao điểm. |
| DB tăng dung lượng | Thấp | ≈ 67 nghìn dòng, vài MB. |
| Đường ghi mới/script ngoài quên gọi | Trung bình | `verify` định kỳ; `shadow`; ghi vào manifest và checklist vận hành. |
| Cache Phase 1 phục vụ số cũ sau khi agg đổi | Thấp | Thêm `MAX(rowid)` các bảng `agg_*` vào vân tay cache. |

## 9. Thứ tự thực hiện và cổng kiểm soát

| Bước | Nội dung | Điều kiện qua |
| --- | --- | --- |
| P2.0 | Migration + `rebuildAggForDate` + `agg_tool` + hook 4 hàm import + test V2/V3 | test xanh; `build`+`verify` = 0 lệch trên DB thật |
| P2.1 | Đọc agg cho **F4.1** (chậm nhất), `aggReadPolicy`, test V1 | deepEqual 100%; đạt mục tiêu thời gian F4.1 |
| P2.2 | F1.3 (ngày×BCVH, tuyến cho overview/ranking) | như trên |
| P2.3 | F1.1 (mẫu số đã đánh giá, pair grid) | như trên |
| P2.4 | F1.2 (huyện, bưu cục, 12 tháng) | như trên |
| P2.5 | Shadow một ngày làm việc ⇒ `on`; cập nhật manifest/progress | log shadow 0 lệch |
| Review | **Opus review độc lập** (prompt viết sau P2.5, mục 11) | không còn blocker |

Mỗi bước một commit (quy tắc "một việc, một commit"), không trộn với việc khác.

## 10. Câu hỏi mở (đề xuất mặc định)

- **Q1.** Lỗi khi dựng agg có làm import thất bại không? **Đề xuất: có** (cùng giao dịch, rollback).
- **Q2.** Cơ chế bật/tắt: biến môi trường + khởi động lại, hay bảng cấu hình đổi nóng? **Đề xuất: biến môi trường** (đơn giản, ít bề mặt lỗi); có thể thêm đổi nóng sau.
- **Q3.** Các khối tuyến dùng `loai_tuyen_phat`/phạm vi 53% và rule engine (route period, delayed cash) có chuyển sang agg không? **Đề xuất: không ở Phase 2**; chúng đã lọc theo một BCVH + khoảng tháng nên nhanh; chỉ đo lại sau P2.2.
- **Q4.** Có cần sao lưu ngoài thư mục `backups` (đĩa khác) trước khi `build` đầu? **Đề xuất: có**, `VACUUM INTO` ra đĩa phụ nếu còn chỗ (DB 2,3 GB).

## 11. Trọng tâm cho Opus review (chuẩn bị sẵn)

1. Từng phương thức đã chuyển: công thức trên agg có đúng bảng quy đổi 5.2; đặc biệt các phép chia/làm tròn và mẫu số F1.1.
2. Điều kiện `IS NOT NULL`/trống và khóa NULL: không có dòng nào bị gộp hoặc mất.
3. Đường ghi: mọi nơi ghi `fact_f13/f41/f11/f12` đã gọi dựng ngày; ROLLBACK không để lại agg lệch; nhập bổ sung `INSERT OR IGNORE`.
4. Cầu chì: không thể phục vụ agg khi lệch; chế độ `shadow` không đổi kết quả trả về.
5. Quan hệ với cache Phase 1 (vân tay), với WAL và với `autoBackfillQueueStore` (kết nối riêng).
6. Test V1 thật sự gọi hai cài đặt khác nhau (không so một hàm với chính nó).

## 12. Ghi nhận triển khai P2.0 (2026-10-13)

Khác biệt so với thiết kế ban đầu (đã chủ động, ghi để Opus xét):

1. **Khóa duy nhất** dùng `IFNULL(col, char(1))` thay vì `COALESCE(col, '')`, để khóa NULL và khóa chuỗi rỗng là hai nhóm riêng (cả hai có thể xuất hiện trong bảng chi tiết; `GROUP BY` coi chúng khác nhau).
2. **`FactBuuGuiRepository.overwriteImport` không được nối**: là mã chết (chèn vào cột `session_id`, `ket_qua_f13` không còn trong schema, không có nơi gọi). `FactF41Repository.overwriteImport` vẫn chạy được nên đã nối.
3. **Bảng agg chưa tồn tại thì bỏ qua** (`rebuildAggForDate` trả `skipped`) thay vì làm import lỗi, để DB chưa migrate vẫn nhập được; phía đọc (bước sau) có cầu chì nên không bao giờ dùng bảng thiếu/lệch.
4. `verify` dùng đúng SELECT dựng bảng (một nguồn sự thật), nên nó chứng minh **nhất quán nội bộ**, không chứng minh công thức đúng. Tính đúng so với truy vấn hiện có được kiểm riêng (xem 12.1) và là nội dung V1 của P2.1–P2.4.

### 12.1 Bằng chứng P2.0

- Dựng trên DB thật: F1.3 283 ngày/29 190 dòng, F4.1 277/2 050, F1.1 276/35 238, F1.2 10/657 (khớp ước tính thiết kế); toàn bộ ~9 giây.
- `verify`: 4/4 OK; `SUM(n_rows)` = `COUNT(*)` ở cả bốn bảng; số ngày bằng nhau.
- Đối chiếu độc lập với truy vấn sản xuất hiện có (`getBcvhOverviewMonthly` của từng repository, neo cuối lịch sử, mọi tháng × đơn vị): khối lượng và số đạt **giống hệt** ở F1.3 (79 nhóm), F4.1 (87), F1.1 (86), F1.2 (37).
- Test mới `test_aggMaintenance.js` 10/10 (đường ghi, nhập bổ sung, force reimport, rollback khi dựng agg lỗi, NULL/rỗng, verify bắt lệch, đường ghi cũ F4.1). Các suite import hiện có giữ nguyên.

## 13. Ghi nhận triển khai P2.1 - F4.1 (2026-10-13)

**Cấu trúc.** `aggSqlSource.js` là nơi duy nhất dịch biểu thức đếm (bảng quy đổi 5.2): `count/passed/failed/strictFailed/blank/name` cho nguồn `fact` và `agg`. `FactF41Repository` dựng mỗi truy vấn **một lần** từ nguồn rồi chạy trên bảng chi tiết hoặc bảng tổng hợp, nên không có hai bản SQL song song để lệch nhau. `aggReadPolicy.js` quyết định nguồn (`off | shadow | on`, mặc định `off`, biến `QIS_AGG_READ_F41`/`QIS_AGG_READ`) và giữ cầu chì `SUM(n_rows)` = `COUNT(*)` (kiểm lại tối đa mỗi 60 giây; thiếu bảng hoặc lệch thì đọc bảng chi tiết và cảnh báo một lần).

**Đã chuyển (F4.1):** `getKpiMetrics`, `getMeta`, `hasNonCanonicalBcvhRows`, `getBcvhOverview{Monthly,Daily,Mtd}`, `getBcvhWeeksList`, `getBcvhMonthsList`, `getBcvhWeeklyTrendAggregate`, `getBcvhWeeklyComparisonAggregate`, `getBcvhOperationMetricsBetween`, `getDailyTrendData`. **Giữ trên bảng chi tiết:** `getBcvhReconciliation` (một ngày), `getLatestImportMeta` (cần `created_at`/`id`).

**Điểm tinh tế đã xử lý:** `COUNT(*)` ⇒ `COALESCE(SUM(n_rows),0)` (tổng rỗng là NULL, `COUNT(*)` là 0); `failed` kiểu dashboard ⇒ `SUM(n_rows) - SUM(n_dat)` (đánh giá trống tính là không đạt) còn `total_failed` của KPI là `SUM(n_khong_dat)`; tổng điều kiện theo tuần ⇒ `SUM(CASE WHEN ... THEN n_rows/n_dat ELSE 0 END)`.

### 13.1 Bằng chứng

- `scripts/agg_compare.js` trên DB thật: **274 lời gọi, 0 sai khác** (mọi phương thức, nhiều neo/khoảng/tập đơn vị gồm tập rỗng và đơn vị không tồn tại, khoảng không có dữ liệu). Thời gian cộng dồn bảng chi tiết 64,5 s so với bảng tổng hợp 0,2 s (trung bình mỗi lời gọi 0-2 ms).
- `test_aggReadF41.js` 6/6 trên dữ liệu tổng hợp có chủ ý khó: 80 ngày qua 4 tháng, ngày thiếu dữ liệu, đơn vị thiếu theo ngày, NULL / rỗng / ngoài danh sách, đánh giá NULL / khoảng trắng, đổi tên đơn vị theo ngày, nhập bổ sung. Gồm: ma trận so sánh sâu (>500 lời gọi), bảng tổng hợp thật sự trả lời ở chế độ `on` (dấu hiệu), cầu chì khi lệch tổng, cầu chì khi thiếu bảng, `shadow` trả số cũ và báo sai khác, mặc định `off`.
- `test_f41RankingReconciliation.js` (DB thật, service đầy đủ) với `QIS_AGG_READ_F41=on`: kết quả như chế độ `off` (8 đạt, 1 hỏng); thời gian: overview 3 516 → 46 ms, danh sách tuần 1 474 → 3 ms, xu hướng tuần 3 988 → 44 ms, danh sách tháng 1 439 → 3 ms. Mục hỏng là giả định cứng của chính script (kỳ vọng DB chỉ có 3 tháng 07-09; DB nay có từ 2026-01) và hỏng như nhau ở cả hai chế độ.
- Hồi quy: `FactF41Repository.test.js` 4/4, `F41RankingController` 5/5, `F41DashboardController` 14/14, `F41RankingService` 11/11, `test_f41DashboardMinimum.js` qua; bộ test cache Phase 1 qua (vân tay cache thêm bốn bảng `agg_*`).

**Mặc định vẫn là `off`**: giao mã này không đổi hành vi cho đến khi đặt `QIS_AGG_READ_F41=shadow` rồi `on`.
