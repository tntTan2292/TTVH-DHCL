# Shipment Performance Center Information Architecture

## 1. Vai trò trong QIS V2

Shipment Performance Center là tầng phân tích chi tiết sau Route Performance Center.

Vai trò chính:

- Chuyển từ phân tích tuyến sang phân tích bưu gửi cụ thể.
- Xác định bưu gửi nào đang gây ảnh hưởng hoặc đại diện cho vấn đề.
- Chuẩn bị bằng chứng và ngữ cảnh để chuyển sang Evidence Center.
- Không lặp Route Performance Center và không thay thế Evidence Center.

## 2. Các câu hỏi quản trị cần trả lời

Shipment Performance Center phải trả lời được các câu hỏi sau:

- Bưu gửi nào đang đại diện rõ nhất cho vấn đề ở cấp tuyến?
- Bưu gửi nào gây ảnh hưởng lớn nhất hoặc bất thường nhất?
- Vấn đề này xuất hiện ở thời điểm nào và diễn tiến ra sao?
- Có dấu hiệu lặp lại hay chỉ là trường hợp đơn lẻ?
- Bưu gửi nào cần đưa sang Evidence Center để xác minh chính thức?

## 3. Information Architecture

### 3.1 Shipment Executive Brief

- Mục tiêu: Tóm tắt tình trạng nổi bật ở cấp bưu gửi.
- Giá trị điều hành: Giúp lãnh đạo nắm nhanh bưu gửi nào cần chú ý nhất.
- Input: Ngữ cảnh từ Route Performance Center, danh sách shipment nổi bật, tín hiệu bất thường.
- Output: Tóm tắt shipment cần quan tâm, trạng thái điều hành ngắn gọn.
- Quan hệ với khối khác: Là điểm vào cho các khối phân tích shipment chi tiết.

### 3.2 Shipment Impact Overview

- Mục tiêu: Xác định bưu gửi nào đang tạo ảnh hưởng đáng kể.
- Giá trị điều hành: Hỗ trợ nhận diện shipment đại diện cho vấn đề thực tế.
- Input: Mức ảnh hưởng, độ lệch, tần suất, mức ưu tiên từ route context.
- Output: Bưu gửi/nhóm bưu gửi gây ảnh hưởng lớn nhất.
- Quan hệ với khối khác: Là nền cho Timeline và Root Cause Analysis.

### 3.3 Shipment Timeline

- Mục tiêu: Cho thấy diễn tiến của shipment theo thời gian.
- Giá trị điều hành: Giúp xác định thời điểm phát sinh và mức độ kéo dài của vấn đề.
- Input: Trạng thái theo mốc thời gian, sự kiện, biến động theo ngày/giờ.
- Output: Chuỗi diễn tiến của bưu gửi.
- Quan hệ với khối khác: Bổ trợ cho Root Cause Analysis và Evidence Drill-down.

### 3.4 Shipment Root Cause Analysis

- Mục tiêu: Giải thích tại sao shipment đó trở thành trường hợp cần chú ý.
- Giá trị điều hành: Chuyển từ quan sát shipment sang nguyên nhân điều hành.
- Input: Timeline, bất thường, ngữ cảnh tuyến, dấu hiệu vi phạm hoặc lệch chuẩn.
- Output: Nguyên nhân khả dĩ và tín hiệu liên quan.
- Quan hệ với khối khác: Là đầu vào cho Recommendation và Evidence Summary.

### 3.5 Evidence Summary

- Mục tiêu: Tóm tắt bằng chứng ở mức cần thiết trước khi sang Evidence Center.
- Giá trị điều hành: Cho lãnh đạo nhìn thấy bằng chứng đủ để quyết định có xác minh sâu hơn hay không.
- Input: Kết quả phân tích shipment, timeline, nguyên nhân nghi ngờ, dấu hiệu liên quan.
- Output: Danh sách evidence summary, chỉ dấu quan trọng, ngữ cảnh xác minh.
- Quan hệ với khối khác: Là cầu nối trực tiếp sang Evidence Drill-down.

### 3.6 Recommendation

