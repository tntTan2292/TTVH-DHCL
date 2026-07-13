# Evidence Center Widget Specification

## 1. Mục tiêu

Widget Specification xác định các thành phần cần có cho Evidence Center.

Mục tiêu:

- Chuyển IA đã freeze thành các widget phục vụ xác minh bằng chứng.
- Đánh giá độ đủ, độ đúng và độ tin cậy của evidence trước khi sang Action Center.
- Giữ đúng ranh giới với Shipment và Action.
- Không biến widget thành khuyến nghị điều hành mới.

## 2. Danh sách Widget

### 2.1 Evidence Executive Summary Widget

- Mục đích: Tóm tắt trạng thái evidence hiện có.
- Câu hỏi quản trị: Evidence đã đủ để xác minh chưa?
- Input data: Evidence context, scan history, validation status, supporting evidence.
- Output: Evidence summary ngắn gọn, trạng thái đủ/chưa đủ.
- Giá trị điều hành: Cho lãnh đạo biết nhanh mức sẵn sàng của evidence.
- Quan hệ với widget khác: Là đầu vào nhận thức cho Coverage và Validation widgets.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Evidence Executive Summary`

### 2.2 Evidence Coverage Widget

- Mục đích: Đánh giá mức độ bao phủ của evidence.
- Câu hỏi quản trị: Đã có đủ loại bằng chứng cần thiết chưa?
- Input data: Evidence set, coverage dimensions, missing evidence signals.
- Output: Coverage status, thiếu gì, đủ ở mức nào.
- Giá trị điều hành: Xác định phần evidence còn thiếu.
- Quan hệ với widget khác: Phụ thuộc Executive Summary và Supporting Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Decision Support`

### 2.3 Evidence Timeline Widget

- Mục đích: Hiển thị trình tự evidence theo thời gian.
- Câu hỏi quản trị: Evidence hình thành và thay đổi thế nào?
- Input data: Evidence events, scan points, validation milestones.
- Output: Evidence timeline.
- Giá trị điều hành: Cung cấp ngữ cảnh thời gian cho xác minh.
- Quan hệ với widget khác: Bổ trợ Scan History và RCA Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Evidence Timeline`

### 2.4 Scan History Widget

- Mục đích: Cho thấy lịch sử quét/ghi nhận của evidence.
- Câu hỏi quản trị: Evidence này đã được ghi nhận ra sao?
- Input data: Scan logs, trace history, record states.
- Output: Scan history.
- Giá trị điều hành: Tăng độ tin cậy cho quá trình xác minh.
- Quan hệ với widget khác: Là nền cho Rule Validation.
- EIDAF: `Evidence`
- IA mapping: `Scan History`

### 2.5 Rule Validation Widget

- Mục đích: Xác minh evidence có hợp lệ theo rule không.
- Câu hỏi quản trị: Evidence có đúng rule và đủ điều kiện chấp nhận không?
- Input data: Evidence, rule context, validation result.
- Output: Kết quả hợp lệ/không hợp lệ, trạng thái xác minh.
- Giá trị điều hành: Là lớp xác minh cốt lõi của Evidence Center.
- Quan hệ với widget khác: Phụ thuộc Scan History và Evidence Timeline.
- EIDAF: `Evidence -> Decision`
- IA mapping: `Rule Validation`

### 2.6 Supporting Evidence Widget

- Mục đích: Gom các bằng chứng hỗ trợ cho kết luận.
- Câu hỏi quản trị: Có bằng chứng phụ nào củng cố kết luận không?
- Input data: Supporting traces, related records, validation context.
- Output: Danh sách supporting evidence.
- Giá trị điều hành: Bổ sung độ chắc chắn cho xác minh.
- Quan hệ với widget khác: Hỗ trợ Executive Summary và RCA Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Supporting Evidence`

### 2.7 RCA Evidence Widget

- Mục đích: Tổ chức evidence phục vụ xác minh root cause.
- Câu hỏi quản trị: Bằng chứng nào xác nhận nguyên nhân nghi ngờ?
- Input data: RCA candidate, timeline, validation data, supporting evidence.
- Output: Evidence gắn với nguyên nhân.
- Giá trị điều hành: Tăng độ tin cậy trước khi chuyển sang Action Center.
- Quan hệ với widget khác: Phụ thuộc Rule Validation và Supporting Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `RCA Evidence`

### 2.8 Decision Support Widget

- Mục đích: Kết luận evidence đã đủ hay chưa.
- Câu hỏi quản trị: Có thể chuyển sang Action Center chưa?
- Input data: Tổng hợp từ các widget xác minh.
- Output: Decision support statement, bao gồm `CHƯA ĐỦ THÔNG TIN` nếu cần.
- Giá trị điều hành: Chốt mức sẵn sàng của evidence.
- Quan hệ với widget khác: Phụ thuộc tất cả widget xác minh phía trên.
- EIDAF: `Decision`
- IA mapping: `Decision Support`

## 3. Widget Priority

### Must-have

- Evidence Executive Summary Widget
- Evidence Coverage Widget
- Evidence Timeline Widget
- Scan History Widget
- Rule Validation Widget
- Supporting Evidence Widget
- RCA Evidence Widget
- Decision Support Widget

### Should-have

- Không có ở giai đoạn này

### Optional

- Không có ở giai đoạn này

## 4. Widget Dependency

- Evidence Executive Summary Widget là điểm vào cho các widget còn lại.
- Evidence Coverage Widget phụ thuộc vào Executive Summary Widget và Supporting Evidence Widget.
- Evidence Timeline Widget hỗ trợ Scan History Widget và RCA Evidence Widget.
- Scan History Widget là nền cho Rule Validation Widget.
- Rule Validation Widget phụ thuộc vào Scan History Widget và Evidence Timeline Widget.
- Supporting Evidence Widget phụ thuộc vào Executive Summary Widget.
- RCA Evidence Widget phụ thuộc vào Rule Validation Widget và Supporting Evidence Widget.
- Decision Support Widget phụ thuộc vào toàn bộ các widget xác minh.

## 5. Widget Boundary

- Không lặp Shipment.
- Không lặp Action.
- Không biến widget thành khuyến nghị điều hành mới.
- Chỉ phục vụ xác minh và đánh giá độ đủ của bằng chứng.
- Widget chỉ thể hiện đúng cấp Evidence.

## 6. EIDAF Mapping

### Evidence Executive Summary Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Evidence Coverage Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Evidence Timeline Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Scan History Widget

- Evidence: Có
- Insight: Không tự tạo
- Decision: Không trực tiếp
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Rule Validation Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Supporting Evidence Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### RCA Evidence Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Decision Support Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 7. Widget-to-IA Mapping

- Evidence Executive Summary Widget -> Evidence Executive Summary
- Evidence Coverage Widget -> Decision Support
- Evidence Timeline Widget -> Evidence Timeline
- Scan History Widget -> Scan History
- Rule Validation Widget -> Rule Validation
- Supporting Evidence Widget -> Supporting Evidence
- RCA Evidence Widget -> RCA Evidence
- Decision Support Widget -> Decision Support

