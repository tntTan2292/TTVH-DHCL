# QIS Dashboard Classification

**Trạng thái: `ACTIVE (PO phê duyệt 2026-11-03)`.** Phân loại trang, người dùng chính và sáu điểm ở Mục 7 đã được PO quyết. Chỉ PO được thay đổi phân loại.

## 1. Phạm vi

Tài liệu này chỉ bổ sung phần còn thiếu: **mỗi trang thuộc loại nào, phục vụ ai, trả lời câu hỏi gì**. Nó cụ thể hóa nguyên tắc `One Question Per Screen` của `QIS_UX_DESIGN_PRINCIPLES.md` (Mục 2) và không thay thế tài liệu nào.

| Nội dung | Vẫn theo tài liệu |
| --- | --- |
| Nguyên tắc UX, thứ tự thông tin, giữ ngữ cảnh khi drill-down | `docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md` (frozen) |
| Thẻ, KPI, bảng, biểu đồ, trạng thái | `docs/03_UX/shared/QIS_DESIGN_SYSTEM.md` (frozen) |
| Camera, sắp xếp cột, đường mục tiêu, màu theo chỉ tiêu, lọc theo ngày | `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` |
| Công thức, số liệu, chuỗi BCVH → Tuyến → Bưu gửi → Minh chứng → Hành động | SSOT và `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` (frozen) |
| Menu theo trục thời gian, bộ lọc, phân quyền khối | `docs/04_TECHNICAL_PLANNING/Feature/F13-V2-STRUCTURE-01_DESIGN.md` |

Không phân loại: các trang F1.3 cũ sắp thay thế; Mạng lưới, Import, Quản trị (không phải trang báo cáo). Nhãn loại chỉ dùng để định hướng thiết kế, **không hiển thị trên màn hình và không dùng để chia menu**.

## 2. Phân loại trang

Áp dụng cho F1.3 mới trước; F1.1, F1.2, F4.1, F4.2 theo cùng khuôn khi được chuyển sang.

| Trang | Loại | Người dùng chính | Câu hỏi chính | Khối trả lời câu hỏi |
| --- | --- | --- | --- | --- |
| Trang chủ | Chiến lược | Lãnh đạo BĐTP, Lãnh đạo TTVH | Toàn đơn vị đang ở trạng thái nào, đứng thứ mấy, đơn vị nào cần chú ý? | Thẻ chỉ tiêu, Xếp hạng toàn quốc, Đơn vị cần hành động |
| Theo ngày | Vận hành | Lãnh đạo TTVH, Chuyên quản BCVH, Giám đốc BCVH | Vấn đề nào cần xử lý ngay? | Bảng tổng hợp số liệu tại các BCVH (tài khoản BCVH thấy bảng riêng của đơn vị mình) |
| Theo tuần | Điều hành | Lãnh đạo TTVH, Chuyên quản BCVH | Đơn vị nào tiến bộ, đơn vị nào suy giảm? | So sánh BCVH theo tuần |
| Theo tháng | Chiến lược + Điều hành | Lãnh đạo BĐTP, Lãnh đạo TTVH | Lũy kế và xu hướng có đáp ứng mục tiêu không? | So sánh BCVH theo tháng, Xu hướng theo tháng |
| Chuyên đề: tuyến, minh chứng | Phân tích | Chuyên quản BCVH, Giám đốc BCVH | Vấn đề nằm ở đâu, bằng chứng nào xác nhận? | Phân tích tuyến phát, Dữ liệu minh chứng |
| Hàng tồn | Giám sát ngoại lệ + Theo dõi xử lý | Giám đốc BCVH, Chuyên quản BCVH | Bưu gửi nào đang tồn, đã xử lý tới đâu? | Tổng quan, Chi tiết, Xử lý tồn |
| Nhật ký điều hành | Theo dõi hành động | Giám đốc TTVH, người được giao việc | Ai phụ trách, việc nào chưa hoàn thành? | Danh sách đã chốt, Nhiệm vụ của tôi |

## 3. Tầng thông tin theo loại trang

Dùng đúng các tầng của `QIS_UX_DESIGN_PRINCIPLES.md` Mục 4. "Có điều kiện" nghĩa là chỉ hiển thị khi đạt Mục 4 của tài liệu này; thiếu điều kiện thì bỏ khối, không làm khối rỗng cho đủ.

| Loại | Bắt buộc | Có điều kiện | Không đặt ở trang này |
| --- | --- | --- | --- |
| Chiến lược | Tóm tắt, Trạng thái, Ưu tiên | Khuyến nghị | Danh sách bưu gửi, Bằng chứng chi tiết |
| Điều hành | Trạng thái, So sánh đơn vị, Xu hướng | Nguyên nhân, Khuyến nghị | Danh sách bưu gửi |
| Vận hành | Tóm tắt, Trạng thái, Ưu tiên | Khuyến nghị, Hành động | Xu hướng dài hạn (thuộc trang tháng) |
| Phân tích | Phạm vi đang xem, Bằng chứng | Nguyên nhân | Thông điệp điều hành tổng hợp |
| Giám sát ngoại lệ, Theo dõi hành động | Trạng thái, Danh sách cần xử lý, Người phụ trách | Nguyên nhân | Xếp hạng, so sánh đơn vị (trừ khi PO yêu cầu) |

## 4. Thành phần chỉ hiển thị khi đủ căn cứ

