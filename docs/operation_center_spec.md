# TTVH-DHCL: Operation Center Specification V1.0 (SSOT)

> **STATUS: FROZEN**
> Tài liệu này là Single Source of Truth (SSOT) quy định thiết kế và yêu cầu của F1.3 Operation Center. Không thay đổi Business Logic, KPI Formula và API Contract hiện hành.

## 1. Mục tiêu Operation Center
Thay thế hoàn toàn file Excel điều hành hàng ngày. Cung cấp một Dashboard Điều hành (không phải Dashboard BI) tập trung vào hành động, định hướng "Nhìn 10 giây là hiểu tình hình và biết cần làm gì". Operation Dashboard là màn hình mặc định của module F1.3.

## 2. UI/UX Principles
- **Tốc độ:** Nhìn vào Dashboard trong 10 giây phải hiểu được toàn bộ tình hình mạng lưới.
- **Tính hành động:** Ưu tiên hiển thị vấn đề và khuyến nghị xử lý, không chỉ đơn thuần hiển thị số liệu chết.
- **Tập trung:** Thiết kế dạng Grid (lưới) tối ưu không gian, không yêu cầu cuộn trang quá nhiều.

## 3. Quy tắc màu sắc
- **Màu Xanh (Đạt/Tốt):** Dành cho các chỉ số đạt KPI, số lượng bưu gửi thành công, hoặc xu hướng tích cực (VD: tăng hạng, tăng KPI).
- **Màu Đỏ (Không đạt/Xấu):** Dành cho các chỉ số không đạt KPI, số lượng bưu gửi tồn đọng, cảnh báo, xu hướng tiêu cực (VD: giảm hạng, giảm KPI).
- **Màu Cam (Cảnh báo/Chú ý):** Dành cho tỷ lệ lỗi, xếp hạng, hoặc các vấn đề cần lưu tâm nhưng chưa đến mức nghiêm trọng/đỏ.

## 4. Layout tổng thể & Thứ tự các Module
Dashboard được phân chia theo cấu trúc Top-to-Bottom ưu tiên luồng công việc của Điều hành viên:
1. **Header Bar:** Tên Dashboard, Bộ lọc (Ngày/Tháng).
2. **Executive Summary:** Tổng quan các chỉ số trọng yếu.
3. **Executive Daily Brief:** Tóm tắt tình hình bằng văn bản tự động.
4. **Rule Recommendation (Điều hành hôm nay):** Khuyến nghị ưu tiên điều hành.
5. **BCVH Operation Table:** Bảng chi tiết điểm nóng.
6. **Quality Timeline:** Chu kỳ và xu hướng chất lượng.
7. **Alert / Top Panel:** Cảnh báo các vấn đề cụ thể.
8. **Message Generation (Tạo Tin Điều hành):** Công cụ xuất thông báo.

## 5. Executive Summary
Chỉ sử dụng các chỉ tiêu đặc thù của F1.3. Mọi KPI phải hiển thị Giá trị hiện tại, +/- hôm qua, +/- cùng kỳ.
Các chỉ số bao gồm:
- KPI F1.3
- Sản lượng tổng
- Bưu gửi Đạt
- Bưu gửi Không đạt
- Xếp hạng toàn quốc

## 6. Executive Daily Brief
- **Vị trí:** Đặt ngay dưới Executive Summary.
- **Chức năng:** Sinh tự động bản tóm tắt điều hành trong khoảng 5~8 dòng.
- **Mục tiêu:** Giúp lãnh đạo nắm tình hình tổng quan toàn mạng lưới trong dưới 10 giây.

## 7. Rule Recommendation (Điều hành hôm nay)
- Đóng vai trò là Operation Rule Engine. Không tính toán IF/ELSE ở Frontend, Frontend chỉ hiển thị kết quả do Backend (Rule Engine) trả về.
- Khuyến nghị bắt buộc phải dựa trên dữ liệu thực tế (VD: rớt hạng sâu nhất, tỷ lệ không đạt cao nhất). Không được để AI tự suy luận hay sinh text ngẫu nhiên.
- Đây KHÔNG phải hệ thống Task Management, không giao việc, không tạo DB quản lý tiến độ.

## 8. BCVH Operation Table
Bảng số liệu điều hành chi tiết các đơn vị. Các cột bắt buộc: Sản lượng (SL), Đạt, Không đạt, KPI, +/- hôm qua, +/- cùng kỳ, Xếp hạng.

