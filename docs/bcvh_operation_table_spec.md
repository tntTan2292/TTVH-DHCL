# Phase 1.4A: BCVH Operation Table Specification (SSOT)

> **TRẠNG THÁI: FROZEN (PHASE 1.4A)**
> Tài liệu này định nghĩa chi tiết (Specification) cho bảng BCVH Operation Table trong module F1.3 Operation Center. Tuân thủ tuyệt đối SSOT, Business Logic, KPI Formula và API Contract hiện tại. Không code, chỉ thiết kế.

## 1. Mục tiêu bảng điều hành
Cung cấp góc nhìn chi tiết, định lượng về tình hình chất lượng của từng Bưu cục Văn hóa (BCVH) trên toàn mạng lưới, giúp điều hành viên phát hiện nhanh các điểm nóng (chậm/muộn) và ra quyết định can thiệp ngay lập tức.

## 2. Danh sách cột & 3. Ý nghĩa từng cột & 4. Thứ tự cột
Thứ tự các cột hiển thị trên bảng từ trái sang phải như sau:
1. **Tên BCVH:** Tên định danh của đơn vị (Kèm mã).
2. **Sản lượng (SL):** Tổng số bưu gửi cần xử lý trong kỳ lọc (`total_bg`).
3. **Đạt:** Số lượng bưu gửi đã xử lý thành công đúng thời gian quy định (`passed_bg`).
4. **Không đạt:** Số lượng bưu gửi xử lý chậm/muộn (`failed_bg`).
5. **KPI (%):** Tỷ lệ phần trăm Đạt / Tổng sản lượng (`kpi_rate`).
6. **+/- hôm qua (DoD):** Sự biến thiên KPI so với ngày hôm qua. (Frontend sẽ nhận từ API hoặc tự tính dựa trên dữ liệu 2 ngày nếu cần thiết).
7. **+/- cùng kỳ (SWC):** Sự biến thiên KPI so với cùng ngày tuần trước.
8. **Xếp hạng:** Thứ hạng của BCVH trong toàn mạng lưới theo tiêu chí KPI (từ cao xuống thấp).

## 5. Quy tắc màu sắc
- **Xanh lá (Tích cực):** Áp dụng cho các giá trị Đạt, KPI vượt ngưỡng mục tiêu, biến thiên DoD/SWC mang giá trị dương (>0), thăng hạng.
- **Đỏ (Tiêu cực):** Áp dụng cho các giá trị Không đạt, KPI dưới ngưỡng mục tiêu, biến thiên DoD/SWC mang giá trị âm (<0), tụt hạng.
- **Cam (Cảnh báo):** Áp dụng cho các giá trị tiệm cận ngưỡng rủi ro hoặc xếp hạng quá thấp.
- **Màu trung tính (Đen/Xám):** Dành cho Tên BCVH và Sản lượng tổng.

## 6. Quy tắc Highlight
- **Highlight hàng (Row):** Dòng BCVH nào có Tỷ lệ Không đạt quá cao hoặc tụt hạng nghiêm trọng sẽ có background màu đỏ nhạt (hoặc cam nhạt) cảnh báo.
- **Hover Highlight:** Khi chuột lướt qua, dòng sẽ đổi màu nền nhẹ để dễ gióng hàng.

## 7. Quy tắc dòng TỔNG CỘNG
- Luôn hiển thị dòng **TỔNG CỘNG** ở dòng số 1 của bảng.
- Dòng TỔNG CỘNG thể hiện tổng Sản lượng, tổng Đạt, tổng Không đạt và trung bình KPI của toàn mạng lưới.

## 8. Quy tắc mặc định 06 BCVH
- Trạng thái mặc định khi load trang: Bảng chỉ hiển thị đúng **06 BCVH trọng điểm**: Thuận Hóa, Thuận An, Hương Thủy, Phú Lộc, Hương Trà, A Lưới.
- Các đơn vị khác bị ẩn để tập trung màn hình vào các điểm nóng chiến lược.

