# Route Performance Center Information Architecture

## 1. Vai trò trong QIS V2

Route Performance Center là tầng phân tích sau BCVH Performance Center.

Vai trò chính:

- Chuyển từ phân tích theo BCVH sang phân tích theo tuyến.
- Xác định tuyến nào đang gây ảnh hưởng đến KPI, xu hướng và mức ưu tiên điều hành.
- Cung cấp ngữ cảnh để lãnh đạo quyết định có cần đi sâu sang Shipment Performance Center hay không.
- Không trùng với BCVH Performance Center và không đi xuống mức bưu gửi.

## 2. Các câu hỏi quản trị cần trả lời

Route Performance Center phải trả lời được các câu hỏi sau:

- Tuyến nào đang làm KPI BCVH bị ảnh hưởng nhiều nhất?
- Tuyến nào có xu hướng xấu đi và cần ưu tiên xử lý?
- Ảnh hưởng của tuyến đến BCVH là nhất thời hay có pattern lặp lại?
- Nguyên nhân nào ở cấp tuyến đang tạo ra biến động?
- Tuyến nào cần chuyển sang Shipment Performance Center để xác minh sâu hơn?

## 3. Information Architecture

### 3.1 Route Executive Brief

- Mục tiêu: Tóm tắt tình trạng điều hành của các tuyến có ảnh hưởng đến BCVH.
- Giá trị điều hành: Cho lãnh đạo biết tuyến nào đang đáng chú ý trước khi đi sâu.
- Input: Tổng hợp từ BCVH context, route ranking, trend và signals điều hành.
- Output: Tóm tắt tuyến nổi bật, tuyến ưu tiên, tuyến cần theo dõi.
- Quan hệ với khối khác: Là điểm vào cho toàn bộ phân tích tuyến.

### 3.2 Route Impact Overview

- Mục tiêu: Hiển thị mức độ ảnh hưởng của tuyến tới KPI BCVH.
- Giá trị điều hành: Cho thấy tuyến nào tạo tác động lớn nhất lên kết quả tổng thể.
- Input: Dữ liệu route-level, mức lệch KPI, mức đóng góp vào total impact.
- Output: Bức tranh ảnh hưởng của các tuyến.
- Quan hệ với khối khác: Là nền cho Priority Analysis và Root Cause Analysis.

### 3.3 Route Priority Analysis

- Mục tiêu: Xác định tuyến nào cần xử lý trước.
- Giá trị điều hành: Hỗ trợ phân bổ nguồn lực điều hành theo tuyến.
- Input: Impact score, severity, frequency, trend, contribution.
- Output: Danh sách tuyến ưu tiên theo mức độ cần can thiệp.
- Quan hệ với khối khác: Dẫn sang Root Cause Analysis và Drill-down.

### 3.4 Route Root Cause Analysis

- Mục tiêu: Giải thích vì sao tuyến đó ảnh hưởng đến KPI.
- Giá trị điều hành: Chỉ ra nguyên nhân ở cấp tuyến thay vì mô tả KPI đơn thuần.
- Input: Route pattern, route exceptions, biến động theo thời gian, dấu hiệu bất thường.
- Output: Nguyên nhân chính ở cấp tuyến và tín hiệu liên quan.
- Quan hệ với khối khác: Là đầu vào trực tiếp cho Recommendation.

### 3.5 Route Trend & Pattern

- Mục tiêu: Theo dõi xu hướng và pattern của tuyến theo thời gian.
- Giá trị điều hành: Phát hiện tuyến nào có biến động lặp lại hoặc suy giảm.
- Input: Dữ liệu route theo ngày, tuần, chu kỳ và biến thiên.
- Output: Trend, pattern, điểm bất thường, tín hiệu lặp lại.
- Quan hệ với khối khác: Bổ trợ cho Impact Overview và Root Cause Analysis.

### 3.6 Route Recommendation

- Mục tiêu: Gợi ý hành động điều hành cho tuyến.
- Giá trị điều hành: Rút ngắn từ phân tích tuyến sang quyết định xử lý.
- Input: Priority, root cause, trend, impact.
- Output: Khuyến nghị xử lý tuyến, mức độ ưu tiên, hướng điều hành tiếp theo.
- Quan hệ với khối khác: Là đầu ra gần với Decision và Action.

