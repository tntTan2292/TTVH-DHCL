# F42-DASHBOARD-UI-01 – Prompt review độc lập (Opus)

Dán nguyên văn cho phiên Claude Code chạy Opus. Chỉ đọc và chạy lệnh kiểm tra, không sửa mã, không commit.

---

Review độc lập (chỉ đọc, không sửa) ticket `F42-DASHBOARD-UI-01` giai đoạn A+B, commit `5e50f0ec` do Antigravity làm. Đọc trước: `docs/10_TICKETS/F42-DASHBOARD-UI-01_MANIFEST.md` (mục 3 phạm vi, 4 quyết định, 5 loại trừ) và `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`. Không mở trình duyệt, không đăng nhập.

Đối chiếu từng yêu cầu của manifest với `git show 5e50f0ec`, trọng tâm `frontend/src/features/f42/`, `indicatorConfig.js`, `Sidebar.jsx`, `appNavigation.jsx`, `accessModel.js`, `DashboardPage.jsx`, `UserManagementPage.jsx`. Chạy `node --test "src/**/*.test.js"`, `npx oxlint`, `npx vite build` trong `frontend/`.

Câu hỏi bắt buộc trả lời:
1. Bậc màu 90/80/70, mục tiêu 90, họ màu `sky` có đúng và không trùng xanh/cam/lục/teal hay màu trạng thái?
2. Khối "6 BCVH hôm nay" gọi `/f13/ranking/bcvh/overview` qua `useIndicatorApi`: URL có thật sự được ghi lại thành `/f42/...` và payload có trường `daily` không?
3. Người dùng theo BCVH: không tính tổng hay thứ hạng liên BCVH ở client; khối "cần chú ý" có lộ BCVH khác không?
4. Bảng bưu tá: tiêu đề bấm để sắp xếp (rỗng xuống cuối), tìm kiếm không dấu, lọc dưới 90 %, ảnh chụp top-N, header dính khi cuộn (manifest yêu cầu; mã hiện chưa có `sticky`), mặc định các BCVH mở hay đóng (state khởi tạo từ `units` lúc còn rỗng).
5. Bưu gửi chưa chấm được tính "Không đạt" ở mọi nơi hiển thị; nhãn "(N blank)" còn tiếng Anh.
6. Kiểm tra định danh chưa khai báo trong `features/f42`.
7. Phạm vi: commit này có kèm sửa đổi không thuộc F4.2 không (`accessModel.js` CAPABILITIES/POSITIONS, `UserManagementPage.jsx` ô "Chức vụ", menu "Xử lý tồn" `/hangton/handling` của `HANGTON-HANDLING-01`)? Ảnh hưởng nếu phần backend và tab tương ứng chưa commit?

Báo cáo: PASS / PASS CÓ ĐIỀU KIỆN / FAIL, danh sách phát hiện theo mức nghiêm trọng (file:dòng), kèm lệnh đã chạy và kết quả thật. Không tự cấp PO PASS.