- Mục tiêu: Gợi ý hành động tiếp theo cho shipment đang có vấn đề.
- Giá trị điều hành: Giúp quyết định có chuyển sang Evidence Center hay chưa.
- Input: Impact, timeline, root cause, evidence summary.
- Output: Khuyến nghị tiếp tục xác minh, theo dõi hoặc chuyển cấp.
- Quan hệ với khối khác: Là đầu ra gần với Decision và Action.

### 3.7 Evidence Drill-down

- Mục tiêu: Chuyển ngữ cảnh sang Evidence Center khi cần xác minh chính thức.
- Giá trị điều hành: Bảo đảm hành động tiếp theo dựa trên evidence thay vì cảm tính.
- Input: Shipment đã được ưu tiên và ngữ cảnh điều tra đủ rõ.
- Output: Gói ngữ cảnh sang Evidence Center.
- Quan hệ với khối khác: Là cầu nối cuối cùng của Shipment Performance Center.

## 4. Data Flow

Luồng dữ liệu trong Shipment Performance Center đi theo hướng:

`Shipment Executive Brief -> Shipment Impact Overview -> Shipment Timeline -> Shipment Root Cause Analysis -> Evidence Summary -> Recommendation -> Evidence Drill-down`

Quy tắc dữ liệu:

- Shipment Executive Brief nhận ngữ cảnh đã được chọn lọc từ Route Performance Center.
- Shipment Impact Overview và Shipment Timeline dùng cùng lớp dữ liệu shipment nhưng khác mục tiêu.
- Shipment Root Cause Analysis chỉ làm việc trên shipment đã được ưu tiên.
- Evidence Summary chỉ tổng hợp những gì cần thiết trước khi sang Evidence Center.
- Recommendation sinh sau khi đã có impact, timeline và root cause đủ rõ.
- Evidence Drill-down chỉ được dùng khi cần xác minh chính thức ở Evidence Center.

## 5. Decision Flow

Luồng ra quyết định của lãnh đạo:

1. Đọc Shipment Executive Brief để biết shipment nào nổi bật.
2. Xem Shipment Impact Overview để hiểu mức ảnh hưởng.
3. Đọc Shipment Timeline để thấy diễn tiến vấn đề.
4. Xem Shipment Root Cause Analysis để hiểu nguyên nhân.
5. Đối chiếu Evidence Summary để quyết định có cần xác minh chính thức không.
6. Dùng Recommendation để chốt hướng hành động.
7. Nếu cần, chuyển sang Evidence Center.

## 6. Drill-down Flow

`Dashboard`

↓

`BCVH Performance Center`

↓

`Route Performance Center`

↓

`Shipment Performance Center`

↓

`Evidence Center`

Ý nghĩa:

- Dashboard là điểm vào cấp tổng quan.
- BCVH Performance Center xác định BCVH cần xử lý.
- Route Performance Center xác định tuyến ảnh hưởng.
- Shipment Performance Center xác định bưu gửi đại diện cho vấn đề.
- Evidence Center là nơi xác minh chính thức bằng evidence.

## 7. EIDAF Mapping

### Shipment Executive Brief

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Tóm tắt shipment nổi bật để dẫn vào phân tích sâu.

### Shipment Impact Overview

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Xác định shipment nào đại diện cho ảnh hưởng lớn.

### Shipment Timeline

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Timeline cung cấp ngữ cảnh để nhận diện vấn đề theo thời gian.

### Shipment Root Cause Analysis

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Root cause ở cấp shipment là cơ sở cho quyết định và xử lý.

### Evidence Summary

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Đây là lớp chuẩn bị trước khi sang Evidence Center.

### Recommendation

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

Lý do: Khối này hỗ trợ chốt hành động điều hành.

### Evidence Drill-down

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

Lý do: Đây là điểm nối sang Evidence Center để xác minh chính thức.

## 8. Nguyên tắc thiết kế

- Không lặp Route Performance Center.
- Không hiển thị KPI đơn thuần.
- Tập trung xác định bưu gửi gây ảnh hưởng hoặc đại diện cho vấn đề.
- Hỗ trợ xác minh nguyên nhân trước khi chuyển sang Evidence Center.
- Không thực hiện chức năng của Evidence Center.
- Kiến trúc phải phục vụ decision support, không chỉ phục vụ trình bày dữ liệu.

