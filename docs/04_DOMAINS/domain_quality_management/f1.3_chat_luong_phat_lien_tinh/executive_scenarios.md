---
title: Executive Scenarios
purpose: Kịch bản điều hành mẫu dành cho lãnh đạo
owner: Product Owner
ssot: True
dependencies: executive_decision_guide.md
version: 1.0.0
---

# Executive Scenarios

Tài liệu cung cấp các kịch bản mẫu để nhận diện và phản ứng với các bất thường trong F1.3.

## Kịch Bản 1: Giảm đột biến toàn mạng

### 1. Điều kiện phát hiện
- KPI F1.3 toàn mạng (DoD hoặc SWC) giảm mạnh và chuyển sang màu Vàng / Đỏ.

### 2. Thông tin hiển thị
- Cảnh báo Top 5 BCVH kéo giảm KPI toàn mạng hiển thị trên Executive Dashboard.

### 3. Hướng điều hành đề xuất
- Mở Impact Analysis để xem % Không đạt toàn mạng tập trung ở BCVH nào.
- Drill down xuống cấp BCVH tương ứng để xử lý.
- *Hướng hành động cụ thể: TODO - Waiting Product Owner.*

---

## Kịch Bản 2: Tắc nghẽn tại cấp BCVH

### 1. Điều kiện phát hiện
- KPI BCVH thấp (Màu Đỏ), trong khi toàn mạng ổn định.

### 2. Thông tin hiển thị
- Bảng BCVH Ranking.
- Chức năng Click BCVH để mở màn hình phân tích BCVH.

### 3. Hướng điều hành đề xuất
- Thực hiện RCA và Drill down cấp tuyến phát của BCVH đó.
- *Hướng hành động cụ thể: TODO - Waiting Product Owner.*

---

## Kịch Bản 3: Nộp tiền muộn tăng cao

### 1. Điều kiện phát hiện
- Tỷ lệ Bưu gửi nộp tiền muộn (> 2 giờ) tăng cao trong nhóm Không đạt.

### 2. Thông tin hiển thị
- Màn hình RCA, Tab Nộp tiền muộn: Hiển thị Tỷ lệ nộp tiền muộn (trong nhóm Không đạt).

### 3. Hướng điều hành đề xuất
- Nhắc nhở bưu tá thực hiện nộp tiền đúng quy định (≤ 2 giờ sau khi PTC).
- *Hướng hành động cụ thể: TODO - Waiting Product Owner.*

---

## Kịch Bản 4: Lỗi tập trung ở một số Tuyến phát (Pareto 80/20)

### 1. Điều kiện phát hiện
- Phân tích Pareto chỉ ra một số ít tuyến phát chiếm phần lớn Bưu gửi Không đạt.

### 2. Thông tin hiển thị
- Biểu đồ Pareto tuyến phát.
- Kết luận tự động (Ví dụ: "15 tuyến phát chiếm 72% số Bưu gửi không đạt toàn mạng").

### 3. Hướng điều hành đề xuất
- Mở danh sách Bưu gửi của tuyến lỗi để truy vấn trực tiếp.
- Điều hành trực tiếp cấp tuyến (Bưu tá).
- *Hướng hành động cụ thể: TODO - Waiting Product Owner.*
