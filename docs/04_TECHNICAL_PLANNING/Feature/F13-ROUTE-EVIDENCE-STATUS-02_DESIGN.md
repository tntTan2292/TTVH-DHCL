# F13-ROUTE-EVIDENCE-STATUS-02 — Evidence theo trạng thái và theo kỳ — Design of Record

| Trường | Giá trị |
| --- | --- |
| Ticket | `F13-ROUTE-EVIDENCE-STATUS-02` |
| Program | `F13-STANDARDIZATION-001` (delta, không mở chương trình mới) |
| Branch | `codex/da-impl-006` |
| Baseline | `17d6061b6e748bca7cce4e91de23d2c7d4fc3502` (local = remote, đã xác minh) |
| Ngày lập | `2026-09-07` |
| Revision | `R0` (2026-09-07) — bản đầu, chờ PO duyệt |
| Trạng thái | `DESIGN DRAFT / AWAITING PO APPROVAL` — **chưa** `READY FOR IMPLEMENTATION` |
| Executor lập thiết kế | `Claude Code` / `Opus` |
| Cơ sở | Audit read-only `F13-ROUTE-EVIDENCE-STATUS-02` (manifest `F13-STANDARDIZATION-001_MANIFEST.md` §62) + ba quyết định PO `PO-A`/`PO-B`/`PO-C` (2026-09-07) + đo thật read-only trên `database.sqlite` khi lập thiết kế này |
| PO UI Check Required | `Yes` (cuối Phase F1 và Phase I1) |

## Table of Contents

