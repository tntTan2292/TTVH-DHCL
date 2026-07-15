# Phase 1.6A: Quality Timeline Specification (SSOT)

> **TRẠNG THÁI: FROZEN (PHASE 1.6A)**
> *(Tham chiếu bắt buộc: Phải tuân thủ tuyệt đối nguyên tắc tại `docs/08_ARCHIVE/Legacy/01_RULES/ARCH-001.md` - Presentation Layer Principle).*
> Tài liệu định nghĩa (Specification) cho module Quality Timeline thuộc F1.3 Operation Center. Góc nhìn điều hành, tập trung vào việc tìm ra quy luật (Pattern) và chu kỳ rủi ro để hành động. 

## 1. Mục tiêu
Cung cấp góc nhìn lịch sử và chu kỳ biến động chất lượng của hệ thống. Thay vì chỉ nhìn vào một con số "Hôm nay", điều hành viên cần nhận diện được các chu kỳ (Ví dụ: Cứ thứ 7 là rớt KPI, cứ cuối tháng là quá tải) để có phương án điều phối nhân lực và xe tuyến chủ động từ trước.

## 2. Thiết kế Thành phần (Component Design)

Thiết kế tập trung vào tính Actionable (Hành động điều hành), loại bỏ các biểu đồ rườm rà mang tính chất báo cáo tĩnh (BI).

### 2.1 Daily Timeline (Xu hướng ngày)
- **Hình thức:** Line chart (Biểu đồ đường) mượt mà (Smooth Curve).
- **Dữ liệu:** Hiển thị diễn biến KPI của 30 ngày gần nhất (hoặc theo kỳ lọc).
- **Điểm nhấn Điều hành:** Trục tung (Y-axis) có đường kẻ đứt ngang cố định (Threshold Line) ở mức 95% và 90%. Nếu đường Line Chart cắt xuống dưới 95%, vùng dưới đường đó được highlight màu Cam, dưới 90% highlight màu Đỏ.

### 2.2 Weekly Pattern (Quy luật Tuần)
- **Hình thức:** Bar chart (Biểu đồ cột) trung bình KPI theo các ngày trong tuần (T2, T3... CN).
- **Dữ liệu:** Trung bình cộng KPI của toàn bộ các ngày Thứ 2, Thứ 3... trong 3 tháng qua.
- **Điểm nhấn Điều hành:** Giúp nhận diện ngày nào trong tuần thường xuyên quá tải nhất (Ví dụ: Chủ nhật thiếu xe, Thứ 2 dồn hàng). Các cột có KPI trung bình < 95% sẽ cảnh báo đỏ.

### 2.3 Monthly Pattern (Quy luật Tháng)
- **Hình thức:** Area chart mini (hoặc Scatter) trung bình các ngày trong tháng (từ mùng 1 đến mùng 30).
- **Điểm nhấn Điều hành:** Phát hiện áp lực đầu tháng / cuối tháng (Ví dụ: Doanh nghiệp gửi thư từ, hợp đồng vào cuối tháng làm bùng nổ sản lượng). 

### 2.4 Quality Calendar (Heatmap Lịch Chất Lượng)
- **Hình thức:** Dạng lịch 30 ngày (Heatmap giống GitHub Contributions).
- **Quy tắc màu:** 
  - Ô vuông Xanh: KPI >= 95%
  - Ô vuông Cam: 90% - 94.9%
  - Ô vuông Đỏ: < 90%
- **Điểm nhấn Điều hành:** Nhìn vào tấm lịch là thấy ngay "Lỗ hổng" chất lượng tập trung ở chuỗi ngày nào. Có thể kết hợp với các sự kiện mưa bão, nghỉ lễ (Backend gửi kèm event).

### 2.5 Quality Pulse (Nhịp đập Chất lượng)
- **Hình thức:** Chỉ số biến thiên ngắn hạn dạng text sinh động hoặc Sparkline.
- **Dữ liệu:** So sánh động lượng (Momentum) của 3 ngày gần nhất vs 3 ngày trước đó.
- **Điểm nhấn Điều hành:** Phát tín hiệu sớm "Hệ thống đang phục hồi" hoặc "Hệ thống đang rơi tự do" bằng Text Recommendation để đưa ra quyết định "Bơm thêm xe ngay lập tức" hay "Duy trì".

## 3. Data Mapping & Trách nhiệm (ARCH-001)

Tuyệt đối tuân thủ **ARCH-001**:
- **Backend (Rule & Operation Engine):** Tính toán sẵn trung bình Weekly, Monthly, nội suy Heatmap, gán màu sắc (Xanh/Cam/Đỏ) cho từng ngày/cột. Đánh giá Pulse (Momentum).
- **Frontend (Presentation Layer):** Nhận JSON (chứa tọa độ x, y, color, tooltip text) và "Vẽ" biểu đồ ra UI bằng thư viện (ví dụ: Recharts, Chart.js). Không tự tính trung bình các ngày Thứ 2.

## 4. Gap Analysis

**API hiện tại (`/api/f13/dashboard/trend`):**
- **Có sẵn:** Chỉ trả về mảng `[ { date, kpi_rate }, ... ]` của 30 ngày.
- **Thiếu (Gaps):**
  - Chưa tính toán Weekly Pattern (Nhóm theo Thứ trong tuần).
  - Chưa tính toán Monthly Pattern.
  - Chưa trả về trạng thái màu sắc cho Heatmap (Mặc dù Frontend có thể tự map dựa trên threshold, nhưng theo ARCH-001 thì Frontend bị cấm hardcode threshold).
  - Chưa có phân tích Quality Pulse.

**Hành động đề xuất cho Phase 1.6B:**
- Backend phải nâng cấp endpoint `/api/f13/dashboard/trend` hoặc tách một API mới chuyên dụng cho Timeline (`/api/f13/dashboard/quality-timeline`) trả về cấu trúc JSON chia sẵn các node: `daily`, `weekly`, `monthly`, `heatmap`, `pulse`.
- Frontend chỉ call API và truyền data vào các Component Chart.

## 5. Acceptance Criteria
1. Đặc tả bao phủ đủ 5 thành phần (Daily, Weekly, Monthly, Heatmap, Pulse).
2. Định hướng UI nhắm tới hành động điều hành (Actionable) thay vì xem báo cáo thuần túy (BI).
3. Tuân thủ 100% nguyên tắc ARCH-001: Mọi logic nhóm dữ liệu, phân tích quy luật, gán ngưỡng đều nằm ở Backend.
4. Ghi nhận đầy đủ Gap Analysis của API hiện hành so với thiết kế.

## 6. Wireframe Concept (Text-based)
```text
[   QUALITY TIMELINE MODULE   ]

[ Quality Pulse ] "Hệ thống đang trong chu kỳ rơi tự do (giảm liên tiếp 3 ngày). Cần can thiệp gấp ca chiều nay!"

--- Lịch sử 30 Ngày (Line Chart) ---
| 100% ---[Threshold Xanh]------------...
| 95%  ---[Threshold Cam]--------/\----/\---...
| 90%  ---[Threshold Đỏ]-----\/--------...

--- Quy luật Tuần (Bar Chart) ---    --- Lịch Heatmap 30 ngày ---
| [T2] [T3] [T4] [T5] [T6] [T7] [CN]   | [Xanh] [Xanh] [Đỏ] [Cam]
|  X    X    X    X    X    C    Đ     | [Xanh] [Cam] [Cam] [Đỏ]
|                                      | [Xanh] [Xanh] [Xanh] [Xanh]
```
