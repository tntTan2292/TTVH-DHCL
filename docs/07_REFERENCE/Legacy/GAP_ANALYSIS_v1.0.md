# GAP ANALYSIS v1.0 (F1.3)

## Executive Summary
Tài liệu thực hiện phân tích khoảng cách (Gap Analysis) giữa **SSOT (RESEARCH_BASELINE_v1.0.md)** và **thực trạng hệ thống hiện tại** (bao gồm Database, API, và Dashboard UI). 
**Kết luận chung:** Hệ thống hiện tại mới chỉ đáp ứng được phần tính toán KPI F1.3 tổng thể. Toàn bộ mảng Phân tích nguyên nhân (Root Cause Analysis - RCA) đặc biệt là nghiệp vụ **"Chậm nộp tiền" (F13_303)** hoàn toàn vắng mặt trong Codebase và cần được thiết kế, bổ sung toàn diện ở các lớp DB, API, và UI.

---

## 1. Dashboard Gap
Đối chiếu với SSOT:
- **Có gì đúng:** Đã có các khung giao diện cơ bản (Dashboard KPI tổng, Bảng xếp hạng BCVH/Tuyến, Quality Timeline).
- **Có gì thiếu:**
  - Hoàn toàn KHÔNG CÓ màn hình hoặc Component (Widget) nào phục vụ RCA (Màn hình 04).
  - KHÔNG CÓ Tab "Chậm nộp tiền".
  - KHÔNG CÓ biểu đồ thể hiện Tỷ lệ chậm nộp tiền (F13_303).
- **Có gì dư:** Không có tính năng dư thừa, nhưng cần lưu ý nếu UI hiện tại cho phép dùng SWC (So sánh cùng kỳ) trên mọi component, thì điều này sẽ sai SSOT đối với màn hình RCA sau này.
- **Có gì sai Business Rule:** Chưa phát hiện sai phạm hiển thị do tính năng chưa được xây dựng.

## 2. API Gap
Đối chiếu backend (`f13Routes.js`, `kpiController.js`):
- **Thiếu field nào:** Các API `/dashboard/kpi`, `/dashboard/top`, `/bcvh-ranking` hiện chỉ trả về tổng bưu gửi (total_bg), số đạt/không đạt, và tỷ lệ KPI. Hoàn toàn thiếu dữ liệu trả về cho `F13_302` (Số BG chậm nộp tiền) và `F13_303` (Tỷ lệ chậm nộp tiền).
- **Thừa field nào:** Không có.
- **Sai Business Meaning nào:** Việc API chưa bóc tách và lọc riêng "Nhóm Không đạt" để tính tỷ lệ chậm nộp tiền tạo ra một Gap lớn về mặt dữ liệu trả về cho Frontend.

## 3. Database Gap
Đối chiếu Database (`importProcessor.js`, SQL Queries):
- **Fact:** Bảng `fact_f13` lưu trữ thô dữ liệu. Mặc dù có thể chứa các cột thời gian từ Excel, nhưng chưa có bất kỳ logic tính toán sẵn (computed column/view) nào để nhận diện: `Thời gian nộp tiền - Thời gian PTC > 3 giờ`.
- **Dimension / View:** Thiếu các Data View phục vụ tính toán nhanh F13_303 theo BCVH và Tuyến phát.
- **Config:** Đã có bảng `system_config` cho màu sắc (anomaly_drop_threshold, v.v.), nhưng chưa có cấu hình threshold cho khoảng thời gian nộp tiền (ví dụ: biến `late_payment_threshold` = 3) hoặc quy định hiển thị cảnh báo cho nhóm RCA.

## 4. Message Generation Gap
Kiểm tra `MessageGenerationPanel.jsx` và API `/dashboard/message`:
- **Tin điều hành & Tin báo cáo:** Cấu trúc hiện tại dựa hoàn toàn vào việc rớt KPI chung. 
- **Gap:** Nội dung template chưa tích hợp luồng xử lý riêng để chèn thông điệp: *"Nhắc nhở bưu tá thực hiện nộp tiền đúng quy định (≤ 3 giờ sau khi PTC)"* khi tỷ lệ F13_303 tăng cao.

## 5. Recommendation Gap
Đối chiếu `ruleEngineService.js`:
- **Recommendation Engine:** Hiện tại Rule Engine (dùng để sinh P1, P2) chỉ đang check `drop` (giảm so với tự thân) và `gap` (thấp hơn toàn mạng) của KPI tổng. 
- **Gap RCA / Chậm nộp tiền:** Engine hoàn toàn không truy vấn hay đánh giá chỉ số **F13_303**. Do đó, hệ thống không thể tự động nhận diện Kịch bản 3: *"Tỷ lệ chậm nộp tiền tăng cao"* như yêu cầu của SSOT.
- **Pareto:** Chưa có engine để tính toán hoặc sắp xếp Pareto cho nhóm nguyên nhân.

## 6. Priority Matrix

| Feature / Gap | Priority | Ghi chú |
| :--- | :---: | :--- |
| **Bổ sung View/Query DB tính F13_302, F13_303 (>3h)** | **P0** | Bắt buộc sửa trước Coding (Cốt lõi dữ liệu RCA). Phải đảm bảo mẫu số chỉ lấy "BG Không đạt". |
| **Thiết kế API cung cấp dữ liệu RCA (Tab Chậm nộp tiền)** | **P0** | API là xương sống để giao tiếp với Dashboard. |
| **Cập nhật Rule Engine (Recommendation) quét Kịch bản 3** | **P1** | Để kích hoạt cảnh báo khi tỷ lệ chậm nộp tiền tăng cao. |
| **Cập nhật Template Tin nhắn điều hành** | **P1** | Phản ánh đúng thông điệp nhắc nhở bưu tá (≤ 3 giờ). |
| **Thiết kế UI Màn hình RCA (Tab 01)** | **P1** | Hiển thị F13_303 trực quan cho Lãnh đạo. |
| **Chặn SWC ở màn hình RCA** | **P2** | Áp dụng trên giao diện để tránh người dùng thao tác sai. |