## 9. SHOW ALL
- Có một nút toggle (công tắc) hoặc nút bấm **"SHOW ALL"** ở góc trên của bảng.
- Khi bấm vào, bảng sẽ expand (mở rộng) hiển thị toàn bộ danh sách các BCVH đang có dữ liệu trong kỳ lọc.

## 10. Sorting
- Hỗ trợ click vào tiêu đề cột để sắp xếp (Ascending/Descending).
- **Mặc định:** Sắp xếp theo cột `Xếp hạng` tăng dần (từ hạng 1 xuống thấp). Dòng TỔNG CỘNG luôn đứng im trên cùng, không bị ảnh hưởng bởi Sorting.

## 11. Sticky Header
- Thanh tiêu đề (Header) của bảng luôn cố định (Sticky) ở phía trên cùng khi người dùng cuộn (scroll) danh sách xuống dưới.

## 12. Sticky Total Row
- Dòng **TỔNG CỘNG** (dòng số 1) cũng phải được cố định (Sticky) ngay dưới Sticky Header để người dùng luôn có số liệu tham chiếu so sánh toàn mạng.

## 13. Responsive
- Trên màn hình nhỏ (Mobile/Tablet): Cho phép cuộn ngang (Horizontal Scroll) phần nội dung bảng.
- Cột `Tên BCVH` phải được cố định (Sticky Left) để khi cuộn ngang vẫn nhìn thấy tên đơn vị.

## 14. Drill Down
- Click vào Tên BCVH hoặc các số liệu trong dòng của BCVH đó sẽ mở rộng (Drill down) xuống cấp Tuyến phát tương ứng của bưu cục đó. (Luồng: BCVH → Tuyến → Bưu tá → Bưu gửi).

## 15. Mapping từng cột với API
Nguồn dữ liệu duy nhất: `/api/f13/bcvh-ranking`
- **Tên BCVH:** `ten_bcvh`
- **Sản lượng:** `total_bg`
- **Đạt:** `passed_bg`
- **Không đạt:** `failed_bg`
- **KPI:** `kpi_rate`
- **Xếp hạng:** `rank`
- **+/- hôm qua (DoD):** *Cần bổ sung logic (Gap).*
- **+/- cùng kỳ (SWC):** *Cần bổ sung logic (Gap).*

## 16. Gap Analysis
- **API `bcvh-ranking` hiện tại:** Trả về `total_bg`, `passed_bg`, `failed_bg`, `kpi_rate`, `rank` cho từng BCVH.
- **Khoảng trống (Gap):** API hiện tại KHÔNG trả về các giá trị biến thiên (DoD, SWC) cho từng dòng BCVH.
- **Giải pháp (Action Plan):**
  - Cách 1 (Khuyên dùng - Sửa Backend nhẹ): Cập nhật endpoint `bcvh-ranking` tương tự cách đã làm cho `kpiController` để tính cả rank và DoD/SWC cho từng đơn vị. (Tuy nhiên do ràng buộc "Không sửa Backend" trong Phase này, ta sẽ dùng Cách 2).
  - Cách 2 (Frontend xử lý): Frontend sẽ tự gọi API `bcvh-ranking` cho 3 kỳ (Hôm nay, Hôm qua, Cùng kỳ) sau đó tự mapping và làm phép trừ để sinh ra cột +/-. *(Yêu cầu xác nhận từ PO về cách tiếp cận khi code).*

## 17. Acceptance Criteria
1. Bảng tuân thủ nghiêm ngặt 18 quy tắc trên.
2. Dòng TỔNG CỘNG và Header luôn Sticky. Tên BCVH Sticky Left trên mobile.
3. Mặc định chỉ load 06 BCVH trọng điểm, nhấn SHOW ALL mới load phần còn lại.
4. Cột +/- hiển thị màu Xanh/Đỏ kèm mũi tên báo hiệu hướng biến động.
5. Sắp xếp (Sorting) không làm trôi dòng TỔNG CỘNG.
6. Responsive mượt mà, không vỡ khung trên iPad/Mobile.

