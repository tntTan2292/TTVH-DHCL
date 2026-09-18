# F13-ROUTE-POSTMAN-IDENTITY-01 Design Proposal
**Bổ sung Mã bưu tá + Tên bưu tá vào Tuyến phát Ranking & Chức năng Rà soát danh mục bưu tá**

> **Tài liệu**: Technical Design Proposal (Đề xuất Thiết kế Kỹ thuật)  
> **Ticket**: `F13-ROUTE-POSTMAN-IDENTITY-01`  
> **Trạng thái**: `DISCOVERY AUDIT COMPLETE / READY FOR PO DESIGN OF RECORD APPROVAL`  
> **Ngày lập**: 2026-09-17  
> **Tác giả**: Antigravity (Gemini)  
> **Căn cứ**: Yêu cầu định hướng của Product Owner nhận ngày 2026-09-17 và file danh bạ `2026.09.17 - DB Buu ta.xls`.

---

> **SUPERSEDED (2026-09-18):** this document is DoR v1. The approved Design of Record is `docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_OF_RECORD.md` (DoR v2), which carries Product Owner decisions D1-D4 and the resolution of R1-R8 from `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_REVIEW_001.md`. Where the two differ — catalog location `/admin/postman-catalog`, the "<50 ms" claim, period display, re-import semantics, audit/rollback — **v2 wins**. v1 is kept for its discovery evidence only.

## 1. Bối cảnh và Mục tiêu (Context & Objective)

1. Tuyến phát Ranking (`Route Ranking` — `/f13/ranking/route`) hiện tại mới chỉ hiển thị định danh tuyến (`ma_tuyen` và `ten_tuyen`) lấy từ bảng `fact_f13` (báo cáo đo kiểm F1.3 hàng ngày). Trong `fact_f13`, trường bưu tá hoàn toàn không tồn tại (trả về `buu_ta: null`).
2. Nhằm nâng cao hiệu quả điều hành chất lượng tại cấp cơ sở, Product Owner yêu cầu:
   - Bổ sung **Mã bưu tá** và **Tên bưu tá** vào bảng Route Ranking.
   - Sử dụng nguồn đối soát BatchFile 29 cột (`POSTMAN_CODE`) kết hợp với Danh bạ bưu tá chính thức (`2026.09.17 - DB Buu ta.xls`).
   - Xây dựng chức năng **"Rà soát danh mục bưu tá"** cho phép hệ thống tự động phát hiện các mã bưu tá mới xuất hiện trong BatchFile mà chưa có tên trong danh bạ để PO nhập bổ sung trực tiếp.

---

## 2. Kết Quả Đối Soát Thực Tế (Empirical Reconciliation Evidence)

### 2.1. Cấu trúc Danh bạ bưu tá (`2026.09.17 - DB Buu ta.xls`)
File xuất từ hệ thống quản lý nhân sự ngày 17/09/2026 lúc 11:01 cho đơn vị `53-BĐTP Huế`, tình trạng `Hoạt động`:
- Tổng số bản ghi hợp lệ: **198 bản ghi**.
- Tổng số mã bưu tá phân biệt: **198 mã**.
- Số mã trùng lặp trong file: **0** (toàn bộ 198 mã là duy nhất).

### 2.2. Khóa ánh xạ dữ liệu (Locked Field Mapping)
- **Tên tài khoản** = `Mã bưu tá` (`POSTMAN_CODE`, ví dụ: `53A121`, `53A978`, `53B211`...).
- **Họ tên người dùng** = `Tên bưu tá` (ví dụ: `"LÊ QUỐC CƯỜNG"`, `"NGUYỄN THỤY ĐOAN"`...).
- **Mã bưu cục** = Mã BCVH (dùng để kiểm tra chéo / cross-check).

### 2.3. Nguyên tắc tối giản dữ liệu & Bảo mật (Data Minimization)
Hệ thống **CHỈ LƯU TRỮ** các trường thông tin tối thiểu phục vụ vận hành:
- `ma_buu_ta` (VARCHAR, PK)
- `ten_buu_ta` (VARCHAR, NOT NULL)
- `ma_bcvh` (VARCHAR, khóa ngoại logic)
- `ten_bcvh` (VARCHAR)
- `trang_thai_hoat_dong` (VARCHAR)