- [1. Mục tiêu và ba quyết định PO](#1-mục-tiêu-và-ba-quyết-định-po)
- [2. Nguyên nhân gốc kiến trúc](#2-nguyên-nhân-gốc-kiến-trúc)
- [3. Từ vựng và định nghĩa trạng thái](#3-từ-vựng-và-định-nghĩa-trạng-thái)
- [4. Quy tắc thời gian và kỳ](#4-quy-tắc-thời-gian-và-kỳ)
- [5. Kiến trúc xử lý dữ liệu kỳ lớn an toàn](#5-kiến-trúc-xử-lý-dữ-liệu-kỳ-lớn-an-toàn)
- [6. API contract](#6-api-contract)
- [7. Giao diện](#7-giao-diện)
- [8. Hiệu năng — số đo thật](#8-hiệu-năng--số-đo-thật)
- [9. File scope và chia phase](#9-file-scope-và-chia-phase)
- [10. Test plan](#10-test-plan)
- [11. Rủi ro dữ liệu thật](#11-rủi-ro-dữ-liệu-thật)
- [12. Tiêu chí nghiệm thu](#12-tiêu-chí-nghiệm-thu)
- [13. Ngoài phạm vi](#13-ngoài-phạm-vi)
- [14. Quyết định PO còn mở](#14-quyết-định-po-còn-mở)
- [15. Trạng thái](#15-trạng-thái)

---

## 1. Mục tiêu và ba quyết định PO

### 1.1 Mục tiêu

Màn hình Evidence (`/f13/evidence`) hiện chỉ trả lời được đúng một câu hỏi: *"trong đúng một ngày, tuyến này có những bưu gửi Không đạt nào"*. Sau ticket này nó phải trả lời được: *"trong kỳ phân tích đang xem ở Tuyến Ranking, tuyến này có những bưu gửi nào — Đạt, Không đạt, hay Chuyển hoàn — và bằng chứng chi tiết của từng nhóm là gì"*.

Đây là **delta trên module Evidence đang chạy**. Ticket này **không** mở lại `F13-ROUTE-RANKING-PERIOD-01` (đã `CLOSED / PO PASS` 2026-09-07), **không** mở lại `F13-BCVH-RANKING-OVERVIEW-01` (đã `CLOSED / PO PASS`), **không** kích hoạt các phase 1-4 còn `PLANNED / NOT ACTIVE` của `F13-STANDARDIZATION-001`, và **không** đụng tới `AUTO-BACKFILL-RUNTIME`.

### 1.2 Ba quyết định PO đã chốt (`2026-09-07`)

| # | Quyết định | Ràng buộc lên thiết kế |
| --- | --- | --- |
| `PO-A` | **YES** — Evidence phải xem được bưu gửi **Đạt** | §3.2 nhóm trạng thái; §6.3 tham số `status`; §7.2 dải trạng thái. Bỏ vị từ `danh_gia_2026 = 'Không đạt'` cứng trong SQL |
| `PO-B` | **YES** — Evidence phải hỗ trợ xem theo **cả kỳ phân tích**, đồng bộ với Tuyến Ranking | §4 quy tắc kỳ; **tái sử dụng nguyên văn** ngữ nghĩa `anchor_date` / `month_to_anchor` của `routePeriodService`, không tự định nghĩa kỳ mới |
| `PO-C` | **YES** — Evidence phải xem được nhóm **Chuyển hoàn** | §3.3 định nghĩa Chuyển hoàn; §14 `D-OPEN-01` về 108 dòng mâu thuẫn |

Ràng buộc kỹ thuật bổ sung do PO nêu cùng lúc, **binding**:

> Phải thiết kế phương án xử lý dữ liệu kỳ lớn an toàn, **không được đơn giản tăng giới hạn 20.000 dòng hoặc tải toàn bộ dữ liệu lên frontend.**

Ràng buộc này chi phối toàn bộ §5 và là lý do bác Phương án A và Phương án B ở §5.3.

---

## 2. Nguyên nhân gốc kiến trúc

Trần 20.000 dòng **không phải là nguyên nhân**, nó là triệu chứng. Nguyên nhân gốc là Evidence hiện có **hai tầng nạp toàn bộ dữ liệu chồng lên nhau**:

**Tầng 1 — backend nạp toàn bộ vào RAM.**
`F13DashboardService.getEvidenceList()` (`F13DashboardService.js:1207`) gọi `factBuuGuiRepo.getEvidenceListFacts()`, là một câu `SELECT *` **không phân trang**. Toàn bộ tập kết quả được nạp vào RAM tiến trình Node, phân loại bằng JS (`_classifyViolationReason`), lọc bằng `Array.filter`, rồi mới `Array.slice` để "phân trang". Phân trang ở đây là **giả**: cơ sở dữ liệu luôn trả về toàn bộ.

Hệ quả trực tiếp: `FactBuuGuiRepository.getEvidenceList()` (`FactBuuGuiRepository.js:652`) — phương thức *có* `LIMIT/OFFSET` thật — là **dead code**, không tầng nào gọi tới.

**Tầng 2 — frontend cũng nạp toàn bộ.**
`fetchAllEvidenceRows()` (`shipmentPerformanceData.js:112`) duyệt **mọi trang** backend rồi nối lại, để tìm kiếm/sắp xếp/đếm chạy trên tập đầy đủ. Trần an toàn `EVIDENCE_FETCH_MAX_PAGES (100) × EVIDENCE_FETCH_PAGE_SIZE (200) = 20.000` chỉ là chốt chặn chống vòng lặp vô hạn của chính cách làm này.

Vì vậy **nâng trần là vô nghĩa**: nâng lên 60.000 thì tầng 1 vẫn nạp toàn bộ vào RAM backend, tầng 2 vẫn nạp toàn bộ sang trình duyệt, và tới kỳ dữ liệu lớn hơn lại phải nâng tiếp. Thiết kế này **xoá cả hai tầng**, không nâng trần.

Số đo thật (§8) cho thấy quy mô: kỳ xấu nhất có thật hiện nay là `BCVH 533140`, tháng `2026-08`, **55.650 dòng** cho toàn bộ trạng thái — gấp **2,8 lần** trần 20.000 hiện hành. Con số `20.256` ghi trong `F13-ROUTE-RANKING-PERIOD-01_DESIGN.md` §13.2 là số đo ngày `2026-08-28` khi tháng 8 **chưa đủ ngày**; đo lại hôm nay trên tháng 8 đã đủ cho `22.858` dòng Không đạt. Hai con số **không mâu thuẫn** — chênh lệch là do dữ liệu tăng, không phải do một trong hai sai.

---

## 3. Từ vựng và định nghĩa trạng thái

### 3.1 Trường quyết định trạng thái

`danh_gia_2026` là **trường đánh giá có thẩm quyền duy nhất**, đã được chốt từ Phase 0 của `F13-STANDARDIZATION-001` (chuyển engine khuyến nghị từ `ket_qua_f13` không có thẩm quyền sang `danh_gia_2026`). Đo thật xác nhận hai trường này **thực sự khác nhau**, không thể dùng thay nhau:

| `ket_qua_f13` | `danh_gia_2026` | Số dòng |
| --- | --- | --- |
| `Đạt` | `Đạt` | 430.503 |
| `Không đạt` | `Không đạt` | 278.553 |
| `Đạt` | `Không đạt` | **35.868** |
| `(NULL)` | `(NULL)` | 32.049 |
| `Không đạt` | `(NULL)` | **70** |
| `Đạt` | `(NULL)` | **38** |

Evidence **chỉ** được phân nhóm theo `danh_gia_2026`. Cấm dùng `ket_qua_f13` để phân nhóm trạng thái.

### 3.2 Ba nhóm trạng thái (`PO-A` + `PO-C`)

| Nhóm | Slug API | Vị từ SQL | Số dòng toàn bảng |
| --- | --- | --- | --- |
| Đạt | `passed` | `danh_gia_2026 = 'Đạt'` | 430.503 |
| Không đạt | `failed` | `danh_gia_2026 = 'Không đạt'` | 314.421 |
| Chuyển hoàn | `returned` | `danh_gia_2026 IS NULL OR TRIM(danh_gia_2026) = ''` | 32.157 |
| Tất cả | `all` | không lọc | 777.081 |

Ràng buộc đồng nhất bắt buộc, kiểm tra ở runtime (§6.4 `C-07`): `all = passed + failed + returned`.

Đo thật xác nhận **không tồn tại giá trị `danh_gia_2026` thứ tư**: truy vấn `GROUP BY` toàn bảng chỉ trả về đúng `Đạt`, `Không đạt`, `(NULL)`.

### 3.3 Chuyển hoàn — định nghĩa và một điểm mâu thuẫn có thật

Quy ước đang có trong mã nguồn (`RuleF13302.js:37-39`, trích SSOT `F13_303_DEFINITION.md` §3/§5): *"Đạt và Chuyển hoàn (BLACK, `danh_gia_2026 IS NULL`) đều bị bỏ qua — Chuyển hoàn không đi qua luồng nộp tiền"*. Aggregate `total_returned` đang chạy (`FactBuuGuiRepository.js:403`) cũng đếm **toàn bộ** `NULL`/rỗng là Chuyển hoàn.

Tuy nhiên đo thật cho thấy nhóm `danh_gia_2026 IS NULL` **không thuần nhất**:

- 32.049 dòng có `ket_qua_f13` cũng `NULL`, `thoi_gian_ptc` `NULL` — đúng hình dạng Chuyển hoàn kinh điển;
- **108 dòng** (70 + 38) có `ket_qua_f13` mang giá trị đánh giá thật (`Không đạt` hoặc `Đạt`) và **có** `thoi_gian_ptc` — mâu thuẫn với nhãn "Chuyển hoàn".

Gán nhãn Chuyển hoàn cho cả 108 dòng này là một **suy diễn**, không phải sự kiện. Đây là quyết định nghiệp vụ/SSOT, thuộc thẩm quyền PO → §14 `D-OPEN-01`. Thiết kế **không tự quyết**; khuyến nghị mặc định là giữ nguyên quy ước `total_returned` đang chạy để không tạo hai định nghĩa Chuyển hoàn khác nhau trong cùng hệ thống.

### 3.4 Lý do vi phạm chỉ tồn tại trong nhóm Không đạt

Ba nhóm lý do hiện hành — `Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân` — được suy ra từ `RULE_F13_302`, và theo chính rule đó chỉ có nghĩa khi `danh_gia_2026 = 'Không đạt'`. Do đó (§6.4 `C-04`): `violation_reason = null` với mọi dòng Đạt và Chuyển hoàn, và dải tab lý do **chỉ hiển thị khi `status = failed`** (§7.3) — không hiển thị rồi trả về 0.

Phân bố thật của ba nhóm lý do trên toàn bộ 314.421 dòng Không đạt: `Chưa xác định nguyên nhân` 161.345 · `Chậm nộp tiền` 95.848 · `Không đạt khác` 57.228.

---

## 4. Quy tắc thời gian và kỳ

### 4.1 Không định nghĩa kỳ mới

`PO-B` yêu cầu "đồng bộ với Tuyến Ranking". Thiết kế **tái sử dụng nguyên văn** mô hình kỳ mà `routePeriodService.js` đã được PO nghiệm thu, **không** định nghĩa lại:

| Kỳ | Slug API | Định nghĩa | Nguồn |
| --- | --- | --- | --- |
| Ngày | `day` | `[anchor_date, anchor_date]` | `routePeriodService.js:273` |
| Kỳ tháng đến ngày neo | `month_to_anchor` | `[<tháng của anchor_date>-01, anchor_date]` | `routePeriodService.js:274` |

`previous_month` **không** đưa vào Evidence ở ticket này (§13) — Evidence là màn hình bằng chứng chi tiết, không phải màn hình so sánh kỳ.

### 4.2 `anchor_date` phải giải theo từng BCVH

`anchor_date = MAX(ngay_do_kiem)` **của chính BCVH đang xem**, chặn trên bởi `anchor_ceiling` do client truyền (`routePeriodService.js:93-97`, `152-160`) — **không bao giờ** là `MAX(ngay_do_kiem)` toàn hệ thống.

Đây chính là lớp defect `ITR3-BLOCK-01` đã bị bắt và phải sửa ở ticket trước (chart lấy ngày neo toàn hệ thống thay vì của BCVH). Ràng buộc `C-05` (§6.4) và test hồi quy tương ứng (§10.1) tồn tại để **không tái lập lớp defect đó** ở Evidence.

### 4.3 Trần độ dài kỳ

Vì kỳ dài nhất là `month_to_anchor`, phạm vi tối đa là **31 ngày**. Không có chế độ khoảng ngày tự do (§13). Nhờ vậy kỳ xấu nhất có thật là một BCVH × một tháng = **55.650 dòng**, và đây là con số dùng để thiết kế hiệu năng ở §5 và §8 — không phải một ước lượng.

---

## 5. Kiến trúc xử lý dữ liệu kỳ lớn an toàn

Đây là phần cốt lõi của thiết kế và là nội dung PO yêu cầu rõ.

### 5.1 Bốn nguyên tắc (binding)

| # | Nguyên tắc |
| --- | --- |
| `P-01` | Frontend **không bao giờ** nhận quá **một trang**. Không có vòng lặp "duyệt hết trang rồi nối". |
| `P-02` | Backend **không materialize dòng đầy đủ** cho cả phạm vi. Chỉ có (a) aggregate bằng SQL, và (b) đúng một trang qua `LIMIT/OFFSET` thật. |
| `P-03` | Ngoại lệ duy nhất được phép materialize phía server là **projection hẹp phục vụ tìm kiếm** (§5.4), chỉ khi có từ khoá, và bị chặn cứng bằng `SEARCH_SCOPE_MAX_ROWS`. |
| `P-04` | **Không nâng trần nào.** `fetchAllEvidenceRows`, `EVIDENCE_FETCH_PAGE_SIZE`, `EVIDENCE_FETCH_MAX_PAGES` bị **xoá**, không bị chỉnh số. |

### 5.2 Điều kiện tiên quyết đã được chứng minh bằng đo thật

Toàn bộ kiến trúc "đẩy mọi thứ xuống SQL" chỉ khả thi nếu **phân loại lý do vi phạm biểu diễn được bằng SQL mà không fork SSOT**. Đây là câu hỏi khả thi số 1 và đã được kiểm chứng, không phải giả định:

Biểu thức SQL đề xuất (dẫn xuất từ `RULE_F13_302`, không thay ngưỡng):

```sql
CASE
  WHEN danh_gia_2026 <> 'Không đạt' THEN NULL
  WHEN NOT (<ptc đúng định dạng>) OR NOT (<nộp tiền đúng định dạng>)
    THEN 'Chưa xác định nguyên nhân'
  WHEN (julianday(<nộp tiền>) - julianday(<ptc>)) * 24.0 > 3.0
    THEN 'Chậm nộp tiền'
  ELSE 'Không đạt khác'
END
```

Guard định dạng dùng `GLOB '[0-9][0-9]/[0-9][0-9]/[0-9][0-9][0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]'`, phản chiếu **đúng** regex của JS.

**Kết quả đối chiếu trên toàn bộ 314.421 dòng Không đạt thật: 0 sai khác.** Ba nhóm khớp tuyệt đối giữa SQL và JS (161.345 / 95.848 / 57.228). Không có mẫu lệch nào.

Ràng buộc governance đi kèm: SQL này là **bản dẫn xuất**, `RuleF13302.js` vẫn là SSOT. Test tương đương (§10.1 `T-B01`) là **cổng chặn bắt buộc** — nếu ai đó sửa ngưỡng trong rule mà không sửa SQL (hoặc ngược lại), test phải đỏ. Đây là cách duy nhất được phép để có phân loại phía SQL mà không tạo fork âm thầm.

### 5.3 Bốn phương án đã cân nhắc

| Phương án | Nội dung | Kết luận |
| --- | --- | --- |
| **A** | Nâng trần 20.000 lên 60.000+ | **BÁC.** PO cấm rõ. Đo thật cho thấy trần sẽ phải nâng lại khi dữ liệu tăng, và không giải quyết tầng nạp-toàn-bộ ở backend. |
| **B** | Đẩy tất cả xuống SQL, kể cả **fold dấu tiếng Việt bằng chuỗi `REPLACE` lồng nhau** | **BÁC vì hiệu năng.** Đúng đắn đã chứng minh (0 sai khác trên 764.377 + 156 + 151 + 9 giá trị distinct; chỉ cần 71 phép thế, biểu thức 1.223 ký tự/cột) nhưng **3.617–4.931 ms** cho một lần đếm trên kỳ xấu nhất. Không chấp nhận được. |
| **C** | Đẩy lọc/phân loại/đếm/sắp xếp/phân trang xuống SQL; **tìm kiếm** dùng projection hẹp + hàm khớp JS dùng chung | **CHỌN.** ~520 ms ở kỳ xấu nhất, 6,6 MB tạm thời, **không fork SSOT** vì dùng lại đúng hàm JS hiện hành. |
| **D** | Thêm cột khoá tìm kiếm đã chuẩn hoá + index | Tối ưu nhất về lâu dài nhưng **là thay đổi schema** → cần delta uỷ quyền riêng. Ghi nhận làm follow-up (§13), **không** làm trong ticket này. |

Ghi chú kỹ thuật quan trọng: phương án dùng **UDF** (`db.function('qis_fold', …)`) — vốn là lời giải sạch nhất vì tái dùng thẳng hàm JS bên trong SQL — đã được thử và **không khả dụng**: `db.function` không tồn tại trên `sqlite3@6.0.1` của dự án. Đây là lý do phương án C phải khớp ở tầng Node thay vì trong SQL.

### 5.4 Luồng truy vấn

**Khi không có từ khoá** (đường đi thường gặp — không materialize gì cả):

1. Một truy vấn aggregate: `COUNT(*)` + 3 facet trạng thái (`SUM(CASE …)`).
2. Một truy vấn aggregate: facet lý do (`GROUP BY <biểu thức phân loại>`), chỉ khi `status = failed`.
3. Một truy vấn trang: `SELECT <cột cần> … ORDER BY … LIMIT ? OFFSET ?`.

Tổng: 3 truy vấn, **≤ 200 dòng** rời khỏi cơ sở dữ liệu.

**Khi có từ khoá** (ngoại lệ `P-03`):

1. Chốt chặn: `SELECT COUNT(*)` phạm vi đã lọc. Nếu `> SEARCH_SCOPE_MAX_ROWS` → trả `scope_guard.exceeded = true`, **không materialize gì**, UI yêu cầu thu hẹp (chọn Tuyến hoặc chuyển về kỳ Ngày). Không cắt cụt âm thầm.
2. Projection hẹp: `SELECT id, danh_gia_2026, <biểu thức phân loại>, ma_bg, ma_tuyen, ten_tuyen, ten_bcvh` — 7 cột ngắn, **không** `SELECT *`.
3. Khớp từ khoá trong Node bằng **đúng hàm `matchesSearchQuery` hiện hành** (đưa lên `shared/`, dùng chung server–client).
4. Facet + `total_items` + danh sách tuyến khớp: đếm trong Node trên tập đã khớp (đã có sẵn trạng thái và lý do từ bước 2).
5. Lấy trang: `SELECT <cột đầy đủ> … WHERE id IN (<≤200 id của trang>)`.

`SEARCH_SCOPE_MAX_ROWS = 200.000` — gấp ~3,6 lần phạm vi xấu nhất có thật hôm nay (55.650). Với dữ liệu hiện tại chốt chặn **không bao giờ kích hoạt**; nó tồn tại để hệ thống hỏng *một cách rõ ràng và có thông báo* thay vì âm thầm nuốt RAM khi dữ liệu tăng nhiều lần.

### 5.5 Đơn giản hoá tìm kiếm đã được chứng minh

Hàm hiện hành khớp theo: `text.includes(q)` **OR** `fold(text).includes(fold(q))`.

Vì `fold` là ánh xạ theo từng ký tự, mọi chuỗi con của `text` đều ánh xạ thành chuỗi con của `fold(text)`; do đó nhánh thứ nhất **hàm ý** nhánh thứ hai, và biểu thức rút gọn còn **đúng một** phép so sánh đã chuẩn hoá.

Đã kiểm chứng, không phải suy luận suông: **1.740.528 phép so sánh** trên 108.783 dòng dữ liệu thật × 16 từ khoá (có dấu, không dấu, mã tuyến, mã bưu gửi) → **0 phân kỳ**. Rút gọn này giữ nguyên hành vi đã được PO nghiệm thu ở remediation `DEFECT A` (2026-08-11) và được khoá lại bằng test `T-F02` (§10.3).

### 5.6 Điều bị xoá, không phải điều được chỉnh

| Bị xoá | Lý do |
| --- | --- |
| `fetchAllEvidenceRows()` | Toàn bộ mô hình "duyệt hết trang rồi nối" biến mất (`P-01`) |
| `EVIDENCE_FETCH_PAGE_SIZE`, `EVIDENCE_FETCH_MAX_PAGES` | Không còn vòng lặp để chặn (`P-04`) |
| Cờ `truncated` và banner cảnh báo cắt cụt | Không còn khả năng cắt cụt âm thầm; thay bằng `scope_guard` tường minh |
| Lọc tab lý do phía client, `reasonScopedRows` | Chuyển xuống SQL |

---

## 6. API contract

### 6.1 Phương án bị bác

**Sửa tại chỗ `GET /f13/evidence-list`.** Bác. Endpoint đó đang chạy và đã qua nhiều vòng nghiệm thu PO; đổi ngữ nghĩa vị từ trạng thái của nó là thay đổi phá vỡ. Theo đúng tiền lệ `F13-ROUTE-RANKING-PERIOD-01` (thêm `/f13/ranking/route/periods` mới, không đụng endpoint cũ), thiết kế này **thêm endpoint mới** và để endpoint cũ **nguyên vẹn từng byte**.

Audit xác nhận `/f13/evidence-list` chỉ có **đúng một** consumer thật (`ShipmentPerformancePage.jsx:229`). Sau khi consumer đó chuyển sang endpoint mới, endpoint cũ trở thành không dùng — nhưng **vẫn giữ nguyên** trong ticket này để rủi ro hồi quy bằng không. Việc khai tử nó (cùng `getEvidenceListFacts()` và dead code `FactBuuGuiRepository.getEvidenceList()`) là **follow-up cần uỷ quyền riêng** (§13).

### 6.2 Endpoint mới

```
GET /f13/evidence          (allowViewerRead — cùng mức phân quyền endpoint cũ)
```

### 6.3 Tham số

| Tham số | Bắt buộc | Giá trị | Mặc định |
| --- | --- | --- | --- |
| `bcvh` | Có | mã BCVH | — (thiếu → `400 MISSING_PARAM`) |
| `period` | Không | `day` \| `month_to_anchor` | `day` |
| `anchor_date` | Không | ISO `YYYY-MM-DD`, dùng làm `anchor_ceiling` | hôm nay |
| `route` | Không | `all` \| `ma_tuyen` | `all` |
| `status` | Không | `all` \| `passed` \| `failed` \| `returned` | `failed` |
| `reason` | Không | `all` \| `delayed_cash` \| `other` \| `unknown` — **bỏ qua** nếu `status <> failed` | `all` |
| `search` | Không | từ khoá | — |
| `sort` | Không | `delay_hours` \| `ngay_do_kiem` \| `ma_bg` \| `ma_tuyen` | `delay_hours` |
| `order` | Không | `asc` \| `desc` | `desc` |
| `page` | Không | ≥ 1 | 1 |
| `page_size` | Không | 1..200 | 50 |

### 6.4 Payload

```jsonc
{
  "success": true,
  "data": [
    {
      "ma_bg": "EG543052658VN",
      "ngay_do_kiem": "2026-08-18",
      "ma_bcvh": "533140", "ten_bcvh": "…",
      "ma_tuyen": "533140133", "ten_tuyen": "Thủy Vân_01",
      "danh_gia_2026": "Không đạt",
      "status_group": "failed",              // passed | failed | returned
      "violation_reason": "Chậm nộp tiền",   // null nếu status_group <> failed
      "thoi_gian_ptc": "…", "thoi_gian_nop_tien": "…",
      "do_tre_gio": 49.21                    // null nếu thiếu/không parse được mốc thời gian
    }
  ],
  "meta": {
    "anchor_date": "2026-08-31",
    "period": { "key": "month_to_anchor", "start": "2026-08-01", "end": "2026-08-31", "days_in_period": 31 },
    "pagination": { "page": 1, "page_size": 50, "total_items": 22858, "total_pages": 458 },
    "status_summary": { "all": 55650, "passed": 30191, "failed": 22858, "returned": 2601, "identity_ok": true },
    "violation_summary": { "total_failed": 22858, "delayed_cash_count": 4810, "other_failed_count": 6752, "unknown_count": 11296 },
    "search": { "keyword": "hcc", "active": true, "matched_items": 13556, "matched_routes": 8 },
    "scope_guard": { "scope_rows": 55650, "limit": 200000, "exceeded": false }
  }
}
```

### 6.5 Bảy ràng buộc bắt buộc của contract

| # | Ràng buộc |
| --- | --- |
| `C-01` | Mọi con số trong `status_summary` / `violation_summary` tính trên **toàn bộ phạm vi đã lọc** bằng aggregate SQL — **không bao giờ** đếm từ trang đã trả về. |
| `C-02` | `pagination.total_items` phản ánh toàn bộ tập đã lọc (kể cả đã áp từ khoá) và **độc lập với `page`**. |
| `C-03` | `do_tre_gio = null` khi thiếu hoặc không parse được một trong hai mốc thời gian — **không bao giờ** bịa số 0. |
| `C-04` | `violation_reason = null` với mọi dòng có `danh_gia_2026 <> 'Không đạt'`. |
| `C-05` | `anchor_date` giải **theo từng BCVH** (§4.2). Cấm dùng `MAX(ngay_do_kiem)` toàn hệ thống. |
| `C-06` | Khớp từ khoá thực hiện phía server trên **toàn bộ phạm vi đã lọc**, không bao giờ chỉ trên trang hiện tại. |
| `C-07` | `status_summary.all = passed + failed + returned`; sai lệch phải lộ ra qua `identity_ok = false`, không được giả định ngầm. |

---

## 7. Giao diện

Phase F1 do `Antigravity` thực thi theo `DEC-020`. Phần này là ràng buộc hành vi, không phải đặc tả pixel.

### 7.1 Vùng lọc — thêm hai điều khiển

Bổ sung vào `GlobalFilterBar` hiện có, **không** tạo vùng lọc mới:

- **Kỳ phân tích**: `Ngày` / `Kỳ tháng đến ngày neo`. Nhãn phải hiển thị khoảng thật đang áp (ví dụ `01/08 → 31/08`), không chỉ tên kỳ.
- **Trạng thái**: `Tất cả` / `Đạt` / `Không đạt` / `Chuyển hoàn`.

Bộ lọc Tuyến và ô tìm kiếm giữ nguyên hành vi hiện hành (`AC-20`: Tuyến là bộ lọc độc lập, từ khoá không bao giờ ngầm đổi nó).

### 7.2 Dải trạng thái

Bốn ô đếm luôn hiển thị cho phạm vi kỳ + tuyến hiện tại: `Tất cả` / `Đạt` / `Không đạt` / `Chuyển hoàn`. Đây là nơi `PO-A` và `PO-C` được trả lời trực tiếp, và là chỗ người quản lý đối soát nhanh với Tuyến Ranking. Nếu `identity_ok = false` phải hiển thị cảnh báo, không được che.

### 7.3 Dải tab lý do

Chỉ hiển thị khi `Trạng thái = Không đạt` (§3.4). Với `Tất cả` / `Đạt` / `Chuyển hoàn`, dải tab **ẩn** — không hiển thị rồi trả 0. Số đếm vẫn lấy từ server (`C-01`).

### 7.4 Phân trang thật

Thay mô hình "tải hết rồi cuộn" bằng điều khiển phân trang phía server: `Trang N / M`, `Trước` / `Sau`, tổng số bản ghi. Đổi trang = một request, **không** tải lại toàn bộ.

### 7.5 Bảng và cột

- Thêm cột **Trạng thái** (badge `Đạt` / `Không đạt` / `Chuyển hoàn`) — bắt buộc, vì danh sách không còn đồng nhất một trạng thái như trước.
- Cột **Độ trễ**: giữ nguyên quy ước hiện hành `formatDelayLabel` — `null` hiển thị `Chưa đủ dữ liệu`, không hiển thị `0h`. Với dòng Đạt/Chuyển hoàn, độ trễ **không có khái niệm** → hiển thị `—`.
- Cột **Lý do vi phạm**: `—` với dòng không phải Không đạt.

### 7.6 Tìm kiếm và nhóm theo tuyến

Dòng tóm tắt `AC-16` giữ nguyên nguyên văn, nhưng cả hai con số nay do server tính (`search.matched_items`, `search.matched_routes`) nên vẫn đúng trên toàn phạm vi dù chỉ hiển thị một trang.

`AC-17`/`AC-18` yêu cầu **mọi tuyến có kết quả khớp đều phải xuất hiện**. Với phân trang thật, nhóm theo tuyến phía client chỉ nhìn thấy một trang. Thiết kế xử lý bằng cách **nhóm phía server**: khi có từ khoá, trả kèm danh sách tuyến khớp với số lượng mỗi tuyến (aggregate, rẻ), hiển thị đầy đủ mọi tuyến khớp; mở rộng một tuyến = một request trang cho riêng tuyến đó.

Đây là **thay đổi tương tác có thật** so với hành vi PO đã nghiệm thu (trước đây mở rộng là tức thời vì mọi dòng đã nằm sẵn ở client) → §14 `D-OPEN-03`.

### 7.7 Tiêu đề màn hình

Tiêu đề hiện tại `Evidence — Chi tiết bưu gửi vi phạm` sẽ **sai** sau ticket này vì màn hình không còn chỉ chứa vi phạm. Đề xuất: `Evidence — Chi tiết bưu gửi`. Là thay đổi chữ hiển thị cho người dùng → §14 `D-OPEN-04`.

### 7.8 Trạng thái rỗng

Giữ nguyên ba thông điệp rỗng phân biệt hiện có (remediation `DEFECT B`), bổ sung ngữ cảnh kỳ và trạng thái vào câu mô tả, và thêm trường hợp thứ tư: `scope_guard.exceeded` → yêu cầu thu hẹp, nêu rõ phạm vi hiện tại bao nhiêu dòng và trần là bao nhiêu.

---

## 8. Hiệu năng — số đo thật

Tất cả số dưới đây đo trực tiếp trên `backend/src/db/database.sqlite` khi lập thiết kế này, mở bằng `sqlite3.OPEN_READONLY`, chỉ chạy `SELECT`/`PRAGMA`. SQLite `3.52.0`. `fact_f13` đọc **trước và sau** toàn bộ quá trình đo: `777.081` dòng, `MAX(ngay_do_kiem) = 2026-09-06`, **giống hệt nhau** → không có ghi nào.

### 8.1 Quy mô

| Chỉ số | Giá trị |
| --- | --- |
| `fact_f13` | 777.081 dòng, `2026-01-01` → `2026-09-06` |
| Phân bố trạng thái | Đạt 430.503 · Không đạt 314.421 · Chuyển hoàn 32.157 |
| **Kỳ xấu nhất có thật** (BCVH × tháng, mọi trạng thái) | `533140` / `2026-08` = **55.650** (Đạt 30.191 · Không đạt 22.858 · Chuyển hoàn 2.601) |
| Ngày xấu nhất (BCVH × ngày, mọi trạng thái) | `533140` / `2026-04-06` = 2.585 |

### 8.2 Thời gian truy vấn trên kỳ xấu nhất (`533140`, `2026-08-01..2026-08-31`)

| Truy vấn | Thời gian |
| --- | --- |
| `COUNT(*)` + 3 facet trạng thái (một lượt) | **69 ms** |
| Facet lý do trên nhóm Không đạt (phân loại bằng SQL) | **98 ms** |
| Trang 1 (50 dòng, sắp theo độ trễ giảm dần) | **94 ms** |
| Trang sâu (`OFFSET 50000`, 50 dòng) | **104 ms** |
| Đếm tìm kiếm `LIKE` phía server | **71 ms** |
| Projection hẹp phục vụ tìm kiếm (55.650 dòng) | **245 ms** nạp + **273 ms** khớp, ~**6,6 MB** JSON tạm |

`EXPLAIN QUERY PLAN` cho truy vấn trang: `SEARCH fact_f13 USING INDEX idx_bcvh_ngay (ma_bcvh=? AND ngay_do_kiem>? AND ngay_do_kiem<?)`.

**Kết luận: không cần index mới, không cần đổi schema.** Index `idx_bcvh_ngay(ma_bcvh, ngay_do_kiem)` sẵn có đã phục vụ đúng hình dạng truy vấn của thiết kế này.

### 8.3 Đối chiếu với ràng buộc PO

Đường đi thường gặp (không từ khoá): **≤ 200 dòng** rời khỏi cơ sở dữ liệu, ~**270 ms**. Đường đi có từ khoá ở kỳ xấu nhất: ~**520 ms**, ~6,6 MB tạm phía server, **≤ 200 dòng** tới trình duyệt. So với hiện trạng: trình duyệt nhận tối đa 20.000 dòng và backend nạp toàn bộ tập vào RAM cho **mọi** request, kể cả khi không tìm kiếm.

---

## 9. File scope và chia phase

### 9.1 Phase B1 — Backend (executor: `Claude Code` / `Sonnet`)

Thêm mới:
- `backend/src/services/evidenceQueryService.js` — dịch vụ mới, additive, **không** sửa `F13DashboardService.js`.
- `backend/src/services/evidenceReasonSql.js` — nơi duy nhất chứa biểu thức SQL phân loại (§5.2), để test tương đương có đúng một đối tượng để soi.
- `backend/src/shared/evidenceSearchMatch.js` — hàm khớp từ khoá dùng chung server–client.
- Phương thức mới trong `FactBuuGuiRepository.js` (additive; **không** sửa `getEvidenceList`/`getEvidenceListFacts` hiện có).
- Route `GET /f13/evidence` trong `f13Routes.js` + handler trong `DashboardController.js` (additive).

### 9.2 Phase F1 — Frontend (executor: `Antigravity`, theo `DEC-020`)

- `ShipmentPerformancePage.jsx` — hai điều khiển lọc mới, dải trạng thái, phân trang server, cột trạng thái, ẩn tab lý do theo trạng thái.
- `shipmentPerformanceData.js` — **xoá** `fetchAllEvidenceRows` và hai hằng trần; chuyển hàm khớp sang `shared/`.
- `F13DashboardClient.js` — thêm client cho endpoint mới (additive).
- `ShipmentEvidenceSummary.jsx` / `ShipmentEvidenceDetail.jsx` — cột trạng thái, nhóm theo tuyến từ server.

### 9.3 Phase I1 — Integration (executor: `Claude Code` / `Sonnet`)

Kiểm chứng đầu-cuối trên dữ liệu thật, đối soát `status_summary` của Evidence với số liệu Tuyến Ranking cùng kỳ, chạy toàn bộ hồi quy, chuẩn bị checklist PO UI Check.

### 9.4 Cấm chạm

`RuleF13302.js` và mọi rule engine · `schema.sql` và cơ sở dữ liệu · `/f13/evidence-list` cùng `getEvidenceListFacts()` · `routePeriodService.js` và contract `/f13/ranking/route/periods` · BCVH Ranking · `AUTO-BACKFILL-*` · `Data QLML/`.

### 9.5 Kỷ luật model

Theo `DEC-021`: model thực thi Phase B1/I1 **không** được tự review độc lập chính thay đổi của mình. Ticket này chạm vào phân loại dẫn xuất từ SSOT và một contract API mới → **bắt buộc** Independent Technical Review bằng model khác trước khi chuyển PO UI Check.

---

## 10. Test plan

### 10.1 Backend unit — mới

| # | Test | Nội dung |
| --- | --- | --- |
| `T-B01` | **Tương đương phân loại (cổng chặn SSOT)** | Với mọi dòng của một fixture phủ cả ba nhóm lý do + mốc thời gian thiếu/sai định dạng/đúng ngưỡng biên `3h`: kết quả biểu thức SQL **phải trùng khớp từng dòng** với `_classifyViolationReason` dựa trên `RuleF13302`. Sửa ngưỡng ở một bên mà không sửa bên kia → test đỏ. |
| `T-B02` | Biên `> 3h` | Chính xác `3h00m00s` → `Không đạt khác`; `3h00m01s` → `Chậm nộp tiền`. |
| `T-B03` | `C-04` | Mọi dòng `Đạt`/`Chuyển hoàn` có `violation_reason = null`. |
| `T-B04` | `C-07` đồng nhất | `all = passed + failed + returned` trên fixture nhiều trạng thái; cố tình phá → `identity_ok = false`. |
| `T-B05` | `C-05` ngày neo theo BCVH | Hai BCVH có `MAX(ngay_do_kiem)` khác nhau → mỗi BCVH nhận đúng ngày neo của mình. Hồi quy trực tiếp lớp defect `ITR3-BLOCK-01`. |
| `T-B06` | `C-02` phân trang thật | `total_items` không đổi giữa các trang; hợp của mọi trang == tập đã lọc; các trang rời nhau. |
| `T-B07` | `C-01` đếm không lấy từ trang | `page_size = 1` vẫn cho facet đầy đủ như `page_size = 200`. |
| `T-B08` | `C-06` tìm kiếm toàn phạm vi | Kết quả khớp nằm ở trang cuối vẫn được tìm thấy và được đếm. |
| `T-B09` | Chốt chặn `scope_guard` | Phạm vi vượt `SEARCH_SCOPE_MAX_ROWS` → `exceeded = true`, **không** materialize, không cắt cụt âm thầm. |
| `T-B10` | `C-03` độ trễ | Thiếu/không parse được mốc → `do_tre_gio = null`, không phải `0`. |
| `T-B11` | `period` | `day` cho đúng một ngày; `month_to_anchor` cho `[đầu tháng, ngày neo]` và `days_in_period` khớp. |
| `T-B12` | `reason` bị bỏ qua khi `status <> failed` | Truyền `reason=delayed_cash` cùng `status=passed` không được lọc mất dòng nào. |

### 10.2 Backend regression — bắt buộc

- 16 test hiện có của `F13DashboardService.evidenceList.test.js` phải **vẫn xanh không sửa** — đây là bằng chứng `/f13/evidence-list` không bị đụng.
- Bộ test Tuyến Ranking theo kỳ (`routePeriodService.test.js` 13/13, `FactBuuGuiRepository.routePeriod.test.js` 5/5) phải vẫn xanh; chạy với `node --experimental-sqlite --test` theo ghi chú môi trường đã biết.

### 10.3 Frontend

| # | Test | Nội dung |
| --- | --- | --- |
| `T-F01` | Xoá mô hình tải-toàn-bộ | `fetchAllEvidenceRows`, `EVIDENCE_FETCH_PAGE_SIZE`, `EVIDENCE_FETCH_MAX_PAGES` **không còn tồn tại**; không file nào tham chiếu (test kiểu "retired", theo tiền lệ `RouteViolationEvidencePage.retired.test.js`). |
| `T-F02` | Tương đương rút gọn tìm kiếm | Hàm khớp dùng chung cho kết quả **giống hệt** biểu thức hai nhánh cũ trên bộ ngữ liệu có dấu/không dấu (`Hương Phong`/`Huong Phong`, `TMĐT`/`tmdt`, mã tuyến số). Khoá lại remediation `DEFECT A`. |
| `T-F03` | Tab lý do ẩn đúng lúc | `status = passed`/`returned`/`all` → không render dải tab. |
| `T-F04` | Cột trạng thái | Mỗi dòng hiển thị đúng badge; dòng Đạt/Chuyển hoàn hiển thị `—` ở Độ trễ và Lý do. |
| `T-F05` | Phân trang | Đổi trang phát đúng một request; `AC-15` giữ nguyên (từ khoá không tự chọn dòng). |
| `T-F06` | Giữ ngữ cảnh | `return_to` vẫn round-trip về Tuyến Ranking; `isValidReturnTo` vẫn chặn giá trị tuyệt đối/giao thức. 19 test của `routeViolationEvidenceData.test.js` phải vẫn xanh. |
| `T-F07` | Deep-link cũ | `/f13/ranking/route/violations?...` vẫn redirect đúng; `App.role-routing.test.js` vẫn xanh. |

### 10.4 Đối soát chéo với Tuyến Ranking

Trên cùng `bcvh` + `anchor_date` + `route` + kỳ `month_to_anchor`: `status_summary.passed` và `status_summary.all` của Evidence phải khớp `month.passed` / `month.volume` của `/f13/ranking/route/periods`. Lệch một dòng cũng là defect chặn — hai màn hình phải kể cùng một câu chuyện.

### 10.5 Baseline

So với baseline `17d6061b`, không so với "100% xanh": 4 lỗi frontend ngoài phạm vi đã có trên hồ sơ từ manifest §52 vẫn được phép đỏ, miễn không lỗi nào nằm trong `features/shipment/` hoặc `features/route/`.

---

## 11. Rủi ro dữ liệu thật

| # | Rủi ro | Giảm thiểu |
| --- | --- | --- |
| `R-01` | **Tái lập defect "tìm kiếm chỉ thấy một lát"** (đã bị PO báo 2026-08-13) nếu tìm kiếm không thật sự chạy toàn phạm vi | `C-06` + `T-B08`. Đây là rủi ro số một của việc chuyển sang phân trang thật. |
| `R-02` | **Tái lập lớp defect `ITR3-BLOCK-01`** (ngày neo toàn hệ thống thay vì theo BCVH) | `C-05` + `T-B05` |
| `R-03` | **Fork SSOT `RULE_F13_302`** khi phân loại chạy ở SQL | `T-B01` là cổng chặn; biểu thức SQL cô lập trong đúng một file; `RuleF13302.js` vẫn là SSOT |
| `R-04` | 108 dòng `danh_gia_2026 IS NULL` nhưng `ket_qua_f13` có giá trị — gán nhãn Chuyển hoàn là suy diễn | `D-OPEN-01`, chờ PO. Không tự quyết. |
| `R-05` | Dữ liệu tăng vượt `SEARCH_SCOPE_MAX_ROWS` | `scope_guard` báo lỗi tường minh thay vì âm thầm; phương án `D` (cột chuẩn hoá + index) đã ghi nhận làm follow-up |
| `R-06` | `julianday`/`GLOB`/`NULLS LAST` phụ thuộc phiên bản SQLite | Đã xác minh trên SQLite `3.52.0` đang chạy; ghi rõ phụ thuộc để lần nâng cấp sau phải chạy lại `T-B01` |
| `R-07` | `OFFSET` sâu chậm dần khi kỳ lớn hơn nhiều | Đo thật `OFFSET 50000` = 104 ms, còn xa ngưỡng khó chịu; nếu sau này xấu đi thì chuyển keyset pagination — không cần đổi contract |

---

## 12. Tiêu chí nghiệm thu

### 12.1 Kỹ thuật (Claude Code tự xác nhận)

1. Toàn bộ `T-B01`..`T-B12`, `T-F01`..`T-F07` xanh.
2. Hồi quy §10.2 xanh; 99 test Evidence hiện có xanh hoặc được **thay thế có lý do ghi rõ từng test**.
3. Đối soát chéo §10.4 khớp tuyệt đối trên ít nhất 3 BCVH thật, gồm `533140`.
4. `oxlint` 0 lỗi/0 cảnh báo trên `features/shipment/` và `features/route/`; `npm run build` thành công.
5. `git diff` xác nhận **không** đụng file nào ở §9.4; `fact_f13` đọc trước/sau bằng nhau.
6. Đo lại hiệu năng trên kỳ xấu nhất thật, xác nhận không request nào trả quá `page_size` dòng.
7. Independent Technical Review bằng model khác (§9.5) trả `PASS`.

### 12.2 PO UI Check (Product Owner — **không tự trao**)

1. Chọn `Kỳ tháng đến ngày neo` cho `533140`: dải trạng thái hiển thị 4 con số, cộng lại đúng bằng `Tất cả`.
2. Chuyển `Trạng thái = Đạt`: thấy bưu gửi Đạt thật, tab lý do biến mất, cột Độ trễ hiển thị `—`.
3. Chuyển `Trạng thái = Chuyển hoàn`: thấy nhóm Chuyển hoàn thật.
4. Chuyển `Trạng thái = Không đạt`: tab lý do quay lại, số đếm khớp dải trạng thái.
5. Tìm một từ khoá có dấu và bản không dấu của nó → cùng kết quả; mọi tuyến khớp đều xuất hiện dù kết quả trải nhiều trang.
6. Đổi trang và quay lại → dữ liệu ổn định, `← Quay lại Tuyến Ranking` vẫn về đúng bộ lọc cũ.
7. Đối chiếu số Đạt/tổng của Evidence với Tuyến Ranking cùng kỳ → khớp.

`Claude Code` không tự trao `PO PASS`.

---

## 13. Ngoài phạm vi

1. **Khai tử `/f13/evidence-list`**, `getEvidenceListFacts()`, và dead code `FactBuuGuiRepository.getEvidenceList()` — cần uỷ quyền riêng.
2. **Phương án `D`** (cột khoá tìm kiếm chuẩn hoá + index) — là thay đổi schema, cần delta uỷ quyền riêng.
3. **Kỳ `previous_month` trong Evidence** — Evidence là màn hình bằng chứng, không phải màn hình so sánh kỳ.
4. **Khoảng ngày tự do** — mô hình vẫn là ngày neo, đồng bộ Tuyến Ranking.
5. **Xuất Excel/CSV cho Evidence theo kỳ** — chưa được yêu cầu; nếu mở sẽ cần thiết kế luồng streaming riêng, vì xuất file lại là bài toán "toàn bộ dữ liệu" mà thiết kế này vừa loại bỏ.
6. **Phân tích nguyên nhân cho nhóm Đạt/Chuyển hoàn** — không có trường nguyên nhân trong `fact_f13`.

---

## 14. Quyết định PO còn mở

| # | Câu hỏi | Khuyến nghị |
| --- | --- | --- |
| `D-OPEN-01` | **Chuyển hoàn**: 108 dòng có `danh_gia_2026 IS NULL` nhưng `ket_qua_f13` mang giá trị đánh giá thật. Xếp cả vào Chuyển hoàn, hay tách thành nhóm thứ tư "Chưa phân loại"? | Xếp cả vào Chuyển hoàn, **giữ nguyên** quy ước `total_returned` đang chạy, để hệ thống không có hai định nghĩa Chuyển hoàn khác nhau. 108/32.157 = 0,34%. |
| `D-OPEN-02` | **Mặc định khi mở Evidence từ Tuyến Ranking**: giữ `status = Không đạt` + `period = Ngày` (tương thích ngược hoàn toàn), hay mặc định theo kỳ đang xem ở Tuyến Ranking? | Giữ `Không đạt` + `Ngày`. Người dùng đang bấm vào **số vi phạm của một ngày**; đổi mặc định sẽ làm con số nhìn thấy khác con số vừa bấm. Kỳ là thứ người dùng chủ động chọn. |
| `D-OPEN-03` | **Nhóm theo tuyến khi tìm kiếm** nay là aggregate phía server, mở rộng một tuyến = một request (trước đây tức thời vì đã có sẵn mọi dòng ở client). Chấp nhận không? | Chấp nhận. Đây là cái giá không tránh được của phân trang thật; đổi lại `AC-17`/`AC-18` được giữ **đúng hơn** hiện tại vì danh sách tuyến khớp do server tính trên toàn phạm vi. |
| `D-OPEN-04` | **Tiêu đề màn hình** đổi từ `Evidence — Chi tiết bưu gửi vi phạm` thành `Evidence — Chi tiết bưu gửi`? | Đổi. Tiêu đề cũ sẽ sai sau `PO-A`/`PO-C`. |
| `D-OPEN-05` | **`page_size` mặc định 50** hợp lý cho thao tác của người quản lý? | Giữ 50, cho phép tối đa 200. |

Năm quyết định này **không chặn** việc duyệt thiết kế về mặt kiến trúc, nhưng `D-OPEN-01` **chặn Phase B1** (không thể viết vị từ `returned` khi chưa chốt định nghĩa) và `D-OPEN-02`/`D-OPEN-04` **chặn Phase F1**.

---

## 15. Trạng thái

`F13-ROUTE-EVIDENCE-STATUS-02 = DESIGN DRAFT / AWAITING PO APPROVAL` (`2026-09-07`, Revision `R0`).

Ba quyết định `PO-A`/`PO-B`/`PO-C` đã đủ để **lập** thiết kế này, nhưng **chưa đủ để mở Phase B1**: cần PO duyệt thiết kế và trả lời `D-OPEN-01` (chặn B1) cùng `D-OPEN-02`/`D-OPEN-04` (chặn F1). Tài liệu này **không tự thực thi**.

Khi lập thiết kế này **không dòng product code, schema, database, API hay business rule nào bị thay đổi**. Mọi số liệu đến từ truy vấn `sqlite3.OPEN_READONLY`; `fact_f13` đọc trước và sau toàn bộ quá trình đo đều cho `777.081` dòng và `MAX(ngay_do_kiem) = 2026-09-06`.

`F13-ROUTE-RANKING-PERIOD-01` giữ nguyên `COMPLETED / PO PASS / CLOSED`, không bị mở lại. `F13-BCVH-RANKING-OVERVIEW-01` giữ nguyên `COMPLETED / PO PASS / CLOSED`. `AUTO-BACKFILL-RUNTIME` vẫn mở độc lập theo `PROJECT_SNAPSHOT.md`.
