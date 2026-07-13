# Action Center Information Architecture

## 1. Vai trò trong QIS V2

Action Center là tầng thực thi sau khi evidence đã được xác minh và decision đã được chốt.

Vai trò chính:

- Chuyển quyết định thành hành động cụ thể.
- Quản lý việc giao việc, người phụ trách, tiến độ và kết quả.
- Theo dõi trạng thái thực thi để khép kín vòng điều hành.
- Không tạo evidence mới và không thay thế Evidence Center.

## 2. Các câu hỏi quản trị cần trả lời

Action Center phải trả lời được các câu hỏi sau:

- Quyết định nào cần chuyển thành hành động ngay?
- Ai là người phụ trách từng hành động?
- Hành động đang ở trạng thái nào?
- Có hành động nào bị trễ hoặc chưa hoàn tất không?
- Kết quả thực thi có phản hồi ngược lại quy trình điều hành không?
- Những hành động nào cần theo dõi tiếp?

## 3. Information Architecture

### 3.1 Action Executive Summary

- Mục tiêu: Tóm tắt toàn bộ tình trạng hành động đang mở.
- Giá trị điều hành: Cho lãnh đạo nhìn nhanh bức tranh thực thi.
- Input: Decision đã chốt từ Evidence Center, danh sách action đang mở, tiến độ.
- Output: Tóm tắt trạng thái hành động, action nổi bật, action cần chú ý.
- Quan hệ với khối khác: Là điểm vào cho các khối quản lý hành động sâu hơn.

### 3.2 Decision Queue

- Mục tiêu: Xếp hàng các quyết định cần chuyển thành hành động.
- Giá trị điều hành: Đảm bảo quyết định được xử lý theo thứ tự ưu tiên.
- Input: Decision đã xác minh, mức ưu tiên, mức độ khẩn.
- Output: Danh sách decision đang chờ thực thi.
- Quan hệ với khối khác: Là nguồn đầu vào cho Recommended Actions và Assignment & Ownership.

### 3.3 Recommended Actions

- Mục tiêu: Chuyển decision thành các hành động đề xuất cụ thể.
- Giá trị điều hành: Giúp lãnh đạo biết cần làm gì tiếp theo.
- Input: Decision queue, evidence đã xác minh, trạng thái hiện tại.
- Output: Danh sách hành động đề xuất.
- Quan hệ với khối khác: Là đầu vào cho Assignment & Ownership.

### 3.4 Assignment & Ownership

- Mục tiêu: Gán người phụ trách cho từng hành động.
- Giá trị điều hành: Xác định rõ trách nhiệm và đầu mối thực thi.
- Input: Recommended actions, cơ cấu tổ chức, phạm vi trách nhiệm.
- Output: Action owner, người phối hợp, hạn xử lý.
- Quan hệ với khối khác: Là cầu nối sang Execution Tracking.

### 3.5 Execution Tracking

- Mục tiêu: Theo dõi tiến độ thực thi từng hành động.
- Giá trị điều hành: Cho biết hành động nào đang làm, hoàn thành hay trễ.
- Input: Assignment, cập nhật tiến độ, trạng thái thực hiện.
- Output: Trạng thái thực thi, mốc tiến độ, cảnh báo trễ.
- Quan hệ với khối khác: Cung cấp dữ liệu cho Follow-up & Feedback.

### 3.6 Follow-up & Feedback

- Mục tiêu: Ghi nhận phản hồi sau hành động và khép kín vòng điều hành.
- Giá trị điều hành: Cho biết hành động có hiệu quả không và cần điều chỉnh gì.
- Input: Kết quả thực thi, phản hồi từ thực tế, trạng thái follow-up.
- Output: Feedback, kết luận sau hành động, tín hiệu điều chỉnh.
- Quan hệ với khối khác: Là đầu vào cho Action History và vòng phản hồi về hệ thống.

### 3.7 Action History