**TUYỆT ĐỐI KHÔNG LƯU TRỮ**:
- `Số điện thoại` (bảo mật thông tin cá nhân)
- `Mã HRM` (không phục vụ đo kiểm vận hành)
- `Loại hợp đồng` (thông tin nhân sự nội bộ)

### 2.4. Kết quả đối soát với 4 kỳ BatchFile (Tháng 5, 6, 7, 8 năm 2026)
Đối soát trên toàn bộ **678.328 điểm phát** từ 4 file BatchFile:
- Tổng số mã bưu tá khác nhau xuất hiện trong BatchFiles: **277 mã**.
- **1. Số mã khớp (Matched)**: **172 mã**.
  - Chiếm **81,93%** tổng sản lượng phát bưu gửi toàn tỉnh (**555.765 / 678.328 điểm phát**).
- **2. Số mã BatchFile chưa có tên (Missing in DB)**: **105 mã**.
  - Chiếm **18,07%** tổng sản lượng phát (**122.563 điểm phát**).
  - Phân loại khối lượng:
    - 29 mã có <= 10 lượt phát (phát sinh tạm thời / ngẫu nhiên).
    - 25 mã có từ 11 đến 100 lượt phát.
    - 51 mã có > 100 lượt phát (ví dụ `53A152` có 15.617 lượt; `53B246` có 7.917 lượt; `53B040` có 7.572 lượt; `53F069` có 7.133 lượt).
  - Nguyên nhân: Nhân sự hợp đồng thuê ngoài, lái xe kiêm phát, hoặc đã luân chuyển trước thời điểm 17/09/2026 nên không nằm trong bộ lọc "Bưu tá - Đang hoạt động" của file xuất ngày 17/09.
- **3. Số mã chỉ có trong danh bạ (DB Only)**: **26 mã** (chưa phát sinh bưu gửi trong 4 tháng BatchFile đã nạp).
- **4. Số trường hợp xung đột mã bưu cục (BCVH Conflicts)**: **0** (tất cả 172 mã khớp đều có mã bưu cục trong Danh bạ trùng khớp hoàn toàn với bưu cục chính trong BatchFile).

---

## 3. Khóa Luồng Ghép Dữ Liệu (Locked Stitching Pipeline)

```
[Báo cáo đo kiểm F1.3 theo ngày]
  fact_f13 (ngay_do_kiem, ma_bcvh, ma_tuyen, ten_tuyen, ket_qua_f13...)
       │
       ▼ [JOIN theo: ngay_phat = ngay_do_kiem AND route_po_code = ma_tuyen]
[BatchFile phát cùng ngày]
  network_delivery_point (ngay_phat, ma_bcvh, route_po_code, postman_code)
       │
       ▼ [JOIN theo: ma_buu_ta = postman_code]
[Bảng Danh mục Bưu tá]
  dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh)
       │
       ▼
[Route Ranking Display — RoutePerformancePage.jsx]
  Hiển thị song song: Mã tuyến | Tên tuyến | Mã bưu tá | Tên bưu tá | [Khối KPI ngày & kỳ]
```

### 3.1. Quy tắc bảo toàn đa bưu tá (Multi-Postman Preservation)
- Dữ liệu thực tế cho thấy **21,3%** lượt tuyến trong ngày có từ 2 đến 3 bưu tá cùng phát đồng thời.
- **Quy tắc**: Tuyệt đối không cắt xén. Hệ thống gom danh sách tất cả các bưu tá hoạt động trong ngày trên tuyến:
  - `postman_codes`: `["53A819", "53A856"]`
  - `postman_names`: `["NGUYỄN VĂN A", "TRẦN VĂN B"]`
  - Hiển thị trên bảng:
    - Nếu 1 bưu tá: `53A819` — `NGUYỄN VĂN A`
    - Nếu nhiều bưu tá: `53A819, 53A856` — `NGUYỄN VĂN A, TRẦN VĂN B` (hoặc tag `53A819 (+1)` kèm tooltip danh sách đầy đủ).

### 3.2. Quy tắc an toàn khi dữ liệu chưa hoàn chỉnh
- Nếu mã bưu tá chưa có tên trong danh mục (thuộc nhóm 105 mã): Hiển thị `Mã bưu tá`, Tên bưu tá hiển thị `—` (không bịa đặt).
- Nếu ngày xem chưa có dữ liệu BatchFile (ví dụ Tháng 7/2026 chưa import, hoặc Tháng 9/2026 chưa có file): Hiển thị `—` cho cả Mã và Tên bưu tá.

