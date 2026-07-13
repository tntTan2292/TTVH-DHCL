# Action Center Screen Architecture

## 1. Vai trò của Screen Architecture

Screen Architecture xác định cách các widget của Action Center được tổ chức thành các vùng màn hình để phục vụ thực thi hành động và phản hồi.

Vai trò:

- Là lớp trung gian giữa Widget Specification và UX.
- Quy định thứ tự đọc, vùng thông tin và mức ưu tiên hiển thị.
- Giữ cho lãnh đạo đi từ decision sang action rồi tới feedback mà không mất context.
- Không thay thế UX design và không đi vào wireframe chi tiết.

## 2. Thứ tự ưu tiên hiển thị Widget

Ưu tiên hiển thị:

1. Action Executive Summary Widget
2. Decision Queue Widget
3. Recommended Actions Widget
4. Assignment & Ownership Widget
5. Execution Tracking Widget
6. Follow-up & Feedback Widget
7. Action History Widget

Nguyên tắc:

- Executive Summary và Decision Queue xuất hiện trước.
- Recommended Actions là lớp chuyển từ quyết định sang hành động.
- Assignment, Tracking và Feedback là lớp thực thi cốt lõi.
- Action History là lớp tổng kết và truy vết.

## 3. Screen Zones

### Header Zone

- Chứa title, context, filter, và action entry.

### Executive Zone

- Chứa Action Executive Summary và Decision Queue.
- Dành cho đọc nhanh toàn cảnh action đang mở.

### Action Planning Zone

- Chứa Recommended Actions và Assignment & Ownership.
- Dành cho lên kế hoạch và giao việc.

### Execution Tracking Zone

- Chứa Execution Tracking Widget.
- Dành cho theo dõi tiến độ thực thi.

### Feedback & History Zone

- Chứa Follow-up & Feedback và Action History.
- Dành cho phản hồi và truy vết kết quả.

## 4. Widget Placement

### Action Executive Summary Widget

- Vị trí: Executive Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị

### Decision Queue Widget

- Vị trí: Executive Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Recommended Actions Widget

- Vị trí: Action Planning Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị

### Assignment & Ownership Widget

- Vị trí: Action Planning Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có action cần gán

### Execution Tracking Widget

- Vị trí: Execution Tracking Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Follow-up & Feedback Widget

- Vị trí: Feedback & History Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có kết quả thực thi hoặc phản hồi

### Action History Widget

- Vị trí: Feedback & History Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị hoặc khi cần truy vết

## 5. Reading Flow

Hành trình mắt của lãnh đạo:

1. Xem Header Zone để xác định context.
2. Đọc Action Executive Summary trước.
3. Xem Decision Queue để biết việc nào cần làm trước.
4. Chuyển sang Recommended Actions để biết phải làm gì.
5. Đọc Assignment & Ownership để biết ai chịu trách nhiệm.
6. Theo dõi Execution Tracking để nắm tiến độ.
7. Xem Follow-up & Feedback để đánh giá kết quả.
8. Cuối cùng xem Action History nếu cần truy vết.

## 6. Interaction Flow

- Decision Queue Widget kích hoạt Recommended Actions Widget.
- Recommended Actions Widget kích hoạt Assignment & Ownership Widget.
- Assignment & Ownership Widget kích hoạt Execution Tracking Widget.
- Execution Tracking Widget kích hoạt Follow-up & Feedback Widget khi có kết quả.
- Follow-up & Feedback Widget kích hoạt Action History Widget để lưu vết.

## 7. Progressive Disclosure

### Mặc định hiển thị

- Action Executive Summary Widget
- Decision Queue Widget
- Recommended Actions Widget
- Execution Tracking Widget

### Chỉ hiện khi cần

- Assignment & Ownership Widget
- Follow-up & Feedback Widget
- Action History Widget

Nguyên tắc:

- Tổng quan và queue luôn hiện trước.
- Giao việc và lịch sử chỉ hiện khi có nhu cầu điều hành cụ thể.
- Không dồn hết lịch sử và phản hồi vào màn hình mặc định.

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

### Action Planning Zone

- Evidence: Không trực tiếp
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

### Execution Tracking Zone

- Evidence: Không trực tiếp
- Insight: Một phần
- Decision: Một phần
- Action: Có
- Feedback: Có

### Feedback & History Zone

- Evidence: Không trực tiếp
- Insight: Có
- Decision: Một phần
- Action: Có
- Feedback: Có

## 9. Kiểm tra tính nhất quán

### Với BCVH Screen Architecture

- Cùng nguyên tắc executive -> analysis/plan -> action-oriented zones.
- Khác ở mục tiêu: Action tập trung thực thi, không phân tích.

### Với Route Screen Architecture

- Cùng giữ context và progressive disclosure.
- Khác ở chỗ Action không drill sang shipment hay evidence nữa.

### Với Shipment Screen Architecture

- Action nhận đầu ra đã được xác minh, không quay lại phân tích shipment.

### Với Evidence Screen Architecture

- Action là lớp sau cùng của evidence đã đủ.
- Không lặp validation hay evidence detail.

### Với QIS Design System

- Card, table, badge, timeline và status phải tuân thủ component standard.
- Layout phải dùng cùng nhịp grid và hierarchy.

### Với QIS UX Design Principles

- Executive First.
- Decision First.
- Action-oriented Design.
- Context Preservation.
- Progressive Drill-down.
- No Information Duplication.

