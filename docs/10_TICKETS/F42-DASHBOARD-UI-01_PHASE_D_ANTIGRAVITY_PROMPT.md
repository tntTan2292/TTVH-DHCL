# F42-DASHBOARD-UI-01 – Giai đoạn D (Antigravity)

Dán nguyên văn cho Antigravity. Backend đã xong; manifest: `F42-DASHBOARD-UI-01_MANIFEST.md`, `F42-POSTMAN-API-01_MANIFEST.md`.

---

Làm giai đoạn D của F42-DASHBOARD-UI-01. Backend đã có: `GET /api/f42/dashboard/postman-trend` (`ma_buu_ta`, `from_date`, `to_date`, tối đa 93 ngày; mỗi ngày có `data_available`, `rate`, `volume`, `passed`, `failed`) và thẻ F4.2 trong `GET /api/home/executive` (chỉ tiêu thứ 5, `id: 'f42'`, mục tiêu 90, danh sách 6 BCVH). Backend chưa khởi động lại nên dùng dữ liệu giả trong test. Không mở trình duyệt, không chụp ảnh, không chạy dev server, không đăng nhập. Commit theo pathspec chỉ file bạn sửa.

Đọc trước: `report_block_ui_standard.md`, `F42-DASHBOARD-UI-01_MANIFEST.md` mục 3 và 4, `frontend/src/pages/DashboardHome.jsx` và `features/home/`.

**D1. Thẻ F4.2 trên trang chủ**
- Hiện F4.2 là thẻ thứ 5 với họ màu `sky` của F4.2, nhãn "F4.2", mục tiêu 90 %. Bố cục 5 thẻ phải vừa một màn hình laptop 1366×768 ở zoom 90 % (ước lượng chiều cao, không mở trình duyệt).
- Cập nhật mọi chỗ liệt kê chỉ tiêu: `homeTableSort.js` (tên "Phát giao bưu tá"), `homeNames.js`, `IndicatorTrendsGrid`, `NationalRankingBlock` (chọn F4.2), `MonthlyRankProgressionBlock`, `ActionUnitsBlock` (loại `bcvh`), `ExecutiveDateBar`, các comment "F1.1, F1.2, F1.3, F4.1".
- Bậc màu thẻ F4.2 theo 90/80/70. Nếu API chưa trả F4.2 thì trang chủ vẫn hiện 4 thẻ bình thường.

**D2. Xu hướng một bưu tá**
- Bấm tên bưu tá trong bảng "Bưu tá theo BCVH" hoặc "Bưu tá cần chú ý" mở khối xu hướng: biểu đồ tỷ lệ đạt theo ngày, đường mục tiêu 90 %, họ màu F4.2, ngày không có dữ liệu để trống (không nối, không bằng 0), kỳ mặc định 30 ngày kết thúc ở ngày đang chọn, nút ảnh chụp, theo bộ lọc ngày, ghi rõ tên bưu tá, BCVH và tổng kỳ (`total_row`).
- Người dùng theo BCVH chỉ mở được bưu tá của BCVH mình; kết quả rỗng thì hiện thông báo, không báo lỗi.

Thêm test cho phần dữ liệu (khoảng trống, rỗng, 5 chỉ tiêu). Chạy lint, build, `node --test "src/**/*.test.js"`, kiểm tra định danh chưa khai báo; báo kết quả thật, dừng ở `READY FOR PO CHECK`.
