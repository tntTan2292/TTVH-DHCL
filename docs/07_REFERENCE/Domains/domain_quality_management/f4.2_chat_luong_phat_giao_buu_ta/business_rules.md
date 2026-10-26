---
title: Business Rules
purpose: Quy tắc nghiệp vụ F4.2 đã được PO chốt
owner: Product Owner
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# Business Rules — F4.2

Nguồn quyết định: `docs/06_REVIEWS/Shared/F42-MODULE-PLAN_CHECKPOINT_001.md` Section 1 (PO, 2026-10-26).

| ID | Quy tắc |
| --- | --- |
| BR-1 | Tên chỉ tiêu: `F4.2 - Chất lượng phát giao bưu tá` (PD-F42-1). |
| BR-2 | Tỷ lệ F4.2 = số bưu gửi `Đạt` / số dòng GBT có thông tin phát của ngày (cột 18 = 17/14 của báo cáo DKCL). Mẫu số gồm cả dòng chưa có đánh giá (PD-F42-2). |
| BR-3 | Xếp hạng theo 6 BCVH; thêm bảng riêng từng BCVH xuống từng bưu tá có phát trong ngày (PD-F42-3). |
| BR-4 | Chỉ đánh giá bưu tá; tuyến phát lưu tại bưu cục không thuộc F4.2, không làm khối tuyến đặc thù (PD-F42-4). |
| BR-5 | Mục tiêu 90 % (PD-F42-5). |
| BR-6 | Hạng toàn quốc theo 34 tỉnh/TP cố định, xếp theo tỉnh phát; các dòng khác của file toàn quốc không lưu (PD-F42-6). |
| BR-7 | Màu sắc và giao diện do Antigravity thiết kế (PD-F42-7); phải có đủ chức năng của `report_block_ui_standard.md`. |
| BR-8 | Đánh giá, thời gian thực hiện lấy nguyên từ cổng, không tính lại. |
| BR-9 | Khóa dòng chi tiết = (số hiệu bưu gửi, mã bưu tá, thời gian GBT): một bưu gửi giao cho hai bưu tá là hai dòng. |
