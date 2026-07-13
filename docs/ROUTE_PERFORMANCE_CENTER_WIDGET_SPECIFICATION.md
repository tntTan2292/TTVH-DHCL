# Route Performance Center Widget Specification

## 1. Mục tiêu

Widget Specification xác định các thành phần cần có cho Route Performance Center.

Mục tiêu:

- Chuyển IA đã freeze thành các widget phục vụ phân tích tuyến.
- Tập trung vào tuyến gây ảnh hưởng đến KPI của BCVH.
- Giữ đúng ranh giới với BCVH, Shipment và Evidence.
- Không biến widget thành báo cáo tổng hợp.

## 2. Danh sách Widget

### 2.1 Route Executive Brief Widget

- Mục đích: Tóm tắt tình trạng tuyến nổi bật nhất.
- Câu hỏi quản trị: Tuyến nào đang cần chú ý ngay?
- Input data: Route context, BCVH context, priority context.
- Output: Route brief ngắn gọn.
- Giá trị điều hành: Cho lãnh đạo nắm nhanh điểm nóng ở cấp tuyến.
- Quan hệ với widget khác: Là đầu vào nhận thức cho Impact và Priority widgets.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Route Executive Brief`

### 2.2 Route Impact Overview Widget

- Mục đích: Hiển thị mức độ ảnh hưởng của tuyến đến BCVH.
- Câu hỏi quản trị: Tuyến nào đang tác động mạnh nhất?
- Input data: Route-level impact, KPI effect, severity context.
- Output: Bức tranh tác động theo tuyến.
- Giá trị điều hành: Xác định tuyến tạo áp lực lên KPI.
- Quan hệ với widget khác: Nền cho Priority List và Root Cause Summary.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Route Impact Overview`

### 2.3 Route Priority List Widget

- Mục đích: Xác định các tuyến cần ưu tiên xử lý.
- Câu hỏi quản trị: Tuyến nào phải xem trước?
- Input data: Impact score, severity, frequency, trend.
- Output: Danh sách tuyến ưu tiên.
- Giá trị điều hành: Hỗ trợ sắp xếp thứ tự điều hành.
- Quan hệ với widget khác: Phụ thuộc Impact và Trend widgets.
- EIDAF: `Insight -> Decision`
- IA mapping: `Route Priority Analysis`

### 2.4 Route Root Cause Summary Widget

- Mục đích: Tóm tắt nguyên nhân ở cấp tuyến.
- Câu hỏi quản trị: Vì sao tuyến này gây ảnh hưởng?
- Input data: Route RCA context, pattern, exception signals.
- Output: Nguyên nhân chính và tín hiệu liên quan.
- Giá trị điều hành: Chuyển từ ưu tiên sang hiểu nguyên nhân.
- Quan hệ với widget khác: Phụ thuộc Priority List và Trend Widget.
- EIDAF: `Insight -> Decision`
- IA mapping: `Route Root Cause Analysis`

### 2.5 Route Trend Widget

- Mục đích: Theo dõi xu hướng và pattern của tuyến.
- Câu hỏi quản trị: Tuyến đang tốt lên hay xấu đi?
- Input data: Time-series route data, historical comparison, trend context.
- Output: Trend, pattern, biến động đáng chú ý.
- Giá trị điều hành: Cung cấp căn cứ cho ưu tiên và RCA.
- Quan hệ với widget khác: Bổ trợ Priority List và Root Cause Summary.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Route Trend & Pattern`

### 2.6 Route Recommendation Widget

- Mục đích: Gợi ý hướng xử lý ở cấp tuyến.
- Câu hỏi quản trị: Cần làm gì tiếp theo cho tuyến này?
- Input data: Priority, RCA, trend, impact.
- Output: Khuyến nghị điều hành.
- Giá trị điều hành: Rút ngắn từ phân tích sang quyết định.
- Quan hệ với widget khác: Phụ thuộc Priority List và Root Cause Summary.
- EIDAF: `Decision -> Action`
- IA mapping: `Route Recommendation`

### 2.7 Shipment Drill-down Trigger Widget

- Mục đích: Kích hoạt drill-down sang Shipment Performance Center.
- Câu hỏi quản trị: Khi nào cần đi xuống bưu gửi?
- Input data: Route đã chọn, route context, priority context.
- Output: Ngữ cảnh drill-down sang Shipment.
- Giá trị điều hành: Mở đường cho phân tích sâu hơn khi cần.
- Quan hệ với widget khác: Phụ thuộc Priority List và Recommendation.
- EIDAF: `Decision -> Action`
- IA mapping: `Shipment Drill-down Trigger`

## 3. Widget Priority

### Must-have

- Route Executive Brief Widget
- Route Impact Overview Widget
- Route Priority List Widget
- Route Root Cause Summary Widget
- Route Trend Widget
- Route Recommendation Widget

### Should-have

- Shipment Drill-down Trigger Widget

### Optional

- Không có ở giai đoạn này

## 4. Widget Dependency

- Route Executive Brief Widget là điểm vào cho các widget còn lại.
- Route Impact Overview Widget và Route Trend Widget cung cấp nền cho Route Priority List Widget.
- Route Priority List Widget phụ thuộc vào Route Impact Overview Widget và Route Trend Widget.
- Route Root Cause Summary Widget phụ thuộc vào Route Priority List Widget.
- Route Recommendation Widget phụ thuộc vào Route Priority List Widget và Route Root Cause Summary Widget.
- Shipment Drill-down Trigger Widget phụ thuộc vào Route Priority List Widget và Route Recommendation Widget.

## 5. Widget Boundary

- Không trùng lặp BCVH.
- Không lặp Shipment/Evidence.
- Không biến widget thành báo cáo tổng hợp.
- Mỗi widget chỉ phục vụ một câu hỏi quản trị rõ ràng.
- Widget chỉ thể hiện đúng cấp tuyến.

## 6. EIDAF Mapping

### Route Executive Brief Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Route Impact Overview Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Route Priority List Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Route Root Cause Summary Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Route Trend Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Route Recommendation Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Shipment Drill-down Trigger Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 7. Widget-to-IA Mapping

- Route Executive Brief Widget -> Route Executive Brief
- Route Impact Overview Widget -> Route Impact Overview
- Route Priority List Widget -> Route Priority Analysis
- Route Root Cause Summary Widget -> Route Root Cause Analysis
- Route Trend Widget -> Route Trend & Pattern
- Route Recommendation Widget -> Route Recommendation
- Shipment Drill-down Trigger Widget -> Shipment Drill-down Trigger