## 18. Bổ sung Quy tắc Nâng cao (Advanced Specifications)
1. **Priority Order:** Các BCVH luôn được phân loại ưu tiên hiển thị dựa trên mức độ rủi ro (Rớt hạng sâu, KPI thấp nhất, Tụt giảm mạnh nhất) trước khi sắp xếp theo mặc định.
2. **BCVH Status:** Mỗi BCVH có một trạng thái ngắn gọn (Bình thường / Cảnh báo / Nguy hiểm) dựa trên KPI thực tế so với ngưỡng quy định.
3. **Priority Flag (HOT/WATCH/BEST):** Cờ đánh dấu: 
   - `HOT`: Đơn vị rớt hạng nghiêm trọng hoặc lỗi cực cao.
   - `WATCH`: Đơn vị đang có xu hướng giảm liên tục.
   - `BEST`: Đơn vị Top đầu vững vàng.
4. **Trend Indicator:** Biểu đồ mini (Sparkline) hoặc mũi tên hiển thị xu hướng chất lượng 7 ngày gần nhất ngay cạnh KPI.
5. **KPI Target Gap:** Khoảng cách chênh lệch so với KPI mục tiêu (ví dụ: Thiếu 2% nữa đạt target).
6. **Action Recommendation Column:** Cột gợi ý hành động cụ thể cho từng BCVH (Ví dụ: "Rà soát bưu tá tuyến 1", "Điều phối thêm xe").
7. **Rule Color:** Bảng màu nghiêm ngặt: Đỏ (#FF3B30) cho Critical, Cam (#FF9500) cho Warning, Xanh (#34C759) cho Success.
8. **Business Threshold:** Ngưỡng nghiệp vụ: Đỏ (<90%), Cam (90%-94.9%), Xanh (>=95%). Dữ liệu cứng từ SSOT.
9. **Loading Strategy:** Sử dụng Skeleton Loading cho các hàng khi đang fetch data. Chuyển đổi mượt mà không giật trang.
10. **Expand Row UX:** Nhấn vào Row sẽ thả xuống (Accordion) chi tiết của BCVH đó thay vì nhảy sang trang mới.
11. **Summary Footer:** Dưới cùng của bảng có thêm thanh tóm tắt nhanh: Bao nhiêu BCVH HOT, bao nhiêu BCVH WATCH.
12. **KPI Goal Bar:** Thanh tiến trình (Progress bar) nhỏ ngay dưới phần trăm KPI để trực quan hóa mức độ hoàn thành mục tiêu.

## 19. Wireframe (Text-based mockup)

```text
[   Operation Dashboard Data - Table Component   ] [ SHOW ALL ]
---------------------------------------------------------------------------------------------------------
| Tên BCVH (Sticky) | Sản lượng | Đạt    | Không đạt | KPI (%) | +/- Hôm qua | +/- Cùng kỳ | Xếp hạng |
---------------------------------------------------------------------------------------------------------
| TỔNG CỘNG (Sticky)| 1,000     | 945    | 55        | 94.5%   | ▲ +0.5%     | ▼ -0.2%     | -        |
---------------------------------------------------------------------------------------------------------
| Thuận Hóa         | 300       | 290    | 10        | 96.6%   | ▲ +1.0%     | ▲ +1.2%     | #1       |
| Hương Thủy        | 200       | 190    | 10        | 95.0%   | ▼ -0.5%     | ▲ +0.1%     | #2       |
| Phú Lộc           | 200       | 185    | 15        | 92.5%   | ▲ +0.2%     | ▼ -0.4%     | #3       |
| Hương Trà         | 150       | 135    | 15        | 90.0%   | ▼ -1.5%     | ▼ -1.0%     | #4       |
| Thuận An          | 100       | 90     | 10        | 90.0%   | ▲ +0.5%     | ▲ +0.5%     | #5       |
| A Lưới            | 50        | 40     | 10        | 80.0%   | ▼ -2.0%     | ▼ -3.0%     | #6 (Đỏ)  |
---------------------------------------------------------------------------------------------------------
```
