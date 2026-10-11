---
title: Business Rules
purpose: Quy tắc nghiệp vụ F1.2 đã được PO chốt
owner: Product Owner
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# Business Rules — F1.2

Nguồn quyết định: `docs/06_REVIEWS/Shared/F12-MODULE-PLAN_CHECKPOINT_001.md` Section 2.

| ID | Quy tắc |
| --- | --- |
| BR-1 (PD-F12-2) | Chỉ phía chấp nhận: bưu cục chấp nhận và đơn vị quản lý (`Tên Huyện`). |
| BR-2 (PD-F12-5) | Tỷ lệ = Đạt / số bưu gửi có BĐ10 (định nghĩa của cổng). Bưu gửi "chưa đủ thông tin" (chỉ có trong file toàn quốc) không vào mẫu số, hiển thị cạnh tỷ lệ. |
| BR-3 | Đạt ⇔ thời gian thực hiện ≤ 10 giờ; lấy nguyên đánh giá của cổng, không tính lại. |
| BR-4 (PD-F12-6) | Ngày dữ liệu = ngày BĐ10. File nhập tay đổi tên `F1.2-YYYY.MM.DD.xlsx`; hệ thống từ chối file có tên lệch ngày BĐ10. |
| BR-5 (PD-F12-7) | Xếp hạng toàn quốc theo **tỉnh chấp nhận**, 34 tỉnh; bỏ EMS, các trung tâm Hà Nội/HCM, Bình Dương. Tỷ lệ giảm dần, rồi sản lượng giảm dần, không đồng hạng. |
| BR-6 (PD-F12-8) | Xếp hạng trong Huế 2 cấp: 37 đơn vị → 73 bưu cục. `531120 Khách hàng lớn` tính vào tổng, hiển thị riêng, không xếp hạng. |
| BR-7 | Tuần Thứ Năm–Thứ Tư (như F1.3); tuần/tháng/lũy kế = cộng tử số và mẫu số từng ngày, không lấy trung bình tỷ lệ. |
| BR-8 (PD-F12-10) | Lũy kế 12 = 12 tháng gần nhất tính đến tháng đang chọn. |
| BR-9 (PD-F12-11) | Khi bật tải tự động: mỗi lần bù dữ liệu tải lại 3 ngày gần nhất (như F1.1). |
| BR-10 (PD-F12-9, PD-F12-12) | Chỉ tiêu 95 %; họ màu xanh ngọc nhạt. |
