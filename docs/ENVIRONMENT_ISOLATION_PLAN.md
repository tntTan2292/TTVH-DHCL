# ENVIRONMENT ISOLATION PLAN

## 1. Môi trường tách biệt (Environment Isolation)

Để đảm bảo hệ thống TTVH-DHCL hoạt động độc lập hoàn toàn và không xảy ra bất kỳ xung đột (Conflict) nào với hệ thống cũ (KHHH-V3-CRM), dưới đây là sơ đồ thiết lập các tham số môi trường:

### Các thông số cô lập (Proposed Values):
*   **A. Backend Port:** `5050` (Hệ thống cũ KHHH thường dùng port 3000/8080, do đó chọn `5050` cho TTVH Backend để đảm bảo tách biệt 100%).
*   **B. Frontend Port:** `5173` (Cổng mặc định của Vite React, an toàn và không đụng chạm).
*   **C. SQLite Database Path:** `d:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\backend\src\db\database.sqlite` (Lưu trữ Flat-file cục bộ ngay bên trong TTVH backend).
*   **D. Project Root Path:** `d:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`
*   **E. Upload Folder Path:** `d:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\backend\uploads` (Sẽ tạo tự động khi có file gửi lên).

---

## 2. Lời cam kết kiến trúc (Architecture Confirmations)

Antigravity xin xác nhận và cam kết tuân thủ 5 quy tắc cô lập không-chia-sẻ (No-Shared Constraints):

1.  **No shared database with KHHH-V3-CRM:** Tuyệt đối không đọc/ghi chung Database. Hệ thống mới dùng hệ quản trị SQLite độc lập, tách rời hoàn toàn với CSDL cũ.
2.  **No shared `.env`:** Hệ thống mới sẽ sở hữu file `.env` độc lập nằm trong `/backend` và `/frontend`.
3.  **No shared `node_modules`:** Dự án mới được khởi tạo bằng `npm init` và `npm create vite` từ con số 0. Không kế thừa hay tái sử dụng bất kỳ Dependency/Package.json nào của KHHH-V3.
4.  **No shared upload folder:** File Excel tải lên được cô lập hoàn toàn tại `/backend/uploads`. Không đụng chạm tới phân vùng lưu trữ file của CRM cũ.
5.  **No shared port:** Phân định rạch ròi bằng Port 5050 và 5173. Không có sự tranh chấp cổng kết nối.