| Thành phần | Điều kiện | Khi chưa đủ |
| --- | --- | --- |
| Tóm tắt tự động | Sinh từ số do backend tính, không có nhận định chủ quan | Chỉ hiện số |
| Nguyên nhân | Có nguồn dữ liệu đã duyệt phân biệt được khâu khai thác, vận chuyển, phát | Ghi "Chưa xác định"; không suy luận từ chỉ tiêu không đạt hay từ số giờ TMS→PTC |
| Pareto / RCA | Có nguồn và quy tắc được PO duyệt (trang hiện là placeholder) | Giữ nguyên, không đưa vào khuôn |
| Khuyến nghị | Theo quy tắc, gắn bằng chứng và đơn vị phụ trách | Bỏ khối |
| Trung tâm hành động | Quy tắc sát thực tế điều hành, được PO duyệt (PO 2026-11-02: bản hiện tại còn máy móc, đã bỏ khỏi trang Theo ngày) | Không đặt vào khuôn mới |
| Vị thứ toàn quốc | Dữ liệu đầy đủ, người xem có quyền cấp thành phố | "Chưa có dữ liệu"; tài khoản BCVH không nhận |

## 5. Chọn biểu đồ theo câu hỏi

Áp dụng cho khối mới hoặc khối đang sửa. Không phải lý do để thay các biểu đồ đang chạy đã được PO duyệt.

| Câu hỏi | Dùng | Ghi chú |
| --- | --- | --- |
| Có đạt mục tiêu không? | Thẻ KPI: giá trị, mục tiêu, chênh lệch | Mục tiêu đọc từ cấu hình chỉ tiêu |
| Các đơn vị xếp thế nào trong một kỳ? | Bảng sắp xếp được | Số cần đọc chính xác nên ưu tiên bảng |
| Diễn biến theo thời gian ra sao? | Cột sản lượng + đường tỷ lệ + đường mục tiêu | Mẫu đã dùng toàn hệ thống |
| Đơn vị nào yếu ở kỳ nào? | Heatmap đơn vị × thời gian | Dùng đúng dải màu của chỉ tiêu |
| Có lặp theo thứ trong tuần không? | Cột theo thứ hoặc heatmap ngày | Không vẽ cả hai cho cùng một câu hỏi trên một trang |
| Việc nào cần xử lý, ai phụ trách? | Bảng danh sách có ưu tiên và trạng thái | Không dùng biểu đồ |
| Bằng chứng là gì? | Bảng chi tiết có bộ lọc | Giữ ngữ cảnh từ nơi drill-down tới |

Không thêm mới: biểu đồ tròn cho nhiều nhóm, đồng hồ đo, 3D, hai biểu đồ cùng trả lời một câu hỏi trên một trang.

## 6. Kiểm tra khi nghiệm thu một trang

1. Mở trang: trả lời được câu hỏi chính trong vài giây đầu, không cần cuộn.
2. Mỗi khối trả lời một câu hỏi; bỏ khối đi mà câu hỏi của trang không bị ảnh hưởng thì cần xem lại khối đó.
3. Không có hai khối hoặc hai bộ lọc làm cùng một việc.
4. Không có nguyên nhân, nhận định nào thiếu căn cứ theo Mục 4.
5. Khối báo cáo đạt `report_block_ui_standard.md`.

## 7. Điểm chờ PO quyết định

| # | Nội dung | Đề xuất |
| --- | --- | --- |
| 1 | Người dùng chính trong Mục 2 | Do Claude Code suy từ phân quyền hiện có, PO cần xác nhận theo thực tế sử dụng |
| 2 | Trang Theo ngày: Trung tâm hành động | **Đã quyết (PO 2026-11-02):** bỏ khỏi trang; bảng tổng hợp điều hành hằng ngày là bảng đầu tiên |
| 3 | Trang Theo ngày: khối Xu hướng có bộ chọn BCVH riêng, trùng bộ lọc đầu trang | **Đã quyết (PO 2026-11-03):** giữ bộ chọn trong khối, vì khi cuộn xuống xem khối Xu hướng không thể cuộn lên để đổi bộ lọc đầu trang |
| 4 | Trang Theo tháng: hai heatmap (tháng và ngày) | **Đã quyết (PO 2026-11-03):** giữ cả hai, vì heatmap ngày có thứ hạng mỗi ngày mà biểu đồ tháng không có |
| 5 | Chuyên đề "Năng lực và chất lượng tuyến" đang dẫn về trang cũ `/f13/ranking/bcvh` | **Đã quyết (PO 2026-11-03):** giữ nguyên như hiện tại. Mục này cùng ba mục Hành trình bưu gửi, Phân tích tuyến phát, Dữ liệu minh chứng thuộc 04 module Chuyên đề F1.3 sẽ được xây dựng lại và chuẩn hóa ở bước tiếp theo |
| 6 | Quy tắc "giữ ngữ cảnh": đổi trang Ngày / Tuần / Tháng không giữ kỳ (PO 2026-11-02), trong khi Design Principles Mục 8 yêu cầu không reset Date Filter khi quay lại | **Đã quyết (PO 2026-11-03):** đồng ý. Đổi Ngày / Tuần / Tháng là chuyển giữa các trang ngang hàng nên không giữ kỳ; drill-down sang Chuyên đề vẫn phải giữ ngữ cảnh |

**Đã quyết (PO 2026-11-03):** điểm 1, đồng ý bảng "Người dùng chính" ở Mục 2 như hiện tại. Không còn điểm nào chờ PO.

## 8. Sau khi phê duyệt

Đã đổi trạng thái thành `ACTIVE` ngày 2026-11-03, đăng ký trong `DOCUMENT_INDEX.md`, ghi một dòng vào `PROJECT_PROGRESS.md`. Ticket có trang báo cáo thêm tài liệu này vào Required Reading của manifest. Chỉ PO được thay đổi phân loại.