---

## 4. Thiết Kế Chức Năng “Rà Soát Danh Mục Bưu Tá”

### 4.1. Vị trí trong hệ thống
- Tích hợp tại mục quản trị mạng lưới / cấu hình: `/admin/postman-catalog` (truy cập từ menu Quản trị Mạng lưới hoặc Cấu hình hệ thống, cấp quyền `admin`).

### 4.2. Giao diện 2 Tab
1. **Tab 1: "Danh mục bưu tá" (198 bưu tá đã chuẩn hóa)**:
   - Danh sách bảng có tìm kiếm và phân trang: `Mã bưu tá`, `Tên bưu tá`, `Bưu cục quản lý`, `Trạng thái`.
   - Chức năng sửa nhanh tên bưu tá nếu có sai sót.
   - Nút `Nhập từ Excel` (cho phép import file danh bạ cập nhật mới trong tương lai).
2. **Tab 2: "Rà soát mã mới từ BatchFile" (105 mã chưa có tên)**:
   - Tự động liệt kê các `POSTMAN_CODE` phát hiện được từ bảng `network_delivery_point` mà chưa có trong `dm_buu_ta`.
   - Cung cấp bối cảnh giúp PO nhận diện:
     - `Mã bưu tá`
     - `Bưu cục phát sinh chính`
     - `Tổng số bưu gửi đã phát` (sắp xếp giảm dần để ưu tiên mã có sản lượng cao trước: `53A152`, `53B246`...)
     - `Các tuyến bưu tá thường phát`
     - `Kỳ xuất hiện gần nhất`
   - Cột thao tác: **Ô nhập nhanh `Tên bưu tá`** + Nút **`Cập nhật`**.
   - **Tác động tức thời**: Ngay khi PO nhập tên và lưu, hệ thống tự động ghi vào `dm_buu_ta`. Bảng Route Ranking sẽ lập tức hiển thị tên cho bưu tá này trên toàn bộ các ngày có liên quan.

---

## 5. Vị Trí & Cấu Trúc Hiển Thị Trên Route Ranking Table

Cập nhật bảng `RouteRankingTable` trong [`RoutePerformancePage.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RoutePerformancePage.jsx):

```html
<thead>
  <tr>
    <th rowspan="2">Mã tuyến</th>
    <th rowspan="2">Tên tuyến bưu tá</th>
    <th rowspan="2">Mã bưu tá</th>
    <th rowspan="2">Tên bưu tá</th>
    <th colspan="5">Kết quả ngày đánh giá</th>
    <th colspan="6">Kết quả theo kỳ</th>
    <th colspan="2">Vi phạm chậm nộp tiền</th>
    <th rowspan="2">Phân loại</th>
  </tr>
  <!-- Hàng subheader sắp xếp -->
</thead>
```

- Không làm xáo trộn các nhóm cột tính toán KPI F1.3 hiện hành.
- Giữ nguyên thiết kế đối xứng, tuân thủ bảng màu chuẩn và quy tắc typography của Governance.

---

## 6. Kế Hoạch Triển Khai Phân Kỳ (Phased Execution)

1. **Giai đoạn 1 (Governance & Schema)**:
   - Tạo bảng `dm_buu_ta` với cơ chế migration an toàn.
   - Nạp 198 bưu tá từ file `2026.09.17 - DB Buu ta.xls` vào `dm_buu_ta` (chỉ nạp các trường được phép, không nạp SĐT/HRM/Hợp đồng).
2. **Giai đoạn 2 (Backend Service & API)**:
   - Bổ sung quan hệ ánh xạ `(ngay_phat, route_po_code) -> postman_codes -> postman_names` trong `F13DashboardService.js`.
   - Tối ưu hóa truy vấn có index để đảm bảo API phản hồi dưới 50ms.
   - Xây dựng các API cho chức năng Quản lý / Rà soát danh bạ bưu tá.
3. **Giai đoạn 3 (Frontend Integration)**:
   - Thêm cột `Mã bưu tá` và `Tên bưu tá` vào `RoutePerformancePage.jsx`.
   - Xây dựng màn hình `PostmanCatalogPage.jsx` với tính năng rà soát mã mới.
   - Kiểm thử toàn diện và trình PO nghiệm thu.
