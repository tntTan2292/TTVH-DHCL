# BCVH Performance Center Information Architecture

## 1. Vai trò trong QIS V2

BCVH Performance Center là tầng phân tích đầu tiên sau Dashboard trong QIS V2.

Vai trò chính:

- Chuyển tín hiệu điều hành từ Dashboard thành phân tích chuyên sâu ở cấp BCVH.
- Giúp lãnh đạo hiểu tình trạng, ưu tiên và nguyên nhân ở cấp quản trị BCVH.
- Cung cấp nền tảng để drill-down sang Route Performance Center khi cần đi từ insight sang hành động.
- Đảm bảo mọi nội dung phục vụ `Decision Support System`, không chỉ là hiển thị dữ liệu.

## 2. Các câu hỏi quản trị cần trả lời

BCVH Performance Center phải trả lời được các câu hỏi sau:

- BCVH nào đang nổi bật nhất theo trạng thái vận hành?
- BCVH nào đang cần ưu tiên xử lý ngay?
- Vì sao BCVH đó đang có rủi ro hoặc suy giảm?
- Xu hướng hiện tại là đang tốt lên hay xấu đi?
- Mức độ ảnh hưởng có đủ lớn để cần quyết định quản trị không?
- Khi cần đi sâu, nên drill-down sang Route Performance Center ở đâu?

## 3. Information Architecture

### 3.1 Executive Brief

- Mục tiêu: Tóm tắt trạng thái điều hành BCVH trong một lớp thông tin ngắn gọn.
- Giá trị điều hành: Cho lãnh đạo nắm nhanh bức tranh tổng thể trước khi đi vào phân tích.
- Input: Tổng hợp runtime, ranking, trend, cảnh báo, tổng quan ưu tiên.
- Output: Executive summary, tình trạng nổi bật, điểm cần chú ý.
- Quan hệ với khối khác: Là điểm vào cho các khối phân tích sâu hơn.

### 3.2 Health Overview

- Mục tiêu: Cho biết sức khỏe tổng quát của toàn bộ BCVH.
- Giá trị điều hành: Giúp xác định hệ thống đang ổn định hay có dấu hiệu suy giảm.
- Input: Chỉ số tổng hợp trạng thái, phân bổ tốt/xấu, độ lệch so với kỳ vọng.
- Output: Bức tranh sức khỏe cấp quản trị.
- Quan hệ với khối khác: Cung cấp nền cho Priority Analysis và Trend & Pattern.

### 3.3 Priority Analysis

- Mục tiêu: Xác định BCVH nào cần xử lý trước.
- Giá trị điều hành: Hỗ trợ lãnh đạo phân bổ nguồn lực và quyết định ưu tiên.
- Input: Xếp hạng, mức độ lệch, mức ảnh hưởng, mức độ nghiêm trọng.
- Output: Danh sách BCVH ưu tiên theo mức cần can thiệp.
- Quan hệ với khối khác: Dẫn sang Root Cause Analysis và Drill-down.

### 3.4 Root Cause Analysis

- Mục tiêu: Trả lời vì sao BCVH đó đang có vấn đề.
- Giá trị điều hành: Chuyển từ quan sát sang nguyên nhân để ra quyết định đúng.
- Input: Phân tích theo tuyến, cụm lỗi, tín hiệu biến động, pattern bất thường.
- Output: Nhận định nguyên nhân chính và nguyên nhân phụ.
- Quan hệ với khối khác: Cung cấp dữ kiện cho Recommendation và Drill-down.

### 3.5 Trend & Pattern

- Mục tiêu: Cho thấy xu hướng và mẫu hình vận hành theo thời gian.
- Giá trị điều hành: Giúp lãnh đạo nhận ra biến động mang tính hệ thống.
- Input: Dữ liệu theo ngày, tuần, chu kỳ và biến thiên giữa các kỳ.
- Output: Trend, pattern, tín hiệu tăng/giảm, điểm bất thường.
- Quan hệ với khối khác: Bổ trợ cho Health Overview và Root Cause Analysis.

