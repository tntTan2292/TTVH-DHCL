# RESEARCH BASELINE v1.0

## 1. Executive Summary
- **Phạm vi Research**: Toàn bộ luồng nghiệp vụ F1.3 - Quality Management (từ Phase R1 đến R5), bao gồm bối cảnh RCA, kịch bản điều hành, thông điệp hệ thống, Data Blueprint, Data Dictionary và Module Specification.
- **Tài liệu đã nghiên cứu**: `rca_ai_context.md`, `executive_scenarios.md`, `executive_decision_guide.md`, `business_glossary.md`, `data_blueprint.md`, `metadata.yml`, `F1.3 MODULE SPECIFICATION v1.0.md`, `F1.3 DATA DICTIONARY v1.0.md`, `faq_troubleshooting.md`, `F13_303_DEFINITION.md`.
- **Mục tiêu đạt được**: Thấu hiểu hoàn toàn nghiệp vụ F1.3, đóng băng (freeze) các luật kinh doanh, đồng bộ toàn bộ tài liệu về chuẩn chung (Single Source of Truth), dọn dẹp thuật ngữ rác và sẵn sàng đầu vào cho luồng thiết kế kỹ thuật.

## 2. Domain Knowledge Summary
Domain F1.3 quản lý chất lượng phát liên tỉnh, theo dõi và phân tích nguyên nhân rớt KPI (Root Cause Analysis - RCA). 
Luồng chức năng hoạt động theo cơ cấu nhiều cấp (Toàn BĐTP, Bưu cục vận hành, Tuyến phát). Hiện tại, hệ thống đặt trọng tâm vào việc thống kê, phân tích và gửi cảnh báo tự động về hiện tượng **Chậm nộp tiền** trong nhóm bưu gửi Không đạt. Hệ thống giúp Điều hành viên nhận diện kịp thời điểm nghẽn để có phương án nhắc nhở bưu tá, nâng cao chất lượng toàn mạng lưới.

## 3. Business Rules Baseline
- **F13_302 (BG chậm nộp tiền)**: Điều kiện xác định: `Thời gian nộp tiền − Thời gian PTC > 3 giờ`.
- **F13_303 (Tỷ lệ chậm nộp tiền)**: Công thức: `Số BG chậm nộp tiền / Tổng số BG Không đạt`. Áp dụng xuyên suốt các cấp.
- **Quy tắc Tính toán**: Tỷ lệ F13_303 tuyệt đối chỉ được lấy tập mẫu số là nhóm bưu gửi Không đạt KPI F1.3 (bỏ qua các bưu gửi Đạt). Chỉ số mang tính thống kê, không chứng minh quan hệ nhân quả tuyệt đối.
- **Quy tắc Import & SSOT**: Dashboard TCT là SSOT về kết quả F1.3. Dữ liệu nạp đè file cũ sẽ tự động xóa sạch dữ liệu ngày đó và nạp mới, hoàn toàn không có cơ chế rollback (hoàn tác).
- **Quy tắc Hiển thị (Time Lag)**: Hệ thống F1.3 hoạt động với độ trễ N-1. Bộ lọc thời gian mặc định hiển thị từ `Today - 7` đến `Today - 1`.
- **Quy tắc Biểu đồ**: Màn hình phân tích RCA, Pareto, Drilldown nghiêm cấm sử dụng chức năng So sánh cùng kỳ (SWC). SWC chỉ dành cho Executive Dashboard ngày.
- **Quy tắc Cảnh báo UI**: Màu sắc cảnh báo (Xanh, Vàng, Đỏ, Hồng) được render theo cấu hình Dynamic (Settings Configuration), không hardcode.

## 4. SSOT Changes
Các điều chỉnh quan trọng so với tài liệu gốc:
- Điều chỉnh ngưỡng thời gian từ `> 2 giờ` thành `> 3 giờ`.
- Chuyển đổi tên gọi "Nộp tiền muộn" sang chuẩn thuật ngữ duy nhất: **"Chậm nộp tiền"**.
- Xóa bỏ hoàn toàn KPI `F13_402` (và Tab 02 trong màn hình RCA).
- Định nghĩa lại `F13_303` với vai trò là KPI duy nhất thay thế F13_402, đo lường tỷ lệ bưu gửi có hiện tượng chậm nộp tiền trên tập bưu gửi Không đạt.
- Xóa bỏ các cách diễn đạt sai (ví dụ: *tỷ lệ nộp tiền muộn trong nhóm không đạt*, v.v.).
- Tạo mới `F13_303_DEFINITION.md` làm Definition Card chuẩn hóa để chốt SSOT.

## 5. Open Questions
Những vấn đề còn chờ Product Owner quyết định:
- Các nhóm nguyên nhân "Chậm phát" và "Chậm khai thác" đang chờ xác nhận định nghĩa, công thức và thiết kế (Tạm hoãn ở Phase 1).
- Cơ chế khôi phục số liệu nếu Admin sơ ý import hỏng file đè lên dữ liệu cũ (do không có Undo).
- Có cần giải pháp bổ sung để xem dữ liệu real-time (Today) nếu Lãnh đạo cấp cao yêu cầu hay vẫn giữ chặt quy định N-1?
- Tại file `faq_troubleshooting.md` vẫn còn rớt lại một cụm từ "Nộp tiền muộn" (tại mục nói về "Chậm phát"). (PO có muốn dọn dẹp triệt để hay không do trước đó lệnh chỉ quét các cụm mang ý nghĩa tỷ lệ).

## 6. Ready for Design
Xác nhận Domain F1.3 đã hoàn toàn trưởng thành về mặt phân tích nghiệp vụ, các Business Rules không còn mâu thuẫn hay nhập nhằng. 
Tiến trình Research đã đóng. Hệ thống chính thức sẵn sàng chuyển trạng thái sang:
- **A1 Gap Analysis**
- **A2 Dashboard Design**
- **A3 API Design**