### 3.7 Shipment Drill-down Trigger

- Mục tiêu: Xác định khi nào cần đi sâu xuống Shipment Performance Center.
- Giá trị điều hành: Giữ đúng cấp độ phân tích, chỉ đi sâu khi có nhu cầu xác minh.
- Input: Tuyến đã được ưu tiên, độ bất thường, nhu cầu kiểm tra chi tiết.
- Output: Ngữ cảnh chuyển sang Shipment Performance Center.
- Quan hệ với khối khác: Là cầu nối sang tầng Shipment, không phải điểm kết thúc phân tích.

## 4. Data Flow

Luồng dữ liệu trong Route Performance Center đi theo hướng:

`Route Executive Brief -> Route Impact Overview -> Route Priority Analysis -> Route Root Cause Analysis -> Route Trend & Pattern -> Route Recommendation -> Shipment Drill-down Trigger`

Quy tắc dữ liệu:

- Route Executive Brief nhận dữ liệu đã được tổng hợp từ cấp BCVH.
- Route Impact Overview và Route Trend & Pattern dùng cùng nền dữ liệu tuyến nhưng khác mục tiêu phân tích.
- Route Priority Analysis chỉ chọn các tuyến có ảnh hưởng đủ lớn.
- Route Root Cause Analysis chỉ làm việc trên các tuyến đã được ưu tiên.
- Route Recommendation sinh ra sau khi có impact và nguyên nhân đủ rõ.
- Shipment Drill-down Trigger chỉ xuất hiện khi cần xác minh sâu hơn ở cấp bưu gửi.

## 5. Decision Flow

Luồng ra quyết định của lãnh đạo:

1. Đọc Route Executive Brief để biết tuyến nào đang nổi bật.
2. Xem Route Impact Overview để hiểu mức tác động lên KPI.
3. Xem Route Priority Analysis để chọn tuyến cần xử lý trước.
4. Đọc Route Root Cause Analysis để hiểu nguyên nhân ở cấp tuyến.
5. Đối chiếu Route Trend & Pattern để xác nhận biến động có lặp lại hay không.
6. Dùng Route Recommendation để quyết định hành động điều hành.
7. Nếu cần xác minh sâu hơn, chuyển sang Shipment Performance Center.

## 6. Drill-down Flow

`Dashboard`

↓

`BCVH Performance Center`

↓

`Route Performance Center`

↓

`Shipment Performance Center`

Ý nghĩa:

- Dashboard là điểm vào cấp tổng quan.
- BCVH Performance Center xác định BCVH cần quan tâm.
- Route Performance Center xác định tuyến gây ảnh hưởng.
- Shipment Performance Center chỉ dùng khi cần xác minh sâu hơn, không phải mặc định.

## 7. EIDAF Mapping

### Route Executive Brief

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Tóm tắt điều hành ở cấp tuyến trước khi phân tích sâu.

### Route Impact Overview

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Khối này cho biết tuyến nào đang gây tác động lớn.

### Route Priority Analysis

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Ưu tiên tuyến là bước chuyển sang quyết định điều hành.

### Route Root Cause Analysis

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Root cause tuyến là nền cho quyết định chính xác.

### Route Trend & Pattern

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Xu hướng tuyến giúp nhận diện pattern và rủi ro kéo dài.

### Route Recommendation

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

Lý do: Đây là lớp gần nhất với hành động điều hành.

### Shipment Drill-down Trigger

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

Lý do: Khối này chỉ mở đường sang Shipment khi cần xác minh sâu.

## 8. Nguyên tắc thiết kế

- Không lặp BCVH Performance Center.
- Không hiển thị KPI đơn thuần.
- Tập trung xác định tuyến gây ảnh hưởng đến KPI và hỗ trợ quyết định điều hành.
- Không đi xuống mức bưu gửi, chỉ điều hướng sang Shipment Performance Center khi cần.
- Kiến trúc phải phục vụ decision support, không chỉ phục vụ trình bày dữ liệu.

