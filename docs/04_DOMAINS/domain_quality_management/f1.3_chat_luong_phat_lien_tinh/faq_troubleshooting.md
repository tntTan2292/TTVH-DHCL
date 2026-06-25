---
title: FAQ & Troubleshooting
purpose: Giải đáp thắc mắc và hướng dẫn xử lý sự cố nghiệp vụ F1.3
owner: Product Owner
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# FAQ & Troubleshooting

Tài liệu cung cấp các câu hỏi thường gặp và cách xử lý sự cố liên quan đến số liệu nghiệp vụ của F1.3.

## 1. Sự Cố Số Liệu (Data Discrepancy)

### Hỏi: Tại sao KPI F1.3 trên hệ thống lại lệch so với Dashboard Tổng công ty?
**Xử lý**: 
- Dashboard Tổng công ty là Single Source of Truth cho kết quả F1.3. 
- Nếu có sự sai lệch, nguyên nhân có thể do file dữ liệu đầu vào chưa cập nhật hoặc bị thiếu dòng khi import (do dính Unique Constraint). 
- Cần kiểm tra lại lịch sử log import trong hệ thống để xem có dòng dữ liệu nào bị loại bỏ hay không.

### Hỏi: Khi tôi import lại file của một ngày đã có dữ liệu thì điều gì xảy ra?
**Xử lý**: 
- Hệ thống sẽ cảnh báo. Nếu bạn đồng ý ghi đè, toàn bộ dữ liệu cũ của ngày đó sẽ bị xóa và nạp lại từ đầu. Không có cơ chế rollback (hoàn tác).

## 2. Sự Cố Hiển Thị (Display Issues)

### Hỏi: Tại sao Dashboard không có dữ liệu của ngày hôm nay (Today)?
**Xử lý**: 
- Theo thiết kế, bộ lọc thời gian mặc định hiển thị từ `Today - 7 ngày` đến `Today - 1 ngày`. Dữ liệu mới nhất luôn có độ trễ 1 ngày (N-1).

### Hỏi: Màu sắc cảnh báo (Xanh, Đỏ, Vàng, Hồng) được quy định như thế nào?
**Xử lý**: 
- Màu sắc này không được code cứng (hardcode) trong hệ thống mà được lấy từ thiết lập cấu hình. Admin có thể tự thay đổi ngưỡng màu sắc này trong Settings Configuration.

## 3. Sự Cố Phân Tích (Analytics Issues)

### Hỏi: Tại sao biểu đồ so sánh SWC (Same Weekday Comparison) không xuất hiện ở màn hình RCA?
**Xử lý**: 
- Theo Business Rules, SWC chỉ được áp dụng cho màn hình Executive Dashboard ngày. Tuyệt đối không áp dụng SWC cho màn hình RCA, Pareto hay Drilldown nguyên nhân.

### Hỏi: Các nguyên nhân như "Chậm phát", "Chậm khai thác" tại sao chưa xem được?
**Xử lý**: 
- Hiện tại Phase 1 chỉ tập trung phân tích nguyên nhân "Nộp tiền muộn". Các nhóm nguyên nhân khác đang chờ nghiệp vụ từ Product Owner.
- TODO – Waiting Product Owner.
