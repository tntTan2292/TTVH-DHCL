---
title: Core Knowledge
purpose: F4.2 là gì, đo khâu nào, khác F4.1 và F1.3 ở đâu
owner: Product Owner
ssot: True
dependencies: metadata.yml
version: 1.0.0
---

# Core Knowledge — F4.2 Chất lượng phát giao bưu tá

## 1. Khâu được đo

Từ lúc bưu gửi được **giao cho bưu tá** (GBT) đến lúc **phát thành công** (PTC). Chỉ tiêu đo bưu tá phát, không đo bưu cục: tuyến "phát lưu tại bưu cục" (bưu cục tự phát) không phải đối tượng đánh giá của F4.2 (PD-F42-4).

## 2. Đơn vị

- Đơn vị xếp hạng: 6 BCVH (`Mã BC phát` / `Tên BC phát`), như các chỉ tiêu khác.
- Chi tiết: từng bưu tá của BCVH (`Mã bưu tá`), chỉ bưu tá có phát trong ngày.
- Toàn quốc: 34 tỉnh/TP cố định (cùng danh sách F1.3 / F4.1), xếp theo tỉnh phát.

## 3. Điểm cần nhớ

- **Ngày dữ liệu = ngày GBT.** Tên file xuất chỉ mang giờ xuất.
- **Mẫu số là mọi dòng GBT trong ngày** (cột 14 của báo cáo DKCL), gồm cả bưu gửi chưa phát và chuyển hoàn chưa có đánh giá. Khác F1.1, nơi dòng chưa đánh giá bị loại khỏi mẫu số.
- Vì vậy tỷ lệ của ngày gần nhất thấp hơn thực tế rồi tăng khi dòng trống chuyển thành Đạt/Không đạt; xuất lại cùng ngày muộn hơn thì thay thế ngày đó.
- Đánh giá do cổng DKCL tính (quy định 11,5 giờ); hệ thống lưu nguyên, không tính lại.
