# Action Center Widget Specification

## 1. Mục tiêu

Widget Specification xác định các thành phần cần có cho Action Center.

Mục tiêu:

- Chuyển IA đã freeze thành widget phục vụ thực thi điều hành.
- Quản lý decision, action, owner, tiến độ và feedback.
- Giữ đúng ranh giới với Evidence Center.
- Không tạo evidence mới.

## 2. Danh sách Widget

### 2.1 Action Executive Summary Widget

- Mục đích: Tóm tắt toàn bộ tình trạng hành động đang mở.
- Câu hỏi quản trị: Có bao nhiêu action đang chờ, đang làm, đã xong?
- Input: Decision context, action status, owner context, progress data.
- Output: Action summary ngắn gọn.
- Giá trị điều hành: Cho lãnh đạo thấy ngay trạng thái thực thi.
- Quan hệ với widget khác: Là điểm vào cho Decision Queue và Tracking widgets.
- IA Mapping: `Action Executive Summary`
- EIDAF Mapping: `Decision -> Action`

### 2.2 Decision Queue Widget

- Mục đích: Xếp hàng các decision cần chuyển thành hành động.
- Câu hỏi quản trị: Decision nào cần xử lý trước?
- Input: Decision đã chốt, mức ưu tiên, mức khẩn.
- Output: Danh sách decision chờ thực thi.
- Giá trị điều hành: Giữ thứ tự xử lý rõ ràng.
- Quan hệ với widget khác: Phụ thuộc Action Summary.
- IA Mapping: `Decision Queue`
- EIDAF Mapping: `Decision -> Action`

### 2.3 Recommended Actions Widget

- Mục đích: Chuyển decision thành hành động đề xuất.
- Câu hỏi quản trị: Cần làm gì tiếp theo?
- Input: Decision queue, action context, priority context.
- Output: Danh sách hành động đề xuất.
- Giá trị điều hành: Rút ngắn từ quyết định sang hành động.
- Quan hệ với widget khác: Phụ thuộc Decision Queue.
- IA Mapping: `Recommended Actions`
- EIDAF Mapping: `Decision -> Action`

### 2.4 Assignment & Ownership Widget

- Mục đích: Gán người phụ trách cho từng action.
- Câu hỏi quản trị: Ai chịu trách nhiệm thực thi?
- Input: Recommended actions, tổ chức, phạm vi trách nhiệm.
- Output: Owner, assignee, deadline.
- Giá trị điều hành: Làm rõ trách nhiệm và đầu mối.
- Quan hệ với widget khác: Phụ thuộc Recommended Actions.
- IA Mapping: `Assignment & Ownership`
- EIDAF Mapping: `Action`

### 2.5 Execution Tracking Widget

- Mục đích: Theo dõi tiến độ thực thi action.
- Câu hỏi quản trị: Action đang ở trạng thái nào?
- Input: Assignment data, progress updates, status changes.
- Output: Trạng thái thực thi, cảnh báo trễ, tiến độ.
- Giá trị điều hành: Giúp lãnh đạo kiểm soát tiến độ.
- Quan hệ với widget khác: Phụ thuộc Assignment & Ownership.
- IA Mapping: `Execution Tracking`
- EIDAF Mapping: `Action -> Feedback`

### 2.6 Follow-up & Feedback Widget

- Mục đích: Ghi nhận kết quả và phản hồi sau thực thi.
- Câu hỏi quản trị: Hành động có hiệu quả không?
- Input: Execution result, feedback signals, follow-up notes.
- Output: Feedback và kết luận sau hành động.
- Giá trị điều hành: Khép kín vòng điều hành.
- Quan hệ với widget khác: Phụ thuộc Execution Tracking.
- IA Mapping: `Follow-up & Feedback`
- EIDAF Mapping: `Feedback`

### 2.7 Action History Widget

- Mục đích: Lưu lịch sử action và feedback.
- Câu hỏi quản trị: Đã thực hiện những gì và kết quả ra sao?
- Input: Action records, progress history, feedback, closure status.
- Output: Lịch sử điều hành.
- Giá trị điều hành: Phục vụ truy vết và cải tiến.
- Quan hệ với widget khác: Phụ thuộc Follow-up & Feedback.
- IA Mapping: `Action History`
- EIDAF Mapping: `Action -> Feedback`

## 3. Widget Priority

### Must-have

- Action Executive Summary Widget
- Decision Queue Widget
- Recommended Actions Widget
- Assignment & Ownership Widget
- Execution Tracking Widget
- Follow-up & Feedback Widget

### Should-have

- Action History Widget

### Optional

- Không có ở giai đoạn này

## 4. Widget Dependency

- Action Executive Summary Widget là điểm vào cho các widget còn lại.
- Decision Queue Widget phụ thuộc vào Action Executive Summary Widget.
- Recommended Actions Widget phụ thuộc vào Decision Queue Widget.
- Assignment & Ownership Widget phụ thuộc vào Recommended Actions Widget.
- Execution Tracking Widget phụ thuộc vào Assignment & Ownership Widget.
- Follow-up & Feedback Widget phụ thuộc vào Execution Tracking Widget.
- Action History Widget phụ thuộc vào Follow-up & Feedback Widget.

## 5. Widget Boundary

- Không lặp Evidence Center.
- Không tạo Evidence mới.
- Không biến widget thành khuyến nghị evidence.
- Tập trung chuyển Decision thành Action và Feedback.
- Widget chỉ thể hiện đúng cấp Action.