### 3.6 Recommendation

- Mục tiêu: Gợi ý hành động điều hành tiếp theo.
- Giá trị điều hành: Rút ngắn khoảng cách từ insight sang decision.
- Input: Priority Analysis, Root Cause Analysis, Trend & Pattern, evidence liên quan.
- Output: Khuyến nghị quản trị, hướng xử lý, mức độ ưu tiên.
- Quan hệ với khối khác: Là đầu ra gần với Decision và Action trong EIDAF.

### 3.7 Drill-down

- Mục tiêu: Cho phép đi sâu từ BCVH xuống Route Performance Center khi cần.
- Giá trị điều hành: Mở đường cho phân tích chi tiết nhưng vẫn giữ đúng cấp độ thông tin.
- Input: BCVH đã được chọn từ các khối trên.
- Output: Ngữ cảnh drill-down sang Route Performance Center.
- Quan hệ với khối khác: Là điểm nối giữa BCVH và các tầng chi tiết hơn.

## 4. Data Flow

Luồng dữ liệu trong BCVH Performance Center đi theo hướng:

`Executive Brief -> Health Overview -> Priority Analysis -> Root Cause Analysis -> Trend & Pattern -> Recommendation -> Drill-down`

Quy tắc dữ liệu:

- Executive Brief nhận dữ liệu đã tổng hợp.
- Health Overview và Trend & Pattern khai thác cùng một lớp dữ liệu nền nhưng khác góc nhìn.
- Priority Analysis lấy đầu ra từ tổng quan để chọn đối tượng cần quan tâm.
- Root Cause Analysis chỉ xử lý những BCVH đã được ưu tiên.
- Recommendation chỉ sinh ra sau khi đã có priority và root cause đủ rõ.
- Drill-down chỉ kích hoạt khi lãnh đạo cần đi sâu hơn.

## 5. Decision Flow

Luồng ra quyết định của lãnh đạo:

1. Đọc Executive Brief để nắm bức tranh nhanh.
2. Xem Health Overview để hiểu mức độ ổn định.
3. Xem Priority Analysis để chọn vấn đề cần xử lý trước.
4. Đọc Root Cause Analysis để hiểu nguyên nhân.
5. Đối chiếu Trend & Pattern để xác nhận tính lặp lại hoặc bất thường.
6. Dùng Recommendation để chốt hướng hành động.
7. Nếu cần, drill-down sang Route Performance Center để xác minh chi tiết.

## 6. Drill-down Flow

`Dashboard`

↓

`BCVH Performance Center`

↓

`Route Performance Center`

Ý nghĩa:

- Dashboard là điểm vào cấp điều hành tổng quan.
- BCVH Performance Center là lớp phân tích BCVH.
- Route Performance Center là lớp chi tiết hơn để tìm nguyên nhân cấp tuyến.

## 7. EIDAF Mapping

### Executive Brief

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Đây là lớp tóm tắt điều hành, tạo nhận thức nhanh trước khi đi sâu.

### Health Overview

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Khối này phản ánh trạng thái hiện tại để định hướng quyết định.

### Priority Analysis

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Ưu tiên là bước chuyển từ dữ liệu sang quyết định điều hành.

### Root Cause Analysis

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

Lý do: Root Cause là nền cho quyết định và hành động đúng.

### Trend & Pattern

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Xu hướng giúp xác nhận tính lặp lại và hỗ trợ quyết định.

### Recommendation

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

Lý do: Đây là khối gần nhất với hành động quản trị.

### Drill-down

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

Lý do: Drill-down mở đường sang lớp phân tích sâu hơn để hỗ trợ hành động.

## 8. Nguyên tắc thiết kế

- Không lặp Dashboard.
- Không hiển thị KPI đơn thuần.
- Mọi thông tin phải phục vụ Decision Support.
- Không đưa nội dung thuộc Route hoặc Shipment vào BCVH Performance Center.
- Kiến trúc phải ưu tiên luồng quyết định, không chỉ luồng trình bày.

