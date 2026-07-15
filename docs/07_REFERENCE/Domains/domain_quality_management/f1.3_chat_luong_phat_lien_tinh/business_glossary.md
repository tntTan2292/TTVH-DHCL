---
title: Business Glossary
purpose: Từ điển thuật ngữ nghiệp vụ F1.3
owner: Product Owner
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# Business Glossary (F1.3 Specific)

Tài liệu định nghĩa các thuật ngữ nghiệp vụ đặc thù chỉ dùng riêng hoặc có sắc thái riêng trong phạm vi Indicator F1.3 (Chất lượng phát liên tỉnh). Các thuật ngữ dùng chung toàn hệ thống nằm tại `03_SHARED_BUSINESS/business_dictionary.md`.

## 1. Thuật Ngữ Định Danh
- **F1.3**: Tên gọi tắt của Indicator "Chất lượng phát liên tỉnh" (Điều kiện: PTC/Nộp tiền ≤14 giờ).
- **PTC**: Phát thành công (Chỉ thời điểm Bưu gửi được giao thành công).
- **BCVH**: Bưu cục Vận hành - Đơn vị chịu trách nhiệm phát cấp xã/phường.
- **Tuyến phát**: Cấp phân bổ công việc nhỏ hơn BCVH, thường gắn với địa bàn hoặc bưu tá cụ thể.

## 2. Thuật Ngữ Trạng Thái
- **Không đạt**: Trạng thái của một Bưu gửi khi không thỏa mãn điều kiện chất lượng của F1.3.
- **Nộp tiền muộn**: Một trong các nguyên nhân (Root Cause) khiến Bưu gửi rớt F1.3, xảy ra khi `Thời gian nộp tiền - Thời gian PTC > 3 giờ`.

## 3. Thuật Ngữ Phân Tích
- **DoD (Day-over-Day)**: So sánh kết quả của Hôm nay so với Hôm qua.
- **SWC (Same Weekday Comparison)**: So sánh kết quả của Hôm nay so với Đúng ngày này của tuần liền trước. (Ví dụ: Thứ Ba tuần này vs Thứ Ba tuần trước).
- **Impact Analysis**: Phân tích mức độ ảnh hưởng. Trong F1.3, dùng để đo lường tỷ trọng % Bưu gửi Không đạt của một BCVH đóng góp vào tổng số Bưu gửi Không đạt của toàn mạng.
- **Pareto**: Nguyên lý 80/20, áp dụng trong F1.3 để tìm ra nhóm 20% tuyến phát gây ra 80% Bưu gửi Không đạt.

## 4. Thuật Ngữ Khác (TODO - Waiting Product Owner)
- Các thuật ngữ liên quan đến: Chậm phát, Chậm điều độ, Phân tích bưu tá.
