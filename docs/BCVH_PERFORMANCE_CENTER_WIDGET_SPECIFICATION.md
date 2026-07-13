# BCVH Performance Center Widget Specification

## 1. Mục tiêu

Widget Specification định nghĩa các thành phần hiển thị cần có cho BCVH Performance Center.

Mục tiêu:

- Chuyển Information Architecture thành các Widget/Component có trách nhiệm rõ ràng.
- Đảm bảo mỗi Widget phục vụ một câu hỏi quản trị cụ thể.
- Giữ ranh giới với Dashboard, Route, Shipment và Evidence.
- Không biến Widget thành báo cáo tổng hợp.

## 2. Danh sách Widget

### 2.1 Executive Brief Widget

- Mục đích: Tóm tắt tình trạng BCVH nổi bật nhất.
- Câu hỏi quản trị: BCVH nào đang cần chú ý ngay?
- Input data: BCVH context, priority context, tổng quan trạng thái.
- Output: Tóm tắt điều hành ngắn gọn.
- Giá trị điều hành: Cho lãnh đạo nắm nhanh điểm nóng.
- Quan hệ với widget khác: Là đầu vào nhận thức cho Priority List và Root Cause Summary.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Executive Brief`

### 2.2 Health Overview Widget

- Mục đích: Hiển thị trạng thái sức khỏe tổng quan của BCVH.
- Câu hỏi quản trị: BCVH đang khỏe hay suy giảm?
- Input data: Tổng hợp trạng thái, xu hướng, phân bổ tốt/xấu.
- Output: Health status và mức độ ổn định.
- Giá trị điều hành: Giúp nhận diện nhanh tình trạng tổng thể.
- Quan hệ với widget khác: Bổ trợ cho Priority List và Trend.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Health Overview`

### 2.3 Priority List Widget

- Mục đích: Xác định BCVH cần ưu tiên xử lý trước.
- Câu hỏi quản trị: BCVH nào phải xem trước?
- Input data: Priority score, impact context, severity context.
- Output: Danh sách BCVH ưu tiên.
- Giá trị điều hành: Hỗ trợ phân bổ sự chú ý điều hành.
- Quan hệ với widget khác: Phụ thuộc Health Overview và Trend Widget.
- EIDAF: `Insight -> Decision`
- IA mapping: `Priority Analysis`

### 2.4 Root Cause Summary Widget

- Mục đích: Tóm tắt nguyên nhân chính ở cấp BCVH.
- Câu hỏi quản trị: Vì sao BCVH này cần được ưu tiên?
- Input data: RCA context, route context, pattern context.
- Output: Nguyên nhân chính và tín hiệu liên quan.
- Giá trị điều hành: Chuyển từ ưu tiên sang hiểu nguyên nhân.
- Quan hệ với widget khác: Phụ thuộc Priority List và Trend Widget.
- EIDAF: `Insight -> Decision`
- IA mapping: `Root Cause Analysis`

### 2.5 Trend Widget

- Mục đích: Cho thấy xu hướng và pattern theo thời gian.
- Câu hỏi quản trị: Tình hình đang tốt lên hay xấu đi?
- Input data: Time-series context, trend context, historical comparison.
- Output: Trend, pattern, biến động đáng chú ý.
- Giá trị điều hành: Cung cấp căn cứ cho ưu tiên và RCA.
- Quan hệ với widget khác: Hỗ trợ Priority List và Root Cause Summary.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Trend & Pattern`

### 2.6 Recommendation Widget

- Mục đích: Gợi ý hướng hành động tiếp theo ở cấp BCVH.
- Câu hỏi quản trị: Cần làm gì tiếp theo?
- Input data: Priority, RCA, trend, tổng hợp context.
- Output: Khuyến nghị điều hành.
- Giá trị điều hành: Rút ngắn từ phân tích sang quyết định.
- Quan hệ với widget khác: Phụ thuộc Priority List và Root Cause Summary.
- EIDAF: `Decision -> Action`
- IA mapping: `Recommendation`

### 2.7 Drill-down Trigger Widget

- Mục đích: Kích hoạt chuyển sang Route Performance Center.
- Câu hỏi quản trị: Khi nào cần đi sâu xuống tuyến?
- Input data: BCVH đã chọn, ngữ cảnh điều hành, priority context.
- Output: Ngữ cảnh drill-down sang Route.
- Giá trị điều hành: Mở đường cho phân tích sâu hơn.
- Quan hệ với widget khác: Phụ thuộc Priority List và Root Cause Summary.
- EIDAF: `Decision -> Action`
- IA mapping: `Drill-down`

## 3. Widget Priority

### Must-have

- Executive Brief Widget
- Health Overview Widget
- Priority List Widget
- Root Cause Summary Widget
- Trend Widget
- Recommendation Widget

### Should-have

- Drill-down Trigger Widget

### Optional

- Không có ở giai đoạn này

## 4. Widget Dependency

- Executive Brief Widget là điểm vào cho các widget còn lại.
- Health Overview Widget và Trend Widget cung cấp nền cho Priority List Widget.
- Priority List Widget phụ thuộc vào Health Overview Widget và Trend Widget.
- Root Cause Summary Widget phụ thuộc vào Priority List Widget.
- Recommendation Widget phụ thuộc vào Priority List Widget và Root Cause Summary Widget.
- Drill-down Trigger Widget phụ thuộc vào Priority List Widget và Recommendation Widget.

## 5. Widget Boundary

- Không trùng lặp Dashboard.
- Không lặp Route/Shipment/Evidence.
- Không biến Widget thành báo cáo tổng hợp.
- Mỗi Widget chỉ phục vụ một câu hỏi quản trị rõ ràng.
- Widget chỉ thể hiện đúng cấp BCVH.

## 6. EIDAF Mapping

### Executive Brief Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Health Overview Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Priority List Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Root Cause Summary Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Trend Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Recommendation Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Drill-down Trigger Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 7. Widget-to-IA Mapping

- Executive Brief Widget -> Executive Brief
- Health Overview Widget -> Health Overview
- Priority List Widget -> Priority Analysis
- Root Cause Summary Widget -> Root Cause Analysis
- Trend Widget -> Trend & Pattern
- Recommendation Widget -> Recommendation
- Drill-down Trigger Widget -> Drill-down

