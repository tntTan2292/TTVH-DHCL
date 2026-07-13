# Shipment Performance Center Screen Architecture

## 1. Vai trò của Screen Architecture

Screen Architecture xác định cách các widget của Shipment Performance Center được tổ chức thành các vùng màn hình để hỗ trợ phân tích bưu gửi.

Vai trò:

- Là lớp trung gian giữa Widget Specification và UX.
- Quy định thứ tự đọc, vùng thông tin và mức ưu tiên hiển thị.
- Giữ cho lãnh đạo đi từ route xuống shipment rồi sang evidence khi cần.
- Không thay thế UX design và không đi vào wireframe chi tiết.

## 2. Thứ tự ưu tiên hiển thị Widget

Ưu tiên hiển thị:

1. Shipment Executive Brief Widget
2. Shipment Impact Overview Widget
3. Shipment Timeline Widget
4. Shipment Root Cause Summary Widget
5. Evidence Summary Widget
6. Recommendation Widget
7. Evidence Drill-down Trigger Widget

Nguyên tắc:

- Executive và Impact luôn xuất hiện sớm nhất.
- Timeline là lớp bối cảnh thời gian trọng tâm.
- Root Cause và Evidence Summary là lớp chốt phân tích.
- Recommendation và Drill-down là lớp ra quyết định và xác minh tiếp.

## 3. Screen Zones

### Header Zone

- Chứa title, context, filter, và action entry.

### Executive Zone

- Chứa Shipment Executive Brief và Shipment Impact Overview.
- Dành cho đọc nhanh và nhận diện shipment nổi bật.

### Shipment Analysis Zone

- Chứa Shipment Timeline và Shipment Root Cause Summary.
- Dành cho phân tích shipment theo thời gian và nguyên nhân.

### Evidence Summary Zone

- Chứa Evidence Summary Widget và Recommendation Widget.
- Dành cho xác định mức sẵn sàng evidence và hướng xử lý.

### Evidence Drill-down Zone

- Chứa Evidence Drill-down Trigger Widget.
- Dành cho ngữ cảnh chuyển sang Evidence Center.

## 4. Widget Placement

### Shipment Executive Brief Widget

- Vị trí: Executive Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị

### Shipment Impact Overview Widget

- Vị trí: Executive Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Shipment Timeline Widget

- Vị trí: Shipment Analysis Zone
- Kích thước tương đối: trung bình đến lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Shipment Root Cause Summary Widget

- Vị trí: Shipment Analysis Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có shipment được chọn

### Evidence Summary Widget

- Vị trí: Evidence Summary Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị hoặc khi dữ liệu đủ

### Recommendation Widget

- Vị trí: Evidence Summary Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: khi có recommendation sẵn sàng

### Evidence Drill-down Trigger Widget

- Vị trí: Evidence Drill-down Zone
- Kích thước tương đối: nhỏ đến trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi cần chuyển sang Evidence Center

## 5. Reading Flow

Hành trình mắt của lãnh đạo:

1. Xem Header Zone để xác định context.
2. Đọc Shipment Executive Brief trước.
3. Xem Shipment Impact Overview để biết shipment nào nổi bật.
4. Chuyển sang Shipment Timeline để hiểu diễn tiến.
5. Đọc Shipment Root Cause Summary để hiểu nguyên nhân.
6. Xem Evidence Summary để biết evidence đã đủ chưa.
7. Đọc Recommendation để chốt hướng xử lý.
8. Nhìn Evidence Drill-down Trigger nếu cần sang Evidence Center.

## 6. Interaction Flow

- Shipment Impact Overview Widget kích hoạt Shipment Timeline Widget theo shipment được chọn.
- Shipment Timeline Widget kích hoạt Shipment Root Cause Summary Widget.
- Shipment Root Cause Summary Widget kích hoạt Evidence Summary Widget.
- Evidence Summary Widget kích hoạt Recommendation Widget khi đủ evidence.
- Recommendation Widget kích hoạt Evidence Drill-down Trigger Widget nếu cần xác minh chính thức.

## 7. Progressive Disclosure

### Mặc định hiển thị

- Shipment Executive Brief Widget
- Shipment Impact Overview Widget
- Shipment Timeline Widget

### Chỉ hiện khi cần

- Shipment Root Cause Summary Widget
- Evidence Summary Widget
- Recommendation Widget
- Evidence Drill-down Trigger Widget

Nguyên tắc:

- Tổng quan luôn hiện trước.
- Chi tiết chỉ hiện khi có shipment được chọn hoặc khi dữ liệu đủ.
- Không dồn toàn bộ evidence và recommendation vào màn hình mặc định.

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

### Shipment Analysis Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Evidence Summary Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Evidence Drill-down Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 9. Kiểm tra tính nhất quán

### Với BCVH Screen Architecture

- Cùng tư duy Executive -> Analysis -> Recommendation -> Drill-down.
- Cùng nguyên tắc progressive disclosure và context preservation.
- Khác ở cấp thông tin: Shipment tập trung vào bưu gửi và evidence summary.

### Với Route Screen Architecture

- Cùng cấu trúc điều hướng và nhịp đọc.
- Khác ở chỗ Shipment đi tới Evidence Center, không đi xuống thêm shipment-level chi tiết.

### Với QIS Design System

- Card, table, badge và drill-down phải tuân thủ component standard.
- Layout phải dùng cùng nhịp grid và hierarchy.
- Severity và status semantics phải nhất quán.

### Với QIS UX Design Principles

- Executive First.
- Decision First.
- Evidence First.
- Progressive Drill-down.
- One Question Per Screen.
- No Information Duplication.
- Context Preservation.

