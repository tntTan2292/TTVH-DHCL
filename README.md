# TTVH Quality Intelligence System (QIS)

## Hướng dẫn Vận hành (Dành cho Product Owner)

Hệ thống được trang bị công cụ **TTVH Control Center (OPS-001)** giúp Product Owner tự khởi động, tắt và quản lý toàn bộ hệ thống (Backend & Frontend) một cách tự động, không cần dùng Terminal/CMD thủ công.

### 1. Khởi động Control Center
- Tại thư mục gốc của dự án, click đúp vào file `Start_ControlCenter.bat`.
- Một cửa sổ giao diện Menu (Màu xanh/đen) sẽ hiện lên.

### 2. Các chức năng trên Control Center
- **Trạng thái hệ thống:** Khi bật Control Center, hệ thống sẽ tự động quét và báo cho bạn biết Backend/Frontend đang `RUNNING` (Chạy) hay `STOPPED` (Đã dừng).
- **Phím 1 (Start System):** Bật Backend và Frontend chạy ngầm dưới nền. Cửa sổ CMD sẽ không bị bật lên liên tục gây rối mắt. Khi bạn tắt Control Center, hệ thống vẫn tiếp tục chạy bình thường.
- **Phím 2 (Stop System):** Quét toàn bộ các tiến trình đang chiếm cổng Backend (5050) và Frontend (5178) và dập tắt hoàn toàn.
- **Phím 3 (Restart System):** Thực hiện Stop rồi Start lại ngay lập tức (Hữu ích khi hệ thống bị treo hoặc vừa nhận code mới).
- **Phím 4 (Health Check):** Quét sức khỏe hệ thống:
  - Backend có chạy không?
  - Frontend có chạy không?
  - Backend API có đang phản hồi đúng định dạng không?
- **Phím 5 (Open Dashboard):** Tự động mở trình duyệt truy cập vào Dashboard F1.3.
- **Phím 6 (Open Project Folder):** Mở nhanh thư mục dự án trên File Explorer.
- **Phím 0 (Exit):** Đóng Control Center.

### 3. Lưu ý quan trọng
- Hệ thống chạy ở dạng **Background Service**, do đó nếu bạn tắt nhầm cửa sổ Control Center, Website vẫn hoạt động bình thường.
- Để tắt Web hoàn toàn, bắt buộc phải mở `Start_ControlCenter.bat` và chọn chức năng số `2` (Stop System).
- File Log lỗi hệ thống được ghi ngầm vào:
  - Backend: `backend\backend.log` và `backend\backend_err.log`
  - Frontend: `frontend\frontend.log` và `frontend\frontend_err.log`
