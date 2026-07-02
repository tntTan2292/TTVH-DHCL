# Phase 1.5A: Rule Recommendation Panel Specification (SSOT)

> **TRẠNG THÁI: FROZEN (PHASE 1.5A)**
> Tài liệu định nghĩa (Specification) cho module Rule Recommendation thuộc F1.3 Operation Center. Tuyệt đối tuân thủ SSOT, Business Logic, KPI Formula và Data Priority hiện tại. Không code, chỉ thiết kế.

## 1. Mục tiêu
Hệ thống tự động phân tích dữ liệu chất lượng của các Bưu cục Văn hóa (BCVH) và phát sinh các khuyến nghị điều hành (Rule Recommendation) dưới dạng văn bản có thể hành động ngay (Actionable Insights). Giảm tải việc phân tích thủ công của điều hành viên, đảm bảo các cảnh báo được đưa ra khách quan dựa trên quy tắc (Rules) dữ liệu.

## 2. Layout
- **Vị trí:** Đặt ngay dưới khối Executive Daily Brief (hoặc tích hợp dưới dạng Panel kế bên bảng BCVH Operation Table), theo thứ tự đã Freeze tại Phase 1.1A.
- **Bố cục:** Hiển thị dưới dạng danh sách các Thẻ (Cards) ngang hoặc dọc (Grid / List), có thể scroll nếu số lượng khuyến nghị vượt quá 5.
- **Header Panel:** Tiêu đề "Khuyến Nghị Điều Hành Hôm Nay" kèm số lượng cảnh báo nghiêm trọng.

## 3. Rule Priority
Quy định mức độ ưu tiên (Priority) để sắp xếp các khuyến nghị xuất hiện trên cùng:
1. **P1 (Critical):** KPI giảm sâu đột biến (>5% so với hôm qua) HOẶC rớt khỏi ngưỡng 90%.
2. **P2 (High):** Rớt khỏi ngưỡng 95% HOẶC lỗi nhiều nhất toàn mạng (Top 1 Failed).
3. **P3 (Medium):** Tụt hạng liên tiếp 2 ngày HOẶC rớt khỏi Top 3 an toàn.
4. **P4 (Low):** Lỗi rải rác nhưng không ảnh hưởng lớn đến KPI tổng.

## 4. Recommendation Levels
Tương ứng với Rule Priority, các mức độ cảnh báo (Levels) được quy định:
- **Nguy hiểm (Danger):** Áp dụng cho các Rule P1. Yêu cầu xử lý tức thời trong ca làm việc.
- **Cảnh báo (Warning):** Áp dụng cho các Rule P2. Yêu cầu rà soát nguyên nhân trong ngày.
- **Lưu ý (Notice):** Áp dụng cho các Rule P3, P4. Theo dõi thêm trong các kỳ lọc tiếp theo.

## 5. Rule Categories
Phân loại nguyên nhân/loại hình cảnh báo để người dùng dễ nhận diện:
- **Tụt hạng (Rank Drop):** Đơn vị mất vị thế thi đua.
- **Chất lượng kém (Low Quality):** Đơn vị không đạt KPI tối thiểu.
- **Biến động âm (Negative Trend):** Xu hướng xấu đi rõ rệt qua các ngày.
- **Lỗi tập trung (Volume Alert):** Lượng bưu gửi chậm/lỗi tăng bất thường.

## 6. Rule Output Format
Một khuyến nghị hiển thị ra màn hình phải gồm đủ 3 thành tố (Format):
- **Condition (Ngữ cảnh):** *(Ví dụ: "Thuận Hóa giảm 2% KPI so với hôm qua")*.
- **Impact (Tác động):** *(Ví dụ: "Nguy cơ rớt khỏi Top 1 toàn mạng")*.
- **Action (Hành động đề xuất):** *(Ví dụ: "Cần tăng cường rà soát các tuyến chậm phát")*.

