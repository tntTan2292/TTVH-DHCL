# Route Performance Center Screen Architecture

## 1. Vai trò của Screen Architecture

Screen Architecture xác định cách các widget của Route Performance Center được tổ chức thành các vùng màn hình để hỗ trợ điều hành theo tuyến.

Vai trò:

- Là lớp trung gian giữa Widget Specification và UX.
- Quy định thứ tự đọc, vùng thông tin và mức ưu tiên hiển thị.
- Giữ cho lãnh đạo đi từ BCVH xuống tuyến rồi sang shipment khi cần.
- Không đi vào wireframe hay UI design chi tiết.

## 2. Thứ tự ưu tiên hiển thị Widget

Ưu tiên hiển thị:

1. Route Executive Brief Widget
2. Route Impact Overview Widget
3. Route Priority List Widget
4. Route Trend Widget
5. Route Root Cause Summary Widget
6. Route Recommendation Widget
7. Shipment Drill-down Trigger Widget

Nguyên tắc:

- Executive và Impact luôn xuất hiện sớm nhất.
- Priority và Trend là lớp phân tích trọng tâm.
- Root Cause và Recommendation là lớp chốt điều hành.
- Drill-down sang Shipment chỉ xuất hiện khi đủ ngữ cảnh.

## 3. Screen Zones

### Header Zone

- Chứa title, context, filter, và action entry.

### Executive Zone

- Chứa Route Executive Brief và Route Impact Overview.
- Dành cho đọc nhanh và nhận diện tuyến nổi bật.

### Route Analysis Zone

- Chứa Route Priority List, Route Trend, Route Root Cause Summary.
- Dành cho phân tích và xác định tuyến cần xử lý.

### Recommendation Zone

- Chứa Route Recommendation Widget.
- Dành cho khuyến nghị hành động cấp tuyến.

### Shipment Drill-down Zone

- Chứa Shipment Drill-down Trigger Widget.
- Dành cho ngữ cảnh chuyển sang Shipment Performance Center.

## 4. Widget Placement

### Route Executive Brief Widget

- Vị trí: Executive Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị

### Route Impact Overview Widget

- Vị trí: Executive Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Route Priority List Widget

- Vị trí: Route Analysis Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Route Trend Widget

- Vị trí: Route Analysis Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Route Root Cause Summary Widget

- Vị trí: Route Analysis Zone
- Kích thước tương đối: trung bình đến lớn
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có route được chọn

### Route Recommendation Widget

- Vị trí: Recommendation Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: khi có recommendation sẵn sàng

### Shipment Drill-down Trigger Widget

- Vị trí: Shipment Drill-down Zone
- Kích thước tương đối: nhỏ đến trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi cần chuyển sang Shipment Performance Center

## 5. Reading Flow

Hành trình mắt của lãnh đạo:

1. Xem Header Zone để xác định context.
2. Đọc Route Executive Brief trước.
3. Xem Route Impact Overview để hiểu mức ảnh hưởng.
4. Chuyển sang Route Priority List để xác định tuyến cần xử lý trước.
5. Đọc Route Trend để hiểu xu hướng.
6. Xem Route Root Cause Summary để hiểu nguyên nhân.
7. Đọc Route Recommendation để chốt hướng xử lý.
8. Nhìn Shipment Drill-down Trigger nếu cần đi sâu.

## 6. Interaction Flow

- Route Priority List Widget kích hoạt Route Trend Widget theo tuyến được chọn.
- Route Priority List Widget kích hoạt Route Root Cause Summary Widget theo tuyến được chọn.
- Route Root Cause Summary Widget kích hoạt Route Recommendation Widget khi đủ ngữ cảnh.
- Route Recommendation Widget kích hoạt Shipment Drill-down Trigger Widget nếu cần sang Shipment.

## 7. Progressive Disclosure

### Mặc định hiển thị

- Route Executive Brief Widget
- Route Impact Overview Widget
- Route Priority List Widget
- Route Trend Widget

### Chỉ hiện khi cần

- Route Root Cause Summary Widget
- Route Recommendation Widget
- Shipment Drill-down Trigger Widget

Nguyên tắc:

- Tổng quan luôn hiện trước.
- Chi tiết chỉ hiện khi có tuyến được chọn hoặc khi có đủ ngữ cảnh điều hành.
- Không nhồi toàn bộ chi tiết lên màn hình mặc định.

## 8. Mapping giữa Screen Zone và EIDAF

### Header Zone

- Evidence: Có
- Insight: Một phần
- Decision: Không trực tiếp
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Executive Zone

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Route Analysis Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Recommendation Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Shipment Drill-down Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 9. Kiểm tra tính nhất quán

### Với BCVH Screen Architecture

- Cùng cấu trúc tư duy: Executive -> Analysis -> Recommendation -> Drill-down.
- Cùng nguyên tắc progressive disclosure và context preservation.
- Khác ở cấp thông tin: Route tập trung vào tuyến, không lặp BCVH.

### Với QIS Design System

- Card, table, badge và drill-down phải tuân thủ component standard.
- Layout phải dùng cùng nhịp grid và hierarchy.
- Severity và status semantics phải nhất quán.

### Với QIS UX Design Principles

- Executive First.
- Decision First.
- Progressive Drill-down.
- One Question Per Screen.
- No Information Duplication.
- Context Preservation.

