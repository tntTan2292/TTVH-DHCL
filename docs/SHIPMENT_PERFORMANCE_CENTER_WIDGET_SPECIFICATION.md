# Shipment Performance Center Widget Specification

## 1. Mục tiêu

Widget Specification xác định các thành phần cần có cho Shipment Performance Center.

Mục tiêu:

- Chuyển IA đã freeze thành các widget phục vụ phân tích bưu gửi.
- Tập trung vào shipment đại diện cho vấn đề hoặc gây ảnh hưởng.
- Giữ đúng ranh giới với Route và Evidence.
- Không biến widget thành báo cáo tổng hợp.

## 2. Danh sách Widget

### 2.1 Shipment Executive Brief Widget

- Mục đích: Tóm tắt tình trạng shipment nổi bật nhất.
- Câu hỏi quản trị: Bưu gửi nào đang cần chú ý ngay?
- Input data: Shipment context, route context, priority context.
- Output: Shipment brief ngắn gọn.
- Giá trị điều hành: Cho lãnh đạo nắm nhanh điểm nóng ở cấp bưu gửi.
- Quan hệ với widget khác: Là đầu vào nhận thức cho Impact và Timeline widgets.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Shipment Executive Brief`

### 2.2 Shipment Impact Overview Widget

- Mục đích: Hiển thị mức độ ảnh hưởng của shipment.
- Câu hỏi quản trị: Bưu gửi nào đang đại diện cho vấn đề lớn nhất?
- Input data: Shipment impact, route context, severity context.
- Output: Bức tranh ảnh hưởng theo shipment.
- Giá trị điều hành: Xác định shipment gây ảnh hưởng rõ nhất.
- Quan hệ với widget khác: Nền cho Timeline, Root Cause và Evidence Summary.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Shipment Impact Overview`

### 2.3 Shipment Timeline Widget

- Mục đích: Cho thấy diễn tiến của shipment theo thời gian.
- Câu hỏi quản trị: Vấn đề xuất hiện khi nào và kéo dài ra sao?
- Input data: Time-series shipment data, event context, status changes.
- Output: Timeline của shipment.
- Giá trị điều hành: Cung cấp bối cảnh thời gian cho phân tích nguyên nhân.
- Quan hệ với widget khác: Bổ trợ Root Cause Summary và Evidence Summary.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Shipment Timeline`

### 2.4 Shipment Root Cause Summary Widget

- Mục đích: Tóm tắt nguyên nhân ở cấp bưu gửi.
- Câu hỏi quản trị: Vì sao shipment này trở thành vấn đề?
- Input data: Shipment RCA context, timeline, exception signals.
- Output: Nguyên nhân chính và tín hiệu liên quan.
- Giá trị điều hành: Chuyển từ hiện tượng sang nguyên nhân.
- Quan hệ với widget khác: Phụ thuộc Timeline và Impact Overview.
- EIDAF: `Insight -> Decision`
- IA mapping: `Shipment Root Cause Analysis`

### 2.5 Evidence Summary Widget

- Mục đích: Tóm tắt evidence cần thiết trước khi sang Evidence Center.
- Câu hỏi quản trị: Đã có đủ bằng chứng sơ bộ chưa?
- Input data: Shipment analysis, timeline, RCA context, trace summary.
- Output: Evidence summary, trạng thái đủ/chưa đủ dữ liệu.
- Giá trị điều hành: Xác định mức độ sẵn sàng để xác minh chính thức.
- Quan hệ với widget khác: Phụ thuộc Root Cause Summary.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Evidence Summary`

### 2.6 Recommendation Widget

- Mục đích: Gợi ý hướng xử lý tiếp theo cho shipment.
- Câu hỏi quản trị: Cần làm gì tiếp theo cho bưu gửi này?
- Input data: Impact, timeline, root cause, evidence summary.
- Output: Khuyến nghị điều hành.
- Giá trị điều hành: Rút ngắn từ phân tích sang quyết định.
- Quan hệ với widget khác: Phụ thuộc Root Cause Summary và Evidence Summary.
- EIDAF: `Decision -> Action`
- IA mapping: `Recommendation`

### 2.7 Evidence Drill-down Trigger Widget

- Mục đích: Kích hoạt drill-down sang Evidence Center.
- Câu hỏi quản trị: Khi nào cần xác minh chính thức?
- Input data: Shipment đã chọn, evidence summary, decision context.
- Output: Ngữ cảnh drill-down sang Evidence Center.
- Giá trị điều hành: Mở đường cho xác minh chính thức.
- Quan hệ với widget khác: Phụ thuộc Evidence Summary và Recommendation.
- EIDAF: `Decision -> Action`
- IA mapping: `Evidence Drill-down`

## 3. Widget Priority

### Must-have

- Shipment Executive Brief Widget
- Shipment Impact Overview Widget
- Shipment Timeline Widget
- Shipment Root Cause Summary Widget
- Evidence Summary Widget
- Recommendation Widget

### Should-have

- Evidence Drill-down Trigger Widget

### Optional

- Không có ở giai đoạn này

## 4. Widget Dependency

- Shipment Executive Brief Widget là điểm vào cho các widget còn lại.
- Shipment Impact Overview Widget và Shipment Timeline Widget cung cấp nền cho Shipment Root Cause Summary Widget.
- Shipment Root Cause Summary Widget phụ thuộc vào Shipment Timeline Widget và Shipment Impact Overview Widget.
- Evidence Summary Widget phụ thuộc vào Shipment Root Cause Summary Widget.
- Recommendation Widget phụ thuộc vào Shipment Root Cause Summary Widget và Evidence Summary Widget.
- Evidence Drill-down Trigger Widget phụ thuộc vào Evidence Summary Widget và Recommendation Widget.

## 5. Widget Boundary

- Không trùng lặp Route.
- Không lặp Evidence.
- Không biến widget thành báo cáo tổng hợp.
- Mỗi widget chỉ phục vụ một câu hỏi quản trị rõ ràng.
- Widget chỉ thể hiện đúng cấp bưu gửi.

## 6. EIDAF Mapping

### Shipment Executive Brief Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Shipment Impact Overview Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Shipment Timeline Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Shipment Root Cause Summary Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Evidence Summary Widget

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

### Evidence Drill-down Trigger Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 7. Widget-to-IA Mapping

- Shipment Executive Brief Widget -> Shipment Executive Brief
- Shipment Impact Overview Widget -> Shipment Impact Overview
- Shipment Timeline Widget -> Shipment Timeline
- Shipment Root Cause Summary Widget -> Shipment Root Cause Analysis
- Evidence Summary Widget -> Evidence Summary
- Recommendation Widget -> Recommendation
- Evidence Drill-down Trigger Widget -> Evidence Drill-down