- Mục tiêu: Lưu lịch sử hành động và kết quả điều hành.
- Giá trị điều hành: Cung cấp vết lịch sử để truy vết và học từ vận hành.
- Input: Toàn bộ action, tiến độ, phản hồi, kết quả cuối.
- Output: Lịch sử hành động theo chuỗi thời gian.
- Quan hệ với khối khác: Hỗ trợ review lại và cải tiến vòng điều hành.

## 4. Data Flow

Luồng dữ liệu trong Action Center đi theo hướng:

`Action Executive Summary -> Decision Queue -> Recommended Actions -> Assignment & Ownership -> Execution Tracking -> Follow-up & Feedback -> Action History`

Quy tắc dữ liệu:

- Action Executive Summary nhận đầu vào đã được xác minh từ Evidence Center.
- Decision Queue chỉ chứa decision đã chốt, không chứa evidence thô.
- Recommended Actions được tạo từ decision đã xác nhận.
- Assignment & Ownership ràng buộc hành động với người phụ trách.
- Execution Tracking theo dõi trạng thái thực thi theo thời gian.
- Follow-up & Feedback ghi nhận kết quả thực tế để đóng vòng điều hành.

## 5. Decision Flow

Luồng ra quyết định của lãnh đạo:

1. Đọc Action Executive Summary để biết tình trạng chung.
2. Xem Decision Queue để chọn việc cần xử lý trước.
3. Đọc Recommended Actions để biết nên làm gì.
4. Kiểm tra Assignment & Ownership để xác định ai chịu trách nhiệm.
5. Theo dõi Execution Tracking để biết tiến độ.
6. Đọc Follow-up & Feedback để đánh giá kết quả.
7. Dùng Action History để xem lại và rút kinh nghiệm.

## 6. Luồng điều hành hoàn chỉnh

`Dashboard`

↓

`BCVH Performance Center`

↓

`Route Performance Center`

↓

`Shipment Performance Center`

↓

`Evidence Center`

↓

`Action Center`

Ý nghĩa:

- Dashboard là điểm vào tổng quan.
- BCVH, Route và Shipment xác định vấn đề.
- Evidence Center xác minh bằng chứng.
- Action Center chuyển decision thành hành động và theo dõi kết quả.

## 7. EIDAF Mapping

### Action Executive Summary

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Đây là lớp tóm tắt hành động từ decision đã chốt.

### Decision Queue

- Evidence: Không trực tiếp
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Queue chỉ nhận decision đã xác minh, không tạo evidence mới.

### Recommended Actions

- Evidence: Không trực tiếp
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

Lý do: Khối này chuyển decision thành hành động cụ thể.

### Assignment & Ownership

- Evidence: Không trực tiếp
- Insight: Một phần
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

Lý do: Gán trách nhiệm là bước thực thi, không phải xác minh.

### Execution Tracking

- Evidence: Không trực tiếp
- Insight: Một phần
- Decision: Một phần
- Action: Có
- Feedback: Có

Lý do: Theo dõi tiến độ và phản hồi kết quả là phần thực thi.

### Follow-up & Feedback

- Evidence: Không trực tiếp
- Insight: Có
- Decision: Một phần
- Action: Có
- Feedback: Có

Lý do: Feedback khép kín vòng điều hành và phản hồi ngược.

### Action History

- Evidence: Không trực tiếp
- Insight: Một phần
- Decision: Không trực tiếp
- Action: Có
- Feedback: Có

Lý do: Lưu lịch sử để phục vụ đánh giá và cải tiến.

## 8. Nguyên tắc thiết kế

- Không lặp Evidence Center.
- Không hiển thị KPI đơn thuần.
- Tập trung quản lý hành động, người phụ trách, tiến độ và kết quả.
- Khép kín vòng `Evidence -> Insight -> Decision -> Action -> Feedback`.
- Không tạo evidence mới.

