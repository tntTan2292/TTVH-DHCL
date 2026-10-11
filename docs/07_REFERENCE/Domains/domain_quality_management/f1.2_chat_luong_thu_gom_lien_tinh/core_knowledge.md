---
title: Core Knowledge
purpose: F1.2 là gì, đo khâu nào, khác F1.1 ở đâu
owner: Product Owner
ssot: True
dependencies: metadata.yml
version: 1.0.0
---

# Core Knowledge — F1.2 Chất lượng thu gom bưu gửi liên tỉnh

## 1. Khâu được đo

Bưu gửi **liên tỉnh** do Huế chấp nhận, từ lúc **chấp nhận** tại bưu cục đến lúc **BĐ10 được quét TMS lên xe** tại khai thác tỉnh chấp nhận (hoặc HUB). Đây là khâu đầu (thu gom / đóng đi), không có khâu phát.

## 2. Đơn vị chịu trách nhiệm — chỉ phía chấp nhận (PD-F12-2)

- **Bưu cục chấp nhận** (`Mã/Tên BC nhận tin/chấp nhận`): 73 bưu cục trong ngày 10/10/2026.
- **Đơn vị quản lý** (`Mã/Tên Huyện`): 37 đơn vị (Bưu điện phường/xã, BCVH Thuận Hóa). Mỗi bưu cục thuộc đúng một đơn vị.
- Không có BCVH phát, không có bảng cặp chấp nhận × phát như F1.1.

## 3. Đánh giá

Đạt khi `Thời gian thực hiện thực tế (giờ)` ≤ 10 giờ. Số giờ do cổng DKCL tính (có trừ khoảng đêm, có thể âm); hệ thống lưu nguyên và không tính lại.

## 4. Ngày dữ liệu

Ngày của BĐ10 (quét TMS, nếu thiếu thì giờ đóng BCCP). File xuất ngày X chứa số liệu ngày X-1 (N-1).

## 5. Chỉ tiêu

Tỷ lệ mục tiêu **95 %** (PO 2026-10-11). Màu nhận diện: xanh ngọc nhạt (teal/cyan).
