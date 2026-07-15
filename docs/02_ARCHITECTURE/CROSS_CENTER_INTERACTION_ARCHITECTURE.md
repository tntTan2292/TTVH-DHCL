# Cross-Center Interaction Architecture

## 1. Vai trò của tài liệu

Tài liệu này mô tả cách các Center tương tác với nhau trong QIS V2.

Mục tiêu:

- Chuẩn hóa luồng điều hành xuyên suốt hệ thống.
- Đảm bảo context được giữ lại khi drill-down hoặc quay ngược.
- Xác định ranh giới thông tin giữa các Center.
- Khép kín vòng điều hành từ phát hiện vấn đề đến hoàn thành hành động.

## 2. Luồng điều hành tổng thể

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

- Dashboard phát hiện tín hiệu tổng quan.
- BCVH Performance Center xác định BCVH cần quan tâm.
- Route Performance Center xác định tuyến gây ảnh hưởng.
- Shipment Performance Center xác định bưu gửi đại diện cho vấn đề.
- Evidence Center xác minh bằng chứng.
- Action Center chuyển decision thành hành động.

## 3. Drill-down Rules

### Dashboard -> BCVH Performance Center

- Khi nào được drill-down: Khi cần xem BCVH đang nổi bật hoặc cần xử lý.
- Điều kiện: Có tín hiệu điều hành hoặc ưu tiên cần phân tích.
- Dữ liệu truyền sang Center tiếp theo: Date Filter, KPI context, tổng quan trạng thái.
- Context phải giữ lại: Ngày dữ liệu, phạm vi điều hành, ưu tiên đang xem.

### BCVH Performance Center -> Route Performance Center

- Khi nào được drill-down: Khi cần xác định tuyến gây ảnh hưởng đến BCVH.
- Điều kiện: BCVH đã được chọn và cần phân tích sâu hơn.
- Dữ liệu truyền sang Center tiếp theo: Date Filter, BCVH, KPI, priority, RCA context sơ bộ.
- Context phải giữ lại: BCVH đang xem, ngữ cảnh thời gian, trạng thái ưu tiên.

### Route Performance Center -> Shipment Performance Center

- Khi nào được drill-down: Khi cần xác định bưu gửi đại diện cho vấn đề ở cấp tuyến.
- Điều kiện: Tuyến đã được chọn và cần đi sâu hơn.
- Dữ liệu truyền sang Center tiếp theo: Date Filter, BCVH, Route, KPI, route-level RCA context.
- Context phải giữ lại: BCVH, route, ngày, rule context liên quan.

### Shipment Performance Center -> Evidence Center

- Khi nào được drill-down: Khi cần xác minh bằng chứng chính thức.
- Điều kiện: Shipment đã được ưu tiên và cần kiểm chứng.
- Dữ liệu truyền sang Center tiếp theo: Date Filter, BCVH, Route, Shipment, rule context, RCA context.
- Context phải giữ lại: Tất cả ngữ cảnh đã tích lũy ở các lớp trước.

### Evidence Center -> Action Center

- Khi nào được drill-down: Khi evidence đã đủ để ra decision và chuyển sang thực thi.
- Điều kiện: Evidence đã được xác minh.
- Dữ liệu truyền sang Center tiếp theo: Date Filter, BCVH, Route, Shipment, rule, RCA context, evidence summary.
- Context phải giữ lại: Evidence đã xác minh, decision context, phạm vi điều hành.

## 4. Context Propagation

Context được kế thừa xuyên suốt các Center gồm:

- Date Filter
- KPI
- BCVH
- Route
- Shipment
- Rule
- RCA Context
- Evidence Context
- Decision Context

Nguyên tắc kế thừa:

- Context mới chỉ được bổ sung, không được làm mất context trước đó.
- Context đi từ tổng quan xuống chi tiết.
- Context phải đủ để quay ngược lên Center trước mà không mất ngữ cảnh.

## 5. Back Navigation Rules

- Từ Center sau quay lại Center trước phải giữ nguyên Date Filter.
- BCVH đã chọn phải còn tồn tại khi quay từ Route hoặc Shipment về BCVH.
- Route đã chọn phải còn tồn tại khi quay từ Shipment về Route.
- Shipment đã chọn phải còn tồn tại khi quay từ Evidence về Shipment.
- Evidence đã xác minh phải còn tồn tại khi quay từ Action về Evidence.
- Không reset context trừ khi người dùng chủ động thay đổi phạm vi điều hành.

## 6. Information Boundary

### Dashboard

- Chịu trách nhiệm thông tin tổng quan điều hành.
- Không đi sâu vào route, shipment hoặc evidence chi tiết.

### BCVH Performance Center

- Chịu trách nhiệm thông tin cấp BCVH.
- Không lặp route, shipment hoặc evidence.

### Route Performance Center

- Chịu trách nhiệm thông tin cấp tuyến.
- Không lặp BCVH tổng quan hoặc shipment chi tiết.

### Shipment Performance Center

- Chịu trách nhiệm thông tin cấp bưu gửi.
- Không thay thế evidence xác minh chính thức.

### Evidence Center

- Chịu trách nhiệm xác minh bằng chứng.
- Không tạo recommendation hoặc action thay cho Action Center.

### Action Center

- Chịu trách nhiệm thực thi, owner, tiến độ và feedback.
- Không tạo evidence mới.

Nguyên tắc không lặp:

- Mỗi Center chỉ giữ thông tin đúng cấp độ của mình.
- Khi chuyển center, context được kế thừa nhưng nội dung không bị sao chép trùng lặp.

## 7. EIDAF Flow

Chuỗi EIDAF xuyên suốt hệ thống:

`Evidence -> Insight -> Decision -> Action -> Feedback`

Ánh xạ theo luồng:

- Dashboard và BCVH/Route/Shipment cung cấp evidence nền và insight phân tích.
- Evidence Center xác minh evidence và hợp thức hóa dữ kiện.
- Action Center biến decision thành action.
- Follow-up và history tạo feedback để cải tiến vòng điều hành.

## 8. Decision Journey

Hành trình của lãnh đạo:

1. Nhìn Dashboard để phát hiện vấn đề.
2. Đi vào BCVH Performance Center để xác định BCVH cần quan tâm.
3. Đi tiếp sang Route Performance Center để tìm tuyến gây ảnh hưởng.
4. Đi xuống Shipment Performance Center để xác định bưu gửi đại diện.
5. Sang Evidence Center để xác minh bằng chứng.
6. Sang Action Center để giao việc, theo dõi và đóng vòng.
7. Quay ngược lại nếu cần, giữ nguyên context để kiểm tra tính nhất quán.