## 9. Dòng TỔNG CỘNG
Mọi bảng số liệu (bao gồm BCVH Operation Table) bắt buộc phải có dòng đầu tiên là dòng **TỔNG CỘNG**.

## 10. 06 BCVH mặc định
Bảng BCVH Operation Table mặc định chỉ hiển thị 06 BCVH trọng điểm để tập trung điều hành: Thuận Hóa, Thuận An, Hương Thủy, Phú Lộc, Hương Trà, A Lưới.

## 11. SHOW ALL
Tại bảng BCVH Operation Table, bắt buộc có nút **SHOW ALL** để mở rộng hiển thị toàn bộ các BCVH trong mạng lưới khi cần thiết.

## 12. Drill Down
Mọi module (Bảng, Biểu đồ) phải hỗ trợ tính năng Drill Down (Khoan sâu dữ liệu) theo hệ phân cấp:
**BCVH → Tuyến → Bưu tá → Bưu gửi**

## 13. Quality Timeline
Module hiển thị diễn biến chất lượng theo thời gian để lãnh đạo nắm chu kỳ. Bao gồm đầy đủ:
- **Daily Timeline:** Diễn biến chất lượng theo các ngày sát nhau.
- **Weekly Pattern:** Biểu đồ xu hướng so sánh các ngày trong tuần.
- **Monthly Pattern:** Biểu đồ xu hướng trong tháng.
- **Quality Calendar:** Lịch chất lượng dạng Heatmap.
- **Quality Pulse:** Nhịp đập chất lượng tổng thể.

## 14. Alert Panel
Khu vực cảnh báo các vấn đề cụ thể, các điểm nghẽn, hoặc danh sách các bưu cục/lỗi ở mức độ nghiêm trọng (Top Impact, Top Lowest).

## 15. Message Generation (Tạo Tin Điều hành)
- Công cụ phục vụ việc xuất nhanh thông báo điều hành.
- **Template Engine:** Toàn bộ quá trình nội suy template phải do Backend Template Engine xử lý. KHÔNG dùng Regex Replace trong React.
- Frontend chỉ có nhiệm vụ Gửi Request (chọn template), Preview kết quả trả về, và nút Copy.

## 16. 06 Template đã Freeze
Hệ thống sử dụng chung một Engine cho 06 Template đã được Product Owner phê duyệt. (Cấu trúc template tĩnh, chỉ nhận biến số đầu vào).

## 17. Acceptance Criteria (Tiêu chí nghiệm thu)
1. F1.3 mặc định load thẳng vào Operation Dashboard.
2. Giao diện thể hiện rõ định hướng "Điều hành", dữ liệu khớp 100% với API hiện hữu, không sửa đổi công thức.
3. Executive Summary và Executive Daily Brief cung cấp đủ thông tin theo yêu cầu trong 10 giây.
4. Bảng điều hành có dòng TỔNG CỘNG, mặc định 6 BCVH, có chức năng SHOW ALL.
5. Rule Recommendation lấy kết quả chuẩn xác từ Rule Engine (dữ liệu thực).
6. Message Generator hoạt động mượt mà qua Template Engine ở Backend, không xử lý chuỗi ở Frontend.
7. Click vào số liệu có thể Drill Down tới cấp Bưu gửi.

## 18. Operation Dashboard Data Priority
Freeze thứ tự hiển thị ưu tiên trên màn hình:
1. Executive Summary
2. Executive Daily Brief
3. Rule Recommendation
4. BCVH Operation Table
5. Quality Timeline
6. Alert
7. Message Generation

## 19. Operation Dashboard Data Source
Quy định về nguồn dữ liệu (SSOT cho UI):
- Tất cả các Module trên Dashboard phải sử dụng **cùng một nguồn dữ liệu** trả về từ Backend (Operation Engine).
- **Tuyệt đối không** được tính toán độc lập giữa các Module ở Frontend dẫn đến độ vênh số liệu.

## 20. Dashboard Performance
Tiêu chuẩn hiệu năng (Freeze Acceptance) bắt buộc phải đạt:
- **First Load:** < 3s (Tải lần đầu tiên)
- **Filter Change:** < 1s (Thay đổi bộ lọc thời gian/đơn vị)
- **Drill Down:** < 2s (Khoan sâu dữ liệu)
- **Refresh sau Import:** < 5s (Sau khi import file excel mới)

