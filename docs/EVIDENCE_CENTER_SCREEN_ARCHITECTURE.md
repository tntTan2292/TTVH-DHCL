# Evidence Center Screen Architecture

## 1. Vai trò của Screen Architecture

Screen Architecture xác định cách các widget của Evidence Center được tổ chức thành các vùng màn hình để phục vụ xác minh bằng chứng.

Vai trò:

- Là lớp trung gian giữa Widget Specification và UX.
- Quy định thứ tự đọc, vùng thông tin và mức ưu tiên hiển thị.
- Giữ cho lãnh đạo đi từ shipment sang evidence validation rồi sang action trigger khi đủ điều kiện.
- Không thay thế UX design và không đi vào wireframe chi tiết.

## 2. Thứ tự ưu tiên hiển thị Widget

Ưu tiên hiển thị:

1. Evidence Executive Summary Widget
2. Evidence Coverage Widget
3. Evidence Timeline Widget
4. Scan History Widget
5. Rule Validation Widget
6. Supporting Evidence Widget
7. RCA Evidence Widget
8. Decision Support Widget

Nguyên tắc:

- Executive Summary luôn xuất hiện đầu tiên.
- Coverage và Timeline là lớp xác minh nền.
- Validation là trung tâm của màn hình.
- Decision Support là lớp chốt trước Action Center.

## 3. Screen Zones

### Header Zone

- Chứa title, context, filter, và action entry.

### Executive Zone

- Chứa Evidence Executive Summary và Evidence Coverage.
- Dành cho nhận thức nhanh về độ đủ của evidence.

### Evidence Validation Zone

- Chứa Evidence Timeline, Scan History, Rule Validation, Supporting Evidence, RCA Evidence.
- Dành cho xác minh và tổ chức bằng chứng.

### Decision Support Zone

- Chứa Decision Support Widget.
- Dành cho kết luận evidence đã đủ hay chưa.

### Action Trigger Zone

- Chứa ngữ cảnh chuyển sang Action Center khi evidence đã đủ.

## 4. Widget Placement

### Evidence Executive Summary Widget

- Vị trí: Executive Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị

### Evidence Coverage Widget

- Vị trí: Executive Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Evidence Timeline Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: full width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Scan History Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Rule Validation Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình đến lớn
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Supporting Evidence Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có evidence hỗ trợ

### RCA Evidence Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: full width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có root cause context

### Decision Support Widget

- Vị trí: Decision Support Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị hoặc khi đủ evidence

## 5. Reading Flow

Hành trình mắt của lãnh đạo:

1. Xem Header Zone để xác định context.
2. Đọc Evidence Executive Summary trước.
3. Xem Evidence Coverage để biết evidence đã đủ chưa.
4. Chuyển sang Evidence Timeline và Scan History để hiểu quá trình ghi nhận.
5. Đọc Rule Validation để biết evidence có hợp lệ không.
6. Xem Supporting Evidence và RCA Evidence để củng cố kết luận.
7. Đọc Decision Support để quyết định có sang Action Center hay chưa.

## 6. Interaction Flow

- Evidence Coverage Widget kích hoạt Evidence Timeline Widget theo coverage gap.
- Evidence Timeline Widget kích hoạt Scan History Widget.
- Scan History Widget kích hoạt Rule Validation Widget.
- Rule Validation Widget kích hoạt Supporting Evidence Widget và RCA Evidence Widget khi cần.
- Decision Support Widget kích hoạt Action Trigger Zone nếu evidence đã đủ.

## 7. Progressive Disclosure

### Mặc định hiển thị

- Evidence Executive Summary Widget
- Evidence Coverage Widget
- Evidence Timeline Widget
- Scan History Widget

### Chỉ hiện khi cần

- Rule Validation Widget
- Supporting Evidence Widget
- RCA Evidence Widget
- Decision Support Widget chi tiết

Nguyên tắc:

- Tổng quan luôn hiện trước.
- Chi tiết chỉ hiện khi có nhu cầu xác minh hoặc khi evidence chưa đủ.
- Không nhồi toàn bộ validation detail vào màn hình mặc định.

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

### Evidence Validation Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Decision Support Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Action Trigger Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 9. Kiểm tra tính nhất quán

### Với BCVH Screen Architecture

- Cùng nguyên tắc progressive disclosure và context preservation.
- Khác ở cấp thông tin: Evidence tập trung xác minh bằng chứng.

### Với Route Screen Architecture

- Cùng luồng executive -> analysis -> decision support -> drill/action trigger.
- Khác ở mục tiêu: Evidence không đi sang shipment nữa.

### Với Shipment Screen Architecture

- Evidence Center nhận shipment context và chốt xác minh.
- Không lặp lại shipment analysis.

### Với QIS Design System

- Card, table, badge, timeline và status phải tuân thủ component standard.
- Layout phải dùng cùng nhịp grid và hierarchy.

### Với QIS UX Design Principles

- Executive First.
- Decision First.
- Evidence First.
- Progressive Drill-down.
- One Question Per Screen.
- No Information Duplication.
- Context Preservation.