## 7. Rule Color
- **Đỏ (Red - #EF4444):** Cấp độ Danger (P1).
- **Cam (Orange - #F97316):** Cấp độ Warning (P2).
- **Vàng/Xanh nhạt (Yellow/Blue):** Cấp độ Notice (P3, P4).

## 8. Recommendation Card
Cấu trúc UI của một thẻ Khuyến nghị:
- **Icon:** Dựa trên Level (Ví dụ: AlertTriangle cho Danger, Info cho Notice).
- **Tiêu đề:** Tên BCVH bị ảnh hưởng hoặc Tên Category.
- **Nội dung:** Text sinh ra từ Output Format.
- **Badge:** Label thể hiện mức độ ưu tiên (P1, P2...).
- **Action Button:** Nút tắt để Drill down ngay xuống BCVH đó hoặc mở Message Generation.

## 9. Data Mapping
- Dữ liệu hoàn toàn sử dụng kết quả lấy từ Backend (KPI, DoD, SWC, Rank).
- Mọi ngưỡng (90%, 95%) đều tham chiếu từ SSOT (Business Threshold).
- Không thực hiện tính toán phép chia, phép nhân tại Frontend.

## 10. API Mapping
- Nguồn dữ liệu sử dụng chung với BCVH Operation Table: `/api/f13/bcvh-ranking`.
- Ngoài ra, có thể cần lấy thêm `/api/f13/dashboard/top` để xác định các Rule liên quan đến Top Lowest / Top Impact (như đã có sẵn trong F13Dashboard).

## 11. Kiến trúc hệ thống (Architecture Option B)
Kiến trúc tiêu chuẩn cho Rule Engine được phê duyệt như sau:
`Data` → `Operation Engine` → `Rule Provider` → `Rule Engine` → `API` → `Frontend (Render Only)`

**Phân định trách nhiệm (Component Responsibilities):**
1. **Frontend (Dashboard Layer):** 
   - Tuyệt đối KHÔNG sử dụng lệnh IF/ELSE cho các nghiệp vụ cảnh báo.
   - KHÔNG hardcode Business Threshold (Ngưỡng 90%, 95%...).
   - KHÔNG tự sinh Recommendation.
   - KHÔNG tự ghép câu chữ điều hành.
   - Chỉ duy nhất có nhiệm vụ Consume API từ Rule Engine và Render (Hiển thị).
2. **Backend (Operation Rule Engine):** Chịu trách nhiệm 100% về:
   - Rule Evaluation (Đánh giá dữ liệu).
   - Recommendation Generation (Sinh văn bản khuyến nghị).
   - Priority (Tính mức độ ưu tiên P1, P2...).
   - Level (Danger, Warning, Notice).
   - Action (Sinh hành động gợi ý).
   - Rule Color & Business Threshold.

## 12. Acceptance Criteria
1. Module Render đúng vị trí theo Layout ưu tiên.
2. Phải hiển thị ít nhất 3 Rule Recommendation dựa trên API.
3. Frontend hoàn toàn "mù" về logic, chỉ map JSON properties vào Component.
4. Backend phải trả về Payload hoàn chỉnh bao gồm đầy đủ: Text, Color, Icon Level, Priority, Action Recommendation.
5. Phase 1.5B sắp tới chỉ tập trung code Frontend Consume API, không được đưa logic vào UI.
6. Giao diện thân thiện, dễ đọc lướt, Responsive trên Mobile.

## 13. Wireframe (Text-based mockup)
```text
[ Điều Hành Hôm Nay (Rule Recommendations) ]
-------------------------------------------------------------------------
| [!] (Đỏ) NGUY HIỂM - P1                                               |
| Thuận Hóa: KPI giảm 2.5% so với hôm qua, rớt xuống 88% (Dưới ngưỡng). |
| Đề xuất: Lập tức rà soát tồn đọng ca chiều, tăng cường lực lượng.     |
-------------------------------------------------------------------------
| [?] (Cam) CẢNH BÁO - P2                                               |
| Phú Lộc: Đang có 15 bưu gửi lỗi, cao nhất toàn mạng lưới.             |
| Đề xuất: Kiểm tra nguyên nhân trễ phát tại các tuyến vùng sâu.        |
-------------------------------------------------------------------------
```
