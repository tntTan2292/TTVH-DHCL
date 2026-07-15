# GAP ANALYSIS ADDENDUM v1.0 (Phase A1.1)

## Executive Summary
Tài liệu Addendum này bổ sung 3 nhóm Gap mang tính rủi ro cao được phát hiện sau khi Technical Audit lại kết quả của Phase A1. Các Gaps này xoay quanh tính toàn vẹn dữ liệu đầu vào (Data Import), khả năng minh bạch hóa quyết định của AI (Explainability), và luồng phân tích sâu (Drill-down) của chỉ số F13_303.

---

## 1. Data Import Gap
Phân tích file `excelParser.js` và luồng Import:
- **Validation của `thoi_gian_ptc` & `thoi_gian_nop_tien`:** Hiện tại hàm `toSqliteValue` chỉ ép kiểu cơ bản (Date sang chuỗi ISO). Không có cơ chế kiểm tra tính hợp lý logic (ví dụ: `thoi_gian_nop_tien` phải lớn hơn `thoi_gian_ptc`).
- **Null handling:** Dữ liệu trống (blank) hoặc lỗi định dạng được âm thầm chuyển thành giá trị `null` mà không cảnh báo.
- **Dữ liệu bất thường:** Không có cơ chế bẫy các dòng có thời gian PTC/Nộp tiền ở tương lai, hoặc chênh lệch nhau bất thường (vài tháng).
- **Ảnh hưởng đến F13_302/F13_303:** NGHIÊM TRỌNG (P0). Nếu một trong hai trường thời gian bị `null` hoặc sai logic, phép tính `thoi_gian_nop_tien - thoi_gian_ptc > 3 giờ` sẽ trả về Null hoặc sai số, dẫn đến đếm sai F13_302 và làm sai lệch trực tiếp mẫu số của F13_303.

## 2. Explainability Gap (Khả năng giải thích của hệ thống)
Đánh giá khối lượng Recommendation, Message Generation, Auto Insight:
- **Tình trạng:** Khối Engine (như `ruleEngineService.js`) sinh ra các cảnh báo dựa trên các ngưỡng cứng (threshold), và sinh ra Message bằng các đoạn text tĩnh (hardcode message).
- **Gap:** Hệ thống **KHÔNG CÓ** khả năng giải thích chi tiết cho người dùng:
  1. *Vì sao sinh cảnh báo?* (Chỉ báo chung chung là KPI giảm, không trích xuất được nguyên nhân sâu xa).
  2. *Dựa trên dữ liệu nào?* (Không đính kèm minh chứng là bao nhiêu bưu gửi đang vi phạm tại thời điểm cảnh báo).
  3. *Dựa trên Business Rule nào?* (Không có UI hay tooltip nào giải thích rule `> 3 giờ` để Điều hành viên hiểu và tin tưởng hệ thống).

## 3. Drill-down Gap
Đánh giá luồng phân tích RCA "Chậm nộp tiền":
- **Tình trạng:** Các màn hình Ranking hiện tại chỉ dừng ở cấp độ BCVH và Tuyến phát cho KPI tổng.
- **Gap:** Luồng Drill-down theo trục F13_303 **hoàn toàn đứt gãy**.
  - Không thể click từ `Tỷ lệ chậm nộp tiền (F13_303)` xuống `BCVH`.
  - Không thể click từ `BCVH` xuống `Tuyến phát`.
  - **NGHIÊM TRỌNG:** Không có màn hình "Danh sách BG chậm nộp tiền" (Evidence List) ở tầng cuối cùng để người dùng tải về xử lý.

---

## Priority Matrix (Cập nhật)

Các hạng mục bổ sung được phân loại độ ưu tiên như sau:

| Feature / Gap | Priority | Ghi chú |
| :--- | :---: | :--- |
| **Bổ sung Validation cho 2 trường thời gian PTC & Nộp tiền** | **P0** | Tránh rác dữ liệu làm hỏng toàn bộ luồng RCA. |
| **Xây dựng Data Grid (Danh sách bưu gửi chậm nộp tiền)** | **P0** | Điểm chốt chặn cuối cùng của Drill-down, bắt buộc phải có để truy vết bưu tá. |
| **Tạo luồng Drill-down liên kết F13_303 → BCVH → Tuyến** | **P1** | Đảm bảo trải nghiệm UI xuyên suốt cho Root Cause Analysis. |
| **Bổ sung Explainability UI (Giải thích Rule & Dữ liệu) vào Cảnh báo** | **P1** | Giúp User tin tưởng Auto Insight và Message Generation. |
